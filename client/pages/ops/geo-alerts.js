/**
 * Ops – Geo Anomaly Alerts (Premium Design)
 * ══════════════════════════════════════════
 * Card-based geo alert view with detail modals and proper data extraction.
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

const ACCENT = '#0d9488';
let _alerts = null;
let _filter = 'all';

window._geoFilter = function(f) { _filter = f; if (typeof window.render === 'function') window.render(); };

// Detail modal
window._viewGeoAlert = function(idx) {
  const a = _alerts?.[idx];
  if (!a) return;
  const d = a._raw;
  const modal = document.createElement('div');
  modal.id = '_geo_detail_modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:14px;padding:28px 24px;width:520px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border-color,#e2e8f0)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">🌍 Geo Alert Detail</h3>
        <button onclick="document.getElementById('_geo_detail_modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-secondary);padding:4px 8px;border-radius:6px">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;background:${a._sevObj.bg};border:1px solid ${a._sevObj.border}">
          <span style="font-size:0.68rem;padding:2px 10px;border-radius:12px;font-weight:700;text-transform:uppercase;background:${a._sevObj.bg};color:${a._sevObj.c}">${a.severity}</span>
          <span style="font-size:0.68rem;padding:2px 10px;border-radius:12px;font-weight:600;background:${a._stObj.bg};color:${a._stObj.c}">${a.status.replace('_',' ')}</span>
        </div>
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Product</div>
          <div style="font-size:0.92rem;font-weight:600;color:var(--text-primary)">${a.product}</div>
        </div>
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Alert Type</div>
          <div style="font-size:0.85rem;color:var(--text-primary)">${a.alertType}</div>
        </div>
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Location</div>
          <div style="font-size:0.85rem;color:var(--text-primary)">📍 ${a.location}</div>
        </div>
        ${a.description ? `<div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Description</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">${a.description}</div>
        </div>` : ''}
        ${a.detailsExtra ? `<div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Details</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);font-family:monospace;background:rgba(0,0,0,0.03);padding:10px 12px;border-radius:8px;white-space:pre-wrap;line-height:1.5">${a.detailsExtra}</div>
        </div>` : ''}
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Detected</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">${a.time}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button onclick="document.getElementById('_geo_detail_modal')?.remove()" style="flex:1;padding:10px;background:var(--bg-secondary,#f1f5f9);color:var(--text-primary);border:1px solid var(--border-color,#e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.85rem">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

async function load() {
  if (_alerts) return;
  try {
    const res = await API.get('/ops/data/geo-alerts');
    _alerts = (res.alerts || []).map(a => {
      const d = typeof a.details === 'string' ? (() => { try { return JSON.parse(a.details); } catch { return {}; } })() : (a.details || {});
      // Extract location — priority: details.location > fromCity/toCity > geo_city > extracted_location > description
      let location = d.location
        || (d.fromCity && d.toCity ? `${d.fromCity} → ${d.toCity}` : d.fromCity || d.toCity || '')
        || [a.geo_city, a.geo_country].filter(Boolean).join(', ')
        || a.extracted_location
        || '';
      if (!location && a.description) {
        // "Scanned in Lagos, expected EU" → "Lagos"
        const m = a.description.match(/(?:scanned |in |from |at )([A-Z][a-zA-Z ]+?)(?:,| -|$)/i);
        if (m) location = m[1].trim();
      }
      if (!location) location = d.outlet || d.region || a.description || 'N/A';
      // Extract product name — priority: JOIN result > details > description
      const product = a.product_name || d.product || '';
      // Build details display
      const detailParts = [];
      if (d.authorizedRegions) detailParts.push(`Authorized regions: ${d.authorizedRegions.join(', ')}`);
      if (d.timeDelta) detailParts.push(`Time delta: ${d.timeDelta}`);
      if (d.distance) detailParts.push(`Distance: ${d.distance}`);
      if (d.scanCount) detailParts.push(`Scan count: ${d.scanCount}`);
      if (d.outlet) detailParts.push(`Outlet: ${d.outlet}`);
      if (d.ipCluster) detailParts.push(`IP cluster detected`);
      const alertType = (a.alert_type || '').replace(/_/g, ' ').replace(/\bgeo\b/i, 'Geo');

      return {
        product,
        location,
        severity: a.severity || 'medium',
        status: a.status || 'open',
        alertType: alertType || 'Geo anomaly',
        description: a.description || '',
        time: timeAgo(a.created_at || a.scanned_at),
        detailsExtra: detailParts.join('\n'),
        _raw: a,
        _sevObj: SEV[a.severity] || SEV.medium,
        _stObj: ST[a.status] || ST.open,
      };
    });
  } catch (e) { _alerts = []; }
  if (typeof window.render === 'function') window.render();
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
  investigating: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  resolved:      { c: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  dismissed:     { c: '#64748b', bg: 'rgba(100,116,139,0.08)' },
};

export function renderPage() {
  const alerts = _alerts || [];
  const filtered = _filter === 'all' ? alerts : alerts.filter(a => a.status === _filter);
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const high = alerts.filter(a => a.severity === 'high').length;
  const investigating = alerts.filter(a => a.status === 'investigating').length;

  return `
    <div class="sa-page">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:14px;margin-bottom:1.5rem">
        ${stat(icon('globe', 20), 'Geo Alerts', alerts.length, ACCENT)}
        ${stat(icon('alertTriangle', 20), 'Critical', critical, '#ef4444')}
        ${stat(icon('zap', 20), 'High Severity', high, '#f97316')}
        ${stat(icon('search', 20), 'Investigating', investigating, '#f59e0b')}
      </div>

      <!-- Status Filters -->
      <div style="display:flex;gap:6px;margin-bottom:1.2rem;flex-wrap:wrap">
        ${['all','open','investigating','resolved','dismissed'].map(f => {
          const active = _filter === f;
          const cnt = f === 'all' ? alerts.length : alerts.filter(a => a.status === f).length;
          return `<button style="padding:5px 14px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ${active ? ACCENT : 'var(--border-color,rgba(0,0,0,0.08))'};background:${active ? ACCENT : 'transparent'};color:${active ? '#fff' : 'var(--text-secondary)'};transition:all 0.15s"
            onclick="window._geoFilter('${f}')">${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} <span style="opacity:0.7">${cnt}</span></button>`;
        }).join('')}
      </div>

      <!-- Alert Cards -->
      ${filtered.length === 0 ? `
        <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:3rem;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px;opacity:0.4">🌍</div>
          <div style="color:var(--text-secondary);font-size:0.85rem">No geo alerts${_filter !== 'all' ? ' with this status' : ''} — all clear ✓</div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${filtered.map((a, idx) => alertCard(a, alerts.indexOf(a))).join('')}
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
        <!-- Left -->
        <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:200px">
          <div style="width:38px;height:38px;border-radius:10px;background:${sev.bg};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">🌐</div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              <span style="font-size:0.82rem;font-weight:600;color:var(--text-primary)">${a.product}</span>
              <span style="font-size:0.6rem;padding:2px 8px;border-radius:12px;font-weight:700;background:${sev.bg};color:${sev.c};text-transform:uppercase">${a.severity}</span>
              <span style="font-size:0.6rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${st.bg};color:${st.c}">${a.status.replace('_',' ')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary)">
              <span>📍 ${a.location}</span>
            </div>
          </div>
        </div>
        <!-- Right -->
        <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Detected</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${a.time}</div>
          </div>
          <button style="padding:5px 14px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;background:transparent;color:var(--text-primary);font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.15s"
            onmouseover="this.style.background='${ACCENT}';this.style.color='#fff';this.style.borderColor='${ACCENT}'"
            onmouseout="this.style.background='transparent';this.style.color='var(--text-primary)';this.style.borderColor='var(--border-color,rgba(0,0,0,0.1))'"
            onclick="window._viewGeoAlert(${idx})">View Details</button>
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
