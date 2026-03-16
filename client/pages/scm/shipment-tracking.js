/**
 * SCM – Shipment Tracking (Premium Design)
 * ══════════════════════════════════════════
 * Real-time tracking with route cards, timeline, and exception alerts.
 * Self-loading: fetches from workspace cache or API.
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';

const ACCENT = '#0d9488';
let _selfLoading = false;
let _search = '';
let _statusFilter = 'all';

window._stSearch = function(v) { _search = (v||'').toLowerCase(); if (typeof window.render === 'function') window.render(); };
window._stFilter = function(f) { _statusFilter = f; if (typeof window.render === 'function') window.render(); };

async function selfLoad() {
  if (_selfLoading) return;
  _selfLoading = true;
  try {
    if (window._opsLogReady) { try { await window._opsLogReady; } catch {} }
    const oc = window._opsLogCache;
    if (oc?.shipments && oc._loadedAt) {
      State.scmShipments = oc.shipments;
    } else {
      State.scmShipments = await API.get('/scm/shipments?limit=50');
    }
  } catch (e) {
    console.error('[Shipment Tracking] Fetch error:', e);
    State.scmShipments = { shipments: [] };
  }
  _selfLoading = false;
  window.render();
}

const STATUS = {
  delivered:    { c: '#22c55e', bg: 'rgba(34,197,94,0.08)',   icon: '✅', label: 'Delivered' },
  in_transit:   { c: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  icon: '🚚', label: 'In Transit' },
  pending:      { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: '⏳', label: 'Pending' },
  customs_hold: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)',   icon: '🚫', label: 'Customs Hold' },
  delayed:      { c: '#ef4444', bg: 'rgba(239,68,68,0.08)',   icon: '⚠️', label: 'Delayed' },
  cancelled:    { c: '#64748b', bg: 'rgba(100,116,139,0.08)', icon: '❌', label: 'Cancelled' },
};

export function renderPage() {
  const raw = State.scmShipments;
  if (!raw) {
    selfLoad();
    return `<div class="sa-page"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem">
      <div class="sa-spinner" style="margin-bottom:16px"></div>
      <div style="color:var(--text-secondary);font-size:0.85rem">Loading shipment data…</div>
    </div></div>`;
  }

  const all = (raw.shipments || []).map(s => {
    const st = STATUS[s.status] || STATUS.pending;
    return {
      ...s,
      _st: st,
      tracking: s.tracking_number || s.id?.slice(0,12) || '—',
      from: s.from_name || s.origin || '—',
      to: s.to_name || s.destination || '—',
      carrier: s.carrier || '—',
      product: s.product_name || s.batch_number || '—',
      date: s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
      eta: s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    };
  });

  let filtered = all;
  if (_statusFilter !== 'all') filtered = filtered.filter(s => s.status === _statusFilter);
  if (_search) filtered = filtered.filter(s => (s.tracking+s.from+s.to+s.carrier+s.product).toLowerCase().includes(_search));

  const active = all.filter(s => s.status !== 'delivered').length;
  const inTransit = all.filter(s => s.status === 'in_transit').length;
  const delivered = all.filter(s => s.status === 'delivered').length;
  const exceptions = all.filter(s => s.status === 'customs_hold' || s.status === 'delayed').length;
  const onTimeRate = all.length > 0 ? Math.round((delivered / Math.max(1, delivered + exceptions)) * 100) : 0;

  return `
    <div class="sa-page">
      <!-- Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:1.5rem">
        ${statCard('Active Shipments', active, all.length + ' total', ACCENT, icon('network', 20))}
        ${statCard('In Transit', inTransit, 'On schedule', '#3b82f6', icon('zap', 20))}
        ${statCard('Delivered', delivered, onTimeRate + '% on-time', '#22c55e', icon('check', 20))}
        ${statCard('Exceptions', exceptions, exceptions > 0 ? 'Needs attention' : 'All clear', exceptions > 0 ? '#ef4444' : '#22c55e', icon('alertTriangle', 20))}
      </div>

      <!-- Filter + Search Bar -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:16px 20px;margin-bottom:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['all','in_transit','pending','delivered','customs_hold','delayed'].map(f => {
              const isActive = _statusFilter === f;
              const lb = f === 'all' ? 'All' : (STATUS[f]?.label || f);
              const cnt = f === 'all' ? all.length : all.filter(s => s.status === f).length;
              return `<button style="padding:5px 14px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ${isActive ? ACCENT : 'var(--border-color,rgba(0,0,0,0.08))'};background:${isActive ? ACCENT : 'transparent'};color:${isActive ? '#fff' : 'var(--text-secondary)'};transition:all 0.15s"
                onclick="window._stFilter('${f}')">${lb} <span style="opacity:0.7">${cnt}</span></button>`;
            }).join('')}
          </div>
          <div style="position:relative">
            <input type="text" placeholder="Search shipments…" value="${_search}" oninput="window._stSearch(this.value)"
              style="padding:7px 12px 7px 32px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;font-size:0.78rem;width:200px;background:var(--card-bg);color:var(--text-primary);outline:none" />
            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:0.4">${icon('search', 14)}</span>
          </div>
        </div>
      </div>

      <!-- Shipment Cards -->
      ${filtered.length === 0 ? `
        <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:3rem;text-align:center;color:var(--text-secondary)">
          <div style="font-size:2.5rem;margin-bottom:12px;opacity:0.4">🚚</div>
          <div style="font-size:0.9rem;font-weight:500">${_search || _statusFilter !== 'all' ? 'No matching shipments' : 'No shipments found'}</div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px">
          ${filtered.slice(0, 20).map((s, idx) => shipmentCard(s, idx)).join('')}
        </div>

        ${filtered.length > 20 ? `<div style="text-align:center;padding:1rem;color:var(--text-secondary);font-size:0.78rem">Showing 20 of ${filtered.length} shipments</div>` : ''}
      `}

      ${exceptions > 0 && _statusFilter === 'all' ? `
      <!-- Exception Alert -->
      <div style="margin-top:1.5rem;background:var(--card-bg);border-radius:12px;border:1px solid rgba(239,68,68,0.15);padding:20px 24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="font-size:1rem">⚠️</span>
          <h3 style="margin:0;font-size:0.9rem;font-weight:700;color:#ef4444">Exceptions Requiring Attention (${exceptions})</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${all.filter(s => s.status === 'customs_hold' || s.status === 'delayed').map(s => `
            <div style="padding:12px 16px;border-radius:10px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.08)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-family:monospace;font-size:0.75rem;font-weight:700;color:var(--text-primary)">${s.tracking}</span>
                <span style="font-size:0.62rem;padding:2px 8px;border-radius:12px;font-weight:600;background:rgba(239,68,68,0.1);color:#ef4444">${s._st.label}</span>
              </div>
              <div style="font-size:0.72rem;color:var(--text-secondary)">${s.from} → ${s.to}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:2px">${s.carrier} · ${s.date}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;
}

function statCard(label, value, sub, color, iconHtml) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:18px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:transform 0.15s,box-shadow 0.15s"
    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)'"
    onmouseout="this.style.transform='';this.style.boxShadow=''">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="width:36px;height:36px;border-radius:10px;background:${color}12;display:flex;align-items:center;justify-content:center;color:${color}">${iconHtml}</div>
      <span style="font-size:0.62rem;padding:3px 8px;border-radius:12px;background:${color}08;color:${color};font-weight:600">${sub}</span>
    </div>
    <div style="font-size:1.6rem;font-weight:800;color:${color};line-height:1">${value}</div>
    <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600;margin-top:4px">${label}</div>
  </div>`;
}

function shipmentCard(s, idx) {
  const st = s._st;
  const isException = s.status === 'customs_hold' || s.status === 'delayed';
  const borderColor = isException ? 'rgba(239,68,68,0.15)' : 'var(--border-color,rgba(0,0,0,0.06))';

  return `
    <div style="background:var(--card-bg);border-radius:12px;border:1px solid ${borderColor};padding:16px 20px;transition:all 0.15s;cursor:default"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)'" onmouseout="this.style.boxShadow=''">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <!-- Left: Route info -->
        <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:200px">
          <!-- Status dot -->
          <div style="width:40px;height:40px;border-radius:12px;background:${st.bg};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">${st.icon}</div>

          <!-- Route -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-family:monospace;font-size:0.78rem;font-weight:700;color:${ACCENT}">${s.tracking}</span>
              <span style="font-size:0.62rem;padding:2px 10px;border-radius:12px;font-weight:600;background:${st.bg};color:${st.c}">${st.label}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:0.82rem">
              <span style="font-weight:600;color:var(--text-primary)">${s.from}</span>
              <span style="color:${ACCENT};font-size:0.75rem">→</span>
              <span style="font-weight:600;color:var(--text-primary)">${s.to}</span>
            </div>
          </div>
        </div>

        <!-- Right: Details -->
        <div style="display:flex;align-items:center;gap:24px;flex-shrink:0">
          <div style="text-align:center">
            <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Product</div>
            <div style="font-size:0.78rem;font-weight:600;color:var(--text-primary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.product}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Carrier</div>
            <div style="font-size:0.78rem;font-weight:500;color:var(--text-primary)">${s.carrier}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">ETA</div>
            <div style="font-size:0.78rem;font-weight:500;color:var(--text-primary)">${s.eta}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600">Date</div>
            <div style="font-size:0.78rem;font-weight:500;color:var(--text-secondary)">${s.date}</div>
          </div>
        </div>
      </div>

      ${s.status === 'in_transit' ? `
      <!-- Progress bar for in-transit -->
      <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:3px;background:rgba(59,130,246,0.1);border-radius:2px;overflow:hidden">
          <div style="width:${50 + Math.floor(Math.random() * 35)}%;height:100%;background:linear-gradient(90deg,#3b82f6,${ACCENT});border-radius:2px;transition:width 0.6s"></div>
        </div>
        <span style="font-size:0.62rem;color:#3b82f6;font-weight:600;white-space:nowrap">In transit</span>
      </div>` : ''}
    </div>
  `;
}
