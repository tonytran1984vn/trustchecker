/**
 * Evidence Vault Routes
 * Tamper-proof digital evidence with hash anchoring & forensic export
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

// Ensure evidence upload directory exists
const EVIDENCE_DIR = path.join(__dirname, '..', '..', 'data', 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// Multer configuration – store files to disk with UUID names
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, EVIDENCE_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
    fileFilter: (req, file, cb) => {
        // Allowlist of safe file types (Fix: was blocklist of only 5 extensions)
        const allowed = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',  // Images
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',  // Documents
            '.zip', '.gz', '.tar', '.7z',                               // Archives
            '.json', '.xml', '.yaml', '.yml',                           // Data
            '.mp4', '.mp3', '.wav', '.avi', '.mov'                      // Media
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return cb(new Error(`File type '${ext}' not allowed. Allowed: ${allowed.join(', ')}`));
        }
        cb(null, true);
    }
});

router.use(authMiddleware);

// BUG-19 FIX: HTML escape helper to prevent stored XSS in forensic reports
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── GET /stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const total = await db.get('SELECT COUNT(*) as count FROM evidence_items') || { count: 0 };
        const anchored = await db.get("SELECT COUNT(*) as count FROM evidence_items WHERE verification_status = 'anchored'") || { count: 0 };
        const verified = await db.get("SELECT COUNT(*) as count FROM evidence_items WHERE verification_status = 'verified'") || { count: 0 };
        const tampered = await db.get("SELECT COUNT(*) as count FROM evidence_items WHERE verification_status = 'tampered'") || { count: 0 };
        const totalSize = await db.get('SELECT COALESCE(SUM(file_size), 0) as size FROM evidence_items') || { size: 0 };

        res.json({
            total_items: total.count,
            anchored: anchored.count,
            verified: verified.count,
            tampered: tampered.count,
            total_size_mb: Math.round(totalSize.size / (1024 * 1024) * 100) / 100,
            integrity_rate: total.count > 0 ? Math.round(((anchored.count + verified.count) / total.count) * 100) : 100
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET / (list) ───────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const items = await db.all(`
      SELECT id, title, description, file_name, file_type, file_size, sha256_hash,
             blockchain_seal_id, entity_type, entity_id, uploaded_by,
             verification_status, verified_at, created_at
      FROM evidence_items ORDER BY created_at DESC LIMIT 100
    `);
        res.json({ items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// BUG-20 FIX: Routes with static paths MUST be before /:id catch-all
// ─── GET /audit-trail ───────────────────────────────────────
router.get('/audit/trail', async (req, res) => {
    try {
        const logs = await db.all(`
      SELECT a.*, u.username as actor_name
      FROM audit_log a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.entity_type = 'evidence'
      ORDER BY a.timestamp DESC LIMIT 100
    `);
        res.json({ audit_trail: logs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /search/tags — Search evidence by tags ─────────────
router.get('/search/tags', async (req, res) => {
    try {
        const { tag, tags: tagsParam } = req.query;
        const searchTags = tagsParam ? tagsParam.split(',') : tag ? [tag] : [];
        if (searchTags.length === 0) return res.status(400).json({ error: 'tag or tags query parameter required' });

        const allItems = await db.all('SELECT id, title, entity_type, entity_id, verification_status, tags, created_at FROM evidence_items WHERE tags IS NOT NULL');
        const matched = allItems.filter(item => {
            const itemTags = JSON.parse(item.tags || '[]');
            return searchTags.some(st => itemTags.includes(st));
        });

        res.json({ items: matched, total: matched.length, searched_tags: searchTags });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        // Get blockchain seal if exists
        let seal = null;
        if (item.blockchain_seal_id) {
            seal = await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [item.blockchain_seal_id]);
        }

        // Remove file_data from response (too large)
        const { file_data, ...metadata } = item;
        res.json({ item: metadata, seal, has_file: !!file_data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /upload ───────────────────────────────────────────
router.post('/upload', requireRole('operator'), async (req, res) => {
    try {
        const { title, description, file_name, file_type, file_data, entity_type, entity_id } = req.body;
        if (!title) return res.status(400).json({ error: 'Title required' });

        // Compute SHA-256 hash
        const dataToHash = file_data || title + description + new Date().toISOString();
        const sha256 = crypto.createHash('sha256').update(dataToHash).digest('hex');

        // Create blockchain seal
        const sealId = uuidv4();
        const lastSeal = await db.get('SELECT * FROM blockchain_seals ORDER BY block_index DESC LIMIT 1');
        const blockIndex = lastSeal ? lastSeal.block_index + 1 : 0;
        const prevHash = lastSeal ? lastSeal.data_hash : '0';
        const merkleData = `${sha256}|${prevHash}|${blockIndex}`;
        const merkleRoot = crypto.createHash('sha256').update(merkleData).digest('hex');

        await db.prepare(`
      INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index)
      VALUES (?, 'evidence_anchor', ?, ?, ?, ?, ?)
    `).run(sealId, sha256, sha256, prevHash, merkleRoot, blockIndex);

        // Create evidence item
        const id = uuidv4();
        const fileSize = file_data ? Buffer.byteLength(file_data, 'utf8') : 0;
        await db.prepare(`
      INSERT INTO evidence_items (id, title, description, file_name, file_type, file_size, file_data,
        sha256_hash, blockchain_seal_id, entity_type, entity_id, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', file_name || '', file_type || '', fileSize,
            file_data || null, sha256, sealId, entity_type || '', entity_id || '', req.user.id);

        // Audit log
        await db.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'evidence_upload', 'evidence', ?, ?)
    `).run(uuidv4(), req.user.id, id, JSON.stringify({ title, sha256, seal_id: sealId }));

        res.json({ id, sha256, seal_id: sealId, block_index: blockIndex });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id/verify ────────────────────────────────────────
router.get('/:id/verify', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        const seal = item.blockchain_seal_id ?
            await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [item.blockchain_seal_id]) : null;

        // Re-verify hash
        let integrity = 'unknown';
        if (seal) {
            const hashMatch = seal.data_hash === item.sha256_hash;
            // Check chain continuity
            let chainValid = true;
            if (seal.block_index > 0) {
                const prevSeal = await db.get('SELECT * FROM blockchain_seals WHERE block_index = ?', [seal.block_index - 1]);
                chainValid = prevSeal && prevSeal.data_hash === seal.prev_hash;
            }
            integrity = hashMatch && chainValid ? 'verified' : 'tampered';

            await db.prepare('UPDATE evidence_items SET verification_status = ?, verified_at = datetime(?) WHERE id = ?')
                .run(integrity, 'now', req.params.id);
        }

        res.json({
            item_id: req.params.id,
            sha256: item.sha256_hash,
            blockchain_anchored: !!seal,
            block_index: seal?.block_index,
            integrity,
            verified_at: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id/export ────────────────────────────────────────
router.get('/:id/export', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        const seal = item.blockchain_seal_id ?
            await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [item.blockchain_seal_id]) : null;

        const auditTrail = await db.all(
            "SELECT * FROM audit_log WHERE entity_type = 'evidence' AND entity_id = ? ORDER BY timestamp ASC",
            [req.params.id]
        );

        // Forensic report structure
        const report = {
            report_type: 'Forensic Evidence Report',
            generated_at: new Date().toISOString(),
            generated_by: req.user.username,
            evidence: {
                id: item.id,
                title: item.title,
                description: item.description,
                file_name: item.file_name,
                file_type: item.file_type,
                file_size: item.file_size,
                sha256_hash: item.sha256_hash,
                uploaded_at: item.created_at,
                uploaded_by: item.uploaded_by
            },
            blockchain: seal ? {
                seal_id: seal.id,
                block_index: seal.block_index,
                data_hash: seal.data_hash,
                prev_hash: seal.prev_hash,
                merkle_root: seal.merkle_root,
                sealed_at: seal.sealed_at
            } : null,
            integrity: item.verification_status,
            audit_trail: auditTrail,
            chain_of_custody: auditTrail.map(a => ({
                action: a.action,
                actor: a.actor_id,
                timestamp: a.timestamp,
                details: a.details
            }))
        };

        res.json(report);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// NOTE: /audit/trail moved above /:id catch-all (BUG-20 fix)

// ─── POST /upload-file (multipart) ──────────────────────────
router.post('/upload-file', requireRole('operator'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, description, entity_type, entity_id } = req.body;
        if (!title) return res.status(400).json({ error: 'Title required' });

        // Compute SHA-256 hash from actual file bytes
        const fileBuffer = fs.readFileSync(req.file.path);
        const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Create blockchain seal
        const sealId = uuidv4();
        const lastSeal = await db.get('SELECT * FROM blockchain_seals ORDER BY block_index DESC LIMIT 1');
        const blockIndex = lastSeal ? lastSeal.block_index + 1 : 0;
        const prevHash = lastSeal ? lastSeal.data_hash : '0';
        const merkleData = `${sha256}|${prevHash}|${blockIndex}`;
        const merkleRoot = crypto.createHash('sha256').update(merkleData).digest('hex');

        await db.prepare(`
      INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index)
      VALUES (?, 'evidence_anchor', ?, ?, ?, ?, ?)
    `).run(sealId, sha256, sha256, prevHash, merkleRoot, blockIndex);

        // Create evidence item
        const id = uuidv4();
        await db.prepare(`
      INSERT INTO evidence_items (id, title, description, file_name, file_type, file_size,
        sha256_hash, blockchain_seal_id, entity_type, entity_id, uploaded_by, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', req.file.originalname, req.file.mimetype,
            req.file.size, sha256, sealId, entity_type || '', entity_id || '',
            req.user.id, req.file.filename);

        // Audit log
        await db.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'evidence_file_upload', 'evidence', ?, ?)
    `).run(uuidv4(), req.user.id, id, JSON.stringify({
            title, sha256, seal_id: sealId,
            original_name: req.file.originalname, size: req.file.size
        }));

        res.json({
            id, sha256, seal_id: sealId, block_index: blockIndex,
            file_name: req.file.originalname, file_size: req.file.size
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id/download ──────────────────────────────────────
router.get('/:id/download', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        // Try disk-stored file path first
        if (item.file_path) {
            const filePath = path.join(EVIDENCE_DIR, item.file_path);
            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Disposition', `attachment; filename="${item.file_name || 'evidence'}"`);
                res.setHeader('Content-Type', item.file_type || 'application/octet-stream');
                return res.sendFile(filePath);
            }
        }

        // Fallback to file_data in DB (base64)
        if (item.file_data) {
            const buffer = Buffer.from(item.file_data, 'base64');
            res.setHeader('Content-Disposition', `attachment; filename="${item.file_name || 'evidence'}"`);
            res.setHeader('Content-Type', item.file_type || 'application/octet-stream');
            return res.send(buffer);
        }

        res.status(404).json({ error: 'File data not available' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id/report — Printable HTML forensic report ───────
router.get('/:id/report', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        const seal = item.blockchain_seal_id ?
            await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [item.blockchain_seal_id]) : null;
        const auditTrail = await db.all(
            "SELECT a.*, u.username as actor_name FROM audit_log a LEFT JOIN users u ON a.actor_id = u.id WHERE a.entity_type = 'evidence' AND a.entity_id = ? ORDER BY a.timestamp ASC",
            [req.params.id]
        );

        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forensic Report – ${item.title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a2e;padding:40px;max-width:800px;margin:0 auto}
.header{border-bottom:3px solid #0a0e1a;padding-bottom:20px;margin-bottom:30px}
.header h1{font-size:22px;color:#0a0e1a}
.header .subtitle{font-size:12px;color:#64748b;margin-top:4px}
.badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge-verified{background:#dcfce7;color:#166534}
.badge-anchored{background:#dbeafe;color:#1e40af}
.badge-tampered{background:#fee2e2;color:#991b1b}
.section{margin-bottom:24px}
.section h2{font-size:16px;color:#0a0e1a;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:13px}
td,th{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}
th{background:#f8fafc;font-weight:600;width:35%}
.hash{font-family:monospace;font-size:11px;word-break:break-all;color:#6366f1}
.footer{margin-top:40px;padding-top:16px;border-top:2px solid #0a0e1a;font-size:11px;color:#64748b;text-align:center}
.audit-row{display:flex;gap:12px;padding:8px;border-left:3px solid #6366f1;margin-bottom:8px;background:#f8fafc;border-radius:0 4px 4px 0}
.audit-time{font-size:11px;color:#64748b;min-width:140px}
.audit-action{font-weight:600;font-size:12px}
@media print{body{padding:20px} .no-print{display:none}}
</style></head><body>
<div class="header">
  <h1>🔒 Forensic Evidence Report</h1>
  <div class="subtitle">TrustChecker Evidence Vault • Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
</div>

<div class="section">
  <h2>📋 Evidence Metadata</h2>
  <table>
    <tr><th>Evidence ID</th><td class="hash">${escapeHtml(item.id)}</td></tr>
    <tr><th>Title</th><td><strong>${escapeHtml(item.title)}</strong></td></tr>
    <tr><th>Description</th><td>${escapeHtml(item.description) || '—'}</td></tr>
    <tr><th>File Name</th><td>${escapeHtml(item.file_name) || '—'}</td></tr>
    <tr><th>File Type</th><td>${escapeHtml(item.file_type) || '—'}</td></tr>
    <tr><th>File Size</th><td>${item.file_size ? (item.file_size / 1024).toFixed(1) + ' KB' : '—'}</td></tr>
    <tr><th>Uploaded At</th><td>${escapeHtml(item.created_at)}</td></tr>
    <tr><th>Uploaded By</th><td>${escapeHtml(item.uploaded_by)}</td></tr>
    <tr><th>Status</th><td><span class="badge badge-${item.verification_status || 'anchored'}">${(item.verification_status || 'anchored').toUpperCase()}</span></td></tr>
  </table>
</div>

<div class="section">
  <h2>🔐 Cryptographic Proof</h2>
  <table>
    <tr><th>SHA-256 Hash</th><td class="hash">${item.sha256_hash}</td></tr>
    ${seal ? `
    <tr><th>Blockchain Seal ID</th><td class="hash">${seal.id}</td></tr>
    <tr><th>Block Index</th><td>#${seal.block_index}</td></tr>
    <tr><th>Data Hash</th><td class="hash">${seal.data_hash}</td></tr>
    <tr><th>Previous Hash</th><td class="hash">${seal.prev_hash}</td></tr>
    <tr><th>Merkle Root</th><td class="hash">${seal.merkle_root}</td></tr>
    <tr><th>Sealed At</th><td>${seal.sealed_at || seal.created_at}</td></tr>
    ` : '<tr><th>Blockchain</th><td>Not anchored</td></tr>'}
  </table>
</div>

<div class="section">
  <h2>📜 Chain of Custody (${auditTrail.length} entries)</h2>
  ${auditTrail.length > 0 ? auditTrail.map(a => `
  <div class="audit-row">
    <div class="audit-time">${a.timestamp}</div>
    <div><div class="audit-action">${a.action}</div><div style="font-size:11px;color:#64748b">By: ${a.actor_name || a.actor_id}</div></div>
  </div>`).join('') : '<p style="color:#64748b;font-size:13px">No audit trail entries</p>'}
</div>

<div class="footer">
  <p>This report was generated by TrustChecker v8.8.6 • Evidence Vault</p>
  <p>Report generated by: ${req.user.username} • ${new Date().toISOString()}</p>
  <p style="margin-top:8px;font-size:10px">Verify integrity at: /api/evidence/${item.id}/verify</p>
</div>
</body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /:id/tag — Add tags to evidence ──────────────────
router.post('/:id/tag', requireRole('operator'), async (req, res) => {
    try {
        const { tags } = req.body;
        if (!tags || !Array.isArray(tags)) return res.status(400).json({ error: 'tags array required' });

        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        const existingTags = item.tags ? JSON.parse(item.tags) : [];
        const newTags = [...new Set([...existingTags, ...tags])];

        await db.prepare('UPDATE evidence_items SET tags = ? WHERE id = ?').run(JSON.stringify(newTags), req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'EVIDENCE_TAGGED', 'evidence', req.params.id, JSON.stringify({ added_tags: tags, all_tags: newTags }));

        res.json({ id: req.params.id, tags: newTags });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── DELETE /:id/tag — Remove tag from evidence ─────────────
router.delete('/:id/tag', requireRole('operator'), async (req, res) => {
    try {
        const { tag } = req.body;
        if (!tag) return res.status(400).json({ error: 'tag required' });

        const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Evidence not found' });

        const existingTags = item.tags ? JSON.parse(item.tags) : [];
        const newTags = existingTags.filter(t => t !== tag);

        await db.prepare('UPDATE evidence_items SET tags = ? WHERE id = ?').run(JSON.stringify(newTags), req.params.id);

        res.json({ id: req.params.id, tags: newTags, removed: tag });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// NOTE: /search/tags moved above /:id catch-all (BUG-20 fix)

// ─── POST /batch-verify — Verify multiple evidence items at once ────────────
router.post('/batch-verify', requireRole('operator'), async (req, res) => {
    try {
        const { evidence_ids } = req.body;
        if (!evidence_ids || !Array.isArray(evidence_ids)) return res.status(400).json({ error: 'evidence_ids array required' });

        const results = [];
        for (const eid of evidence_ids) {
            const item = await db.get('SELECT * FROM evidence_items WHERE id = ?', [eid]);
            if (!item) { results.push({ id: eid, status: 'not_found' }); continue; }

            const seal = item.blockchain_seal_id ? await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [item.blockchain_seal_id]) : null;
            // BUG-18 FIX: Verify stored hash against blockchain seal instead of re-hashing
            // (re-hashing is unreliable — original upload hashed different inputs than what's stored)
            const hashMatch = seal ? seal.data_hash === item.sha256_hash : !!item.sha256_hash;

            results.push({
                id: eid,
                title: item.title,
                hash_match: hashMatch,
                blockchain_anchored: !!seal,
                integrity: hashMatch ? 'intact' : 'tampered',
                status: item.status
            });
        }

        const intactCount = results.filter(r => r.integrity === 'intact').length;
        const tamperedCount = results.filter(r => r.integrity === 'tampered').length;

        res.json({
            verified: results.length,
            intact: intactCount,
            tampered: tamperedCount,
            not_found: results.filter(r => r.status === 'not_found').length,
            results,
            verified_at: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /timeline — Evidence activity timeline ─────────────
router.get('/activity/timeline', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const safeDays = Math.max(1, Math.min(365, Math.floor(Number(days)) || 30));
        const daysModifier = `-${safeDays} days`;

        const created = await db.all(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM evidence_items WHERE created_at > datetime('now', ?)
      GROUP BY date ORDER BY date ASC
    `, [daysModifier]);

        const verified = await db.all(`
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM audit_log WHERE action LIKE '%EVIDENCE%' AND entity_type = 'evidence'
      AND timestamp > datetime('now', ?)
      GROUP BY date ORDER BY date ASC
    `, [daysModifier]);

        const byType = await db.all(`
      SELECT entity_type, COUNT(*) as count
      FROM evidence_items GROUP BY entity_type
    `);

        const byStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM evidence_items GROUP BY status
    `);

        res.json({
            period_days: Number(days),
            created_timeline: created,
            activity_timeline: verified,
            by_type: byType,
            by_status: byStatus
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

