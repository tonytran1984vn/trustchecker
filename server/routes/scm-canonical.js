/**
 * Canonical Product Identity API (Phase 4.1)
 *
 * 1 product = 1 global identity. Match pipeline with confidence scoring.
 * Hash used for candidate matching only — NEVER auto-merge on hash alone.
 *
 * POST   /api/scm/canonical               — Create canonical product
 * GET    /api/scm/canonical               — List canonical products
 * POST   /api/scm/canonical/match         — Submit supplier product for matching
 * GET    /api/scm/canonical/candidates    — Review pending candidates
 * POST   /api/scm/canonical/candidates/:id/decide — Approve/reject
 * POST   /api/scm/canonical/reconcile    — Re-evaluate old mappings
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

router.use(authMiddleware);

// ═══ Helpers ════════════════════════════════════════════════════════════

const LEGAL_SUFFIXES =
    /\b(co\.?|company|ltd\.?|limited|inc\.?|incorporated|llc\.?|corp\.?|corporation|plc\.?|gmbh|sa\.?|srl|pte\.?|pty\.?|group|holdings?)\b/gi;

function normalizeName(raw) {
    return (raw || '')
        .toLowerCase()
        .trim()
        .replace(LEGAL_SUFFIXES, '')
        .replace(/[.\-_,&]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function similarity(a, b) {
    if (!a || !b) return 0;
    const setA = new Set(a.split(' '));
    const setB = new Set(b.split(' '));
    const intersection = [...setA].filter(x => setB.has(x));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.length / union.size : 0;
}

function attributeHash(name, brand, attributes) {
    const payload = JSON.stringify({ n: normalizeName(name), b: normalizeName(brand || ''), a: attributes || {} });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

// ═══ POST / — Create canonical product (ATOMIC GTIN DEDUP) ═══════════

router.post('/', requirePermission('product:create'), async (req, res) => {
    try {
        const { name, brand, category, gtin, attributes } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const id = uuidv4();

        // Atomic insert — ON CONFLICT handles concurrent GTIN race
        if (gtin) {
            const inserted = await db.get(
                `INSERT INTO canonical_products (id, name, brand, category, gtin, attributes)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (gtin) WHERE gtin IS NOT NULL DO NOTHING
                 RETURNING id`,
                [id, name, brand || null, category || null, gtin, JSON.stringify(attributes || {})]
            );

            if (!inserted) {
                // GTIN already exists — return proper 409
                const existing = await db.get('SELECT id, name FROM canonical_products WHERE gtin = $1', [gtin]);
                return res.status(409).json({
                    error: 'GTIN already assigned to another canonical product',
                    existing_id: existing?.id,
                    existing_name: existing?.name,
                });
            }
        } else {
            // No GTIN — simple insert
            await db.run(
                `INSERT INTO canonical_products (id, name, brand, category, gtin, attributes)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, name, brand || null, category || null, null, JSON.stringify(attributes || {})]
            );
        }

        res.status(201).json({ canonical: { id, name, brand, category, gtin } });
    } catch (err) {
        logger.error('[canonical] POST / error:', err.message);
        res.status(500).json({ error: 'Failed to create canonical product' });
    }
});

// ═══ GET / — List canonical products ═════════════════════════════════
// L-2 FIX: Scoped to org visibility — only show canonical products the org has mapped to

router.get('/', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const isPlatform = req.user?.user_type === 'platform';
        const { category, search, status } = req.query;

        let query;
        const params = [];

        if (isPlatform) {
            // Platform admin: global view
            query = 'SELECT * FROM canonical_products WHERE 1=1';
        } else {
            // Org user: only see canonical products they have mapped to, OR global products with no mapping
            query = `SELECT DISTINCT cp.* FROM canonical_products cp
                     LEFT JOIN product_mappings pm ON pm.canonical_product_id = cp.id AND pm.org_id = $1
                     WHERE (pm.org_id = $1 OR NOT EXISTS (SELECT 1 FROM product_mappings pm2 WHERE pm2.canonical_product_id = cp.id))`;
            params.push(orgId);
        }

        if (status) {
            query += ` AND cp.status = $${params.length + 1}`;
            params.push(status);
        }
        if (category) {
            query += ` AND cp.category = $${params.length + 1}`;
            params.push(category);
        }
        if (search) {
            query += ` AND cp.name ILIKE $${params.length + 1}`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY cp.created_at DESC LIMIT 200';
        const products = await db.all(query, params);
        res.json({ products, total: products.length });
    } catch (err) {
        logger.error('[canonical] GET / error:', err.message);
        res.status(500).json({ error: 'Failed to list canonical products' });
    }
});

// ═══ POST /match — Submit supplier product for matching ══════════════
// FIX: Added LIMIT 5000 to prevent OOM at scale. TODO: migrate to pg_trgm.

router.post('/match', requirePermission('product:create'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { supplier_product_id, product_name, product_brand, product_gtin, product_attributes } = req.body;

        if (!supplier_product_id || !product_name) {
            return res.status(400).json({ error: 'supplier_product_id and product_name required' });
        }

        // 1. GTIN exact match (highest confidence)
        if (product_gtin) {
            const gtinMatch = await db.get(
                'SELECT id, name, brand, category FROM canonical_products WHERE gtin = $1 AND status = $2',
                [product_gtin, 'active']
            );
            if (gtinMatch) {
                const candidateId = uuidv4();
                await db.run(
                    `INSERT INTO product_match_candidates (id, supplier_product_id, org_id, canonical_product_id, confidence, match_method, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [candidateId, supplier_product_id, orgId, gtinMatch.id, 1.0, 'gtin', 'approved']
                );

                // Auto-map (GTIN = highest trust) — uses withTransaction internally
                await _createMapping(supplier_product_id, orgId, gtinMatch.id, 1.0, 'gtin');

                return res.json({
                    match: 'exact_gtin',
                    canonical: gtinMatch,
                    candidate_id: candidateId,
                    auto_mapped: true,
                });
            }
        }

        // 2. Fuzzy name + brand matching — M-2 FIX: pg_trgm DB-side similarity (indexed)
        const normInput = normalizeName(product_name);
        const inputHash = attributeHash(product_name, product_brand, product_attributes);
        const candidates = [];

        try {
            // Use pg_trgm similarity() — leverages GIN index on canonical_products.name
            const trgmMatches = await db.all(
                `SELECT id, name, brand, category, attributes,
                        similarity(LOWER(name), $1) as name_sim
                 FROM canonical_products
                 WHERE status = 'active'
                   AND similarity(LOWER(name), $1) > 0.3
                 ORDER BY name_sim DESC
                 LIMIT 20`,
                [normInput]
            );

            for (const cp of trgmMatches) {
                const nameSim = parseFloat(cp.name_sim) || 0;
                const brandBoost =
                    product_brand && cp.brand && normalizeName(product_brand) === normalizeName(cp.brand) ? 0.2 : 0;
                const cpHash = attributeHash(cp.name, cp.brand, cp.attributes);
                const hashBoost = inputHash === cpHash ? 0.15 : 0;

                const confidence = Math.min(1.0, Math.round((nameSim + brandBoost + hashBoost) * 1000) / 1000);
                if (confidence >= 0.5) {
                    candidates.push({ canonical: cp, confidence });
                }
            }
        } catch (trgmErr) {
            // Fallback: in-memory matching if pg_trgm unavailable
            logger.warn('[canonical] pg_trgm fallback:', trgmErr.message);
            const canonicals = await db.all(
                'SELECT id, name, brand, category, attributes FROM canonical_products WHERE status = $1 LIMIT 5000',
                ['active']
            );
            for (const cp of canonicals) {
                const nameSim = similarity(normInput, normalizeName(cp.name));
                const brandBoost =
                    product_brand && cp.brand && normalizeName(product_brand) === normalizeName(cp.brand) ? 0.2 : 0;
                const cpHash = attributeHash(cp.name, cp.brand, cp.attributes);
                const hashBoost = inputHash === cpHash ? 0.15 : 0;
                const confidence = Math.min(1.0, Math.round((nameSim + brandBoost + hashBoost) * 1000) / 1000);
                if (confidence >= 0.5) {
                    candidates.push({ canonical: cp, confidence });
                }
            }
        }

        // Sort by confidence desc
        candidates.sort((a, b) => b.confidence - a.confidence);

        // Insert candidates + auto-approve if > 0.9 (H-5 FIX: Only auto-map the FIRST one to avoid UNIQUE constraint clashes / state corruption)
        const insertedCandidates = [];
        let hasAutoMapped = false;

        for (const c of candidates.slice(0, 5)) {
            // Top 5 candidates max
            const candidateId = uuidv4();
            let status = 'pending';

            if (c.confidence > 0.9 && !hasAutoMapped) {
                status = 'approved';
                hasAutoMapped = true;
            }

            await db.run(
                `INSERT INTO product_match_candidates (id, supplier_product_id, org_id, canonical_product_id, confidence, match_method, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [candidateId, supplier_product_id, orgId, c.canonical.id, c.confidence, 'auto', status]
            );

            // Auto-map if > 0.9 — uses withTransaction internally
            if (status === 'approved') {
                await _createMapping(supplier_product_id, orgId, c.canonical.id, c.confidence, 'auto');
            }

            insertedCandidates.push({
                candidate_id: candidateId,
                canonical_id: c.canonical.id,
                canonical_name: c.canonical.name,
                confidence: c.confidence,
                status,
                auto_mapped: status === 'approved',
            });
        }

        // If no good match → suggest creating new canonical
        if (candidates.length === 0 || candidates[0].confidence < 0.7) {
            return res.json({
                match: 'no_match',
                suggestion: 'Create new canonical product',
                candidates: insertedCandidates,
            });
        }

        res.json({
            match: candidates[0].confidence > 0.9 ? 'auto_mapped' : 'review_needed',
            candidates: insertedCandidates,
        });
    } catch (err) {
        logger.error('[canonical] POST /match error:', err.message);
        res.status(500).json({ error: 'Failed to match product' });
    }
});

// ═══ GET /candidates — Review pending matches ═══════════════════════

router.get('/candidates', requirePermission('product:create'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const candidates = await db.all(
            `SELECT pmc.*, cp.name as canonical_name, cp.brand as canonical_brand, cp.category as canonical_category
             FROM product_match_candidates pmc
             LEFT JOIN canonical_products cp ON cp.id = pmc.canonical_product_id
             WHERE pmc.org_id = $1 AND pmc.status = 'pending'
             ORDER BY pmc.confidence DESC`,
            [orgId]
        );
        res.json({ candidates, total: candidates.length });
    } catch (err) {
        logger.error('[canonical] GET /candidates error:', err.message);
        res.status(500).json({ error: 'Failed to load candidates' });
    }
});

// ═══ POST /candidates/:id/decide — Approve or reject ════════════════

router.post('/candidates/:id/decide', requirePermission('product:create'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { id } = req.params;
        const { decision } = req.body; // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
        }

        const candidate = await db.get(
            'SELECT * FROM product_match_candidates WHERE id = $1 AND org_id = $2 AND status = $3',
            [id, orgId, 'pending']
        );
        if (!candidate) return res.status(404).json({ error: 'Candidate not found or already decided' });

        const newStatus = decision === 'approve' ? 'approved' : 'rejected';
        await db.run(
            `UPDATE product_match_candidates SET status = $1, decided_by = $2, decided_at = NOW() WHERE id = $3`,
            [newStatus, req.user.email || 'manual', id]
        );

        if (decision === 'approve') {
            await _createMapping(
                candidate.supplier_product_id,
                orgId,
                candidate.canonical_product_id,
                candidate.confidence,
                'manual'
            );

            // Supersede other pending candidates for same supplier product
            await db.run(
                `UPDATE product_match_candidates SET status = 'superseded'
                 WHERE supplier_product_id = $1 AND org_id = $2 AND status = 'pending' AND id != $3`,
                [candidate.supplier_product_id, orgId, id]
            );
        }

        res.json({ message: `Candidate ${decision}d`, candidate_id: id, decision });
    } catch (err) {
        logger.error('[canonical] POST /decide error:', err.message);
        res.status(500).json({ error: 'Failed to decide candidate' });
    }
});

// ═══ POST /reconcile — Re-evaluate old mappings ═════════════════════

router.post('/reconcile', requirePermission('settings:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;

        // Get all active mappings for this org
        const mappings = await db.all(
            `SELECT pm.*, pd.name as product_name, pd.description
             FROM product_mappings pm
             LEFT JOIN product_definitions pd ON pd.id = pm.supplier_product_id
             WHERE pm.org_id = $1 AND pm.is_active = true`,
            [orgId]
        );

        // Get active canonicals (CAPPED to prevent OOM)
        const canonicals = await db.all(
            "SELECT id, name, brand, category FROM canonical_products WHERE status = 'active' LIMIT 5000",
            []
        );

        let re_evaluated = 0;
        let upgraded = 0;

        for (const mapping of mappings) {
            if (!mapping.product_name) continue;

            const normInput = normalizeName(mapping.product_name);
            let bestMatch = null;
            let bestScore = mapping.confidence || 0;

            for (const cp of canonicals) {
                if (cp.id === mapping.canonical_product_id) continue;
                const sim = similarity(normInput, normalizeName(cp.name));
                if (sim > bestScore + 0.1) {
                    // Must be significantly better
                    bestMatch = cp;
                    bestScore = sim;
                }
            }

            re_evaluated++;

            if (bestMatch && bestScore > 0.9) {
                // Create candidate for review (don't auto-switch)
                await db.run(
                    `INSERT INTO product_match_candidates (id, supplier_product_id, org_id, canonical_product_id, confidence, match_method, status)
                     VALUES ($1, $2, $3, $4, $5, 'auto', 'pending')
                     ON CONFLICT DO NOTHING`,
                    [uuidv4(), mapping.supplier_product_id, orgId, bestMatch.id, bestScore]
                );
                upgraded++;
            }
        }

        res.json({
            message: `Reconciliation complete`,
            re_evaluated,
            better_matches_found: upgraded,
        });
    } catch (err) {
        logger.error('[canonical] POST /reconcile error:', err.message);
        res.status(500).json({ error: 'Failed to reconcile' });
    }
});

// ═══ Helper: Create mapping with REAL TRANSACTION ═══════════════════
// FIX: Uses db.withTransaction() — FOR UPDATE now holds lock on same connection.
// DB partial unique index uq_product_mappings_active prevents duplicates as safety net.

async function _createMapping(supplierProductId, orgId, canonicalProductId, confidence, decidedBy) {
    await db.withTransaction(async tx => {
        // Lock existing active mapping — scoped to org_id to prevent cross-tenant contention
        const existing = await tx.get(
            'SELECT id FROM product_mappings WHERE supplier_product_id = $1 AND org_id = $2 AND is_active = true FOR UPDATE',
            [supplierProductId, orgId]
        );

        if (existing) {
            await tx.run('UPDATE product_mappings SET is_active = false, superseded_at = NOW() WHERE id = $1', [
                existing.id,
            ]);
        }

        await tx.run(
            `INSERT INTO product_mappings (id, supplier_product_id, org_id, canonical_product_id, confidence, decided_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), supplierProductId, orgId, canonicalProductId, confidence, decidedBy]
        );

        // Also update product_definitions
        await tx.run('UPDATE product_definitions SET canonical_product_id = $1 WHERE id = $2', [
            canonicalProductId,
            supplierProductId,
        ]);
    });
}

module.exports = router;
