const { safeError } = require('../utils/safe-error');
/**
 * Multi-Stakeholder Trust Routes
 * Community ratings, certifications, and regulatory compliance
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

router.use(authMiddleware);

// ─── GET /dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
    try {
        const totalRatings = await db.get('SELECT COUNT(*) as count FROM ratings') || { count: 0 };
        const avgRating = await db.get('SELECT COALESCE(AVG(score), 0) as avg FROM ratings') || { avg: 0 };
        const totalCerts = await db.get('SELECT COUNT(*) as count FROM certifications') || { count: 0 };
        const activeCerts = await db.get("SELECT COUNT(*) as count FROM certifications WHERE status = 'active'") || { count: 0 };
        const expiredCerts = await db.get("SELECT COUNT(*) as count FROM certifications WHERE status = 'expired'") || { count: 0 };
        const totalCompliance = await db.get('SELECT COUNT(*) as count FROM compliance_records') || { count: 0 };
        const compliant = await db.get("SELECT COUNT(*) as count FROM compliance_records WHERE status = 'compliant'") || { count: 0 };
        const nonCompliant = await db.get("SELECT COUNT(*) as count FROM compliance_records WHERE status = 'non_compliant'") || { count: 0 };

        // Rating distribution
        const dist = await db.all('SELECT score, COUNT(*) as count FROM ratings GROUP BY score ORDER BY score');
        const distribution = {};
        for (let i = 1; i <= 5; i++) {
            const found = dist.find(d => d.score === i);
            distribution[i] = found ? found.count : 0;
        }

        // Top-rated entities
        const topRated = await db.all(`
      SELECT entity_type, entity_id, AVG(score) as avg_score, COUNT(*) as num_ratings
      FROM ratings GROUP BY entity_type, entity_id
      HAVING num_ratings >= 2
      ORDER BY avg_score DESC LIMIT 5
    `);

        res.json({
            ratings: { total: totalRatings.count, average: Math.round(avgRating.avg * 10) / 10, distribution },
            certifications: { total: totalCerts.count, active: activeCerts.count, expired: expiredCerts.count },
            compliance: {
                total: totalCompliance.count,
                compliant: compliant.count,
                non_compliant: nonCompliant.count,
                rate: totalCompliance.count > 0 ? Math.round((compliant.count / totalCompliance.count) * 100) : 100
            },
            top_rated: topRated
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── RATINGS ────────────────────────────────────────────────
router.post('/ratings', async (req, res) => {
    try {
        const { entity_type, entity_id, score, comment } = req.body;
        if (!entity_type || !entity_id || !score) return res.status(400).json({ error: 'entity_type, entity_id, score required' });
        if (score < 1 || score > 5) return res.status(400).json({ error: 'Score must be 1-5' });

        // Check for existing rating by same user
        const existing = await db.get(
            'SELECT id FROM ratings WHERE entity_type = ? AND entity_id = ? AND user_id = ?',
            [entity_type, entity_id, req.user.id]
        );

        if (existing) {
            await db.prepare('UPDATE ratings SET score = ?, comment = ? WHERE id = ?')
                .run(score, comment || '', existing.id);
            return res.json({ updated: true, rating_id: existing.id });
        }

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO ratings (id, entity_type, entity_id, user_id, score, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, entity_type, entity_id, req.user.id, score, comment || '');

        res.json({ rating_id: id });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

router.get('/ratings/:entity_type/:entity_id', async (req, res) => {
    try {
        const ratings = await db.all(`
      SELECT r.*, u.username as reviewer
      FROM ratings r LEFT JOIN users u ON r.user_id = u.id
      WHERE r.entity_type = ? AND r.entity_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.entity_type, req.params.entity_id]);

        const avg = await db.get(
            'SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE entity_type = ? AND entity_id = ?',
            [req.params.entity_type, req.params.entity_id]
        );

        res.json({
            ratings,
            average: Math.round((avg?.avg || 0) * 10) / 10,
            total: avg?.count || 0
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── CERTIFICATIONS ─────────────────────────────────────────
router.post('/certifications', requirePermission('stakeholder:manage'), async (req, res) => {
    try {
        const { entity_type, entity_id, cert_name, cert_body, cert_number, issued_date, expiry_date } = req.body;
        if (!entity_id || !cert_name) return res.status(400).json({ error: 'entity_id and cert_name required' });

        const id = uuidv4();
        const docHash = require('crypto').createHash('sha256')
            .update(`${cert_name}|${cert_number}|${entity_id}`).digest('hex').substring(0, 16);

        await db.prepare(`
      INSERT INTO certifications (id, entity_type, entity_id, cert_name, cert_body, cert_number,
        issued_date, expiry_date, document_hash, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, entity_type || 'product', entity_id, cert_name, cert_body || '', cert_number || '',
            issued_date || new Date().toISOString().split('T')[0], expiry_date || '', docHash, req.user.id);

        res.json({ certification_id: id, document_hash: docHash });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

router.get('/certifications', async (req, res) => {
    try {
        const { entity_type, entity_id } = req.query;
        let sql = 'SELECT * FROM certifications';
        const params = [];

        if (entity_type && entity_id) {
            sql += ' WHERE entity_type = ? AND entity_id = ?';
            params.push(entity_type, entity_id);
        }
        sql += ' ORDER BY created_at DESC';

        res.json({ certifications: await db.all(sql, params) });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── COMPLIANCE ─────────────────────────────────────────────
router.post('/compliance', requireRole('manager'), async (req, res) => {
    try {
        const { entity_type, entity_id, framework, requirement, status, evidence, next_review } = req.body;
        if (!entity_id || !framework) return res.status(400).json({ error: 'entity_id and framework required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO compliance_records (id, entity_type, entity_id, framework, requirement, status, evidence, checked_by, next_review)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, entity_type || 'product', entity_id, framework, requirement || '',
            status || 'compliant', evidence || '', req.user.id, next_review || '');

        res.json({ record_id: id });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

router.get('/compliance', async (req, res) => {
    try {
        const { entity_type, entity_id } = req.query;
        let sql = 'SELECT * FROM compliance_records';
        const params = [];

        if (entity_type && entity_id) {
            sql += ' WHERE entity_type = ? AND entity_id = ?';
            params.push(entity_type, entity_id);
        }
        sql += ' ORDER BY created_at DESC';

        res.json({ records: await db.all(sql, params) });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── DISPUTES ───────────────────────────────────────────────
router.post('/disputes', async (req, res) => {
    try {
        const { entity_type, entity_id, reason, description } = req.body;
        if (!entity_type || !entity_id || !reason) return res.status(400).json({ error: 'entity_type, entity_id, reason required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'DISPUTE_OPENED', ?, ?, ?)
    `).run(id, req.user.id, entity_type, entity_id, JSON.stringify({ reason, description: description || '', status: 'open' }));

        res.json({ dispute_id: id, status: 'open', message: 'Dispute filed successfully' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

router.get('/disputes', async (req, res) => {
    try {
        const { status } = req.query;
        let sql = `SELECT * FROM audit_log WHERE action LIKE 'DISPUTE%'`;
        if (status) {
            sql += ` AND details LIKE '%"status":"${status}"%'`;
        }
        sql += ' ORDER BY created_at DESC';
        const disputes = await db.all(sql);

        const parsed = disputes.map(d => {
            const details = JSON.parse(d.details || '{}');
            return { id: d.id, entity_type: d.entity_type, entity_id: d.entity_id, actor_id: d.actor_id, action: d.action, ...details, created_at: d.created_at };
        });

        res.json({ disputes: parsed, total: parsed.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

router.put('/disputes/:id/resolve', requireRole('manager'), async (req, res) => {
    try {
        const { resolution, outcome } = req.body;
        const dispute = await db.get(`SELECT * FROM audit_log WHERE id = ? AND action = 'DISPUTE_OPENED'`, [req.params.id]);
        if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

        const existing = JSON.parse(dispute.details || '{}');
        existing.status = 'resolved';
        existing.resolution = resolution || '';
        existing.outcome = outcome || 'upheld';
        existing.resolved_by = req.user.id;
        existing.resolved_at = new Date().toISOString();

        await db.prepare('UPDATE audit_log SET details = ? WHERE id = ?').run(JSON.stringify(existing), req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'DISPUTE_RESOLVED', dispute.entity_type, dispute.entity_id,
                JSON.stringify({ original_dispute: req.params.id, resolution, outcome: outcome || 'upheld' }));

        res.json({ dispute_id: req.params.id, status: 'resolved', outcome: outcome || 'upheld' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── REPUTATION HISTORY ─────────────────────────────────────
router.get('/reputation/:entity_type/:entity_id', async (req, res) => {
    try {
        const { entity_type, entity_id } = req.params;

        const ratings = await db.all(`
      SELECT score, comment, created_at, u.username as reviewer
      FROM ratings r LEFT JOIN users u ON r.user_id = u.id
      WHERE r.entity_type = ? AND r.entity_id = ?
      ORDER BY r.created_at ASC
    `, [entity_type, entity_id]);

        const certs = await db.all(`
      SELECT cert_name, cert_body, status, issued_date, expiry_date, created_at
      FROM certifications WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at ASC
    `, [entity_type, entity_id]);

        const compliance = await db.all(`
      SELECT framework, status, created_at, next_review
      FROM compliance_records WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at ASC
    `, [entity_type, entity_id]);

        // Build running average over time
        let runningSum = 0;
        const ratingTimeline = ratings.map((r, i) => {
            runningSum += r.score;
            return { date: r.created_at, score: r.score, running_avg: Math.round((runningSum / (i + 1)) * 10) / 10, reviewer: r.reviewer };
        });

        const currentAvg = ratings.length > 0 ? runningSum / ratings.length : 0;

        res.json({
            entity: { type: entity_type, id: entity_id },
            current_score: Math.round(currentAvg * 10) / 10,
            total_ratings: ratings.length,
            rating_timeline: ratingTimeline,
            certifications: certs,
            compliance_records: compliance
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── CERTIFICATION VERIFICATION ─────────────────────────────
router.post('/certifications/:id/verify', async (req, res) => {
    try {
        const cert = await db.get('SELECT * FROM certifications WHERE id = ?', [req.params.id]);
        if (!cert) return res.status(404).json({ error: 'Certification not found' });

        const expectedHash = require('crypto').createHash('sha256')
            .update(`${cert.cert_name}|${cert.cert_number}|${cert.entity_id}`).digest('hex').substring(0, 16);

        const hashMatch = cert.document_hash === expectedHash;
        const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date();
        const isValid = hashMatch && !isExpired && cert.status === 'active';

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'CERT_VERIFIED', 'certification', cert.id,
                JSON.stringify({ hash_match: hashMatch, expired: isExpired, valid: isValid }));

        res.json({
            certification_id: cert.id,
            cert_name: cert.cert_name,
            verified: isValid,
            hash_match: hashMatch,
            expired: isExpired,
            status: cert.status,
            verification_timestamp: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── COMPLIANCE ALERTS ──────────────────────────────────────
router.get('/compliance/alerts', async (req, res) => {
    try {
        // Expiring within 30 days
        const expiringSoon = await db.all(`
      SELECT * FROM compliance_records
      WHERE next_review != '' AND next_review <= date('now', '+30 days') AND status = 'compliant'
      ORDER BY next_review ASC
    `);

        // Overdue reviews
        const overdue = await db.all(`
      SELECT * FROM compliance_records
      WHERE next_review != '' AND next_review < date('now') AND status = 'compliant'
      ORDER BY next_review ASC
    `);

        // Non-compliant items
        const nonCompliant = await db.all(`
      SELECT * FROM compliance_records WHERE status = 'non_compliant'
      ORDER BY created_at DESC
    `);

        // Expired certifications
        const expiredCerts = await db.all(`
      SELECT * FROM certifications
      WHERE expiry_date != '' AND expiry_date < date('now') AND status = 'active'
    `);

        // Auto-update expired certs
        if (expiredCerts.length > 0) {
            for (const c of expiredCerts) {
                await db.prepare("UPDATE certifications SET status = 'expired' WHERE id = ?").run(c.id);
            }
        }

        res.json({
            expiring_soon: expiringSoon,
            overdue_reviews: overdue,
            non_compliant: nonCompliant,
            expired_certifications: expiredCerts,
            total_alerts: expiringSoon.length + overdue.length + nonCompliant.length + expiredCerts.length
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

module.exports = router;

