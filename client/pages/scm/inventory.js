/**
 * SCM – Inventory Management (Premium Design)
 * ═══════════════════════════════════════════════
 * Clean card-based inventory view with stock levels,
 * search filter, and status indicators.
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';

let _inv = null;
let _loading = false;
let _search = '';
const ACCENT = '#0d9488';

async function loadInventory() {
  if (_loading) return;
  _loading = true;
  try {
    const res = await API.get('/scm/inventory');
    _inv = res;
    State.scmInventory = res;
  } catch (e) { _inv = { inventory: [] }; }
  _loading = false;
  if (typeof window.render === 'function') window.render();
}

window._invSearch = function(val) {
  _search = (val || '').toLowerCase();
  if (typeof window.render === 'function') window.render();
};

export function renderPage() {
  const cache = window._opsWhCache || {};
  const inv = State.scmInventory || cache.inventory || _inv;

  if (!inv) {
    if (!_loading) loadInventory();
    return `<div class="sa-page"><div style="text-align:center;padding:4rem"><div class="sa-spinner"></div><p style="color:var(--text-secondary);margin-top:1rem">Loading inventory…</p></div></div>`;
  }

  const all = inv.inventory || [];
  const items = _search ? all.filter(i =>
    (i.product_name || i.sku || '').toLowerCase().includes(_search) ||
    (i.location || '').toLowerCase().includes(_search)
  ) : all;

  const totalUnits = all.reduce((s, i) => s + (i.quantity || 0), 0);
  const lowStock = all.filter(i => i.quantity <= i.min_stock).length;
  const overStock = all.filter(i => i.quantity >= i.max_stock).length;
  const healthy = all.length - lowStock - overStock;

  return `
    <div class="sa-page">

      <!-- ── Stats ─────────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:1.8rem">
        ${stat(icon('products', 20, ACCENT), 'TOTAL SKUs', all.length, '', ACCENT)}
        ${stat(icon('products', 20, '#6366f1'), 'TOTAL UNITS', totalUnits.toLocaleString(), '', '#6366f1')}
        ${stat(icon('check', 20, '#22c55e'), 'HEALTHY', healthy, `${all.length > 0 ? Math.round(healthy/all.length*100) : 0}%`, '#22c55e')}
        ${stat(icon('alertTriangle', 20, '#ef4444'), 'LOW STOCK', lowStock, lowStock > 0 ? 'Needs attention' : '', '#ef4444')}
      </div>

      <!-- ── Inventory Table ───────────────────────────────── -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:1rem;font-weight:600;color:var(--text-primary)">Current Stock</h3>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative">
              <input type="text" placeholder="Search products…" value="${_search}" oninput="window._invSearch(this.value)"
                style="padding:7px 12px 7px 32px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:8px;font-size:0.78rem;width:200px;background:var(--card-bg);color:var(--text-primary);outline:none" />
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:0.4">${icon('search', 14)}</span>
            </div>
          </div>
        </div>

        ${items.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text-secondary);font-size:0.82rem">${_search ? 'No matching products' : 'No inventory records'}</div>` : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead>
              <tr style="text-align:left">
                <th style="${th()}">Product</th>
                <th style="${th()}">Location</th>
                <th style="${th()}text-align:right">Quantity</th>
                <th style="${th()}">Stock Level</th>
                <th style="${th()}">Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => {
                const status = i.quantity <= i.min_stock ? 'low' : i.quantity >= i.max_stock ? 'over' : 'ok';
                const pct = i.max_stock > 0 ? Math.min(Math.round(i.quantity / i.max_stock * 100), 100) : 50;
                const barColor = status === 'low' ? '#ef4444' : status === 'over' ? '#f59e0b' : ACCENT;
                const stLabel = status === 'low' ? 'Understock' : status === 'over' ? 'Overstock' : 'Normal';
                const stColor = status === 'low' ? '#ef4444' : status === 'over' ? '#f59e0b' : '#22c55e';
                const stBg = status === 'low' ? 'rgba(239,68,68,0.08)' : status === 'over' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)';

                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background=''">
                  <td style="${td()}">
                    <div style="font-weight:600;color:var(--text-primary)">${i.product_name || i.sku || '—'}</div>
                  </td>
                  <td style="${td()}">
                    <span style="font-size:0.72rem;padding:3px 8px;border-radius:6px;background:rgba(13,148,136,0.06);color:${ACCENT};font-weight:500">${i.location || '—'}</span>
                  </td>
                  <td style="${td()}text-align:right">
                    <span style="font-weight:700;color:${barColor}">${(i.quantity || 0).toLocaleString()}</span>
                    <span style="font-size:0.68rem;color:var(--text-secondary);margin-left:4px">/ ${(i.max_stock||0).toLocaleString()}</span>
                  </td>
                  <td style="${td()}min-width:120px">
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="flex:1;height:5px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div>
                      </div>
                      <span style="font-size:0.68rem;color:var(--text-secondary);min-width:28px">${pct}%</span>
                    </div>
                  </td>
                  <td style="${td()}">
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.68rem;padding:3px 10px;border-radius:20px;font-weight:500;background:${stBg};color:${stColor}">
                      <span style="width:5px;height:5px;border-radius:50%;background:currentColor"></span>
                      ${stLabel}
                    </span>
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

function th() { return 'padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));'; }
function td() { return 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));'; }

function stat(iconHtml, label, value, sub, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:box-shadow 0.2s"
    onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow=''">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
      ${sub ? `<span style="font-size:0.62rem;color:${color};font-weight:500;margin-left:auto">${sub}</span>` : ''}
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:var(--text-primary);line-height:1.2">${value}</div>
  </div>`;
}
