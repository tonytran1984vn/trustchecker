/**
 * TrustChecker — Email Alert Service
 * Configurable SMTP via DB (email_settings table)
 */
const nodemailer = require('nodemailer');
const db = require('../db');

let _transporter = null;
let _config = null;
let _lastConfigLoad = 0;
const CONFIG_TTL = 60000; // reload config every 60s

// ── Load config from DB ─────────────────────────────────────────
async function getConfig() {
    const now = Date.now();
    if (_config && now - _lastConfigLoad < CONFIG_TTL) return _config;
    try {
        _config = await db.get("SELECT * FROM email_settings WHERE id = 'default'");
        _lastConfigLoad = now;
        _transporter = null; // reset transporter on config change
    } catch (e) {
        console.error('[Email] Config load error:', e.message);
    }
    return _config;
}

// ── Create transporter ──────────────────────────────────────────
async function getTransporter() {
    const cfg = await getConfig();
    if (!cfg || !cfg.smtp_user || !cfg.smtp_pass) return null;
    if (_transporter) return _transporter;

    _transporter = nodemailer.createTransport({
        host: cfg.smtp_host || 'smtp.gmail.com',
        port: cfg.smtp_port || 587,
        secure: cfg.smtp_secure || false,
        auth: {
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
        },
    });
    return _transporter;
}

// ── HTML Email Templates ────────────────────────────────────────
const TEMPLATES = {
    fraud_detected: (data) => ({
        subject: '🚨 Fraud Detected — TrustChecker Alert',
        html: alertTemplate('Fraud Detected', '#ef4444', '🚨', [
            `<b>Product:</b> ${data.product_name || 'Unknown'}`,
            `<b>Fraud Score:</b> ${data.fraud_score || 'N/A'}`,
            `<b>Details:</b> ${data.details || 'Suspicious activity detected.'}`,
        ]),
    }),
    scan_anomaly: (data) => ({
        subject: '⚠️ Scan Anomaly — TrustChecker Alert',
        html: alertTemplate('Scan Anomaly', '#f59e0b', '⚠️', [
            `<b>Product:</b> ${data.product_name || 'Unknown'}`,
            `<b>Type:</b> ${data.anomaly_type || 'Unknown'}`,
            `<b>Details:</b> ${data.details || 'Unusual scan pattern detected.'}`,
        ]),
    }),
    sla_violation: (data) => ({
        subject: '⏰ SLA Violation — TrustChecker Alert',
        html: alertTemplate('SLA Violation', '#f97316', '⏰', [
            `<b>Service:</b> ${data.service_name || 'Unknown'}`,
            `<b>Violation:</b> ${data.violation || 'Response time exceeded threshold.'}`,
        ]),
    }),
    new_tenant: (data) => ({
        subject: '🏢 New Tenant Registered — TrustChecker',
        html: alertTemplate('New Tenant Registered', '#3b82f6', '🏢', [
            `<b>Organization:</b> ${data.org_name || 'Unknown'}`,
            `<b>Admin:</b> ${data.admin_email || 'Unknown'}`,
        ]),
    }),
    usage_threshold: (data) => ({
        subject: '📊 Usage Threshold Alert — TrustChecker',
        html: alertTemplate('Usage Threshold Exceeded', '#f59e0b', '📊', [
            `<b>Metric:</b> ${data.metric || 'API calls'}`,
            `<b>Usage:</b> ${data.usage || '>80%'}`,
            `<b>Limit:</b> ${data.limit || 'N/A'}`,
        ]),
    }),
    certificate_expiry: (data) => ({
        subject: '🔒 Certificate Expiring — TrustChecker Alert',
        html: alertTemplate('Certificate Expiring', '#ef4444', '🔒', [
            `<b>Certificate:</b> ${data.cert_name || 'SSL/TLS'}`,
            `<b>Expires:</b> ${data.expiry_date || 'Soon'}`,
            `<b>Action:</b> Renew immediately to avoid service disruption.`,
        ]),
    }),
    system_health: (data) => ({
        subject: '🖥️ System Health Alert — TrustChecker',
        html: alertTemplate('System Health Alert', '#ef4444', '🖥️', [
            `<b>Component:</b> ${data.component || 'Unknown'}`,
            `<b>Status:</b> ${data.status || 'Degraded'}`,
            `<b>Details:</b> ${data.details || 'System performance issue detected.'}`,
        ]),
    }),
    payment_failed: (data) => ({
        subject: '💳 Payment Failed — TrustChecker Alert',
        html: alertTemplate('Payment Failed', '#ef4444', '💳', [
            `<b>Tenant:</b> ${data.tenant_name || 'Unknown'}`,
            `<b>Amount:</b> ${data.amount || 'N/A'}`,
            `<b>Reason:</b> ${data.reason || 'Payment processing error.'}`,
        ]),
    }),
    test: (data) => ({
        subject: '✅ Test Email — TrustChecker Alerts Working!',
        html: alertTemplate('Test Email', '#10b981', '✅', [
            `<b>Status:</b> Email alerts are configured correctly!`,
            `<b>Time:</b> ${new Date().toISOString()}`,
            `<b>Server:</b> ${data.server || 'TrustChecker VPS'}`,
        ]),
    }),
};

function alertTemplate(title, color, emoji, lines) {
    return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
    <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <!-- Header -->
      <div style="background:${color};padding:24px 32px;color:#fff">
        <div style="font-size:28px;margin-bottom:4px">${emoji}</div>
        <h1 style="margin:0;font-size:20px;font-weight:700">${title}</h1>
      </div>
      <!-- Body -->
      <div style="padding:24px 32px">
        ${lines.map(l => `<p style="margin:8px 0;font-size:14px;color:#334155;line-height:1.6">${l}</p>`).join('')}
      </div>
      <!-- Footer -->
      <div style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">
        Sent by <b>TrustChecker</b> Alert System &bull; <a href="https://tonytran.work/trustchecker" style="color:${color}">Dashboard</a>
      </div>
    </div>
  </body></html>`;
}

// ── Send Alert ──────────────────────────────────────────────────
async function sendAlert(eventType, eventData = {}) {
    try {
        const cfg = await getConfig();
        if (!cfg || !cfg.enabled) return { sent: false, reason: 'Email alerts disabled' };
        if (!cfg.smtp_user || !cfg.smtp_pass) return { sent: false, reason: 'SMTP not configured' };

        // Check if email_alerts channel is enabled for this user
        // For now, use platform-level recipients from email_settings
        const recipients = cfg.recipients || [];
        if (!recipients.length) return { sent: false, reason: 'No recipients configured' };

        const template = TEMPLATES[eventType];
        if (!template) return { sent: false, reason: `No template for event: ${eventType}` };

        const transporter = await getTransporter();
        if (!transporter) return { sent: false, reason: 'Failed to create transporter' };

        const { subject, html } = template(eventData);

        const info = await transporter.sendMail({
            from: `"${cfg.from_name || 'TrustChecker Alerts'}" <${cfg.smtp_user}>`,
            replyTo: cfg.from_email || cfg.smtp_user,
            to: recipients.join(', '),
            subject,
            html,
        });

        console.log(`[Email] Alert sent: ${eventType} → ${recipients.join(', ')} (${info.messageId})`);
        return { sent: true, messageId: info.messageId, recipients };
    } catch (e) {
        console.error(`[Email] Send failed (${eventType}):`, e.message);
        return { sent: false, reason: e.message };
    }
}

// ── Send Test Email ─────────────────────────────────────────────
async function sendTestEmail(customConfig = null) {
    try {
        let cfg = customConfig || await getConfig();
        if (!cfg) throw new Error('No email config found');
        if (!cfg.smtp_user || !cfg.smtp_pass) throw new Error('SMTP credentials not configured');

        const recipients = cfg.recipients || [];
        if (!recipients.length) throw new Error('No recipients configured');

        const transporter = nodemailer.createTransport({
            host: cfg.smtp_host || 'smtp.gmail.com',
            port: cfg.smtp_port || 587,
            secure: cfg.smtp_secure || false,
            auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
        });

        const { subject, html } = TEMPLATES.test({ server: 'TrustChecker VPS' });

        const info = await transporter.sendMail({
            from: `"${cfg.from_name || 'TrustChecker Alerts'}" <${cfg.smtp_user}>`,
            replyTo: cfg.from_email || cfg.smtp_user,
            to: recipients.join(', '),
            subject,
            html,
        });

        console.log(`[Email] Test sent → ${recipients.join(', ')} (${info.messageId})`);
        return { sent: true, messageId: info.messageId };
    } catch (e) {
        console.error('[Email] Test failed:', e.message);
        return { sent: false, reason: e.message };
    }
}

// ── Force reload config ─────────────────────────────────────────
function invalidateConfig() {
    _config = null;
    _transporter = null;
    _lastConfigLoad = 0;
}

module.exports = { sendAlert, sendTestEmail, getConfig, invalidateConfig };
