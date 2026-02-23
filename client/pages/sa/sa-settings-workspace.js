/**
 * Operations Workspace — SA Domain (Stability & Reliability)
 * Tabs: System Health | Incidents | Feature Flags | Notifications | General
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { renderPage as renderServices } from './services-status.js';
import { renderPage as renderIncidents } from './incidents.js';

// ═══════════════════════════════════════════════════════════════
// Feature Flags Tab (DB-backed via platform_feature_flags table)
// ═══════════════════════════════════════════════════════════════
let _flagList = null;  // Full flag data from API
let _flagsLoading = false;

function loadFeatureFlags() {
    if (_flagsLoading) return;
    _flagsLoading = true;
    API.get('/platform/feature-flags').then(data => {
        if (data?.flagList) {
            _flagList = data.flagList;
            // Also update State.featureFlags for backward compat
            State.featureFlags = {};
            data.flagList.forEach(f => { State.featureFlags[f.key] = f.enabled; });
        }
        _flagsLoading = false;
        window.render();
    }).catch(() => { _flagsLoading = false; });
}

function renderFeatureFlags() {
    if (!_flagList) {
        loadFeatureFlags();
        return `<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading feature flags...</div>`;
    }

    const enabledCount = _flagList.filter(f => f.enabled).length;

    return `
    <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
        <div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Manage platform-wide feature toggles. Changes apply to all tenants.</div>
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);background:var(--bg-secondary);padding:4px 12px;border-radius:20px">
            ${enabledCount} / ${_flagList.length} enabled
        </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px">
        ${_flagList.map(f => {
        const enabled = f.enabled;
        const color = f.color || '#6b7280';
        return `
            <div class="card" style="padding:16px;display:flex;align-items:center;gap:14px;transition:all 0.2s;border-left:3px solid ${enabled ? color : 'transparent'};opacity:${enabled ? '1' : '0.6'}">
                <div style="width:40px;height:40px;border-radius:10px;background:${enabled ? color + '22' : 'var(--bg-secondary)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${f.icon || '⚡'}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:700">${f.label}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${f.description || ''}</div>
                </div>
                <label style="position:relative;width:48px;height:26px;cursor:pointer;flex-shrink:0">
                    <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleFlag('${f.key}', this.checked)"
                        style="display:none">
                    <div style="position:absolute;inset:0;background:${enabled ? color : '#cbd5e1'};border-radius:13px;transition:background 0.3s;${enabled ? '' : 'border:1px solid #94a3b8;'}"></div>
                    <div style="position:absolute;top:3px;left:${enabled ? '24px' : '3px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:left 0.3s;box-shadow:0 2px 4px rgba(0,0,0,0.25)"></div>
                </label>
            </div>`;
    }).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// Notifications Tab (DB-backed + Channel Config on click)
// ═══════════════════════════════════════════════════════════════
let _notifData = null;
let _notifLoading = false;
let _emailConfig = null;
let _emailLoading = false;
let _channelConfigs = {};  // {slack: {...}, sms: {...}, push: {...}}
let _openPanel = null;     // 'email_alerts' | 'slack_webhooks' | 'sms_alerts' | 'push_notifications' | null

const CHANNEL_MAP = { email_alerts: 'email', slack_webhooks: 'slack', sms_alerts: 'sms', push_notifications: 'push' };

function loadNotifications() {
    if (_notifLoading) return;
    _notifLoading = true;
    API.get('/platform/notifications').then(data => {
        _notifData = data;
        _notifLoading = false;
        window.render();
    }).catch(() => { _notifLoading = false; });
}

function loadEmailConfig() {
    if (_emailLoading) return;
    _emailLoading = true;
    API.get('/platform/email-settings').then(data => {
        _emailConfig = data?.config || {};
        _emailLoading = false;
        window.render();
    }).catch(() => { _emailLoading = false; });
}

function loadChannelConfig(channel) {
    if (_channelConfigs[channel]?._loading) return;
    _channelConfigs[channel] = { _loading: true };
    API.get('/platform/channel-settings/' + channel).then(data => {
        _channelConfigs[channel] = data?.config || { enabled: false, config: {} };
        window.render();
    }).catch(() => { _channelConfigs[channel] = { enabled: false, config: {} }; });
}

function renderNotifications() {
    if (!_notifData) { loadNotifications(); }
    if (!_emailConfig) { loadEmailConfig(); }
    if (!_notifData || !_emailConfig) {
        return `<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading notifications...</div>`;
    }
    // Lazy-load channel configs
    ['slack', 'sms', 'push'].forEach(ch => { if (!_channelConfigs[ch]) loadChannelConfig(ch); });

    const { channels = [], events = [] } = _notifData;
    const sevColors = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const sevLabels = { critical: 'Critical', warning: 'Warning', info: 'Info' };
    const ist = 'width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:0.82rem;outline:none';

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
            <div class="card-header"><div class="card-title">${icon('bell', 16)} Notification Channels</div></div>
            <div style="padding:0 16px 16px">
                ${channels.map(c => {
        const hasConfig = !!CHANNEL_MAP[c.key];
        const isOpen = _openPanel === c.key;
        return `<div>
                    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);${hasConfig ? 'cursor:pointer' : ''}" ${hasConfig ? `onclick="toggleChannelPanel('${c.key}')"` : ''}>
                        <span style="font-size:1.2rem">${c.icon || '🔔'}</span>
                        <div style="flex:1">
                            <div style="font-size:0.82rem;font-weight:600">${c.label}${hasConfig ? ' <span style="font-size:0.7rem;color:#3b82f6">⚙ Configure</span>' : ''}</div>
                            <div style="font-size:0.78rem;color:var(--text-muted)">${c.description || ''}</div>
                        </div>
                        ${hasConfig ? renderChannelBadge(c.key) : ''}
                        <label style="position:relative;width:40px;height:22px;cursor:pointer;flex-shrink:0" onclick="event.stopPropagation()">
                            <input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="toggleNotifPref('${c.id}', this.checked)" style="display:none">
                            <div style="position:absolute;inset:0;background:${c.enabled ? '#10b981' : '#cbd5e1'};border-radius:11px;transition:0.3s"></div>
                            <div style="position:absolute;top:2px;left:${c.enabled ? '20px' : '2px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.25)"></div>
                        </label>
                    </div>
                    ${isOpen ? renderChannelConfig(c.key, ist) : ''}
                </div>`;
    }).join('')}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="card-title">${icon('alert', 16)} Event Subscriptions</div></div>
            <div style="padding:0 16px 16px">
                ${events.map(e => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                    <div style="width:8px;height:8px;border-radius:50%;background:${sevColors[e.severity] || '#6b7280'};flex-shrink:0"></div>
                    <div style="flex:1"><div style="font-size:0.82rem;font-weight:600">${e.label}</div></div>
                    <span style="font-size:0.72rem;padding:2px 8px;border-radius:10px;background:${(sevColors[e.severity] || '#6b7280')}22;color:${sevColors[e.severity] || '#6b7280'};font-weight:600">${sevLabels[e.severity] || e.severity}</span>
                    <label style="position:relative;width:40px;height:22px;cursor:pointer;flex-shrink:0">
                        <input type="checkbox" ${e.enabled ? 'checked' : ''} onchange="toggleNotifPref('${e.id}', this.checked)" style="display:none">
                        <div style="position:absolute;inset:0;background:${e.enabled ? '#10b981' : '#cbd5e1'};border-radius:11px;transition:0.3s"></div>
                        <div style="position:absolute;top:2px;left:${e.enabled ? '20px' : '2px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.25)"></div>
                    </label>
                </div>`).join('')}
            </div>
        </div>
    </div>`;
}

// ── Channel Badge (small status next to channel name) ───────────
function renderChannelBadge(key) {
    if (key === 'email_alerts') {
        const cfg = _emailConfig || {};
        const n = (cfg.smtp_accounts || []).length;
        return `<span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:${cfg.enabled ? '#10b98122' : '#94a3b822'};color:${cfg.enabled ? '#10b981' : '#94a3b8'};font-weight:600">${cfg.enabled ? n + ' acct' : 'Off'}</span>`;
    }
    if (key === 'slack_webhooks') {
        const cfg = _channelConfigs.slack || {};
        const wh = (cfg.config?.webhooks || []).length;
        return `<span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:${cfg.enabled ? '#10b98122' : '#94a3b822'};color:${cfg.enabled ? '#10b981' : '#94a3b8'};font-weight:600">${cfg.enabled ? wh + ' hook' : 'Off'}</span>`;
    }
    if (key === 'sms_alerts') {
        const cfg = _channelConfigs.sms || {};
        return `<span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:#94a3b822;color:#94a3b8;font-weight:600">${cfg.config?.account_sid ? 'Ready' : 'Setup'}</span>`;
    }
    if (key === 'push_notifications') {
        const cfg = _channelConfigs.push || {};
        return `<span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:#94a3b822;color:#94a3b8;font-weight:600">${cfg.config?.vapid_public_key ? 'Ready' : 'Setup'}</span>`;
    }
    return '';
}

// ── Channel Config Panel (renders below clicked channel) ────────
function renderChannelConfig(key, ist) {
    const ps = 'padding:14px;margin:8px 0 4px;background:var(--bg-secondary);border-radius:10px;border:1px solid var(--border)';
    if (key === 'email_alerts') return renderEmailPanel(ist, ps);
    if (key === 'slack_webhooks') return renderSlackPanel(ist, ps);
    if (key === 'sms_alerts') return renderSmsPanel(ist, ps);
    if (key === 'push_notifications') return renderPushPanel(ist, ps);
    return '';
}

// ── EMAIL PANEL ─────────────────────────────────────────────────
function renderEmailPanel(ist, ps) {
    const cfg = _emailConfig || {};
    const accounts = cfg.smtp_accounts || [];
    const recipients = cfg.recipients || [];
    return `<div style="${ps}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:0.82rem;font-weight:700">📧 Email Configuration</span>
            ${renderMiniToggle(cfg.enabled, "saveEmailSetting('enabled', this.checked)")}
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:10px">
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">SMTP Host</label><input id="smtp_host" value="${cfg.smtp_host || 'smtp.gmail.com'}" style="${ist}"></div>
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">Port</label><input id="smtp_port" value="${cfg.smtp_port || 587}" type="number" style="${ist}"></div>
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">Limit/Day</label><input id="daily_limit" value="${cfg.daily_limit || 450}" type="number" style="${ist}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">From Name</label><input id="from_name" value="${cfg.from_name || 'TrustChecker Alerts'}" style="${ist}"></div>
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">Reply-To</label><input id="from_email" value="${cfg.from_email || 'alerts@trustchecker.io'}" style="${ist}"></div>
        </div>
        <div style="margin-bottom:12px">
            <label style="font-size:0.7rem;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">SMTP Accounts (Round-Robin) — ${accounts.length}</label>
            ${accounts.map((a, i) => `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;margin-bottom:4px;background:var(--bg-primary);border-radius:6px;border:1px solid var(--border)">
                <span style="font-size:0.7rem;color:var(--text-muted)">#${i + 1}</span>
                <span style="flex:1;font-size:0.78rem;font-weight:600">${a.email}</span>
                <span style="font-size:0.68rem;padding:2px 6px;border-radius:6px;background:${(a.sent_today || 0) > (cfg.daily_limit || 450) * 0.8 ? '#f59e0b22' : '#10b98122'};color:${(a.sent_today || 0) > (cfg.daily_limit || 450) * 0.8 ? '#f59e0b' : '#10b981'}">${a.sent_today || 0}/${cfg.daily_limit || 450}</span>
                <span onclick="removeSmtpAccount(${i})" style="cursor:pointer;color:#ef4444;font-size:0.8rem">&times;</span>
            </div>`).join('')}
            ${!accounts.length ? '<div style="font-size:0.75rem;color:var(--text-muted);padding:6px">No accounts</div>' : ''}
            <div style="display:flex;gap:6px;margin-top:6px">
                <input id="new_smtp_email" type="email" placeholder="gmail@example.com" style="${ist};flex:1">
                <input id="new_smtp_pass" type="password" placeholder="App Password" style="${ist};flex:1">
                <button onclick="addSmtpAccount()" style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;white-space:nowrap">+ Add</button>
            </div>
        </div>
        ${renderRecipients(recipients, ist)}
        ${renderPanelActions("sendTestEmail()", "saveEmailConfig()", "📧")}
    </div>`;
}

// ── SLACK PANEL ─────────────────────────────────────────────────
function renderSlackPanel(ist, ps) {
    const cfg = _channelConfigs.slack || {};
    const webhooks = cfg.config?.webhooks || [];
    const EVENT_TYPES = [
        { key: 'fraud_detected', label: '🚨 Fraud Detected', color: '#ef4444' },
        { key: 'scan_anomaly', label: '⚠️ Scan Anomaly', color: '#f59e0b' },
        { key: 'sla_violation', label: '⏰ SLA Violation', color: '#f97316' },
        { key: 'new_tenant', label: '🏢 New Tenant', color: '#3b82f6' },
        { key: 'usage_threshold', label: '📊 Usage Alert', color: '#f59e0b' },
        { key: 'certificate_expiry', label: '🔒 Cert Expiry', color: '#ef4444' },
        { key: 'system_health', label: '🖥️ System Health', color: '#ef4444' },
        { key: 'payment_failed', label: '💳 Payment Failed', color: '#ef4444' },
    ];
    return `<div style="${ps}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:0.82rem;font-weight:700">💬 Slack Configuration</span>
            ${renderMiniToggle(cfg.enabled, "saveChannelEnabled('slack', this.checked)")}
        </div>
        <div style="margin-bottom:12px">
            <label style="font-size:0.7rem;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">Webhook Channels — ${webhooks.length} configured</label>
            ${webhooks.map((wh, i) => {
        const evts = wh.events || [];
        const allEvts = evts.length === 0;
        return `<div style="margin-bottom:8px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border);overflow:hidden">
                <div style="display:flex;align-items:center;gap:6px;padding:8px 10px">
                    <span style="font-size:0.7rem;color:var(--text-muted)">#${i + 1}</span>
                    <span style="flex:1;font-size:0.78rem;font-weight:600">${wh.name || 'Webhook'}</span>
                    <span style="font-size:0.65rem;padding:2px 6px;border-radius:6px;background:#3b82f622;color:#3b82f6;font-weight:600">${allEvts ? 'All Events' : evts.length + ' event' + (evts.length !== 1 ? 's' : '')}</span>
                    <span style="font-size:0.68rem;padding:2px 6px;border-radius:6px;background:${wh.enabled ? '#10b98122' : '#94a3b822'};color:${wh.enabled ? '#10b981' : '#94a3b8'}">${wh.enabled ? 'Active' : 'Off'}</span>
                    <span onclick="removeSlackWebhook(${i})" style="cursor:pointer;color:#ef4444;font-size:0.8rem">&times;</span>
                </div>
                <div style="padding:6px 10px 10px;border-top:1px solid var(--border)">
                    <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px;font-weight:600">Route events to this channel:</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding-bottom:4px;border-bottom:1px dashed var(--border)">
                        <input type="checkbox" ${allEvts ? 'checked' : ''} onchange="toggleSlackAllEvents(${i}, this.checked)" style="accent-color:#10b981;width:14px;height:14px">
                        <span style="font-size:0.72rem;font-weight:600;color:${allEvts ? '#10b981' : 'var(--text-muted)'}">All Events</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">
                        ${EVENT_TYPES.map(et => {
            const checked = allEvts || evts.includes(et.key);
            return `<label style="display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:4px;cursor:${allEvts ? 'default' : 'pointer'};font-size:0.7rem;${checked ? '' : 'opacity:0.45'}">
                                <input type="checkbox" ${checked ? 'checked' : ''} ${allEvts ? 'disabled' : ''} onchange="toggleSlackEvent(${i}, '${et.key}', this.checked)" style="accent-color:${et.color};width:13px;height:13px">
                                ${et.label}
                            </label>`;
        }).join('')}
                    </div>
                </div>
            </div>`;
    }).join('')}
            ${!webhooks.length ? '<div style="font-size:0.75rem;color:var(--text-muted);padding:6px">No webhooks. Create one at <a href="https://api.slack.com/apps" target="_blank" style="color:#3b82f6">api.slack.com</a></div>' : ''}
            <div style="margin-top:8px;padding:10px;background:var(--bg-primary);border-radius:8px;border:1px dashed var(--border)">
                <div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);margin-bottom:6px">➕ Add New Webhook</div>
                <div style="display:flex;gap:6px;margin-bottom:8px">
                    <input id="new_slack_name" placeholder="Channel name (e.g. #security)" style="${ist};width:140px">
                    <input id="new_slack_url" placeholder="https://hooks.slack.com/services/..." style="${ist};flex:1">
                </div>
                <div style="font-size:0.68rem;color:var(--text-muted);font-weight:600;margin-bottom:4px">Select events for this channel:</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:8px">
                    ${EVENT_TYPES.map(et => `<label style="display:flex;align-items:center;gap:4px;padding:2px 4px;border-radius:4px;cursor:pointer;font-size:0.7rem">
                        <input type="checkbox" class="new-slack-evt" value="${et.key}" style="accent-color:${et.color};width:13px;height:13px">
                        ${et.label}
                    </label>`).join('')}
                </div>
                <div style="display:flex;justify-content:flex-end">
                    <button onclick="addSlackWebhook()" style="padding:6px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600">+ Add Channel</button>
                </div>
            </div>
        </div>
        ${renderPanelActions("testChannel('slack')", "saveSlackConfig()", "💬")}
    </div>`;
}


// ── SMS PANEL ───────────────────────────────────────────────────
function renderSmsPanel(ist, ps) {
    const cfg = _channelConfigs.sms || {};
    const c = cfg.config || {};
    const recipients = c.recipients || [];
    return `<div style="${ps}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:0.82rem;font-weight:700">📱 SMS Configuration (Twilio)</span>
            ${renderMiniToggle(cfg.enabled, "saveChannelEnabled('sms', this.checked)")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">Account SID</label><input id="sms_sid" value="${c.account_sid || ''}" style="${ist}" placeholder="ACxxxxxxxxx"></div>
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">Auth Token</label><input id="sms_token" value="${c.auth_token || ''}" type="password" style="${ist}" placeholder="Your auth token"></div>
        </div>
        <div style="margin-bottom:12px">
            <label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">From Number</label>
            <input id="sms_from" value="${c.from_number || ''}" style="${ist}" placeholder="+1234567890">
        </div>
        <div style="margin-bottom:12px">
            <label style="font-size:0.7rem;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">Recipients</label>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">
                ${recipients.map((r, i) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--bg-primary);border-radius:12px;font-size:0.75rem;border:1px solid var(--border)">${r}<span onclick="removeSmsRecipient(${i})" style="cursor:pointer;color:var(--text-muted)">&times;</span></span>`).join('')}
                ${!recipients.length ? '<span style="font-size:0.75rem;color:var(--text-muted)">None</span>' : ''}
            </div>
            <div style="display:flex;gap:6px">
                <input id="new_sms_number" placeholder="+1234567890" style="${ist};flex:1">
                <button onclick="addSmsRecipient()" style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;white-space:nowrap">+ Add</button>
            </div>
        </div>
        <div style="padding:8px;background:#f59e0b11;border:1px solid #f59e0b33;border-radius:6px;margin-bottom:12px;font-size:0.72rem;color:#f59e0b">
            ⚠️ Requires Twilio account. Get credentials at <a href="https://www.twilio.com/console" target="_blank" style="color:#f59e0b;font-weight:600">twilio.com/console</a>
        </div>
        ${renderPanelActions(null, "saveSmsConfig()", "📱")}
    </div>`;
}

// ── PUSH PANEL ──────────────────────────────────────────────────
function renderPushPanel(ist, ps) {
    const cfg = _channelConfigs.push || {};
    const c = cfg.config || {};
    return `<div style="${ps}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="font-size:0.82rem;font-weight:700">🔔 Push Notifications</span>
            ${renderMiniToggle(cfg.enabled, "saveChannelEnabled('push', this.checked)")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">VAPID Public Key</label><input id="push_pub" value="${c.vapid_public_key || ''}" style="${ist}" placeholder="BEl62i..."></div>
            <div><label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">VAPID Private Key</label><input id="push_priv" value="${c.vapid_private_key || ''}" type="password" style="${ist}" placeholder="Private key"></div>
        </div>
        <div style="margin-bottom:12px">
            <label style="font-size:0.7rem;color:var(--text-muted);font-weight:600">Subscriptions</label>
            <div style="font-size:0.75rem;color:var(--text-muted);padding:8px">${(c.subscriptions || []).length} device(s) subscribed</div>
        </div>
        <div style="padding:8px;background:#3b82f611;border:1px solid #3b82f633;border-radius:6px;margin-bottom:12px;font-size:0.72rem;color:#3b82f6">
            ℹ️ Generate VAPID keys via <code style="background:var(--bg-primary);padding:1px 4px;border-radius:3px">npx web-push generate-vapid-keys</code>
        </div>
        ${renderPanelActions(null, "savePushConfig()", "🔔")}
    </div>`;
}

// ── Shared UI Helpers ───────────────────────────────────────────
function renderMiniToggle(enabled, onchange) {
    return `<div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:0.72rem;color:${enabled ? '#10b981' : 'var(--text-muted)'}">${enabled ? 'Active' : 'Off'}</span>
        <label style="position:relative;width:36px;height:20px;cursor:pointer">
            <input type="checkbox" ${enabled ? 'checked' : ''} onchange="${onchange}" style="display:none">
            <div style="position:absolute;inset:0;background:${enabled ? '#10b981' : '#cbd5e1'};border-radius:10px;transition:0.3s"></div>
            <div style="position:absolute;top:2px;left:${enabled ? '18px' : '2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 2px rgba(0,0,0,0.2)"></div>
        </label>
    </div>`;
}

function renderRecipients(recipients, ist) {
    return `<div style="margin-bottom:12px">
        <label style="font-size:0.7rem;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">Recipients</label>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">
            ${recipients.map((r, i) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--bg-primary);border-radius:12px;font-size:0.75rem;border:1px solid var(--border)">${r}<span onclick="removeRecipient(${i})" style="cursor:pointer;color:var(--text-muted)">&times;</span></span>`).join('')}
            ${!recipients.length ? '<span style="font-size:0.75rem;color:var(--text-muted)">None</span>' : ''}
        </div>
        <div style="display:flex;gap:6px">
            <input id="new_recipient" type="email" placeholder="who@receives.com" style="${ist};flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();addRecipient()}">
            <button onclick="addRecipient()" style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;white-space:nowrap">+ Add</button>
        </div>
    </div>`;
}

function renderPanelActions(testFn, saveFn, emoji) {
    return `<div style="display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border)">
        ${testFn ? `<button onclick="${testFn}" style="padding:6px 14px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600">${emoji} Test</button>` : ''}
        <button onclick="${saveFn}" style="padding:6px 14px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600">💾 Save</button>
    </div>`;
}

// ── Actions ─────────────────────────────────────────────────────
window.toggleChannelPanel = function (key) {
    _openPanel = _openPanel === key ? null : key;
    window.render();
};

// Email actions
window.saveEmailConfig = async function () {
    try {
        const data = {
            smtp_host: document.getElementById('smtp_host')?.value,
            smtp_port: parseInt(document.getElementById('smtp_port')?.value) || 587,
            from_name: document.getElementById('from_name')?.value,
            from_email: document.getElementById('from_email')?.value,
            daily_limit: parseInt(document.getElementById('daily_limit')?.value) || 450,
            recipients: _emailConfig?.recipients || [],
            smtp_accounts: _emailConfig?.smtp_accounts || [],
        };
        await API.put('/platform/email-settings', data);
        _emailConfig = { ..._emailConfig, ...data };
        showToast('✅ Email settings saved!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.saveEmailSetting = async function (key, value) {
    try { await API.put('/platform/email-settings', { [key]: value }); _emailConfig[key] = value; window.render(); showToast(`Email ${value ? 'enabled' : 'disabled'}`, value ? 'success' : 'info'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.addSmtpAccount = async function () {
    const email = document.getElementById('new_smtp_email')?.value?.trim();
    const pass = document.getElementById('new_smtp_pass')?.value?.trim();
    if (!email || !email.includes('@') || !pass) return showToast('Enter email + app password', 'error');
    const accounts = _emailConfig?.smtp_accounts || [];
    if (accounts.find(a => a.email === email)) return showToast('Already exists', 'info');
    accounts.push({ email, password: pass, sent_today: 0, last_reset: new Date().toISOString().slice(0, 10) });
    try { await API.put('/platform/email-settings', { smtp_accounts: accounts }); _emailConfig.smtp_accounts = accounts; window.render(); showToast('✅ Account added', 'success'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.removeSmtpAccount = async function (idx) {
    const accounts = [...(_emailConfig?.smtp_accounts || [])]; const removed = accounts.splice(idx, 1);
    try { await API.put('/platform/email-settings', { smtp_accounts: accounts }); _emailConfig.smtp_accounts = accounts; window.render(); showToast('Removed: ' + removed[0]?.email, 'info'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.addRecipient = async function () {
    const email = document.getElementById('new_recipient')?.value?.trim();
    if (!email || !email.includes('@')) return showToast('Enter valid email', 'error');
    const list = _emailConfig?.recipients || [];
    if (list.includes(email)) return showToast('Already added', 'info');
    list.push(email);
    try { await API.put('/platform/email-settings', { recipients: list }); _emailConfig.recipients = list; window.render(); showToast('✅ Added', 'success'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.removeRecipient = async function (idx) {
    const list = [...(_emailConfig?.recipients || [])]; const removed = list.splice(idx, 1);
    try { await API.put('/platform/email-settings', { recipients: list }); _emailConfig.recipients = list; window.render(); showToast('Removed: ' + removed[0], 'info'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.sendTestEmail = async function () {
    try { showToast('📧 Sending...', 'info'); const res = await API.post('/platform/email-settings/test'); showToast('✅ ' + (res.message || 'Sent!'), 'success'); } catch (e) { showToast('❌ ' + (e.message || 'Failed'), 'error'); }
};

// Slack actions
window.addSlackWebhook = async function () {
    const name = document.getElementById('new_slack_name')?.value?.trim() || 'General';
    const url = document.getElementById('new_slack_url')?.value?.trim();
    if (!url || !url.startsWith('https://')) return showToast('Enter valid webhook URL', 'error');
    // Read selected events from checkboxes
    const selectedEvents = [...document.querySelectorAll('.new-slack-evt:checked')].map(cb => cb.value);
    if (!selectedEvents.length) return showToast('Select at least 1 event for this channel', 'error');
    const cfg = _channelConfigs.slack || {};
    const webhooks = cfg.config?.webhooks || [];
    webhooks.push({ name, url, enabled: true, events: selectedEvents });
    try { await API.put('/platform/channel-settings/slack', { config: { webhooks } }); _channelConfigs.slack = { ...cfg, config: { webhooks } }; window.render(); showToast('✅ ' + name + ' added with ' + selectedEvents.length + ' events', 'success'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.removeSlackWebhook = async function (idx) {
    const cfg = _channelConfigs.slack || {};
    const webhooks = [...(cfg.config?.webhooks || [])]; webhooks.splice(idx, 1);
    try { await API.put('/platform/channel-settings/slack', { config: { webhooks } }); _channelConfigs.slack = { ...cfg, config: { webhooks } }; window.render(); showToast('Webhook removed', 'info'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.saveSlackConfig = async function () {
    try {
        const config = JSON.parse(JSON.stringify(_channelConfigs.slack?.config || {}));
        // Remove UI-only flags before saving
        (config.webhooks || []).forEach(wh => delete wh._showEvents);
        await API.put('/platform/channel-settings/slack', { config });
        showToast('✅ Slack saved!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// Toggle expand/collapse event checkboxes
window.toggleSlackEvents = function (idx) {
    const cfg = _channelConfigs.slack || {};
    const webhooks = cfg.config?.webhooks || [];
    if (webhooks[idx]) { webhooks[idx]._showEvents = !webhooks[idx]._showEvents; }
    window.render();
};

// Toggle single event on a webhook
window.toggleSlackEvent = function (idx, eventKey, checked) {
    const cfg = _channelConfigs.slack || {};
    const wh = (cfg.config?.webhooks || [])[idx];
    if (!wh) return;
    if (!wh.events) wh.events = [];
    if (checked && !wh.events.includes(eventKey)) wh.events.push(eventKey);
    if (!checked) wh.events = wh.events.filter(e => e !== eventKey);
    window.render();
};

// Toggle "All Events" on a webhook
window.toggleSlackAllEvents = function (idx, checked) {
    const cfg = _channelConfigs.slack || {};
    const wh = (cfg.config?.webhooks || [])[idx];
    if (!wh) return;
    // checked = All Events → empty array (backend treats as "all")
    // unchecked = switch to individual selection → populate all 8 event keys
    wh.events = checked ? [] : ['fraud_detected', 'scan_anomaly', 'sla_violation', 'new_tenant', 'usage_threshold', 'certificate_expiry', 'system_health', 'payment_failed'];
    window.render();
};
window.testChannel = async function (ch) {
    try { showToast(`Testing ${ch}...`, 'info'); const res = await API.post('/platform/channel-settings/' + ch + '/test'); showToast('✅ ' + (res.message || 'Sent!'), 'success'); } catch (e) { showToast('❌ ' + (e.message || 'Failed'), 'error'); }
};

// SMS actions
window.saveSmsConfig = async function () {
    try {
        const config = {
            provider: 'twilio',
            account_sid: document.getElementById('sms_sid')?.value,
            auth_token: document.getElementById('sms_token')?.value,
            from_number: document.getElementById('sms_from')?.value,
            recipients: _channelConfigs.sms?.config?.recipients || [],
        };
        await API.put('/platform/channel-settings/sms', { config });
        _channelConfigs.sms = { ..._channelConfigs.sms, config };
        showToast('✅ SMS saved!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.addSmsRecipient = async function () {
    const num = document.getElementById('new_sms_number')?.value?.trim();
    if (!num || num.length < 10) return showToast('Enter valid phone', 'error');
    const cfg = _channelConfigs.sms || {};
    const recipients = cfg.config?.recipients || [];
    if (recipients.includes(num)) return showToast('Already added', 'info');
    recipients.push(num);
    const config = { ...cfg.config, recipients };
    try { await API.put('/platform/channel-settings/sms', { config }); _channelConfigs.sms = { ...cfg, config }; window.render(); showToast('✅ Added', 'success'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};
window.removeSmsRecipient = async function (idx) {
    const cfg = _channelConfigs.sms || {};
    const recipients = [...(cfg.config?.recipients || [])]; recipients.splice(idx, 1);
    const config = { ...cfg.config, recipients };
    try { await API.put('/platform/channel-settings/sms', { config }); _channelConfigs.sms = { ...cfg, config }; window.render(); showToast('Removed', 'info'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// Push actions
window.savePushConfig = async function () {
    try {
        const config = {
            provider: 'web_push',
            vapid_public_key: document.getElementById('push_pub')?.value,
            vapid_private_key: document.getElementById('push_priv')?.value,
            subscriptions: _channelConfigs.push?.config?.subscriptions || [],
        };
        await API.put('/platform/channel-settings/push', { config });
        _channelConfigs.push = { ..._channelConfigs.push, config };
        showToast('✅ Push saved!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// Channel enable/disable
window.saveChannelEnabled = async function (ch, enabled) {
    try { await API.put('/platform/channel-settings/' + ch, { enabled }); _channelConfigs[ch] = { ..._channelConfigs[ch], enabled }; window.render(); showToast(`${ch} ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'info'); } catch (e) { showToast('Failed: ' + e.message, 'error'); }
};

// Toggle notification preference
window.toggleNotifPref = async function (id, enabled) {
    try {
        if (_notifData) { const all = [...(_notifData.channels || []), ...(_notifData.events || [])]; const item = all.find(i => i.id === id); if (item) item.enabled = enabled; window.render(); }
        const res = await API.put('/platform/notifications/' + id, { enabled });
        showToast(`${enabled ? '✅ Enabled' : '⛔ Disabled'}: ${res.message || 'updated'}`, enabled ? 'success' : 'info');
    } catch (e) {
        if (_notifData) { const all = [...(_notifData.channels || []), ...(_notifData.events || [])]; const item = all.find(i => i.id === id); if (item) item.enabled = !enabled; window.render(); }
        showToast('Failed: ' + e.message, 'error');
    }
};
// ═══════════════════════════════════════════════════════════════
// General Settings Tab
// ═══════════════════════════════════════════════════════════════
function renderGeneral() {
    const user = State.user || {};
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Platform Info -->
        <div class="card">
            <div class="card-header"><div class="card-title">${icon('server', 16)} Platform Information</div></div>
            <div style="padding:0 16px 16px">
                <table style="width:100%">
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Version</td><td style="padding:8px 0;text-align:right;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:0.82rem">v9.4.1</td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Environment</td><td style="padding:8px 0;text-align:right"><span class="badge valid" style="font-size:0.68rem">Production</span></td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Database</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem">PostgreSQL 16</td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Node.js</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem">v20.x LTS</td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Uptime</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem;color:var(--emerald)">99.97%</td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Region</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem">Asia-Pacific (SG)</td></tr>
                </table>
            </div>
        </div>

        <!-- Account Settings -->
        <div class="card">
            <div class="card-header"><div class="card-title">${icon('users', 16)} Account</div></div>
            <div style="padding:0 16px 16px">
                <table style="width:100%">
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Email</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem">${user.email || '—'}</td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Role</td><td style="padding:8px 0;text-align:right"><span class="badge" style="background:var(--violet);color:#fff;font-size:0.68rem">${(user.role || 'admin').toUpperCase()}</span></td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">MFA</td><td style="padding:8px 0;text-align:right"><span class="badge ${user.mfa_enabled ? 'valid' : 'warning'}" style="font-size:0.68rem">${user.mfa_enabled ? 'Enabled' : 'Disabled'}</span></td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Organization</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem">${user.org_name || 'TrustChecker'}</td></tr>
                    <tr><td style="padding:8px 0;font-size:0.78rem;color:var(--text-muted)">Last Login</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:0.78rem;color:var(--text-muted)">${new Date().toLocaleDateString()}</td></tr>
                </table>
            </div>
        </div>

        <!-- Security -->
        <div class="card" style="grid-column:1/-1">
            <div class="card-header"><div class="card-title">🔑 Change Password</div></div>
            <div style="padding:0 16px 16px">
                <div id="pw-msg-ops" class="settings-msg" style="display:none"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:end">
                    <div class="input-group">
                        <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Current Password</label>
                        <input class="input" id="pw-current-ops" type="password" placeholder="Current password">
                    </div>
                    <div class="input-group">
                        <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">New Password</label>
                        <input class="input" id="pw-new-ops" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number">
                    </div>
                    <div class="input-group">
                        <label style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Confirm New</label>
                        <div style="display:flex;gap:8px">
                            <input class="input" id="pw-confirm-ops" type="password" placeholder="Confirm" style="flex:1">
                            <button class="btn btn-primary" onclick="changePasswordOps()" style="white-space:nowrap">Update</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// Password change for ops
window.changePasswordOps = async function () {
    const cur = document.getElementById('pw-current-ops')?.value;
    const nw = document.getElementById('pw-new-ops')?.value;
    const conf = document.getElementById('pw-confirm-ops')?.value;
    const msg = document.getElementById('pw-msg-ops');
    if (!cur || !nw || !conf) { if (msg) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = 'All fields required'; } return; }
    if (nw !== conf) { if (msg) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = 'Passwords do not match'; } return; }
    try {
        await API.post('/auth/password', { current_password: cur, new_password: nw });
        if (msg) { msg.style.display = 'block'; msg.className = 'settings-msg success'; msg.textContent = 'Password changed successfully'; }
        ['pw-current-ops', 'pw-new-ops', 'pw-confirm-ops'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    } catch (e) { if (msg) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = e.message; } }
};

// Feature flag toggle
window.toggleFlag = async function (key, value) {
    try {
        // Optimistic update
        if (_flagList) {
            const item = _flagList.find(f => f.key === key);
            if (item) item.enabled = value;
        }
        if (!State.featureFlags) State.featureFlags = {};
        State.featureFlags[key] = value;
        window.render();
        const res = await API.put('/platform/feature-flags', { key, value });
        showToast(`${value ? '✅ Enabled' : '⛔ Disabled'}: ${key.replace(/_/g, ' ')} — ${res.message || 'saved'}`, value ? 'success' : 'info');
    } catch (e) {
        // Revert on failure
        if (_flagList) {
            const item = _flagList.find(f => f.key === key);
            if (item) item.enabled = !value;
        }
        State.featureFlags[key] = !value;
        window.render();
        showToast('Failed to toggle: ' + e.message, 'error');
    }
};

export function renderPage() {
    return renderWorkspace({
        domain: 'operations',
        title: 'Operations',
        subtitle: 'System health · Incidents · Configuration',
        icon: icon('server', 24),
        tabs: [
            { id: 'health', label: 'System Health', icon: icon('server', 14), render: renderServices },
            { id: 'incidents', label: 'Incidents', icon: icon('alert', 14), render: renderIncidents },
            { id: 'features', label: 'Feature Flags', icon: icon('settings', 14), render: renderFeatureFlags },
            { id: 'notifications', label: 'Notifications', icon: icon('bell', 14), render: renderNotifications },
            { id: 'general', label: 'General', icon: icon('settings', 14), render: renderGeneral },
        ],
    });
}
