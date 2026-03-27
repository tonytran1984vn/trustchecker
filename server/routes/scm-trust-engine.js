/**
 * Supplier Trust Engine (Phase 3 — D2/D3/G1)
 *
 * D2: Compute trust scores from PO fulfillment + quality data → supplier_trust_metrics
 * D3: Duplicate supplier detection (fuzzy name match + country)
 * G1: Supplier offboarding with cascade cleanup
 *
 * Mounted at /api/scm/trust-engine
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const { appendAuditEntry } = require('../utils/audit-chain');
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// D2: TRUST SCORE COMPUTATION FROM TRANSACTION DATA
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/scm/trust-engine/compute
 * Recompute supplier trust metrics from PO fulfillment + quality checks.
 * Writes results to supplier_trust_metrics and updates partners.trust_score.
 */
router.post('/compute', requirePermission('settings:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { partner_id } = req.body; // Optional: recompute for single partner

        // Build partner list
        let partners;
        if (partner_id) {
            const p = await db.get('SELECT id, name FROM partners WHERE id = $1 AND org_id = $2', [partner_id, orgId]);
            if (!p) return res.status(404).json({ error: 'Partner not found' });
            partners = [p];
        } else {
            partners = await db.all('SELECT id, name FROM partners WHERE org_id = $1', [orgId]);
        }

        const results = [];

        for (const partner of partners) {
            // 1. PO Fulfillment metrics
            const poStats = await db.get(
                `SELECT
                    COUNT(*)::int as total_orders,
                    COUNT(*) FILTER (WHERE status IN ('fulfilled','completed','delivered'))::int as fulfilled,
                    COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric(5,1) as avg_days
                 FROM purchase_orders
                 WHERE org_id = $1 AND (supplier = $2 OR supplier_org_id = $2)`,
                [orgId, partner.id]
            );

            // 2. Quality check metrics (FIX: scoped to partner via supplier filter)
            const qcStats = await db.get(
                `SELECT
                    COUNT(*)::int as total_checks,
                    COUNT(*) FILTER (WHERE result = 'fail')::int as failed_checks,
                    COALESCE(SUM(defects_found), 0)::int as total_defects,
                    COALESCE(AVG(score), 100)::numeric(5,1) as avg_quality_score
                 FROM quality_checks
                 WHERE org_id = $1 AND (supplier_id = $2 OR supplier = $3)`,
                [orgId, partner.id, partner.name]
            );

            // 3. Incident count (severity-weighted)
            const incidents = await db.get(
                `SELECT
                    COUNT(*) FILTER (WHERE severity = 'critical')::int as critical,
                    COUNT(*) FILTER (WHERE severity = 'high')::int as high,
                    COUNT(*) FILTER (WHERE severity IN ('medium','low'))::int as low
                 FROM ops_incidents_v2
                 WHERE org_id = $1 AND module LIKE '%supplier%'`,
                [orgId]
            );

            // 4. Compute composite score (0-100)
            const totalOrders = poStats?.total_orders || 0;
            const fulfilled = poStats?.fulfilled || 0;
            const fulfillmentRate = totalOrders > 0 ? fulfilled / totalOrders : 0.5;
            const defectRate = qcStats?.total_checks > 0 ? qcStats.failed_checks / qcStats.total_checks : 0;
            const incidentPenalty =
                (incidents?.critical || 0) * 15 + (incidents?.high || 0) * 8 + (incidents?.low || 0) * 2;

            // Weighted formula:
            // 40% fulfillment rate + 30% quality score + 20% delivery speed + 10% incident-free bonus
            const qualityComponent = (qcStats?.avg_quality_score || 50) / 100;
            const deliveryComponent = Math.max(0, 1 - Math.max(0, (poStats?.avg_days || 14) - 7) / 30);
            const incidentComponent = Math.max(0, 1 - incidentPenalty / 100);

            let computedScore =
                fulfillmentRate * 40 + qualityComponent * 30 + deliveryComponent * 20 + incidentComponent * 10;
            computedScore = Math.max(0, Math.min(100, Math.round(computedScore * 100) / 100));

            // 5. Upsert to supplier_trust_metrics
            await db.run(
                `INSERT INTO supplier_trust_metrics (org_id, orders_fulfilled, orders_total, avg_delivery_days, defect_rate, dispute_count, computed_score, last_computed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                 ON CONFLICT (org_id) DO UPDATE SET
                     orders_fulfilled = EXCLUDED.orders_fulfilled,
                     orders_total = EXCLUDED.orders_total,
                     avg_delivery_days = EXCLUDED.avg_delivery_days,
                     defect_rate = EXCLUDED.defect_rate,
                     dispute_count = EXCLUDED.dispute_count,
                     computed_score = EXCLUDED.computed_score,
                     last_computed_at = NOW()`,
                [
                    partner.id,
                    fulfilled,
                    totalOrders,
                    poStats?.avg_days || 0,
                    defectRate,
                    incidents?.critical || 0,
                    computedScore,
                ]
            );

            // 6. Sync back to partners.trust_score + trust state machine
            // State machine: score < 30 → probation, < 15 → restricted
            // Recovery: score above threshold + cooldown expired → promote
            let newState = 'active';
            let stateReason = null;
            const currentPartnerState = await db.get(
                'SELECT trust_state, trust_cooldown_until FROM partners WHERE id = $1 AND org_id = $2',
                [partner.id, orgId]
            );
            const currentState = currentPartnerState?.trust_state || 'active';
            const cooldownUntil = currentPartnerState?.trust_cooldown_until;
            const cooldownExpired = !cooldownUntil || new Date(cooldownUntil) <= new Date();

            if (computedScore < 15) {
                newState = 'restricted';
                stateReason = `Score ${computedScore} below restricted threshold (15)`;
            } else if (computedScore < 30) {
                newState = 'probation';
                stateReason = `Score ${computedScore} below probation threshold (30)`;
            } else if (currentState === 'probation' && computedScore >= 30 && cooldownExpired) {
                newState = 'active';
                stateReason = `Score recovered to ${computedScore}, cooldown expired`;
            } else if (currentState === 'restricted' && computedScore >= 30 && cooldownExpired) {
                newState = 'probation'; // Step up, not jump to active
                stateReason = `Score recovered to ${computedScore}, promoted to probation`;
            } else if (currentState !== 'banned') {
                newState = currentState; // Keep current state
            }

            // Set cooldown when entering probation/restricted (7 day cooldown)
            const cooldownClause =
                newState !== currentState && ['probation', 'restricted'].includes(newState)
                    ? ", trust_cooldown_until = NOW() + INTERVAL '7 days'"
                    : '';

            await db.run(
                `UPDATE partners SET trust_score = $1, composite_score = $1,
                    trust_state = $2, trust_state_changed_at = CASE WHEN trust_state != $2 THEN NOW() ELSE trust_state_changed_at END,
                    trust_state_reason = COALESCE($3, trust_state_reason)
                    ${cooldownClause}
                 WHERE id = $4 AND org_id = $5`,
                [computedScore, newState, stateReason, partner.id, orgId]
            );

            // 7. Log to score history
            await db.run(
                `INSERT INTO supplier_score_history (id, supplier_name, org_id, score, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [uuidv4(), partner.name, orgId, computedScore]
            );

            results.push({
                partner_id: partner.id,
                name: partner.name,
                score: computedScore,
                metrics: {
                    fulfillment_rate: Math.round(fulfillmentRate * 100),
                    quality_score: qcStats?.avg_quality_score || 50,
                    total_orders: totalOrders,
                    defect_rate: Math.round(defectRate * 10000) / 100,
                    incident_penalty: incidentPenalty,
                },
            });
        }

        res.json({
            message: `Trust scores computed for ${results.length} partner(s)`,
            results,
            computed_at: new Date().toISOString(),
        });
    } catch (err) {
        logger.error('[trust-engine] compute error:', err.message);
        res.status(500).json({ error: 'Failed to compute trust scores' });
    }
});

/**
 * GET /api/scm/trust-engine/metrics/:partnerId
 * Fetch trust metrics for a specific partner
 */
router.get('/metrics/:partnerId', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { partnerId } = req.params;

        // Verify partner belongs to org
        const partner = await db.get(
            'SELECT id, name, trust_score, risk_level, tier FROM partners WHERE id = $1 AND org_id = $2',
            [partnerId, orgId]
        );
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        const metrics = await db.get('SELECT * FROM supplier_trust_metrics WHERE org_id = $1', [partnerId]);

        const history = await db.all(
            `SELECT score, created_at FROM supplier_score_history
             WHERE supplier_name = $1 AND org_id = $2
             ORDER BY created_at DESC LIMIT 30`,
            [partner.name, orgId]
        );

        res.json({ partner, metrics: metrics || {}, history });
    } catch (err) {
        logger.error('[trust-engine] metrics error:', err.message);
        res.status(500).json({ error: 'Failed to load trust metrics' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// D3: DUPLICATE SUPPLIER DETECTION
// ═══════════════════════════════════════════════════════════════════

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

/**
 * GET /api/scm/trust-engine/duplicates
 * Detect potential duplicate suppliers by fuzzy name match.
 */
router.get('/duplicates', requirePermission('settings:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const threshold = parseFloat(req.query.threshold) || 0.6;

        // FIX: Added LIMIT 3000 to prevent O(n²) timeout at scale
        const partners = await db.all(
            'SELECT id, name, normalized_name, country, type, status, trust_score FROM partners WHERE org_id = $1 ORDER BY name LIMIT 3000',
            [orgId]
        );

        const duplicates = [];
        const checked = new Set();

        for (let i = 0; i < partners.length; i++) {
            for (let j = i + 1; j < partners.length; j++) {
                const key = `${partners[i].id}:${partners[j].id}`;
                if (checked.has(key)) continue;
                checked.add(key);

                const normA = partners[i].normalized_name || normalizeName(partners[i].name);
                const normB = partners[j].normalized_name || normalizeName(partners[j].name);

                // Exact normalized match
                if (normA === normB) {
                    duplicates.push({
                        partner_a: {
                            id: partners[i].id,
                            name: partners[i].name,
                            country: partners[i].country,
                            status: partners[i].status,
                        },
                        partner_b: {
                            id: partners[j].id,
                            name: partners[j].name,
                            country: partners[j].country,
                            status: partners[j].status,
                        },
                        match_type: 'exact',
                        confidence: 1.0,
                    });
                    continue;
                }

                // Fuzzy Jaccard similarity
                const sim = similarity(normA, normB);
                if (sim >= threshold) {
                    // Boost confidence if same country
                    const countryBoost = partners[i].country === partners[j].country ? 0.15 : 0;
                    duplicates.push({
                        partner_a: {
                            id: partners[i].id,
                            name: partners[i].name,
                            country: partners[i].country,
                            status: partners[i].status,
                        },
                        partner_b: {
                            id: partners[j].id,
                            name: partners[j].name,
                            country: partners[j].country,
                            status: partners[j].status,
                        },
                        match_type: 'fuzzy',
                        confidence: Math.min(1.0, Math.round((sim + countryBoost) * 100) / 100),
                    });
                }
            }
        }

        // Sort by confidence descending
        duplicates.sort((a, b) => b.confidence - a.confidence);

        res.json({ duplicates, total: duplicates.length, threshold });
    } catch (err) {
        logger.error('[trust-engine] duplicates error:', err.message);
        res.status(500).json({ error: 'Failed to detect duplicates' });
    }
});

/**
 * POST /api/scm/trust-engine/merge
 * Merge two duplicate suppliers — keep primary, deactivate secondary.
 */
router.post('/merge', requirePermission('settings:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { primary_id, secondary_id } = req.body;

        if (!primary_id || !secondary_id) {
            return res.status(400).json({ error: 'primary_id and secondary_id required' });
        }
        if (primary_id === secondary_id) {
            return res.status(400).json({ error: 'Cannot merge a supplier with itself' });
        }

        // Verify both belong to org (outside tx — read-only)
        const primary = await db.get('SELECT id, name FROM partners WHERE id = $1 AND org_id = $2', [
            primary_id,
            orgId,
        ]);
        const secondary = await db.get('SELECT id, name FROM partners WHERE id = $1 AND org_id = $2', [
            secondary_id,
            orgId,
        ]);
        if (!primary || !secondary) return res.status(404).json({ error: 'One or both partners not found' });

        // FIX: Entire merge operation is now atomic (single connection)
        await db.withTransaction(async tx => {
            // FIX: Added org_id scoping to prevent cross-tenant offering reassignment
            await tx.run(
                `UPDATE supplier_offerings SET org_id = $1
                 WHERE org_id = $2
                   AND id IN (SELECT so.id FROM supplier_offerings so
                              JOIN product_definitions pd ON pd.id = so.product_def_id
                              WHERE so.org_id = $2)`,
                [primary_id, secondary_id]
            );
            await tx.run('UPDATE purchase_orders SET supplier = $1 WHERE supplier = $2 AND org_id = $3', [
                primary_id,
                secondary_id,
                orgId,
            ]);
            await tx.run('UPDATE purchase_orders SET supplier_org_id = $1 WHERE supplier_org_id = $2 AND org_id = $3', [
                primary_id,
                secondary_id,
                orgId,
            ]);
            await tx.run('UPDATE partner_locations SET partner_id = $1 WHERE partner_id = $2', [
                primary_id,
                secondary_id,
            ]);

            // Mark secondary as merged/inactive
            await tx.run(
                "UPDATE partners SET status = 'merged', notes = CONCAT(COALESCE(notes,''), ' [Merged into ' || $1 || ']') WHERE id = $2 AND org_id = $3",
                [primary.name, secondary_id, orgId]
            );
        });

        // Audit trail (outside tx — best-effort, not critical for atomicity)
        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'SUPPLIER_MERGED',
            entity_type: 'partner',
            entity_id: primary_id,
            details: {
                primary: { id: primary_id, name: primary.name },
                secondary: { id: secondary_id, name: secondary.name },
                merged_by: req.user.email,
            },
            ip: req.ip || '',
        });

        res.json({
            message: `"${secondary.name}" merged into "${primary.name}"`,
            primary_id,
            secondary_id,
        });
    } catch (err) {
        logger.error('[trust-engine] merge error:', err.message);
        res.status(500).json({ error: 'Failed to merge suppliers' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// G1: SUPPLIER OFFBOARDING
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/scm/trust-engine/offboard/:partnerId
 * Offboard a supplier — deactivate account, cancel offerings, cascade cleanup.
 */
router.post('/offboard/:partnerId', requirePermission('settings:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { partnerId } = req.params;
        const { reason, cancel_open_pos } = req.body;

        // Verify partner (outside tx — read-only)
        const partner = await db.get('SELECT id, name, status FROM partners WHERE id = $1 AND org_id = $2', [
            partnerId,
            orgId,
        ]);
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        if (partner.status === 'offboarded') {
            return res.status(409).json({ error: 'Partner already offboarded' });
        }

        // FIX: Entire cascade is now atomic (single connection, single transaction)
        // Crash at any step → full ROLLBACK → no partial offboard
        const actions = await db.withTransaction(async tx => {
            const steps = [];

            // 1. Deactivate all offerings
            await tx.run(
                "UPDATE supplier_offerings SET status = 'discontinued', updated_at = NOW() WHERE org_id = $1",
                [partnerId]
            );
            steps.push('Discontinued offerings');

            // 2. Close all active offering versions
            await tx.run(
                'UPDATE supplier_offering_versions SET valid_to = NOW() WHERE offering_id IN (SELECT id FROM supplier_offerings WHERE org_id = $1) AND valid_to IS NULL',
                [partnerId]
            );
            steps.push('Closed all active offering versions');

            // 3. Cancel pending POs (optional)
            if (cancel_open_pos) {
                await tx.run(
                    "UPDATE purchase_orders SET status = 'cancelled', updated_at = NOW() WHERE (supplier = $1 OR supplier_org_id = $1) AND org_id = $2 AND status IN ('pending_approval','approved','in_progress')",
                    [partnerId, orgId]
                );
                steps.push('Cancelled open POs');
            }

            // 4. Deactivate product mappings
            await tx.run(
                'UPDATE product_mappings SET is_active = false, superseded_at = NOW() WHERE org_id = $1 AND is_active = true',
                [partnerId]
            );
            steps.push('Deactivated product mappings');

            // 5. Revoke network invitations
            await tx.run(
                "UPDATE supplier_invitations SET status = 'revoked', updated_at = NOW() WHERE (accepted_org_id = $1 OR org_id = $1) AND status = 'accepted'",
                [partnerId]
            );
            steps.push('Revoked invitations');

            // 6. Crypto-shredding: delete encryption key
            const keyRow = await tx.get(
                'SELECT encryption_key FROM supplier_encryption_keys WHERE org_id = $1 AND status = $2',
                [partnerId, 'active']
            );
            if (keyRow) {
                await tx.run(
                    "UPDATE supplier_encryption_keys SET encryption_key = 'SHREDDED', status = 'shredded', shredded_at = NOW(), shredded_by = $1 WHERE org_id = $2",
                    [req.user.email || 'system', partnerId]
                );

                // 7. Verify within SAME transaction
                const verifyRow = await tx.get(
                    'SELECT encryption_key, status FROM supplier_encryption_keys WHERE org_id = $1',
                    [partnerId]
                );
                const shredVerified = verifyRow?.status === 'shredded' && verifyRow?.encryption_key === 'SHREDDED';
                if (!shredVerified) {
                    throw new Error('CRYPTO_SHRED_VERIFY_FAILED: key not properly shredded');
                }
                steps.push('Crypto-shred: VERIFIED');
            } else {
                steps.push('No encryption key found (skipped crypto-shred)');
            }

            // 8. Set partner status
            await tx.run(
                "UPDATE partners SET status = 'offboarded', trust_state = 'banned', trust_state_reason = $1, trust_state_changed_at = NOW(), updated_at = NOW() WHERE id = $2 AND org_id = $3",
                [reason || 'Offboarded', partnerId, orgId]
            );
            steps.push('Partner status → offboarded, trust_state → banned');

            return steps;
        });

        // Audit trail (outside tx — best-effort, not critical for atomicity)
        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'SUPPLIER_OFFBOARDED',
            entity_type: 'partner',
            entity_id: partnerId,
            details: {
                partner_name: partner.name,
                reason: reason || 'Not specified',
                actions,
                offboarded_by: req.user.email,
            },
            ip: req.ip || '',
        });

        res.json({
            message: `${partner.name} offboarded successfully`,
            partner_id: partnerId,
            actions,
        });
    } catch (err) {
        logger.error('[trust-engine] offboard error:', err.message);
        res.status(500).json({ error: 'Failed to offboard supplier' });
    }
});

module.exports = router;
