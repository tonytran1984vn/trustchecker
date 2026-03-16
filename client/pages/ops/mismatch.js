/**
 * Ops – Mismatch Detection (Premium Design)
 * ═══════════════════════════════════════════
 * Clean mismatch alerts with stats, severity indicators, and action buttons.
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

const ACCENT = '#0d9488';
let _mismatches = null;

async function load() {
  if (_mismatches) return;
  try {
    const res = await API.get('/ops/data/mismatch-alerts');
    _mismatches = (res.mismatches || []).map(m => {
      const d = typeof m.details === 'string' ? (() => { try { return JSON.parse(m.details); } catch { return {}; } })() : (m.details || {});
      return {
        id: m.source_id || shortId(m.id),
        type: (m.anomaly_type || '').replace(/_/g, ' '),
        location: d.route || d.product || m.description || '—',
        expected: d.expected || d.system || '—',
        actual: d.received || d.physical || '—',
        variance: d.variance != null ? (d.variance > 0 ? `+${d.variance}` : `${d.variance}`) : '—',
        severity: m.severity || 'medium',
        status: m.status || 'open',
        description: m.description || '',
        time: timeAgo(m.detected_at),
      };
    });
    window._mmData = _mismatches;
  } catch (e) { _mismatches = []; }
  if (typeof window.render === 'function') window.render();
}
load();

export function renderPage() {
  const mismatches = _mismatches || [];
  const open = mismatches.filter(m => m.status === 'open').length;
  const high = mismatches.filter(m => m.severity === 'high').length;
  const investigating = mismatches.filter(m => m.status === 'investigating').length;

  const sevStyle = { high: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' }, medium: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' }, low: { c: '#22c55e', bg: 'rgba(34,197,94,0.08)' } };
  const statusStyle = { open: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' }, investigating: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' }, resolved: { c: '#22c55e', bg: 'rgba(34,197,94,0.08)' } };

  return `
    <div class="sa-page">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.5rem">
        ${mStat(icon('alertTriangle', 20, '#ef4444'), 'Total Mismatches', mismatches.length, '#ef4444')}
        ${mStat(icon('x', 20, '#ef4444'), 'Open', open, open > 0 ? '#ef4444' : '#22c55e')}
        ${mStat(icon('search', 20, '#f59e0b'), 'Investigating', investigating, '#f59e0b')}
        ${mStat(icon('alertTriangle', 20, '#ef4444'), 'High Severity', high, high > 0 ? '#ef4444' : '#22c55e')}
      </div>

      <!-- Table -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <h3 style="margin:0 0 16px;font-size:1rem;font-weight:600">Mismatch Alerts</h3>
        ${mismatches.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary)">
          <div style="font-size:2rem;margin-bottom:8px;opacity:0.5">✓</div>
          <div>No mismatch alerts — all clear</div>
        </div>` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${mismatches.map(m => {
            const sev = sevStyle[m.severity] || sevStyle.medium;
            const st = statusStyle[m.status] || statusStyle.open;
            return `<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;border:1px solid ${sev.bg.replace('0.08', '0.15')};background:${m.severity === 'high' ? 'rgba(239,68,68,0.02)' : 'transparent'};transition:box-shadow 0.15s"
              onmouseover="this.style.boxShadow='0 2px 10px rgba(0,0,0,0.04)'" onmouseout="this.style.boxShadow=''">
              <div style="width:36px;height:36px;border-radius:8px;background:${sev.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${icon('alertTriangle', 16, sev.c)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                  <span style="font-weight:600;font-size:0.82rem;color:var(--text-primary)">${m.type || 'Mismatch'}</span>
                  <span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:${sev.bg};color:${sev.c};font-weight:600;text-transform:uppercase">${m.severity}</span>
                  <span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:${st.bg};color:${st.c};font-weight:600">${m.status}</span>
                </div>
                <div style="font-size:0.72rem;color:var(--text-secondary);display:flex;gap:12px;flex-wrap:wrap">
                  <span>${m.location}</span>
                  <span>Expected: <strong>${m.expected}</strong></span>
                  <span>Actual: <strong style="color:${sev.c}">${m.actual}</strong></span>
                  ${m.variance !== '—' ? `<span>Variance: <strong style="color:${sev.c}">${m.variance}</strong></span>` : ''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
                <span style="font-size:0.68rem;color:var(--text-secondary)">${m.time}</span>
                <button style="padding:4px 12px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:6px;background:transparent;color:var(--text-primary);font-size:0.68rem;cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='#0d9488';this.style.color='#fff';this.style.borderColor='#0d9488'" onmouseout="this.style.background='transparent';this.style.color='var(--text-primary)';this.style.borderColor='var(--border-color,rgba(0,0,0,0.1))'" onclick="window._viewMismatch(${mismatches.indexOf(m)})">View</button>
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>
    </div>
  `;
}

function shortId(id) { return id ? id.slice(0, 8) : '—'; }
function timeAgo(d) { if (!d) return '—'; const m = Math.floor((Date.now()-new Date(d).getTime())/60000); if (m < 60) return `${m}m ago`; const h = Math.floor(m/60); if (h < 24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; }
function mStat(iconHtml, label, value, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2">${value}</div>
  </div>`;
}

window._viewMismatch = function(idx) {
  const m = window._mmData?.[idx];
  if (!m) return;
  const sevC = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
  const sc = sevC[m.severity] || '#f59e0b';
  const modal = document.createElement('div');
  modal.id = '_mm_detail_modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:14px;padding:28px 24px;width:520px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:1px solid var(--border-color,#e2e8f0)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">⚠️ Mismatch Detail</h3>
        <button onclick="document.getElementById('_mm_detail_modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-secondary);padding:4px 8px;border-radius:6px">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;background:${sc}08;border:1px solid ${sc}20">
          <span style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${m.type || 'Mismatch'}</span>
          <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:700;text-transform:uppercase;background:${sc}12;color:${sc}">${m.severity}</span>
          <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${m.status==='open'?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)'};color:${m.status==='open'?'#ef4444':'#f59e0b'}">${m.status}</span>
        </div>
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Source</div>
          <div style="font-size:0.85rem;font-family:monospace;color:var(--text-primary)">${m.id}</div>
        </div>
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Location / Route</div>
          <div style="font-size:0.85rem;color:var(--text-primary)">${m.location}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Expected</div>
            <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${m.expected}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Actual</div>
            <div style="font-size:1rem;font-weight:700;color:${sc}">${m.actual}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Variance</div>
            <div style="font-size:1rem;font-weight:700;color:${sc}">${m.variance}</div>
          </div>
        </div>
        ${m.description ? `<div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Description</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">${m.description}</div>
        </div>` : ''}
        <div>
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Detected</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">${m.time}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button onclick="document.getElementById('_mm_detail_modal')?.remove()" style="flex:1;padding:10px;background:var(--bg-secondary,#f1f5f9);color:var(--text-primary);border:1px solid var(--border-color,#e2e8f0);border-radius:8px;cursor:pointer;font-weight:500;font-size:0.85rem">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
};
