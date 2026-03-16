/**
 * Ops – Batch Registry (Premium Design)
 * ═══════════════════════════════════════
 * Clean batch list with status pills, search, and working action buttons.
 */
import { icon } from '../../core/icons.js';

const ACCENT = '#0d9488';
let _search = '';

window._batchSearch = function(v) { _search = (v||'').toLowerCase(); if (typeof window.render === 'function') window.render(); };

export function renderPage() {
  const cache = window._opsProdCache || {};
  const raw = cache.batches?.batches || [];
  const all = raw.slice(0, 30).map(b => ({
    _raw: b,
    id: b.batch_number || shortId(b.id),
    realId: b.id,
    product: b.product_name || shortId(b.product_id),
    qty: b.quantity || 0,
    origin: b.origin_facility || '—',
    status: b.status || 'created',
    created: b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    expiry: b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
    manufactured: b.manufactured_date ? new Date(b.manufactured_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  }));
  const batches = _search ? all.filter(b => (b.id+b.product+b.origin+b.status).toLowerCase().includes(_search)) : all;
  const active = all.filter(b => b.status === 'active').length;
  const transit = all.filter(b => b.status === 'in_transit').length;
  const stColors = {
    created: { c: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
    active: { c: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
    in_transit: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    delivered: { c: ACCENT, bg: 'rgba(13,148,136,0.08)' },
    completed: { c: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    quarantined: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    recalled: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    issue: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    pending: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    expired: { c: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  };

  // Store batch data globally so modal can access it
  window._batchListData = all;

  return `
    <div class="sa-page">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:1.5rem">
        ${stat('Total Batches', all.length, ACCENT)}
        ${stat('Active', active, '#22c55e')}
        ${stat('In Transit', transit, '#f59e0b')}
        ${stat('Total Units', all.reduce((s,b)=>s+b.qty,0).toLocaleString(), '#6366f1')}
      </div>

      <!-- Table -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:1rem;font-weight:600">Batch Registry</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative">
              <input type="text" placeholder="Search batches…" value="${_search}" oninput="window._batchSearch(this.value)"
                style="padding:7px 12px 7px 32px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;font-size:0.78rem;width:180px;background:var(--card-bg);color:var(--text-primary);outline:none" />
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:0.4">${icon('search', 14)}</span>
            </div>
            <button style="padding:6px 16px;border:none;border-radius:8px;background:${ACCENT};color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap"
              onclick="window._wsSwitch('ops-production','create')">+ Create Batch</button>
          </div>
        </div>
        ${batches.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary)">${_search ? 'No matching batches' : 'No batches found'}</div>` : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead><tr>
              <th style="${th}">Batch ID</th><th style="${th}">Product</th><th style="${th}text-align:right">Qty</th>
              <th style="${th}">Origin</th><th style="${th}">Status</th><th style="${th}">Created</th><th style="${th}text-align:right">Actions</th>
            </tr></thead>
            <tbody>
              ${batches.map((b, idx) => {
                const sc = stColors[b.status] || stColors.created;
                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background=''">
                  <td style="${td}"><span style="font-weight:600;color:${ACCENT};cursor:pointer" onclick="window._batchView(${idx})">${b.id}</span></td>
                  <td style="${td}">${b.product}</td>
                  <td style="${td}text-align:right;font-weight:600">${b.qty.toLocaleString()}</td>
                  <td style="${td}"><span style="font-size:0.72rem;padding:3px 8px;border-radius:6px;background:rgba(13,148,136,0.06);color:${ACCENT};font-weight:500">${b.origin}</span></td>
                  <td style="${td}"><span style="font-size:0.68rem;padding:3px 10px;border-radius:20px;font-weight:600;background:${sc.bg};color:${sc.c}">${b.status.replace('_',' ')}</span></td>
                  <td style="${td}color:var(--text-secondary)">${b.created}</td>
                  <td style="${td}text-align:right;white-space:nowrap">
                    <button style="padding:4px 12px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:6px;background:transparent;color:var(--text-primary);font-size:0.72rem;cursor:pointer;margin-right:4px;transition:background 0.15s"
                      onmouseover="this.style.background='rgba(0,0,0,0.04)'" onmouseout="this.style.background='transparent'"
                      onclick="window._batchView(${idx})">View</button>
                    ${b.status === 'active' ? `<button style="padding:4px 12px;border:none;border-radius:6px;background:${ACCENT};color:#fff;font-size:0.72rem;cursor:pointer;transition:opacity 0.15s"
                      onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'"
                      onclick="window._batchTransfer('${b.id}')">Transfer</button>` : ''}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>
  `;
}

const th = 'padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));text-align:left;';
const td = 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));';
function shortId(id) { return id ? id.slice(0, 12) : '—'; }
function stat(label, val, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2;margin-top:2px">${val}</div>
  </div>`;
}

/* ─── View Batch Detail Modal ─────────────────────────── */
window._batchView = function(idx) {
  const data = window._batchListData || [];
  const b = data[idx];
  if (!b) return;

  const sc = {
    active: { c: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
    completed: { c: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    pending: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    recalled: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    issue: { c: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    in_transit: { c: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  };
  const st = sc[b.status] || { c: '#3b82f6', bg: 'rgba(59,130,246,0.08)' };

  const modal = document.createElement('div');
  modal.id = 'batch-detail-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);animation:fadeIn 0.2s';
  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:16px;padding:28px 32px;max-width:520px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,0.25);animation:slideUp 0.25s">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:var(--text-primary)">📦 Batch Detail</h3>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">${b.id}</div>
        </div>
        <span style="font-size:0.68rem;padding:4px 12px;border-radius:20px;font-weight:600;background:${st.bg};color:${st.c}">${b.status.replace('_',' ')}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        ${detailField('Product', b.product)}
        ${detailField('Quantity', b.qty.toLocaleString() + ' units')}
        ${detailField('Origin Facility', b.origin)}
        ${detailField('Created', b.created)}
        ${detailField('Manufactured', b.manufactured)}
        ${detailField('Expiry Date', b.expiry)}
      </div>

      ${b.realId ? `<div style="padding:12px 16px;border-radius:8px;background:rgba(13,148,136,0.04);border:1px solid rgba(13,148,136,0.08);margin-bottom:20px">
        <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">Batch UUID</div>
        <div style="font-size:0.72rem;font-family:monospace;color:${ACCENT};word-break:break-all">${b.realId}</div>
      </div>` : ''}

      <div style="display:flex;gap:8px;justify-content:flex-end">
        ${b.status === 'active' ? `<button style="padding:7px 18px;border:none;border-radius:8px;background:${ACCENT};color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer"
          onclick="document.getElementById('batch-detail-modal')?.remove();window._batchTransfer('${b.id}')">🚚 Create Transfer</button>` : ''}
        <button style="padding:7px 18px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;background:transparent;color:var(--text-primary);font-size:0.78rem;cursor:pointer"
          onclick="document.getElementById('batch-detail-modal')?.remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

function detailField(label, value) {
  return `<div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);font-weight:600;margin-bottom:3px">${label}</div>
    <div style="font-size:0.85rem;font-weight:500;color:var(--text-primary)">${value || '—'}</div>
  </div>`;
}

/* ─── Transfer Batch → Navigate to Transfer Orders tab ──── */
window._batchTransfer = function(batchId) {
  if (typeof showToast === 'function') showToast(`🚚 Preparing transfer for ${batchId}…`, 'info');
  // Switch to Transfer Orders tab within the Warehouse workspace
  if (typeof window._wsSwitch === 'function') {
    window._wsSwitch('ops-warehouse', 'transfers');
  } else {
    window.navigate && window.navigate('ops-warehouse');
  }
};
