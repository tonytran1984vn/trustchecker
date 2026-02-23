const { safeError } = require('../utils/safe-error');
/**
 * KYC-Business Routes
 * Business verification, sanction screening, GDPR compliance
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const crypto = require('crypto');

// All KYC routes require auth
router.use(authMiddleware);

// ─── GET /stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const total = await db.get('SELECT COUNT(*) as count FROM kyc_businesses') || { count: 0 };
        const verified = await db.get("SELECT COUNT(*) as count FROM kyc_businesses WHERE verification_status = 'verified'") || { count: 0 };
        const pending = await db.get("SELECT COUNT(*) as count FROM kyc_businesses WHERE verification_status = 'pending'") || { count: 0 };
        const rejected = await db.get("SELECT COUNT(*) as count FROM kyc_businesses WHERE verification_status = 'rejected'") || { count: 0 };
        const highRisk = await db.get("SELECT COUNT(*) as count FROM kyc_businesses WHERE risk_level = 'high' OR risk_level = 'critical'") || { count: 0 };
        const sanctionHits = await db.get("SELECT COUNT(*) as count FROM sanction_hits WHERE status = 'pending_review'") || { count: 0 };
        const checks = await db.get('SELECT COUNT(*) as count FROM kyc_checks') || { count: 0 };

        res.json({
            total_businesses: total.count,
            verified: verified.count,
            pending: pending.count,
            rejected: rejected.count,
            high_risk: highRisk.count,
            pending_sanctions: sanctionHits.count,
            total_checks: checks.count,
            verification_rate: total.count > 0 ? Math.round((verified.count / total.count) * 100) : 0
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /businesses ────────────────────────────────────────
router.get('/businesses', async (req, res) => {
    try {
        const businesses = await db.all(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM kyc_checks WHERE business_id = b.id) as check_count,
        (SELECT COUNT(*) FROM sanction_hits WHERE business_id = b.id AND status = 'pending_review') as pending_sanctions
      FROM kyc_businesses b
      ORDER BY b.created_at DESC
    `);
        res.json({ businesses });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /businesses/:id ────────────────────────────────────
router.get('/businesses/:id', async (req, res) => {
    try {
        const biz = await db.get('SELECT * FROM kyc_businesses WHERE id = ?', [req.params.id]);
        if (!biz) return res.status(404).json({ error: 'Business not found' });

        const checks = await db.all('SELECT * FROM kyc_checks WHERE business_id = ? ORDER BY created_at DESC', [req.params.id]);
        const sanctions = await db.all('SELECT * FROM sanction_hits WHERE business_id = ? ORDER BY created_at DESC', [req.params.id]);

        res.json({ business: biz, checks, sanctions });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /verify ───────────────────────────────────────────
router.post('/verify', requirePermission('kyc:create'), async (req, res) => {
    try {
        const { name, registration_number, country, address, industry, contact_email, contact_phone } = req.body;
        if (!name) return res.status(400).json({ error: 'Business name required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO kyc_businesses (id, name, registration_number, country, address, industry, contact_email, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, registration_number || null, country || '', address || '', industry || '', contact_email || '', contact_phone || '');

        // Auto-run registry check
        const checkId = uuidv4();
        const regScore = Math.random() * 40 + 60; // 60-100
        await db.prepare(`
      INSERT INTO kyc_checks (id, business_id, check_type, provider, status, result, score, checked_by)
      VALUES (?, ?, 'registry', 'gov_registry_api', 'completed', ?, ?, ?)
    `).run(checkId, id, JSON.stringify({
            registry_found: regScore > 70,
            company_age_years: Math.floor(Math.random() * 20) + 1,
            active_status: regScore > 65
        }), regScore, req.user.id);

        // Auto-run identity check
        const idCheckId = uuidv4();
        const idScore = Math.random() * 30 + 70;
        await db.prepare(`
      INSERT INTO kyc_checks (id, business_id, check_type, provider, status, result, score, checked_by)
      VALUES (?, ?, 'identity', 'veriff_sim', 'completed', ?, ?, ?)
    `).run(idCheckId, id, JSON.stringify({
            document_verified: idScore > 80,
            face_match: idScore > 75,
            liveness_check: true
        }), idScore, req.user.id);

        // Set risk level based on scores
        const avgScore = (regScore + idScore) / 2;
        const risk = avgScore > 85 ? 'low' : avgScore > 70 ? 'medium' : 'high';
        await db.prepare('UPDATE kyc_businesses SET risk_level = ? WHERE id = ?').run(risk, id);

        res.json({
            business_id: id,
            checks_performed: 2,
            risk_level: risk,
            avg_score: Math.round(avgScore)
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /businesses/submit — User submits business for verification ───────
router.post('/businesses/submit', async (req, res) => {
    try {
        const { name, registration_number, country, address, industry, contact_email, contact_phone } = req.body;
        if (!name) return res.status(400).json({ error: 'Tên doanh nghiệp là bắt buộc' });

        const id = uuidv4();
        await db.prepare(`
          INSERT INTO kyc_businesses (id, name, registration_number, country, address, industry, contact_email, contact_phone, org_id, submitted_by, verification_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(id, name, registration_number || '', country || '', address || '', industry || '', contact_email || '', contact_phone || '', req.user.orgId || null, req.user.id);

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'KYC_BUSINESS_SUBMITTED', 'kyc_business', id, JSON.stringify({ name, country }));

        res.status(201).json({
            business_id: id,
            status: 'pending',
            message: 'Thông tin doanh nghiệp đã được gửi. Vui lòng chờ duyệt.',
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /sanction-check ───────────────────────────────────
router.post('/sanction-check', requirePermission('kyc:verify'), async (req, res) => {
    try {
        const { business_id } = req.body;
        if (!business_id) return res.status(400).json({ error: 'business_id required' });

        const biz = await db.get('SELECT * FROM kyc_businesses WHERE id = ?', [business_id]);
        if (!biz) return res.status(404).json({ error: 'Business not found' });

        // Simulate sanction list scanning
        const lists = ['OFAC SDN', 'EU Consolidated', 'UN Security Council', 'UK HMT'];
        const hits = [];

        for (const list of lists) {
            // 10% chance of a hit per list
            if (Math.random() < 0.1) {
                const hitId = uuidv4();
                const matchScore = Math.random() * 40 + 60;
                await db.prepare(`
          INSERT INTO sanction_hits (id, business_id, list_name, match_score, matched_entity, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(hitId, business_id, list, matchScore,
                    `${biz.name} (partial match)`,
                    JSON.stringify({ list, score: matchScore, reason: 'Name similarity' })
                );
                hits.push({ id: hitId, list, score: matchScore });
            }
        }

        // Add sanction check record
        const checkId = uuidv4();
        await db.prepare(`
      INSERT INTO kyc_checks (id, business_id, check_type, provider, status, result, score, checked_by)
      VALUES (?, ?, 'sanctions', 'multi_list_scan', 'completed', ?, ?, ?)
    `).run(checkId, business_id, JSON.stringify({ lists_checked: lists, hits: hits.length }), hits.length > 0 ? 30 : 100, req.user.id);

        if (hits.length > 0) {
            await db.prepare("UPDATE kyc_businesses SET risk_level = 'critical' WHERE id = ?").run(business_id);
        }

        res.json({ business_id, lists_checked: lists.length, hits, clean: hits.length === 0 });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /businesses/:id/approve — Approve by super_admin or delegated approver ──
router.post('/businesses/:id/approve', async (req, res) => {
    try {
        // Check: must be super_admin or designated approver
        const canApprove = await checkApproverPermission(req.user);
        if (!canApprove) {
            return res.status(403).json({ error: 'Không có quyền duyệt KYC. Liên hệ super admin.' });
        }

        const biz = await db.get('SELECT * FROM kyc_businesses WHERE id = ?', [req.params.id]);
        if (!biz) return res.status(404).json({ error: 'Business not found' });

        await db.prepare(`
          UPDATE kyc_businesses SET verification_status = 'verified', verified_at = datetime('now'), verified_by = ? WHERE id = ?
        `).run(req.user.id, req.params.id);

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'KYC_BUSINESS_APPROVED', 'kyc_business', req.params.id,
                JSON.stringify({ business_name: biz.name, approved_by: req.user.username }));

        res.json({ status: 'verified', business_id: req.params.id });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /businesses/:id/reject — Reject by super_admin or delegated approver ──
router.post('/businesses/:id/reject', async (req, res) => {
    try {
        const canApprove = await checkApproverPermission(req.user);
        if (!canApprove) {
            return res.status(403).json({ error: 'Không có quyền từ chối KYC. Liên hệ super admin.' });
        }

        const { reason } = req.body;
        await db.prepare(`
          UPDATE kyc_businesses SET verification_status = 'rejected', verified_at = datetime('now'), verified_by = ?, notes = ? WHERE id = ?
        `).run(req.user.id, reason || '', req.params.id);

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'KYC_BUSINESS_REJECTED', 'kyc_business', req.params.id,
                JSON.stringify({ reason: reason || 'No reason provided' }));

        res.json({ status: 'rejected', business_id: req.params.id });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GDPR: Export User Data ─────────────────────────────────
router.get('/gdpr/export/:userId', requireRole('operator'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const userData = {
            user: await db.get('SELECT id, username, email, role, company, created_at FROM users WHERE id = ?', [userId]),
            sessions: await db.all('SELECT id, ip_address, created_at, last_active FROM sessions WHERE user_id = ?', [userId]),
            scan_events: await db.all('SELECT id, scan_type, scanned_at FROM scan_events WHERE org_id IN (SELECT org_id FROM users WHERE id = ?) LIMIT 100', [userId]),
            audit_logs: await db.all('SELECT * FROM audit_log WHERE actor_id = ?', [userId]),
        };
        res.json({ exported_at: new Date().toISOString(), data: userData });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GDPR: Delete User Data ────────────────────────────────
router.delete('/gdpr/delete/:userId', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.userId;
        if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete own data' });

        await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
        await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
        await db.prepare('DELETE FROM audit_log WHERE actor_id = ?').run(userId);
        await db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        res.json({ deleted: true, user_id: userId });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /verify-document — Simulated document OCR verification ─────────
router.post('/verify-document', requireRole('operator'), async (req, res) => {
    try {
        const { business_id, document_type, document_number } = req.body;
        if (!business_id || !document_type) return res.status(400).json({ error: 'business_id and document_type required' });

        const biz = await db.get('SELECT * FROM kyc_businesses WHERE id = ?', [business_id]);
        if (!biz) return res.status(404).json({ error: 'Business not found' });

        const docTypes = {
            passport: { fields: ['full_name', 'nationality', 'date_of_birth', 'expiry_date', 'mrz_code'], confidenceRange: [0.82, 0.99] },
            national_id: { fields: ['full_name', 'id_number', 'date_of_birth', 'address'], confidenceRange: [0.80, 0.98] },
            drivers_license: { fields: ['full_name', 'license_number', 'issue_date', 'expiry_date', 'vehicle_class'], confidenceRange: [0.78, 0.97] },
            business_license: { fields: ['company_name', 'registration_number', 'issue_date', 'authority', 'address'], confidenceRange: [0.85, 0.99] },
            tax_certificate: { fields: ['company_name', 'tax_id', 'jurisdiction', 'fiscal_year'], confidenceRange: [0.88, 0.99] }
        };

        const docConfig = docTypes[document_type] || docTypes.passport;
        const confidence = docConfig.confidenceRange[0] + Math.random() * (docConfig.confidenceRange[1] - docConfig.confidenceRange[0]);
        const ocrResult = {};
        docConfig.fields.forEach(f => {
            ocrResult[f] = { extracted: `[simulated_${f}]`, confidence: (0.8 + Math.random() * 0.2).toFixed(3) };
        });

        const checkId = uuidv4();
        const docHash = crypto.createHash('sha256').update(`${document_type}|${document_number || ''}|${business_id}|${Date.now()}`).digest('hex');

        await db.prepare(`
      INSERT INTO kyc_checks (id, business_id, check_type, provider, status, result, score, checked_by)
      VALUES (?, ?, ?, 'document_ocr_sim', 'completed', ?, ?, ?)
    `).run(checkId, business_id, `document_${document_type}`,
            JSON.stringify({ document_type, ocr_fields: ocrResult, document_hash: docHash, tamper_check: confidence > 0.9 ? 'pass' : 'review_needed' }),
            Math.round(confidence * 100), req.user.id);

        res.json({
            check_id: checkId,
            document_type,
            overall_confidence: Math.round(confidence * 100) / 100,
            ocr_result: ocrResult,
            document_hash: docHash,
            tamper_check: confidence > 0.9 ? 'pass' : 'review_needed',
            status: 'completed'
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /businesses/:id/risk-report — Detailed risk breakdown ──────────
router.get('/businesses/:id/risk-report', async (req, res) => {
    try {
        const biz = await db.get('SELECT * FROM kyc_businesses WHERE id = ?', [req.params.id]);
        if (!biz) return res.status(404).json({ error: 'Business not found' });

        const checks = await db.all('SELECT * FROM kyc_checks WHERE business_id = ? ORDER BY created_at DESC', [req.params.id]);
        const sanctions = await db.all('SELECT * FROM sanction_hits WHERE business_id = ?', [req.params.id]);

        const avgScore = checks.length > 0 ? checks.reduce((s, c) => s + (c.score || 0), 0) / checks.length : 0;
        const sanctionRisk = sanctions.length > 0 ? 'critical' : 'none';
        const checkTypeScores = {};
        checks.forEach(c => { checkTypeScores[c.check_type] = c.score; });

        const factors = {
            registry_verification: { score: checkTypeScores.registry || 0, weight: 0.25, status: checkTypeScores.registry > 70 ? 'pass' : 'fail' },
            identity_verification: { score: checkTypeScores.identity || 0, weight: 0.25, status: checkTypeScores.identity > 75 ? 'pass' : 'fail' },
            sanctions_screening: { score: sanctionRisk === 'none' ? 100 : 10, weight: 0.30, status: sanctionRisk === 'none' ? 'clear' : 'flagged' },
            business_age: { score: Math.min(100, (Math.floor(Math.random() * 20) + 1) * 5), weight: 0.10, status: 'informational' },
            jurisdiction_risk: { score: ['US', 'GB', 'SG', 'JP'].includes(biz.country) ? 90 : ['CN', 'RU'].includes(biz.country) ? 40 : 70, weight: 0.10, status: 'informational' }
        };

        const compositeScore = Object.values(factors).reduce((s, f) => s + f.score * f.weight, 0);
        const riskLevel = compositeScore > 80 ? 'low' : compositeScore > 60 ? 'medium' : compositeScore > 40 ? 'high' : 'critical';

        res.json({
            business: { id: biz.id, name: biz.name, country: biz.country, industry: biz.industry },
            composite_score: Math.round(compositeScore),
            risk_level: riskLevel,
            factors,
            checks_performed: checks.length,
            sanction_hits: sanctions.length,
            recommendation: compositeScore > 70 ? 'Approve' : compositeScore > 50 ? 'Review manually' : 'Reject — high risk',
            generated_at: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /businesses/:id/audit — KYC audit trail ────────────────────────
router.get('/businesses/:id/audit', async (req, res) => {
    try {
        const biz = await db.get('SELECT * FROM kyc_businesses WHERE id = ?', [req.params.id]);
        if (!biz) return res.status(404).json({ error: 'Business not found' });

        const checks = await db.all(`
      SELECT kc.*, u.username as checker_name
      FROM kyc_checks kc LEFT JOIN users u ON kc.checked_by = u.id
      WHERE kc.business_id = ? ORDER BY kc.created_at ASC
    `, [req.params.id]);

        const sanctions = await db.all('SELECT * FROM sanction_hits WHERE business_id = ? ORDER BY created_at ASC', [req.params.id]);

        const timeline = [
            { event: 'business_registered', timestamp: biz.created_at, details: { name: biz.name, country: biz.country } },
            ...checks.map(c => ({ event: `check_${c.check_type}`, timestamp: c.created_at, details: { provider: c.provider, score: c.score, checker: c.checker_name } })),
            ...sanctions.map(s => ({ event: 'sanction_hit', timestamp: s.created_at, details: { list: s.list_name, score: s.match_score } }))
        ];

        if (biz.verified_at) {
            timeline.push({ event: `verification_${biz.verification_status}`, timestamp: biz.verified_at, details: { by: biz.verified_by } });
        }

        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({ business_id: req.params.id, business_name: biz.name, audit_trail: timeline });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ═════════════════════════════════════════════════════════════════
// KYC APPROVER MANAGEMENT (super_admin only)
// ═════════════════════════════════════════════════════════════════

/**
 * Check if a user has KYC approval permission.
 * Returns true if user is super_admin or is a designated approver.
 */
async function checkApproverPermission(user) {
    if (user.role === 'super_admin') return true;

    try {
        const setting = await db.prepare(
            "SELECT setting_value FROM system_settings WHERE category = 'kyc' AND setting_key = 'approvers'"
        ).get();

        if (!setting) return false;
        const approvers = JSON.parse(setting.setting_value);
        return Array.isArray(approvers) && approvers.includes(user.id);
    } catch {
        return false;
    }
}

// ─── POST /approvers — Designate KYC approver (super_admin only) ────────────
router.post('/approvers', requireSuperAdmin(), async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const user = await db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get current approvers
        const setting = await db.prepare(
            "SELECT setting_value FROM system_settings WHERE category = 'kyc' AND setting_key = 'approvers'"
        ).get();

        let approvers = setting ? JSON.parse(setting.setting_value) : [];
        if (approvers.includes(user_id)) {
            return res.status(409).json({ error: 'User is already a designated approver' });
        }

        approvers.push(user_id);

        if (setting) {
            await db.prepare(
                "UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = datetime('now') WHERE category = 'kyc' AND setting_key = 'approvers'"
            ).run(JSON.stringify(approvers), req.user.id);
        } else {
            await db.prepare(
                "INSERT INTO system_settings (id, category, setting_key, setting_value, updated_by) VALUES (?, 'kyc', 'approvers', ?, ?)"
            ).run(uuidv4(), JSON.stringify(approvers), req.user.id);
        }

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'KYC_APPROVER_ADDED', 'user', user_id,
                JSON.stringify({ username: user.username, email: user.email }));

        res.status(201).json({ message: 'Approver designated', user: { id: user.id, username: user.username, email: user.email } });
    } catch (e) {
        safeError(res, 'Failed to add approver', e);
    }
});

// ─── GET /approvers — List designated approvers (super_admin only) ───────────
router.get('/approvers', requireSuperAdmin(), async (req, res) => {
    try {
        const setting = await db.prepare(
            "SELECT setting_value FROM system_settings WHERE category = 'kyc' AND setting_key = 'approvers'"
        ).get();

        const approverIds = setting ? JSON.parse(setting.setting_value) : [];
        const approvers = [];

        for (const id of approverIds) {
            const user = await db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(id);
            if (user) approvers.push(user);
        }

        res.json({ approvers, total: approvers.length });
    } catch (e) {
        safeError(res, 'Failed to list approvers', e);
    }
});

// ─── DELETE /approvers/:userId — Revoke approver permission (super_admin only) ─
router.delete('/approvers/:userId', requireSuperAdmin(), async (req, res) => {
    try {
        const setting = await db.prepare(
            "SELECT setting_value FROM system_settings WHERE category = 'kyc' AND setting_key = 'approvers'"
        ).get();

        if (!setting) return res.status(404).json({ error: 'No approvers configured' });

        let approvers = JSON.parse(setting.setting_value);
        const idx = approvers.indexOf(req.params.userId);
        if (idx === -1) return res.status(404).json({ error: 'User is not a designated approver' });

        approvers.splice(idx, 1);
        await db.prepare(
            "UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = datetime('now') WHERE category = 'kyc' AND setting_key = 'approvers'"
        ).run(JSON.stringify(approvers), req.user.id);

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'KYC_APPROVER_REMOVED', 'user', req.params.userId, '{}');

        res.json({ message: 'Approver permission revoked', removed_user: req.params.userId });
    } catch (e) {
        safeError(res, 'Failed to remove approver', e);
    }
});

module.exports = router;
