/**
 * TrustChecker — Slack Webhook Service
 * Sends alert notifications to Slack channels via Incoming Webhooks.
 */
const db = require('../db');

let _config = null;
let _lastLoad = 0;
const TTL = 60000;

async function getConfig() {
    const now = Date.now();
    if (_config && now - _lastLoad < TTL) return _config;
    try {
        const row = await db.get("SELECT * FROM channel_settings WHERE channel = 'slack'");
        _config = row ? { ...row, config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {}) } : null;
        _lastLoad = now;
    } catch (e) { console.error('[Slack] Config load error:', e.message); }
    return _config;
}

// ── Slack Block Kit Templates ───────────────────────────────────
const TEMPLATES = {
    fraud_detected: (data) => ({
        text: `🚨 Fraud Detected: ${data.product_name || 'Unknown'}`,
        blocks: alertBlocks('🚨 Fraud Detected', '#ef4444', [
            `*Product:* ${data.product_name || 'Unknown'}`,
            `*Score:* ${data.fraud_score || 'N/A'}`,
            `*Details:* ${data.details || 'Suspicious activity detected.'}`,
        ]),
    }),
    scan_anomaly: (data) => ({
        text: `⚠️ Scan Anomaly: ${data.product_name || 'Unknown'}`,
        blocks: alertBlocks('⚠️ Scan Anomaly', '#f59e0b', [
            `*Product:* ${data.product_name || 'Unknown'}`,
            `*Type:* ${data.anomaly_type || 'Unknown'}`,
            `*Details:* ${data.details || 'Unusual scan pattern.'}`,
        ]),
    }),
    sla_violation: (data) => ({
        text: `⏰ SLA Violation: ${data.service_name || 'Unknown'}`,
        blocks: alertBlocks('⏰ SLA Violation', '#f97316', [
            `*Service:* ${data.service_name || 'Unknown'}`,
            `*Violation:* ${data.violation || 'Threshold exceeded.'}`,
        ]),
    }),
    new_org: (data) => ({
        text: `🏢 New Tenant: ${data.org_name || 'Unknown'}`,
        blocks: alertBlocks('🏢 New Tenant Registered', '#3b82f6', [
            `*Organization:* ${data.org_name || 'Unknown'}`,
            `*Admin:* ${data.admin_email || 'Unknown'}`,
        ]),
    }),
    usage_threshold: (data) => ({
        text: `📊 Usage Alert: ${data.metric || 'API calls'}`,
        blocks: alertBlocks('📊 Usage Threshold', '#f59e0b', [
            `*Metric:* ${data.metric || 'API calls'}`,
            `*Usage:* ${data.usage || '>80%'}`,
        ]),
    }),
    certificate_expiry: (data) => ({
        text: `🔒 Certificate Expiring: ${data.cert_name || 'SSL/TLS'}`,
        blocks: alertBlocks('🔒 Certificate Expiring', '#ef4444', [
            `*Certificate:* ${data.cert_name || 'SSL/TLS'}`,
            `*Expires:* ${data.expiry_date || 'Soon'}`,
        ]),
    }),
    system_health: (data) => ({
        text: `🖥️ System Health: ${data.component || 'Unknown'}`,
        blocks: alertBlocks('🖥️ System Health Alert', '#ef4444', [
            `*Component:* ${data.component || 'Unknown'}`,
            `*Status:* ${data.status || 'Degraded'}`,
            `*Details:* ${data.details || 'Performance issue.'}`,
        ]),
    }),
    payment_failed: (data) => ({
        text: `💳 Payment Failed: ${data.tenant_name || 'Unknown'}`,
        blocks: alertBlocks('💳 Payment Failed', '#ef4444', [
            `*Tenant:* ${data.tenant_name || 'Unknown'}`,
            `*Amount:* ${data.amount || 'N/A'}`,
            `*Reason:* ${data.reason || 'Processing error.'}`,
        ]),
    }),
    test: () => ({
        text: '✅ TrustChecker Slack integration working!',
        blocks: alertBlocks('✅ Test Message', '#10b981', [
            '*Status:* Slack alerts configured correctly!',
            `*Time:* ${new Date().toISOString()}`,
            '*Source:* TrustChecker Alert System',
        ]),
    }),
};

function alertBlocks(title, color, lines) {
    return [
        { type: 'header', text: { type: 'plain_text', text: title, emoji: true } },
        { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `_TrustChecker Alerts • ${new Date().toLocaleString()}_` }] },
        { type: 'divider' },
    ];
}

// ── Send Alert ──────────────────────────────────────────────────
async function sendAlert(eventType, eventData = {}) {
    try {
        const cfg = await getConfig();
        if (!cfg || !cfg.enabled) return { sent: false, reason: 'Slack disabled' };

        const webhooks = cfg.config?.webhooks || [];
        if (!webhooks.length) return { sent: false, reason: 'No webhook URLs configured' };

        const template = TEMPLATES[eventType];
        if (!template) return { sent: false, reason: `No template: ${eventType}` };

        const payload = template(eventData);
        const results = [];

        for (const wh of webhooks) {
            if (!wh.url || !wh.enabled) continue;
            // Event filtering: if webhook has events array, only send matching events
            if (wh.events && wh.events.length > 0 && !wh.events.includes(eventType)) continue;
            try {
                const resp = await fetch(wh.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                results.push({ channel: wh.name, ok: resp.ok, status: resp.status });
            } catch (e) {
                results.push({ channel: wh.name, ok: false, error: e.message });
            }
        }

        console.log(`[Slack] Alert sent: ${eventType} → ${results.length} webhook(s)`);
        return { sent: true, results };
    } catch (e) {
        console.error(`[Slack] Send failed (${eventType}):`, e.message);
        return { sent: false, reason: e.message };
    }
}

// ── Send Test ───────────────────────────────────────────────────
async function sendTest() {
    return sendAlert('test');
}

function invalidateConfig() { _config = null; _lastLoad = 0; }

module.exports = { sendAlert, sendTest, getConfig, invalidateConfig };
