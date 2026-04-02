/**
 * Ops – Duplicate QR Alerts (Premium Design)
 * ═══════════════════════════════════════════
 * Card-based alert view with investigation modals and real actions.
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

const ACCENT = '#0d9488';
let _alerts = null;
let _filter = 'all';

window._dupFilter = function(f) { _filter = f; if (typeof window.render === 'function') window.render(); };

// Investigation modal with real actions
window._viewDupAlert = function(idx) {
  const a = _alerts?.[idx];
  if (!a) return;
  const modal = document.createElement('div');
  modal.id = '_dup_detail_modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const hasRichDesc = a.description && a.description !== 'duplicate scan detected' && a.description.length > 25;
  const sev = a._sevObj;
  const st = a._stObj;

  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:14px;padding:28px 24px;width:560px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border-color,#e2e8f0);max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">🔍 Investigation</h3>
        <button onclick="document.getElementById('_dup_detail_modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-secondary);padding:4px 8px;border-radius:6px">✕</button>
      </div>

      <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;background:${sev.bg};border:1px solid ${sev.border};margin-bottom:16px">
        <span style="font-size:1.1rem">${sev.icon}</span>
        <span style="font-size:0.68rem;padding:2px 10px;border-radius:12px;font-weight:700;text-transform:uppercase;background:${sev.bg};color:${sev.c}">${a.severity}</span>
        <span style="font-size:0.68rem;padding:2px 10px;border-radius:12px;font-weight:600;background:${st.bg};color:${st.c}">${a.status.replace('_',' ')}</span>
        ${a.autoDetected ? '<span style="font-size:0.58rem;padding:2px 8px;border-radius:10px;background:rgba(59,130,246,0.08);color:#3b82f6;font-weight:600">🤖 Auto-detected</span>' : ''}
        <span style="margin-left:auto;font-size:0.72rem;color:var(--text-secondary)">${a.time}</span>
      </div>

      ${hasRichDesc ? `
      <div style="padding:14px 16px;border-radius:10px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.1);margin-bottom:16px">
        <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:#ef4444;font-weight:700;margin-bottom:6px">⚠️ Alert Summary</div>
        <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary);line-height:1.5">${a.description}</div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="padding:12px 14px;border-radius:8px;background:var(--bg-secondary,#f8fafc)">
          <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Source ID</div>
          <div style="font-size:0.78rem;font-weight:600;color:var(--text-primary);font-family:monospace;word-break:break-all">${a.sourceId}</div>
        </div>
        <div style="padding:12px 14px;border-radius:8px;background:var(--bg-secondary,#f8fafc)">
          <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Alert Type</div>
          <div style="font-size:0.78rem;font-weight:600;color:var(--text-primary)">${a.alertType}</div>
        </div>
        ${a.product !== 'N/A' ? `
        <div style="padding:12px 14px;border-radius:8px;background:var(--bg-secondary,#f8fafc)">
          <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Product</div>
          <div style="font-size:0.78rem;font-weight:600;color:var(--text-primary)">${a.product}</div>
        </div>` : ''}
        <div style="padding:12px 14px;border-radius:8px;background:var(--bg-secondary,#f8fafc)">
          <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Source Type</div>
          <div style="font-size:0.78rem;font-weight:600;color:var(--text-primary)">${a.sourceType}</div>
        </div>
      </div>

      ${a.detailsExtra ? `
      <div style="padding:12px 14px;border-radius:8px;background:var(--bg-secondary,#f8fafc);margin-bottom:16px">
        <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:6px">Detection Details</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);font-family:monospace;white-space:pre-wrap;line-height:1.6">${a.detailsExtra}</div>
      </div>` : ''}

      <div style="border-top:1px solid var(--border-color,#e2e8f0);padding-top:16px;margin-top:8px">
        <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:10px">Actions</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${a.status !== 'resolved' && a.status !== 'dismissed' ? `
          <button onclick="window._dupAction(${idx},'resolved')" style="flex:1;padding:10px 14px;border:none;border-radius:8px;background:#22c55e;color:#fff;font-size:0.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity 0.15s" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">✅ Mark Resolved</button>
          <button onclick="window._dupAction(${idx},'escalated')" style="flex:1;padding:10px 14px;border:none;border-radius:8px;background:#ef4444;color:#fff;font-size:0.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity 0.15s" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">🚨 Escalate</button>
          <button onclick="window._dupAction(${idx},'dismissed')" style="flex:1;padding:10px 14px;border:1px solid var(--border-color,#e2e8f0);border-radius:8px;background:transparent;color:var(--text-secondary);font-size:0.82rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">❌ Dismiss</button>
          ` : `
          <div style="flex:1;padding:12px 14px;border-radius:8px;background:${a.status === 'resolved' ? 'rgba(34,197,94,0.06)' : 'rgba(100,116,139,0.06)'};text-align:center;font-size:0.82rem;font-weight:600;color:${a.status === 'resolved' ? '#22c55e' : '#64748b'}">
            ${a.status === 'resolved' ? '✅ Resolved' : '❌ Dismissed'}
          </div>
          `}
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

// Action handler — updates alert status via API
window._dupAction = async function(idx, newStatus) {
  const a = _alerts?.[idx];
  if (!a) return;
  const labels = { resolved: 'Resolve', escalated: 'Escalate to Incident', dismissed: 'Dismiss as false positive' };
  if (!confirm(`${labels[newStatus]} this alert?`)) return;
  try {
    await API.put(`/ops/data/anomaly/${a._id}`, { status: newStatus });
    _alerts[idx].status = newStatus;
    _alerts[idx]._stObj = ST[newStatus] || ST.open;
    document.getElementById('_dup_detail_modal')?.remove();
    showToast(`✅ Alert ${newStatus}`, 'success');
    if (typeof window.render === 'function') window.render();
  } catch (e) {
        _loading = false;
    showToast('Failed: ' + (e.message || 'Unknown error'), 'error');
  }
};

let _loading = false;
let _loaded = false;
async function load() {
    if (_loading || _loaded) return;
    _loading = true;
    try {
  if (_alerts) return;
  try {
    const res = await API.get('/ops/data/duplicate-alerts');
    _alerts = (res.alerts || []).map(a => {
      const d = typeof a.details === 'string' ? (() => { try { return JSON.parse(a.details); } catch { return {}; } })() : (a.details || {});

      // Product: from server enrichment > details > parse description
      const product = a.resolved_product_name || d.product || 'N/A';

      // Description — use as-is, it's the most useful field
      const desc = a.description || '';
      const isRichDesc = desc && desc !== 'duplicate scan detected' && desc.length > 25;

      // Build detail parts from structured details
      const detailParts = [];
      if (d.timeDelta) detailParts.push(`Time delta: ${d.timeDelta}`);
      if (d.scanCount) detailParts.push(`Scan count: ${d.scanCount}`);
      if (d.timeWindow) detailParts.push(`Time window: ${d.timeWindow}`);
      if (d.device) detailParts.push(`Device: ${d.device}`);
      if (d.product_id) detailParts.push(`Product ID: ${d.product_id.slice(0,8)}…`);
      if (d.auto_detected) detailParts.push('Auto-detected: Yes');

      return {
        _id: a.id,
        sourceId: a.source_id || '—',
        sourceType: (a.source_type || 'scan').replace('_', ' '),
        alertType: (a.anomaly_type || '').replace(/_/g, ' '),
        product,
        severity: a.severity || 'medium',
        status: a.status || 'open',
        description: desc,
        cardSubtitle: isRichDesc ? desc : (product !== 'N/A' ? product : 'Duplicate scan alert'),
        autoDetected: !!d.auto_detected,
        time: timeAgo(a.detected_at),
        detailsExtra: detailParts.join('\n'),
        _sevObj: SEV[a.severity] || SEV.medium,
        _stObj: ST[a.status] || ST.open,
      };
    });
  } catch (e) {
        _loading = false; _alerts = []; }
  if (typeof window.render === 'function') window.render();
        _loaded = true;
        if (window.render) window.render();
    } catch (e) {
        console.error(e);
    } finally {
        _loading = false;
    }
}
load();

const SEV = {
  critical: { c: '#ef4444', bg: 'rgba(239,68,68,0.06)', icon: '🔴', border: 'rgba(239,68,68,0.2)' },
  high:     { c: '#f97316', bg: 'rgba(249,115,22,0.05)', icon: '🟠', border: 'rgba(249,115,22,0.15)' },
  medium:   { c: '#f59e0b', bg: 'rgba(245,158,11,0.04)', icon: '🟡', border: 'rgba(245,158,11,0.12)' },
  low:      { c: '#22c55e', bg: 'rgba(34,197,94,0.04)',  icon: '🟢', border: 'rgba(34,197,94,0.1)' },
};

const ST = {
  open:          { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  active:        { c: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  investigating: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  confirmed:     { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  escalated:     { c: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  resolved:      { c: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  dismissed:     { c: '#64748b', bg: 'rgba(100,116,139,0.08)' },
};

export function renderPage() {
  const alerts = _alerts || [];
  const filtered = _filter === 'all' ? alerts : alerts.filter(a => a.severity === _filter);
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const high = alerts.filter(a => a.severity === 'high').length;
  const open = alerts.filter(a => a.status === 'open' || a.status === 'active').length;
  const investigating = alerts.filter(a => a.status === 'investigating').length;

  return `
    <div class="sa-page">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:14px;margin-bottom:1.5rem">
        ${stat(icon('shield', 20), 'Total Alerts', alerts.length, ACCENT)}
        ${stat(icon('alertTriangle', 20), 'Critical', critical, '#ef4444')}
        ${stat(icon('zap', 20), 'High Risk', high, '#f97316')}
        ${stat(icon('clock', 20), 'Open / Investigating', open + ' / ' + investigating, '#f59e0b')}
      </div>

      <div style="display:flex;gap:6px;margin-bottom:1.2rem;flex-wrap:wrap">
        ${['all','critical','high','medium','low'].map(f => {
          const active = _filter === f;
          const cnt = f === 'all' ? alerts.length : alerts.filter(a => a.severity === f).length;
          return `<button style="padding:5px 14px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ${active ? ACCENT : 'var(--border-color,rgba(0,0,0,0.08))'};background:${active ? ACCENT : 'transparent'};color:${active ? '#fff' : 'var(--text-secondary)'};transition:all 0.15s"
            onclick="window._dupFilter('${f}')">${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} <span style="opacity:0.7">${cnt}</span></button>`;
        }).join('')}
      </div>

      ${filtered.length === 0 ? `
        <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:3rem;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px;opacity:0.4">🛡️</div>
          <div style="color:var(--text-secondary);font-size:0.85rem">No duplicate alerts${_filter !== 'all' ? ' for this severity' : ''} — all clear ✓</div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${filtered.map((a, i) => alertCard(a, alerts.indexOf(a))).join('')}
        </div>
      `}
    </div>
  `;
}

function alertCard(a, idx) {
  const sev = a._sevObj;
  const st = a._stObj;
  return `
    <div style="background:var(--card-bg);border-radius:12px;border:1px solid ${sev.border};border-left:4px solid ${sev.c};padding:16px 20px;transition:all 0.15s"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)'" onmouseout="this.style.boxShadow=''">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:200px">
          <div style="width:38px;height:38px;border-radius:10px;background:${sev.bg};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">${sev.icon}</div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              <span style="font-family:monospace;font-size:0.75rem;font-weight:700;color:var(--text-primary);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.sourceId.slice(0,8)}…</span>
              <span style="font-size:0.6rem;padding:2px 8px;border-radius:12px;font-weight:700;background:${sev.bg};color:${sev.c};text-transform:uppercase">${a.severity}</span>
              <span style="font-size:0.6rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${st.bg};color:${st.c}">${a.status.replace('_',' ')}</span>
            </div>
            <div style="font-size:0.75rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px">${a.cardSubtitle}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Detected</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${a.time}</div>
          </div>
          <button style="padding:5px 14px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;background:transparent;color:var(--text-primary);font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.15s"
            onmouseover="this.style.background='${ACCENT}';this.style.color='#fff';this.style.borderColor='${ACCENT}'"
            onmouseout="this.style.background='transparent';this.style.color='var(--text-primary)';this.style.borderColor='var(--border-color,rgba(0,0,0,0.1))'"
            onclick="window._viewDupAlert(${idx})">Investigate</button>
        </div>
      </div>
    </div>`;
}

function stat(iconHtml, label, value, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:transform 0.15s"
    onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}12;display:flex;align-items:center;justify-content:center;color:${color}">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.4rem;font-weight:800;color:${color};line-height:1.2;margin-top:2px">${value}</div>
  </div>`;
}

function timeAgo(d) { if (!d) return '—'; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; }
