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
// Feature Flags Tab
// ═══════════════════════════════════════════════════════════════
function renderFeatureFlags() {
    const flags = State.featureFlags || {};
    const flagList = [
        { key: 'ai_anomaly', label: 'AI Anomaly Detection', desc: 'ML-powered fraud pattern detection', icon: '🤖', color: '#8b5cf6' },
        { key: 'digital_twin', label: 'Digital Twin', desc: 'Virtual product simulation engine', icon: '🔮', color: '#06b6d4' },
        { key: 'carbon_tracking', label: 'Carbon Intelligence', desc: 'Product Carbon Passports · Scope 1,2,3 · ESG', icon: '🌱', color: '#10b981' },
        { key: 'nft_certificates', label: 'NFT Certificates', desc: 'Blockchain-based product certificates', icon: '🎫', color: '#f59e0b' },
        { key: 'demand_sensing', label: 'Demand Sensing AI', desc: 'Predictive inventory analytics', icon: '📊', color: '#3b82f6' },
        { key: 'gri_reports', label: 'GRI Sustainability Reports', desc: 'Automated ESG compliance reporting', icon: '📋', color: '#22c55e' },
        { key: 'sso_saml', label: 'SSO / SAML Integration', desc: 'Enterprise single sign-on support', icon: '🔐', color: '#ef4444' },
        { key: 'webhook_events', label: 'Webhook Events', desc: 'Real-time event delivery to external systems', icon: '🔗', color: '#a855f7' },
    ];

    return `
    <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
        <div>
            <div style="font-size:0.78rem;color:var(--text-muted)">Manage platform-wide feature toggles. Changes apply to all tenants.</div>
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);background:var(--bg-secondary);padding:4px 12px;border-radius:20px">
            ${Object.values(flags).filter(v => v).length} / ${flagList.length} enabled
        </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px">
        ${flagList.map(f => {
        const enabled = flags[f.key] ?? false;
        return `
            <div class="card" style="padding:16px;display:flex;align-items:center;gap:14px;transition:all 0.2s;border-left:3px solid ${enabled ? f.color : 'transparent'};opacity:${enabled ? '1' : '0.6'}">
                <div style="width:40px;height:40px;border-radius:10px;background:${enabled ? f.color + '22' : 'var(--bg-secondary)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${f.icon}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:700">${f.label}</div>
                    <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${f.desc}</div>
                </div>
                <label style="position:relative;width:48px;height:26px;cursor:pointer;flex-shrink:0">
                    <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleFlag('${f.key}', this.checked)"
                        style="display:none">
                    <div style="position:absolute;inset:0;background:${enabled ? f.color : '#cbd5e1'};border-radius:13px;transition:background 0.3s;${enabled ? '' : 'border:1px solid #94a3b8;'}"></div>
                    <div style="position:absolute;top:3px;left:${enabled ? '24px' : '3px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:left 0.3s;box-shadow:0 2px 4px rgba(0,0,0,0.25)"></div>
                </label>
            </div>`;
    }).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// Notifications Tab
// ═══════════════════════════════════════════════════════════════
function renderNotifications() {
    const channels = [
        { key: 'email_alerts', label: 'Email Alerts', desc: 'Critical fraud & anomaly notifications', icon: '📧', default: true },
        { key: 'slack_webhooks', label: 'Slack Webhooks', desc: 'Real-time channel notifications', icon: '💬', default: false },
        { key: 'sms_alerts', label: 'SMS Alerts', desc: 'High-priority mobile notifications', icon: '📱', default: false },
        { key: 'push_notifications', label: 'Push Notifications', desc: 'Browser & mobile push alerts', icon: '🔔', default: true },
    ];
    const events = [
        { key: 'fraud_detected', label: 'Fraud Detected', severity: 'critical' },
        { key: 'scan_anomaly', label: 'Scan Anomaly', severity: 'warning' },
        { key: 'sla_violation', label: 'SLA Violation', severity: 'warning' },
        { key: 'new_tenant', label: 'New Tenant Registered', severity: 'info' },
        { key: 'usage_threshold', label: 'Usage Threshold (>80%)', severity: 'warning' },
        { key: 'certificate_expiry', label: 'Certificate Expiring', severity: 'critical' },
        { key: 'system_health', label: 'System Health Alert', severity: 'critical' },
        { key: 'payment_failed', label: 'Payment Failed', severity: 'warning' },
    ];
    const sevColors = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const sevLabels = { critical: 'Critical', warning: 'Warning', info: 'Info' };

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Channels -->
        <div class="card">
            <div class="card-header"><div class="card-title">${icon('bell', 16)} Notification Channels</div></div>
            <div style="padding:0 16px 16px">
                ${channels.map(c => `
                <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
                    <span style="font-size:1.2rem">${c.icon}</span>
                    <div style="flex:1">
                        <div style="font-size:0.82rem;font-weight:600">${c.label}</div>
                        <div style="font-size:0.68rem;color:var(--text-muted)">${c.desc}</div>
                    </div>
                    <span class="badge ${c.default ? 'valid' : ''}" style="font-size:0.65rem">${c.default ? 'Active' : 'Inactive'}</span>
                </div>`).join('')}
            </div>
        </div>

        <!-- Event Subscriptions -->
        <div class="card">
            <div class="card-header"><div class="card-title">${icon('alert', 16)} Event Subscriptions</div></div>
            <div style="padding:0 16px 16px">
                ${events.map(e => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                    <div style="width:8px;height:8px;border-radius:50%;background:${sevColors[e.severity]};flex-shrink:0"></div>
                    <div style="flex:1">
                        <div style="font-size:0.78rem;font-weight:600">${e.label}</div>
                    </div>
                    <span style="font-size:0.62rem;padding:2px 8px;border-radius:10px;background:${sevColors[e.severity]}22;color:${sevColors[e.severity]};font-weight:600">${sevLabels[e.severity]}</span>
                    <span class="badge valid" style="font-size:0.62rem">Subscribed</span>
                </div>`).join('')}
            </div>
        </div>
    </div>`;
}

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
        if (!State.featureFlags) State.featureFlags = {};
        State.featureFlags[key] = value;
        window.render();
        const res = await API.put('/platform/feature-flags', { key, value });
        showToast(`${value ? '✅ Enabled' : '⛔ Disabled'}: ${key.replace(/_/g, ' ')} — ${res.message || 'saved'}`, value ? 'success' : 'info');
    } catch (e) {
        // Revert on failure
        State.featureFlags[key] = !value;
        window.render();
        showToast('Failed to toggle: ' + e.message, 'error');
    }
};

let _flagsLoaded = false;

export function renderPage() {
    // Load flags from API on first visit
    if (!_flagsLoaded) {
        _flagsLoaded = true;
        if (!State.featureFlags) {
            // Defaults while loading
            State.featureFlags = {
                ai_anomaly: true, digital_twin: true, carbon_tracking: true,
                nft_certificates: true, demand_sensing: false, gri_reports: true,
                sso_saml: false, webhook_events: true,
            };
        }
        // Fetch real flags from DB
        API.get('/platform/feature-flags').then(data => {
            if (data?.flags) {
                State.featureFlags = { ...State.featureFlags, ...data.flags };
                window.render();
            }
        }).catch(() => { /* use defaults */ });
    }

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
