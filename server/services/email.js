/**
 * TrustChecker — Email Alert Service (Multi-SMTP Round-Robin)
 * Supports multiple SMTP accounts with automatic rotation to avoid daily limits.
 */
const nodemailer = require('nodemailer');
const db = require('../db');

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
    } catch (e) {
        console.error('[Email] Config load error:', e.message);
    }
    return _config;
}

// ── Get next SMTP account (round-robin) ─────────────────────────
async function getNextAccount() {
    const cfg = await getConfig();
    if (!cfg) return null;

    let accounts = cfg.smtp_accounts || [];
    if (typeof accounts === 'string') accounts = JSON.parse(accounts);
    if (!accounts.length) {
        // Fallback to legacy single smtp_user/smtp_pass
        if (cfg.smtp_user && cfg.smtp_pass) {
            return { email: cfg.smtp_user, password: cfg.smtp_pass, index: 0 };
        }
        return null;
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyLimit = cfg.daily_limit || 450;
    const idx = cfg.round_robin_index || 0;

    // Try each account starting from current index
    for (let attempt = 0; attempt < accounts.length; attempt++) {
        const i = (idx + attempt) % accounts.length;
        const acct = accounts[i];

        // Reset daily counter if new day
        if (acct.last_reset !== today) {
            acct.sent_today = 0;
            acct.last_reset = today;
        }

        // Check daily limit
        if ((acct.sent_today || 0) < dailyLimit) {
            // Move round-robin to next account for next send
            const nextIdx = (i + 1) % accounts.length;
            try {
                // Update counter and index
                acct.sent_today = (acct.sent_today || 0) + 1;
                await db.run(
                    "UPDATE email_settings SET smtp_accounts = $1::jsonb, round_robin_index = $2, updated_at = NOW() WHERE id = 'default'",
                    [JSON.stringify(accounts), nextIdx]
                );
            } catch (e) {
                console.error('[Email] Counter update error:', e.message);
            }

            return { email: acct.email, password: acct.password, index: i, sent_today: acct.sent_today };
        }
    }

    // All accounts exceeded daily limit
    console.warn('[Email] All SMTP accounts exceeded daily limit!');
    return null;
}

// ── Create transporter for a specific account ───────────────────
function createTransporter(cfg, account) {
    return nodemailer.createTransport({
        host: cfg.smtp_host || 'smtp.gmail.com',
        port: cfg.smtp_port || 587,
        secure: cfg.smtp_secure || false,
        auth: {
            user: account.email,
            pass: account.password,
        },
    });
}

// ── HTML Email Templates ────────────────────────────────────────
const TEMPLATES = {
    fraud_detected: data => ({
        subject: '🚨 Fraud Detected — TrustChecker Alert',
        html: alertTemplate('Fraud Detected', '#ef4444', '🚨', [
            `<b>Product:</b> ${data.product_name || 'Unknown'}`,
            `<b>Fraud Score:</b> ${data.fraud_score || 'N/A'}`,
            `<b>Details:</b> ${data.details || 'Suspicious activity detected.'}`,
        ]),
    }),
    scan_anomaly: data => ({
        subject: '⚠️ Scan Anomaly — TrustChecker Alert',
        html: alertTemplate('Scan Anomaly', '#f59e0b', '⚠️', [
            `<b>Product:</b> ${data.product_name || 'Unknown'}`,
            `<b>Type:</b> ${data.anomaly_type || 'Unknown'}`,
            `<b>Details:</b> ${data.details || 'Unusual scan pattern detected.'}`,
        ]),
    }),
    sla_violation: data => ({
        subject: '⏰ SLA Violation — TrustChecker Alert',
        html: alertTemplate('SLA Violation', '#f97316', '⏰', [
            `<b>Service:</b> ${data.service_name || 'Unknown'}`,
            `<b>Violation:</b> ${data.violation || 'Response time exceeded threshold.'}`,
        ]),
    }),
    new_org: data => ({
        subject: '🏢 New Org Registered — TrustChecker',
        html: alertTemplate('New Org Registered', '#3b82f6', '🏢', [
            `<b>Organization:</b> ${data.org_name || 'Unknown'}`,
            `<b>Admin:</b> ${data.admin_email || 'Unknown'}`,
        ]),
    }),
    usage_threshold: data => ({
        subject: '📊 Usage Threshold Alert — TrustChecker',
        html: alertTemplate('Usage Threshold Exceeded', '#f59e0b', '📊', [
            `<b>Metric:</b> ${data.metric || 'API calls'}`,
            `<b>Usage:</b> ${data.usage || '>80%'}`,
            `<b>Limit:</b> ${data.limit || 'N/A'}`,
        ]),
    }),
    certificate_expiry: data => ({
        subject: '🔒 Certificate Expiring — TrustChecker Alert',
        html: alertTemplate('Certificate Expiring', '#ef4444', '🔒', [
            `<b>Certificate:</b> ${data.cert_name || 'SSL/TLS'}`,
            `<b>Expires:</b> ${data.expiry_date || 'Soon'}`,
            `<b>Action:</b> Renew immediately to avoid service disruption.`,
        ]),
    }),
    system_health: data => ({
        subject: '🖥️ System Health Alert — TrustChecker',
        html: alertTemplate('System Health Alert', '#ef4444', '🖥️', [
            `<b>Component:</b> ${data.component || 'Unknown'}`,
            `<b>Status:</b> ${data.status || 'Degraded'}`,
            `<b>Details:</b> ${data.details || 'System performance issue detected.'}`,
        ]),
    }),
    payment_failed: data => ({
        subject: '💳 Payment Failed — TrustChecker Alert',
        html: alertTemplate('Payment Failed', '#ef4444', '💳', [
            `<b>Org:</b> ${data.org_name || 'Unknown'}`,
            `<b>Amount:</b> ${data.amount || 'N/A'}`,
            `<b>Reason:</b> ${data.reason || 'Payment processing error.'}`,
        ]),
    }),
    test: data => ({
        subject: '✅ Test Email — TrustChecker Alerts Working!',
        html: alertTemplate('Test Email', '#10b981', '✅', [
            `<b>Status:</b> Email alerts are configured correctly!`,
            `<b>Sent via:</b> ${data.sent_via || 'SMTP'}`,
            `<b>Account:</b> ${data.account || 'N/A'}`,
            `<b>Time:</b> ${new Date().toISOString()}`,
        ]),
    }),
};

function alertTemplate(title, color, emoji, lines) {
    return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
    <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <div style="background:${color};padding:24px 32px;color:#fff">
        <div style="font-size:28px;margin-bottom:4px">${emoji}</div>
        <h1 style="margin:0;font-size:20px;font-weight:700">${title}</h1>
      </div>
      <div style="padding:24px 32px">
        ${lines.map(l => `<p style="margin:8px 0;font-size:14px;color:#334155;line-height:1.6">${l}</p>`).join('')}
      </div>
      <div style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">
        Sent by <b>TrustChecker</b> Alert System &bull; <a href="https://tonytran.work/trustchecker" style="color:${color}">Dashboard</a>
      </div>
    </div>
  </body></html>`;
}

// ── Send Alert (with round-robin) ───────────────────────────────
async function sendAlert(eventType, eventData = {}) {
    try {
        const cfg = await getConfig();
        if (!cfg || !cfg.enabled) return { sent: false, reason: 'Email alerts disabled' };

        const recipients = cfg.recipients || [];
        if (!recipients.length) return { sent: false, reason: 'No recipients configured' };

        const account = await getNextAccount();
        if (!account)
            return { sent: false, reason: 'No available SMTP accounts (daily limit reached or none configured)' };

        const template = TEMPLATES[eventType];
        if (!template) return { sent: false, reason: `No template for event: ${eventType}` };

        const transporter = createTransporter(cfg, account);
        const { subject, html } = template(eventData);

        const info = await transporter.sendMail({
            from: `"${cfg.from_name || 'TrustChecker Alerts'}" <${account.email}>`,
            replyTo: cfg.from_email || account.email,
            to: recipients.join(', '),
            subject,
            html,
        });

        console.log(
            `[Email] Alert sent: ${eventType} via ${account.email} (${account.sent_today}/${cfg.daily_limit || 450} today) → ${recipients.join(', ')}`
        );
        return { sent: true, messageId: info.messageId, via: account.email, recipients };
    } catch (e) {
        console.error(`[Email] Send failed (${eventType}):`, e.message);
        return { sent: false, reason: e.message };
    }
}

// ── Send Test Email ─────────────────────────────────────────────
async function sendTestEmail() {
    try {
        const cfg = await getConfig();
        if (!cfg) throw new Error('No email config found');

        const recipients = cfg.recipients || [];
        if (!recipients.length) throw new Error('No recipients configured');

        const account = await getNextAccount();
        if (!account) throw new Error('No SMTP accounts configured or all exceeded daily limit');

        const transporter = createTransporter(cfg, account);
        const { subject, html } = TEMPLATES.test({
            sent_via: 'SMTP Round-Robin',
            account: `${account.email} (#${account.index + 1})`,
        });

        const info = await transporter.sendMail({
            from: `"${cfg.from_name || 'TrustChecker Alerts'}" <${account.email}>`,
            replyTo: cfg.from_email || account.email,
            to: recipients.join(', '),
            subject,
            html,
        });

        console.log(`[Email] Test sent via ${account.email} → ${recipients.join(', ')} (${info.messageId})`);
        return { sent: true, messageId: info.messageId, via: account.email };
    } catch (e) {
        console.error('[Email] Test failed:', e.message);
        return { sent: false, reason: e.message };
    }
}

// ── Force reload config ─────────────────────────────────────────
function invalidateConfig() {
    _config = null;
    _lastConfigLoad = 0;
}

module.exports = { sendAlert, sendTestEmail, getConfig, invalidateConfig };
