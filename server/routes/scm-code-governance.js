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

// ═══════════════════════════════════════════════════════════
// AUTO-CREATE FORMAT_RULES TABLES
// ═══════════════════════════════════════════════════════════
(async () => {
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS format_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prefix TEXT DEFAULT '',
        pattern TEXT DEFAULT '',
        separator TEXT DEFAULT '-',
        code_length INTEGER DEFAULT 24,
        charset TEXT DEFAULT 'ALPHANUMERIC_UPPER',
        check_digit_algo TEXT DEFAULT 'HMAC-SHA256',
        description TEXT DEFAULT '',
        example TEXT DEFAULT '',
        tenant_id TEXT,
        status TEXT DEFAULT 'active',
        usage_count INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )`);
        await db.run(`CREATE TABLE IF NOT EXISTS format_rules_audit (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes TEXT DEFAULT '{}',
        actor_id TEXT,
        actor_name TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
    )`);
    } catch (e) { console.error('format_rules table init:', e.message); }
})();

// GOV-1: All routes require authentication
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════
// FORMAT RULES — CRUD + TEST + TEMPLATES + AUDIT + STATS
// ═══════════════════════════════════════════════════════════

// ─── GET /api/scm/code-gov/format-rules — List all format rules ─────────────
router.get('/format-rules', async (req, res) => {
    try {
        const rules = await db.all(`
            SELECT fr.*,
                   (SELECT COUNT(*) FROM qr_codes qc WHERE qc.qr_data LIKE fr.prefix || '%') as codes_generated
            FROM format_rules fr
            WHERE fr.status != 'deleted'
            ORDER BY fr.created_at DESC
        `);
        res.json({ rules, total: rules.length });
    } catch (err) {
        console.error('List format rules error:', err);
        res.status(500).json({ error: 'Failed to fetch format rules' });
    }
});

// ─── POST /api/scm/code-gov/format-rules — Create a new format rule ─────────
router.post('/format-rules', async (req, res) => {
    try {
        const { name, prefix, pattern, separator, code_length, charset, check_digit_algo, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Rule name is required' });

        const id = uuidv4();
        const example = generateExample(prefix || '', separator || '-', parseInt(code_length) || 24, charset || 'ALPHANUMERIC_UPPER');

        await db.run(`
            INSERT INTO format_rules (id, name, prefix, pattern, separator, code_length, charset, check_digit_algo, description, example, tenant_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, name, prefix || '', pattern || '', separator || '-', parseInt(code_length) || 24, charset || 'ALPHANUMERIC_UPPER', check_digit_algo || 'HMAC-SHA256', description || '', example, req.user?.orgId || null, req.user?.id || null]);

        // Audit log
        await db.run(`INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name) VALUES (?, ?, 'created', ?, ?, ?)`,
            [uuidv4(), id, JSON.stringify({ name, prefix, pattern, code_length, charset }), req.user?.id || '', req.user?.username || '']);

        const rule = await db.get('SELECT * FROM format_rules WHERE id = ?', [id]);
        res.status(201).json(rule);
    } catch (err) {
        console.error('Create format rule error:', err);
        res.status(500).json({ error: 'Failed to create format rule' });
    }
});

// ─── PUT /api/scm/code-gov/format-rules/:id — Update a format rule ──────────
router.put('/format-rules/:id', async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM format_rules WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Rule not found' });

        const { name, prefix, pattern, separator, code_length, charset, check_digit_algo, description, status } = req.body;
        const changes = {};
        if (name !== undefined && name !== existing.name) changes.name = { from: existing.name, to: name };
        if (prefix !== undefined && prefix !== existing.prefix) changes.prefix = { from: existing.prefix, to: prefix };
        if (pattern !== undefined && pattern !== existing.pattern) changes.pattern = { from: existing.pattern, to: pattern };
        if (status !== undefined && status !== existing.status) changes.status = { from: existing.status, to: status };

        const example = generateExample(prefix || existing.prefix, separator || existing.separator, parseInt(code_length) || existing.code_length, charset || existing.charset);

        await db.run(`
            UPDATE format_rules SET name=?, prefix=?, pattern=?, separator=?, code_length=?, charset=?, check_digit_algo=?, description=?, example=?, status=?, updated_at=datetime('now')
            WHERE id=?
        `, [name || existing.name, prefix ?? existing.prefix, pattern ?? existing.pattern, separator || existing.separator,
        parseInt(code_length) || existing.code_length, charset || existing.charset, check_digit_algo || existing.check_digit_algo,
        description ?? existing.description, example, status || existing.status, req.params.id]);

        // Audit log
        if (Object.keys(changes).length > 0) {
            await db.run(`INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name) VALUES (?, ?, 'updated', ?, ?, ?)`,
                [uuidv4(), req.params.id, JSON.stringify(changes), req.user?.id || '', req.user?.username || '']);
        }

        const updated = await db.get('SELECT * FROM format_rules WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (err) {
        console.error('Update format rule error:', err);
        res.status(500).json({ error: 'Failed to update format rule' });
    }
});

// ─── DELETE /api/scm/code-gov/format-rules/:id — Soft-delete rule ───────────
router.delete('/format-rules/:id', async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM format_rules WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Rule not found' });

        await db.run(`UPDATE format_rules SET status='deleted', updated_at=datetime('now') WHERE id=?`, [req.params.id]);
        await db.run(`INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name) VALUES (?, ?, 'deleted', '{}', ?, ?)`,
            [uuidv4(), req.params.id, req.user?.id || '', req.user?.username || '']);

        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete format rule' });
    }
});

// ─── POST /api/scm/code-gov/format-rules/test — Test a code against rules ───
router.post('/format-rules/test', async (req, res) => {
    try {
        const { code, rule_id } = req.body;
        if (!code) return res.status(400).json({ error: 'code is required' });

        let rules;
        if (rule_id) {
            const rule = await db.get('SELECT * FROM format_rules WHERE id = ?', [rule_id]);
            rules = rule ? [rule] : [];
        } else {
            rules = await db.all("SELECT * FROM format_rules WHERE status = 'active'");
        }

        if (rules.length === 0) {
            // No rules — just check basic entropy
            const entropy = shannonEntropy(code);
            return res.json({
                code, results: [], overall: 'no_rules',
                entropy: { bits: parseFloat(entropy.toFixed(3)), passed: entropy >= 4.0 },
                message: 'No active format rules. Basic entropy check performed.'
            });
        }

        const results = rules.map(rule => {
            const checks = [];
            let passed = true;

            // Prefix check
            if (rule.prefix) {
                const prefixMatch = code.startsWith(rule.prefix);
                checks.push({ name: 'Prefix', expected: rule.prefix, passed: prefixMatch });
                if (!prefixMatch) passed = false;
            }

            // Length check
            if (rule.code_length) {
                const lenOk = code.length >= rule.code_length - 4 && code.length <= rule.code_length + 4;
                checks.push({ name: 'Length', expected: `${rule.code_length} ±4`, actual: code.length, passed: lenOk });
                if (!lenOk) passed = false;
            }

            // Charset check
            if (rule.charset) {
                let charOk = true;
                if (rule.charset === 'ALPHANUMERIC_UPPER') charOk = /^[A-Z0-9\-]+$/.test(code);
                else if (rule.charset === 'NUMERIC') charOk = /^[0-9\-]+$/.test(code);
                else if (rule.charset === 'HEX') charOk = /^[0-9A-F\-]+$/.test(code);
                checks.push({ name: 'Charset', expected: rule.charset, passed: charOk });
                if (!charOk) passed = false;
            }

            // Pattern (regex) check
            if (rule.pattern) {
                try {
                    const patternOk = new RegExp(rule.pattern).test(code);
                    checks.push({ name: 'Pattern', expected: rule.pattern, passed: patternOk });
                    if (!patternOk) passed = false;
                } catch (e) {
                    checks.push({ name: 'Pattern', expected: rule.pattern, passed: false, error: 'Invalid regex' });
                    passed = false;
                }
            }

            // Entropy check
            const entropy = shannonEntropy(code);
            const entropyOk = entropy >= 3.5;
            checks.push({ name: 'Entropy', expected: '≥ 3.5 bits', actual: parseFloat(entropy.toFixed(3)), passed: entropyOk });
            if (!entropyOk) passed = false;

            return { rule_id: rule.id, rule_name: rule.name, passed, checks };
        });

        const overallPassed = results.every(r => r.passed);
        res.json({ code, results, overall: overallPassed ? 'pass' : 'fail' });
    } catch (err) {
        console.error('Test format rule error:', err);
        res.status(500).json({ error: 'Failed to test code' });
    }
});

// ─── GET /api/scm/code-gov/format-rules/templates — Pre-built templates ─────
router.get('/format-rules/templates', async (req, res) => {
    const templates = [
        { name: 'TrustChecker Standard', prefix: 'TK-', separator: '-', code_length: 28, charset: 'ALPHANUMERIC_UPPER', check_digit_algo: 'HMAC-SHA256', pattern: '^TK-[A-Z]+-\\d{4}-\\d{10,}-[A-Z0-9]$', description: 'Default TrustChecker format: TK-{SKU}-{YEAR}-{TIMESTAMP}{RANDOM}-{CHECK}' },
        { name: 'GS1 / EAN-13', prefix: '', separator: '', code_length: 13, charset: 'NUMERIC', check_digit_algo: 'Modulo-10', pattern: '^\\d{13}$', description: 'Standard 13-digit EAN barcode format' },
        { name: 'GS1-128 / SSCC', prefix: '00', separator: '', code_length: 18, charset: 'NUMERIC', check_digit_algo: 'Modulo-10', pattern: '^\\d{18}$', description: 'Serial Shipping Container Code (18 digits)' },
        { name: 'Custom Alphanumeric', prefix: '', separator: '-', code_length: 16, charset: 'ALPHANUMERIC_UPPER', check_digit_algo: 'CRC-32', pattern: '^[A-Z0-9\\-]{12,20}$', description: 'Flexible alphanumeric format with custom length' },
        { name: 'UUID-Based', prefix: '', separator: '-', code_length: 36, charset: 'HEX', check_digit_algo: 'None', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', description: 'UUID v4 format — globally unique, no collision' },
        { name: 'Short Numeric Code', prefix: '', separator: '', code_length: 8, charset: 'NUMERIC', check_digit_algo: 'Luhn', pattern: '^\\d{8}$', description: 'Short 8-digit numeric for retail labels' },
    ];
    res.json({ templates });
});

// ─── GET /api/scm/code-gov/format-rules/audit — Audit history ───────────────
router.get('/format-rules/audit', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const logs = await db.all(`
            SELECT a.*, fr.name as rule_name
            FROM format_rules_audit a
            LEFT JOIN format_rules fr ON fr.id = a.rule_id
            ORDER BY a.created_at DESC
            LIMIT ?
        `, [limit]);
        res.json({ logs, total: logs.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ─── GET /api/scm/code-gov/format-rules/stats — Rule statistics ─────────────
router.get('/format-rules/stats', async (req, res) => {
    try {
        const rules = await db.all("SELECT * FROM format_rules WHERE status != 'deleted'");
        const totalCodes = (await db.get('SELECT COUNT(*) as c FROM qr_codes'))?.c || 0;

        const stats = rules.map(r => ({
            id: r.id,
            name: r.name,
            prefix: r.prefix,
            status: r.status,
            usage_count: r.usage_count || 0,
            created_at: r.created_at,
        }));

        res.json({
            total_rules: rules.length,
            active_rules: rules.filter(r => r.status === 'active').length,
            total_codes: totalCodes,
            rules: stats
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * Generate an example code based on rule params
 */
function generateExample(prefix, separator, length, charset) {
    const chars = charset === 'NUMERIC' ? '0123456789' :
        charset === 'HEX' ? '0123456789ABCDEF' :
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const remaining = Math.max(4, length - prefix.length);
    let code = prefix;
    for (let i = 0; i < remaining; i++) {
        if (i > 0 && i % 4 === 0 && separator) code += separator;
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

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
