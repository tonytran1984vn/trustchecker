/**
 * SCM Code Governance Hardening API
 * Entropy enforcement, rate-limited generation, central registry
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// ENTROPY ENFORCEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Calculate Shannon entropy of a string
 */
function shannonEntropy(str) {
    const freq = {};
    for (const c of str) freq[c] = (freq[c] || 0) + 1;
    const len = str.length;
    let entropy = 0;
    for (const c in freq) {
        const p = freq[c] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

// ─── GET /api/scm/code-gov/entropy-config – Get entropy requirements ────────
router.get('/entropy-config', authMiddleware, async (req, res) => {
    try {
        const config = await db.prepare(`
            SELECT * FROM system_settings WHERE category = 'code_governance'
        `).all();

        const defaults = {
            min_entropy_bits: 4.0,
            min_code_length: 12,
            max_code_length: 32,
            allowed_charsets: 'alphanumeric_upper',
            check_digit_algorithm: 'HMAC-SHA256',
            require_prefix: true,
            prefix_format: '{TENANT}-{YEAR}-'
        };

        const merged = { ...defaults };
        for (const s of config) {
            merged[s.setting_key] = s.setting_value;
        }
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch entropy config' });
    }
});

// ─── POST /api/scm/code-gov/entropy-check – Validate code entropy ──────────
router.post('/entropy-check', authMiddleware, async (req, res) => {
    try {
        const { code, min_entropy } = req.body;
        if (!code) return res.status(400).json({ error: 'code required' });

        const entropy = shannonEntropy(code);
        const minRequired = parseFloat(min_entropy) || 4.0;
        const passed = entropy >= minRequired;

        res.json({
            code_length: code.length,
            entropy_bits: parseFloat(entropy.toFixed(3)),
            min_required: minRequired,
            passed,
            recommendation: passed ? 'Code meets entropy requirements' :
                `Entropy too low (${entropy.toFixed(2)} < ${minRequired}). Use more varied characters or increase length.`
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check entropy' });
    }
});

// ─── POST /api/scm/code-gov/bulk-entropy-check – Check batch of codes ───────
router.post('/bulk-entropy-check', authMiddleware, async (req, res) => {
    try {
        const { codes, min_entropy } = req.body;
        if (!codes || !Array.isArray(codes)) return res.status(400).json({ error: 'codes array required' });

        const minRequired = parseFloat(min_entropy) || 4.0;
        const results = codes.map(code => {
            const entropy = shannonEntropy(code);
            return { code: code.substring(0, 8) + '***', entropy: parseFloat(entropy.toFixed(3)), passed: entropy >= minRequired };
        });
        const passRate = results.filter(r => r.passed).length / results.length;

        res.json({
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            pass_rate: (passRate * 100).toFixed(1) + '%',
            min_required: minRequired,
            results: results.slice(0, 50) // cap display
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check bulk entropy' });
    }
});

// ═══════════════════════════════════════════════════════════
// RATE-LIMITED GENERATION
// ═══════════════════════════════════════════════════════════

// ─── GET /api/scm/code-gov/generation-limits – Per-tenant generation limits ─
router.get('/generation-limits', authMiddleware, async (req, res) => {
    try {
        const limits = await db.prepare('SELECT * FROM generation_limits ORDER BY created_at DESC').all();
        res.json(limits);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch limits' });
    }
});

// ─── POST /api/scm/code-gov/generation-limits – Set tenant limit ────────────
router.post('/generation-limits', authMiddleware, requirePermission('settings:update'), async (req, res) => {
    try {
        const { tenant_id, max_per_hour, max_per_day, max_per_month, max_batch_size } = req.body;
        const id = uuidv4();

        // Check if limit already exists for tenant
        const existing = await db.prepare('SELECT id FROM generation_limits WHERE tenant_id = ?').get(tenant_id);
        if (existing) {
            await db.prepare(`
                UPDATE generation_limits SET max_per_hour = ?, max_per_day = ?, max_per_month = ?, max_batch_size = ?, updated_at = datetime('now')
                WHERE tenant_id = ?
            `).run(max_per_hour || 1000, max_per_day || 10000, max_per_month || 100000, max_batch_size || 5000, tenant_id);
            return res.json({ id: existing.id, tenant_id, status: 'updated' });
        }

        await db.prepare(`
            INSERT INTO generation_limits (id, tenant_id, max_per_hour, max_per_day, max_per_month, max_batch_size, current_hour, current_day, current_month, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, datetime('now'), datetime('now'))
        `).run(id, tenant_id, max_per_hour || 1000, max_per_day || 10000, max_per_month || 100000, max_batch_size || 5000);

        res.status(201).json({ id, tenant_id, status: 'created' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to set generation limit' });
    }
});

// ─── POST /api/scm/code-gov/generation-check – Check if generation allowed ─
router.post('/generation-check', authMiddleware, async (req, res) => {
    try {
        const { tenant_id, requested_count } = req.body;
        const limit = await db.prepare('SELECT * FROM generation_limits WHERE tenant_id = ?').get(tenant_id);
        if (!limit) return res.json({ allowed: true, message: 'No limit configured for this tenant' });

        const count = parseInt(requested_count) || 1;
        const hourOk = (limit.current_hour + count) <= limit.max_per_hour;
        const dayOk = (limit.current_day + count) <= limit.max_per_day;
        const monthOk = (limit.current_month + count) <= limit.max_per_month;
        const batchOk = count <= limit.max_batch_size;
        const allowed = hourOk && dayOk && monthOk && batchOk;

        res.json({
            allowed,
            requested: count,
            limits: {
                hour: { current: limit.current_hour, max: limit.max_per_hour, ok: hourOk },
                day: { current: limit.current_day, max: limit.max_per_day, ok: dayOk },
                month: { current: limit.current_month, max: limit.max_per_month, ok: monthOk },
                batch: { max: limit.max_batch_size, ok: batchOk }
            },
            blocked_reason: !allowed ? (!batchOk ? 'Batch size exceeds limit' : !hourOk ? 'Hourly limit reached' : !dayOk ? 'Daily limit reached' : 'Monthly limit reached') : null
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check generation limit' });
    }
});

// ═══════════════════════════════════════════════════════════
// CENTRAL REGISTRY (Cross-Tenant Collision Prevention)
// ═══════════════════════════════════════════════════════════

// ─── GET /api/scm/code-gov/registry/stats – Registry statistics ─────────────
router.get('/registry/stats', authMiddleware, async (req, res) => {
    try {
        const total = (await db.prepare('SELECT COUNT(*) as c FROM code_registry').get())?.c || 0;
        const byTenant = await db.prepare('SELECT tenant_id, COUNT(*) as count FROM code_registry GROUP BY tenant_id').all();
        const collisions = (await db.prepare('SELECT COUNT(*) as c FROM code_registry WHERE collision_detected = 1').get())?.c || 0;

        res.json({
            total_codes_registered: total,
            collisions_detected: collisions,
            collision_rate: total > 0 ? ((collisions / total) * 100).toFixed(4) + '%' : '0%',
            by_tenant: byTenant
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch registry stats' });
    }
});

// ─── POST /api/scm/code-gov/registry/check – Check for collision ────────────
router.post('/registry/check', authMiddleware, async (req, res) => {
    try {
        const { code, tenant_id } = req.body;
        if (!code) return res.status(400).json({ error: 'code required' });

        // Generate HMAC hash for cross-tenant comparison
        const hmacHash = crypto.createHmac('sha256', 'trustchecker-registry-salt').update(code).digest('hex');

        // Check cross-tenant collision
        const existing = await db.prepare('SELECT tenant_id, created_at FROM code_registry WHERE hmac_hash = ?').get(hmacHash);

        if (existing) {
            const sameTenant = existing.tenant_id === tenant_id;
            return res.json({
                collision: true,
                same_tenant: sameTenant,
                existing_tenant: sameTenant ? tenant_id : '[REDACTED]',
                registered_at: existing.created_at,
                action: sameTenant ? 'Duplicate within tenant — reject' : 'Cross-tenant collision — reject and alert Super Admin'
            });
        }

        res.json({ collision: false, hmac_hash: hmacHash.substring(0, 16) + '...', message: 'Code is unique across all tenants' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check collision' });
    }
});

// ─── POST /api/scm/code-gov/registry/register – Register codes in bulk ──────
router.post('/registry/register', authMiddleware, async (req, res) => {
    try {
        const { codes, tenant_id } = req.body;
        if (!codes || !Array.isArray(codes)) return res.status(400).json({ error: 'codes array required' });
        if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

        let registered = 0;
        let collisions = 0;

        for (const code of codes) {
            const hmacHash = crypto.createHmac('sha256', 'trustchecker-registry-salt').update(code).digest('hex');
            const existing = await db.prepare('SELECT id FROM code_registry WHERE hmac_hash = ?').get(hmacHash);

            if (existing) {
                collisions++;
                await db.prepare('UPDATE code_registry SET collision_detected = 1 WHERE id = ?').run(existing.id);
            } else {
                const id = uuidv4();
                await db.prepare(`
                    INSERT INTO code_registry (id, tenant_id, hmac_hash, code_prefix, collision_detected, created_at)
                    VALUES (?, ?, ?, ?, 0, datetime('now'))
                `).run(id, tenant_id, hmacHash, code.substring(0, 6));
                registered++;
            }
        }

        // Update generation counters
        await db.prepare(`
            UPDATE generation_limits SET current_hour = current_hour + ?, current_day = current_day + ?, current_month = current_month + ?, updated_at = datetime('now')
            WHERE tenant_id = ?
        `).run(registered, registered, registered, tenant_id);

        res.status(201).json({
            submitted: codes.length,
            registered,
            collisions,
            collision_rate: codes.length > 0 ? ((collisions / codes.length) * 100).toFixed(2) + '%' : '0%'
        });
    } catch (err) {
        console.error('Register codes error:', err);
        res.status(500).json({ error: 'Failed to register codes' });
    }
});

module.exports = router;
