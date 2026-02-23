/**
 * Email Management Routes
 * Template preview, test send, and email configuration
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const emailTemplates = require('../engines/emailTemplates');

router.use(authMiddleware);

// ─── GET /templates — List all available email templates ────
router.get('/templates', async (req, res) => {
    try {
        res.json({ templates: emailTemplates.listTemplates() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /templates/:name/preview — Preview a template ──────
router.get('/templates/:name/preview', requirePermission('notification:manage'), async (req, res) => {
    try {
        const html = emailTemplates.preview(req.params.name);
        if (!html) return res.status(404).json({ error: 'Template not found' });

        // Return as HTML for browser rendering
        if (req.query.render === 'true') {
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }

        res.json({ template: req.params.name, html, preview: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /send — Send an email (simulated) ────────────────
router.post('/send', requireRole('admin'), async (req, res) => {
    const { to, template, params } = req.body;
    if (!to || !template) return res.status(400).json({ error: 'to and template required' });

    let html;
    try {
        switch (template) {
            case 'password_reset': html = emailTemplates.passwordReset(params?.username, params?.token, params?.url); break;
            case 'welcome': html = emailTemplates.welcome(params?.username, params?.url); break;
            case 'fraud_alert': html = emailTemplates.fraudAlert(params?.productName, params?.fraudScore, params?.scanId, params?.details); break;
            case 'scan_receipt': html = emailTemplates.scanReceipt(params?.productName, params?.result, params?.trustScore, params?.fraudScore, params?.sealHash); break;
            case 'invoice': html = emailTemplates.invoice(params?.planName, params?.amount, params?.currency, params?.invoiceId, params?.period); break;
            case 'kyc_status': html = emailTemplates.kycStatus(params?.businessName, params?.status, params?.reason); break;
            case 'weekly_digest': html = emailTemplates.weeklyDigest(params?.stats || {}); break;
            default: return res.status(400).json({ error: 'Unknown template' });
        }
    } catch (e) {
        console.error('Email template error:', e.message);
        return res.status(400).json({ error: 'Template rendering failed' });
    }

    // Simulated send (in production, integrate with SMTP from integrations)
    res.json({
        message: 'Email sent (simulated)',
        to,
        template,
        subject: getSubject(template),
        html_size: html.length,
        sent_at: new Date().toISOString(),
        note: 'Configure SMTP in Integrations → Email settings for real delivery'
    });
});

// ─── GET /config — Get email configuration status ───────────
router.get('/config', requireRole('admin'), async (req, res) => {
    try {
        res.json({
            provider: 'simulated',
            smtp_configured: false,
            supported_templates: emailTemplates.listTemplates().length,
            note: 'Set up SMTP credentials in Admin → Integrations → Email/SMTP to enable real email delivery'
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function getSubject(template) {
    const subjects = {
        password_reset: 'Reset Your TrustChecker Password',
        welcome: 'Welcome to TrustChecker!',
        fraud_alert: 'Fraud Alert — Action Required',
        scan_receipt: 'Scan Verification Receipt',
        invoice: 'Payment Confirmation — TrustChecker',
        kyc_status: 'KYC Verification Update',
        weekly_digest: 'Your Weekly TrustChecker Digest',
    };
    return subjects[template] || 'TrustChecker Notification';
}

module.exports = router;
