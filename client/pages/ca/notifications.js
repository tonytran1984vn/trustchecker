/**
 * Company Admin – Notification Settings
 * ═══════════════════════════════════════
 * Alert threshold config, notification channels, severity filter
 * API: /governance/notifications GET/POST
 */
import { API as api } from '../../core/api.js';

let _data = null;
let _saving = false;

export function renderPage() {
    if (!_data) { loadData(); return loading(); }
    const d = _data;

    return `
    <div class="page-content stagger-in">
      <div class="page-header"><h1>🔔 Notification Settings</h1><p class="desc">Configure alert thresholds and notification preferences</p></div>

      <!-- Alert Thresholds -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">⚡ Alert Thresholds</div></div>
        <div style="padding:20px;display:grid;gap:20px">
          ${sliderField('fraud_rate_threshold', 'Fraud Rate Alert Threshold', d.fraud_rate_threshold, '%', 'Trigger alert when fraud rate exceeds this value', 0, 50)}
          ${sliderField('trust_drop_threshold', 'Trust Score Drop Alert', d.trust_drop_threshold, 'pts', 'Alert when product trust drops by this many points (week over week)', 0, 50)}
          ${sliderField('anomaly_multiplier', 'Anomaly Detection Multiplier', d.anomaly_multiplier, 'x', 'Alert when flagged scans exceed weekly average by this multiplier', 1, 10)}
        </div>
      </div>

      <!-- Notification Channels -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">📡 Notification Channels</div></div>
        <div style="padding:20px;display:grid;gap:16px">
          ${toggleField('channel_email', '📧 Email Notifications', d.channels.email, 'Send alerts to admin email addresses')}
          ${toggleField('channel_inapp', '🔔 In-App Notifications', d.channels.in_app, 'Show alerts in the dashboard notification center')}
        </div>
      </div>

      <!-- Severity Filter -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">🎚️ Severity Filter</div></div>
        <div style="padding:20px">
          <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px">Only receive notifications for selected severity levels:</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${['critical', 'high', 'medium', 'low'].map(sev => {
        const checked = (d.severity_filter || []).includes(sev);
        const colors = { critical: '#ef4444', high: '#f97316', medium: '#a855f7', low: '#3b82f6' };
        const c = colors[sev];
        return `
              <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;border:1px solid ${checked ? c : 'var(--border)'};background:${checked ? c + '12' : 'var(--card-bg)'};cursor:pointer;font-size:0.82rem;font-weight:600">
                <input type="checkbox" id="sev_${sev}" ${checked ? 'checked' : ''} onchange="window.__toggleSev('${sev}')" style="accent-color:${c}">
                <span style="color:${checked ? c : 'var(--text-secondary)'};text-transform:capitalize">${sev}</span>
              </label>`;
    }).join('')}
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div style="display:flex;justify-content:flex-end;gap:12px">
        <button onclick="window.__saveNotifSettings()" id="saveNotifBtn"
                style="padding:12px 32px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;cursor:pointer;font-size:0.88rem;transition:opacity 0.2s">
          ${_saving ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  `;
}

function sliderField(id, label, value, unit, desc, min, max) {
    return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label style="font-weight:600;font-size:0.85rem">${label}</label>
        <span style="font-weight:800;color:#6366f1;font-size:1rem" id="val_${id}">${value}${unit}</span>
      </div>
      <input type="range" id="inp_${id}" min="${min}" max="${max}" value="${value}" step="1"
             oninput="document.getElementById('val_${id}').textContent=this.value+'${unit}'"
             style="width:100%;accent-color:#6366f1">
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${desc}</div>
    </div>`;
}

function toggleField(id, label, checked, desc) {
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:0.85rem">${label}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${desc}</div>
      </div>
      <span onclick="window.__toggleChannel('${id}')" style="position:relative;width:44px;height:24px;display:inline-block;cursor:pointer" id="${id}_wrap">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="display:none">
        <span id="${id}_track" style="position:absolute;inset:0;background:${checked ? '#22c55e' : '#cbd5e1'};border-radius:12px;transition:0.3s"></span>
        <span id="${id}_thumb" style="position:absolute;top:2px;left:${checked ? '22px' : '2px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.25)"></span>
      </span>
    </div>`;
}

async function loadData() {
    try {
        _data = await api.get('/org-admin/governance/notifications');
        window.__toggleChannel = (id) => {
            // Update _data directly (so renderPage uses new state)
            if (id === 'channel_email') _data.channels.email = !_data.channels.email;
            else if (id === 'channel_inapp') _data.channels.in_app = !_data.channels.in_app;
            // Re-render with updated _data
            const mc = document.getElementById('main-content');
            if (mc) mc.innerHTML = renderPage();
        };
        window.__toggleSev = (sev) => {
            const idx = _data.severity_filter.indexOf(sev);
            if (idx >= 0) _data.severity_filter.splice(idx, 1);
            else _data.severity_filter.push(sev);
        };
        window.__saveNotifSettings = async () => {
            _saving = true;
            try {
                // Read values from _data (already updated by toggle handlers)
                const body = {
                    fraud_rate_threshold: parseInt(document.getElementById('inp_fraud_rate_threshold')?.value) || _data.fraud_rate_threshold || 5,
                    trust_drop_threshold: parseInt(document.getElementById('inp_trust_drop_threshold')?.value) || _data.trust_drop_threshold || 15,
                    anomaly_multiplier: parseInt(document.getElementById('inp_anomaly_multiplier')?.value) || _data.anomaly_multiplier || 2,
                    channels: {
                        email: _data.channels?.email || false,
                        in_app: _data.channels?.in_app !== false,
                    },
                    severity_filter: _data.severity_filter,
                };
                const result = await api.post('/org-admin/governance/notifications', body);
                if (result.notifications) _data = result.notifications;
                _saving = false;
                const mc2 = document.getElementById('main-content');
                if (mc2) mc2.innerHTML = renderPage();
                // Show success toast
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:10px;background:#22c55e;color:#fff;font-weight:600;font-size:0.82rem;z-index:9999;animation:fadeIn 0.3s';
                toast.textContent = '✅ Settings saved!';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            } catch (e) {
                _saving = false;
                console.error('[Notif] Save error:', e);
                const mc3 = document.getElementById('main-content');
                if (mc3) mc3.innerHTML = renderPage();
            }
        };
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = renderPage();
    } catch (e) { console.error('[Notif]', e); }
}

function loading() {
    return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading notification settings...</span></div>';
}
