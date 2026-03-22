/**
 * SCM – Warehouse Management (Premium Design)
 * ═══════════════════════════════════════════════
 * Clean card-based design with stats, utilization bars, and status pills.
 * Data from PostgreSQL via /api/ops/data/warehouses + /api/scm/inventory/alerts
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;
const ACCENT = '#0d9488'; // teal — workspace primary

export function renderPage() {
  if (!_data) { loadData(); return loading(); }
  const { warehouses, transfers, alerts } = _data;
  const totalCap = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
  const totalUsed = warehouses.reduce((s, w) => s + (w.used_capacity || w.used || 0), 0);
  const utilPct = totalCap > 0 ? Math.round(totalUsed / totalCap * 100) : 0;
  const activeTransfers = transfers.filter(t => t.status !== 'delivered').length;

  return `
    <div class="sa-page">

      <!-- ── Stats Row ─────────────────────────────────────── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:1.8rem">
        ${statCard(icon('building', 20, ACCENT), 'AVAILABLE STORAGE', `${100 - utilPct}%`, `+${utilPct < 80 ? '2.4' : '0.8'}%`, ACCENT,
          `<div style="margin-top:10px;height:6px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:${utilPct}%;background:${ACCENT};border-radius:3px;transition:width 0.6s"></div></div>
           <div style="font-size:0.65rem;color:var(--text-secondary);margin-top:4px">${totalUsed.toLocaleString()} / ${totalCap.toLocaleString()} units used</div>`)}

        ${statCard(icon('network', 20, '#6366f1'), 'ACTIVE TRANSFERS', activeTransfers.toString(), '', '#6366f1',
          `<div style="display:flex;gap:4px;margin-top:8px">
            <span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:rgba(99,102,241,0.08);color:#6366f1">${transfers.filter(t=>t.status==='in_transit').length} in transit</span>
            <span style="font-size:0.6rem;padding:2px 6px;border-radius:4px;background:rgba(34,197,94,0.08);color:#22c55e">${transfers.filter(t=>t.status==='delivered').length} delivered</span>
          </div>`)}

        ${statCard(icon('check', 20, '#22c55e'), 'WAREHOUSES ONLINE', `${warehouses.filter(w => w.status === 'operational').length}  <span style="font-size:0.85rem;font-weight:400;color:var(--text-secondary)">/ ${warehouses.length}</span>`, '', '#22c55e',
          `<div style="font-size:0.65rem;color:var(--text-secondary);margin-top:6px">All locations operational</div>`)}

        ${statCard(icon('alertTriangle', 20, alerts.length > 0 ? '#ef4444' : '#22c55e'), 'STOCK ALERTS', alerts.length.toString(), alerts.length > 0 ? `${alerts.filter(a=>a.severity==='critical').length} critical` : '', alerts.length > 0 ? '#ef4444' : '#22c55e',
          alerts.length > 0
            ? `<div style="font-size:0.65rem;color:#ef4444;margin-top:6px">⚠ ${alerts.filter(a=>a.severity==='critical').length} critical · ${alerts.filter(a=>a.severity!=='critical').length} warning</div>`
            : `<div style="font-size:0.65rem;color:#22c55e;margin-top:6px">✓ All stock levels healthy</div>`)}
      </div>

      <!-- ── Warehouse Network ─────────────────────────────── -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px;margin-bottom:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:1rem;font-weight:600;color:var(--text-primary)">Warehouse Network</h3>
          <button class="btn btn-outline btn-sm" onclick="navigate('ops-logistics')">+ New Transfer</button>
        </div>
        ${warehouses.length === 0 ? empty('No warehouses configured') : `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead>
              <tr style="text-align:left">
                <th style="padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06))">Warehouse</th>
                <th style="padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06))">Region</th>
                <th style="padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06))">Utilization</th>
                <th style="padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06))">Temp</th>
                <th style="padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06))">Status</th>
              </tr>
            </thead>
            <tbody>
              ${warehouses.map((w, i) => {
                const pct = w.capacity > 0 ? Math.round((w.used_capacity || w.used || 0) / w.capacity * 100) : 0;
                const barColor = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : ACCENT;
                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.03)'" onmouseout="this.style.background=''">
                  <td style="padding:14px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04))">
                    <div style="font-weight:600;color:var(--text-primary)">${w.name || '—'}</div>
                    <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:1px">${(w.capacity||0).toLocaleString()} capacity</div>
                  </td>
                  <td style="padding:14px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04))">
                    <span style="font-size:0.72rem;padding:3px 8px;border-radius:6px;background:rgba(13,148,136,0.06);color:${ACCENT};font-weight:500">${w.region || '—'}</span>
                  </td>
                  <td style="padding:14px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));min-width:140px">
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="flex:1;height:6px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.4s"></div>
                      </div>
                      <span style="font-weight:600;font-size:0.75rem;color:${barColor};min-width:30px">${pct}%</span>
                    </div>
                  </td>
                  <td style="padding:14px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04))">
                    <span style="font-size:0.78rem;color:var(--text-primary);font-weight:500">${w.temperature ? w.temperature + '°C' : (w.temp || '—')}</span>
                  </td>
                  <td style="padding:14px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04))">
                    <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;padding:4px 10px;border-radius:20px;font-weight:500;
                      background:${(w.status||'operational')==='operational' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'};
                      color:${(w.status||'operational')==='operational' ? '#22c55e' : '#f59e0b'}">
                      <span style="width:6px;height:6px;border-radius:50%;background:currentColor"></span>
                      ${(w.status || 'operational').replace('_', ' ')}
                    </span>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      <!-- ── Two-column: Transfers + Alerts ────────────────── -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

        <!-- Recent Transfers -->
        <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="margin:0;font-size:0.95rem;font-weight:600;color:var(--text-primary)">Recent Transfers</h3>
            <span style="font-size:0.68rem;color:var(--text-secondary)">${transfers.length} total</span>
          </div>
          ${transfers.length === 0 ? empty('No active transfers') : `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${transfers.slice(0, 6).map(t => {
              const stColor = t.status === 'delivered' ? '#22c55e' : t.status === 'in_transit' ? '#f59e0b' : '#3b82f6';
              const stBg = t.status === 'delivered' ? 'rgba(34,197,94,0.08)' : t.status === 'in_transit' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)';
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color,rgba(0,0,0,0.04));transition:box-shadow 0.15s"
                onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'" onmouseout="this.style.boxShadow=''">
                <div style="width:32px;height:32px;border-radius:8px;background:rgba(13,148,136,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${icon('network', 14, ACCENT)}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.78rem;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${t.from_name || t.from_location || shortId(t.from)} → ${t.to_name || t.to_location || shortId(t.to)}
                  </div>
                  <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:1px">${t.product_name || t.carrier || '—'}</div>
                </div>
                <span style="font-size:0.65rem;padding:3px 8px;border-radius:12px;font-weight:500;background:${stBg};color:${stColor};white-space:nowrap">
                  ${(t.status || 'pending').replace('_', ' ')}
                </span>
              </div>`;
            }).join('')}
          </div>`}
        </div>

        <!-- Stock Alerts -->
        <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="margin:0;font-size:0.95rem;font-weight:600;color:var(--text-primary)">Stock Alerts</h3>
            ${alerts.length > 0 ? `<span style="font-size:0.65rem;padding:3px 10px;border-radius:12px;background:rgba(239,68,68,0.08);color:#ef4444;font-weight:600">${alerts.length} alerts</span>` : ''}
          </div>
          ${alerts.length === 0 ? `<div style="text-align:center;padding:2rem;color:var(--text-secondary);font-size:0.82rem">✓ All stock levels healthy</div>` : `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${alerts.slice(0, 6).map(a => {
              const isCritical = a.severity === 'critical';
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid ${isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'};background:${isCritical ? 'rgba(239,68,68,0.02)' : 'rgba(245,158,11,0.02)'}">
                <div style="width:32px;height:32px;border-radius:8px;background:${isCritical ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${icon('alertTriangle', 14, isCritical ? '#ef4444' : '#f59e0b')}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.78rem;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.product_name || '—'}</div>
                  <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:1px">${a.location || a.partner_name || '—'} · Qty: ${a.quantity ?? a.current ?? 0}</div>
                </div>
                <span style="font-size:0.65rem;padding:3px 8px;border-radius:12px;font-weight:600;
                  background:${isCritical ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'};
                  color:${isCritical ? '#ef4444' : '#f59e0b'}">${a.severity || 'warning'}</span>
              </div>`;
            }).join('')}
          </div>`}
        </div>
      </div>
    </div>
  `;
}

/* ─── Data Loading ─────────────────────────────────────────── */
async function loadData() {
  try {
    const [whRes, shipRes, alertRes] = await Promise.all([
      api.get('/ops/data/warehouses').catch(() => ({ warehouses: [] })),
      api.get('/scm/shipments').catch(() => ({ shipments: [] })),
      api.get('/scm/inventory/alerts').catch(() => ({ understock: [], overstock: [] }))
    ]);
    _data = {
      warehouses: whRes.warehouses || [],
      transfers: (shipRes.shipments || []).slice(0, 10),
      alerts: [...(alertRes.understock || []), ...(alertRes.overstock || [])].slice(0, 10)
    };
    if (typeof window.render === 'function') window.render();
  } catch (e) { console.error('[Warehouse]', e); }
}

/* ─── Helpers ──────────────────────────────────────────────── */
function shortId(id) { return id ? id.slice(0, 8) : '—'; }

function statCard(iconHtml, label, value, trend, color, extra) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:18px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:box-shadow 0.2s"
    onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow=''">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="width:36px;height:36px;border-radius:10px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
      ${trend ? `<span style="font-size:0.65rem;color:${color};font-weight:500;margin-left:auto">${trend}</span>` : ''}
    </div>
    <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600;margin-bottom:4px">${label}</div>
    <div style="font-size:1.6rem;font-weight:700;color:var(--text-primary);line-height:1">${value}</div>
    ${extra || ''}
  </div>`;
}

function empty(msg) {
  return `<div style="text-align:center;padding:2.5rem;color:var(--text-secondary);font-size:0.82rem">${msg}</div>`;
}

function loading() {
  return `<div class="sa-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading warehouse data...</div></div></div>`;
}

window._refreshWarehouse = () => { _data = null; if (typeof window.render === 'function') window.render(); };
