/**
 * server/routes/compliance-engine.js
 * Cổng giao tiếp HTTP (Restful API) Cho Vòng Giao Dịch
 */

const express = require('express');
const router = express.Router();
const complianceEngine = require('../services/compliance-engine/engine');

/**
 * Đón nhận yêu cầu K6 / Client Frontend
 * POST /api/compliance/evaluate
 */
router.post('/evaluate', async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.request_id || !payload.org_id || !payload.action) {
            return res.status(400).json({ error: 'Missing mandatory deterministic fields' });
        }

        // Kỷ luật Hệ thống Thực Sự: Gán Time-stamp Độc Nhất (Deterministic Boot)
        // Loại bỏ Date.now() ở mọi nơi khác.
        if (!payload.event) {
            payload.event = {};
        }
        if (!payload.event.timestamp) {
            payload.event.timestamp = new Date().toISOString();
        }

        // Ủy quyền Cỗ Máy Trí Tuệ (Inject `res` Buffer để Lút X-Engine-Time Headers ngay khi Logic ngã ngũ)
        const decision = await complianceEngine.evaluate(payload, res);

        // Nhả Response
        return res.status(200).json(decision);
    } catch (e) {
        if (e.message.includes('TAMPER_DETECTED')) return res.status(403).json({ error: e.message });
        if (e.message.includes('IDEMPOTENCY_VIOLATION')) return res.status(409).json({ error: e.message });
        if (e.message.includes('TIMEOUT')) return res.status(504).json({ error: 'Engine overload or deadlock' });

        console.error('Compliance Engine Critical Crash:', e);
        return res.status(500).json({ error: 'Internal system fault evaluated to implicitly DENY.' });
    }
});

module.exports = router;
