/**
 * Executive – Platform ROI (Dedicated Page)
 * ═══════════════════════════════════════════
 * DEEP VIEW — uses /ccs/roi?detail=full
 * Overview only shows 4 KPI cards
 * This page shows: monthly ROI progression, cumulative value chart,
 * category breakdown, top products, cost analysis, projections
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const r = _data;
  const monthly = r.monthly || [];
  const cats = r.categories || [];
  const topProds = r.top_products || [];
  const fmtM = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + (v || 0);
  const fmtFull = v => '$' + Math.round(v || 0).toLocaleString();

  const totalValue = (r.detection_value || 0) + (r.cost_savings || 0);
  const dvPct = totalValue > 0 ? Math.round((r.detection_value || 0) / totalValue * 100) : 0;

  // Monthly value for projection
  const monthlyAvgValue = r.months_active > 0 ? totalValue / r.months_active : 0;
  const annualProjection = monthlyAvgValue * 12;

  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('creditCard', 28)} Platform ROI — Deep Analysis</h1>
        <div class="exec-timestamp">${r.months_active || 0} months active · ${(r.total_scans || 0).toLocaleString()} scans · ${monthly.length} monthly data points</div>
      </div>

      <!-- ROI Hero -->
      <section class="exec-section">
        <div style="text-align:center;padding:2rem;background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(34,197,94,0.05));border-radius:16px;border:1px solid rgba(99,102,241,0.15)">
          <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em">Return on Investment</div>
          <div style="font-size:3.5rem;font-weight:900;background:linear-gradient(135deg,#22c55e,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:8px 0">${r.roi_multiple || 0}x</div>
          <div style="font-size:0.85rem;opacity:0.6">Every $1 invested returns $${r.roi_multiple || 0}</div>
          <div style="margin-top:12px;display:flex;justify-content:center;gap:24px;font-size:0.72rem">
            <span>💰 Value: <strong>${fmtM(totalValue)}</strong></span>
            <span>💳 Cost: <strong>${fmtFull(r.platform_cost || 0)}</strong></span>
            <span>⏱️ Payback: <strong>${r.payback_months || 0}mo</strong></span>
          </div>
        </div>
      </section>

      <!-- Value Breakdown -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Value Breakdown</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${valueCard('Detection Value', r.detection_value, dvPct, '#22c55e',
    `Counterfeits: ${(r.counterfeits_detected || 0).toLocaleString()} · Unit value: ${fmtFull(r.avg_unit_value)} · Formula: counterfeits × unit value`)}
          ${valueCard('Cost Savings', r.cost_savings, 100 - dvPct, '#6366f1',
      `Scans: ${(r.total_scans || 0).toLocaleString()} · Manual cost: $${r.manual_cost_per_check || 5}/check · Formula: scans × manual cost`)}
        </div>
      </section>

      <!-- Monthly ROI Progression (NOT in overview) -->
      ${monthly.length > 1 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Monthly Value Progression</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderMonthlyChart(monthly, 250)}
        </div>
      </section>

      <!-- Cumulative Value vs Platform Cost -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('target', 20)} Cumulative Value vs Platform Cost (Break-Even)</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderBreakEvenChart(monthly, r.platform_cost || 6000, 220)}
        </div>
      </section>

      <!-- Monthly Detail Table -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('list', 20)} Monthly Detail</h2>
        <div style="max-height:350px;overflow-y:auto;border:1px solid rgba(255,255,255,0.06);border-radius:10px">
        <table class="ccs-table" style="font-size:0.75rem">
          <thead style="position:sticky;top:0;background:var(--surface-color,#12122a);z-index:1">
            <tr><th>Month</th><th>Scans</th><th>Counterfeit</th><th>Det. Value</th><th>Cost Savings</th><th>Total Value</th><th>Cumulative</th></tr>
          </thead>
          <tbody>
            ${monthly.slice().reverse().map(m => `
            <tr>
              <td><strong>${formatMonth(m.month)}</strong></td>
              <td>${m.scans.toLocaleString()}</td>
              <td style="color:#ef4444">${m.counterfeit}</td>
              <td style="color:#22c55e">${fmtM(m.detection_value)}</td>
              <td style="color:#6366f1">${fmtM(m.cost_savings)}</td>
              <td><strong>${fmtM(m.total_value)}</strong></td>
              <td style="font-weight:700">${fmtM(m.cumulative_value)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        </div>
      </section>` : ''}

      <!-- Category Detection Breakdown (NOT in overview) -->
      ${cats.length > 0 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Detection Value by Category</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:16px">
          ${cats.slice(0, 6).map(c => {
        const maxVal = Math.max(...cats.map(x => x.detection_value), 1);
        const pct = Math.round(c.detection_value / maxVal * 100);
        return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-weight:700;font-size:0.82rem">${c.category}</div>
                <span style="font-size:0.75rem;color:#22c55e;font-weight:700">${fmtM(c.detection_value)}</span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:6px">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#22c55e,#6366f1);border-radius:3px"></div>
              </div>
              <div style="font-size:0.65rem;opacity:0.4">🚫 ${c.counterfeit} counterfeit · ⚠️ ${c.suspicious} suspicious</div>
            </div>`;
      }).join('')}
        </div>
      </section>` : ''}

      <!-- Top Products by Detection Value (NOT in overview) -->
      ${topProds.length > 0 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('search', 20)} Top Products by Detection Value</h2>
        <table class="ccs-table" style="font-size:0.78rem">
          <thead><tr><th>#</th><th>Product</th><th>Category</th><th>Detections</th><th>Counterfeit</th><th>Value Protected</th></tr></thead>
          <tbody>
            ${topProds.map((p, i) => `
            <tr>
              <td style="font-weight:700;color:${i < 3 ? '#f59e0b' : '#888'}">${i + 1}</td>
              <td><strong>${p.name}</strong></td>
              <td style="opacity:0.5">${p.category || '—'}</td>
              <td>${p.detections}</td>
              <td style="color:#ef4444;font-weight:600">${p.counterfeit}</td>
              <td style="color:#22c55e;font-weight:700">${fmtM(p.value)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </section>` : ''}

      <!-- Protection Metrics + Projections -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('star', 20)} Projections & Metrics</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
          ${metricCard('Revenue Protected', fmtM(r.protected_revenue), 'Fraud loss avoided', '#22c55e')}
          ${metricCard('Auth Rate', (r.authentication_rate || 0) + '%', 'Detection effectiveness', '#6366f1')}
          ${metricCard('Cost/Detection', '$' + (r.cost_per_detection || 0), 'Per flag', '#f59e0b')}
          ${metricCard('Avg Det. Time', (r.avg_detection_days || 0) + ' days', 'First detection', '#06b6d4')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:0.65rem;opacity:0.5">Monthly Avg Value</div>
            <div style="font-size:1.3rem;font-weight:800;color:#22c55e;margin:4px 0">${fmtM(monthlyAvgValue)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:0.65rem;opacity:0.5">Annual Projection</div>
            <div style="font-size:1.3rem;font-weight:800;color:#6366f1;margin:4px 0">${fmtM(annualProjection)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:0.65rem;opacity:0.5">Projected Annual ROI</div>
            <div style="font-size:1.3rem;font-weight:800;background:linear-gradient(135deg,#22c55e,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:4px 0">${r.platform_cost > 0 ? Math.round(annualProjection / r.platform_cost) : 0}x</div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function valueCard(label, value, pct, color, detail) {
  const fmtM = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + (v || 0);
  return `
    <div style="background:linear-gradient(135deg,${color}08,transparent);border:1px solid ${color}15;border-radius:14px;padding:20px">
      <div style="font-size:0.68rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em">${label}</div>
      <div style="font-size:1.8rem;font-weight:800;color:${color};margin:6px 0">${fmtM(value)}</div>
      <div style="font-size:0.72rem;opacity:0.6;margin-bottom:10px">${pct}% of total</div>
      <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:10px">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
      </div>
      <div style="font-size:0.68rem;opacity:0.4;line-height:1.8">${detail}</div>
    </div>`;
}

function metricCard(label, value, sub, color) {
  return `
    <div style="background:linear-gradient(135deg,${color}08,transparent);border:1px solid ${color}20;border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:0.65rem;opacity:0.5">${label}</div>
      <div style="font-size:1.2rem;font-weight:800;color:${color};margin:4px 0">${value}</div>
      <div style="font-size:0.6rem;opacity:0.4">${sub}</div>
    </div>`;
}

function renderMonthlyChart(monthly, h) {
  const w = 800;
  const pad = 50;
  const cw = w - pad * 2;
  const ch = h - 50;
  const mx = Math.max(...monthly.map(m => m.total_value)) * 1.15 || 1;
  const barW = Math.min(50, cw / monthly.length * 0.6);
  const fmtM = v => v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + v;

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      ${monthly.map((m, i) => {
    const x = pad + (i / Math.max(monthly.length - 1, 1)) * cw - barW / 2;
    const dvH = (m.detection_value / mx) * ch;
    const csH = (m.cost_savings / mx) * ch;
    const baseY = 20 + ch;
    return `
          <rect x="${x}" y="${baseY - dvH - csH}" width="${barW}" height="${dvH}" fill="#22c55e" rx="3" opacity="0.7"/>
          <rect x="${x}" y="${baseY - csH}" width="${barW}" height="${csH}" fill="#6366f1" rx="0" opacity="0.7"/>
          <text x="${x + barW / 2}" y="${baseY - dvH - csH - 6}" text-anchor="middle" fill="#999" font-size="7" font-weight="600">${fmtM(m.total_value)}</text>
          <text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" fill="#666" font-size="7">${formatMonth(m.month)}</text>
        `;
  }).join('')}
    </svg>
    <div style="display:flex;gap:16px;justify-content:center;font-size:0.65rem;opacity:0.4">
      <span style="color:#22c55e">■ Detection Value</span><span style="color:#6366f1">■ Cost Savings</span>
    </div>`;
}

function renderBreakEvenChart(monthly, platformCost, h) {
  const w = 800;
  const pad = 50;
  const cw = w - pad * 2;
  const ch = h - 40;
  const cumVals = monthly.map(m => m.cumulative_value);
  const mx = Math.max(...cumVals, platformCost) * 1.15 || 1;
  const fmtM = v => v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + v;

  // Platform cost line
  const costY = 20 + ch - (platformCost / mx) * ch;

  const points = monthly.map((m, i) => {
    const x = pad + (i / Math.max(monthly.length - 1, 1)) * cw;
    const y = 20 + ch - (m.cumulative_value / mx) * ch;
    return `${x},${y}`;
  });

  const area = `${pad},${20 + ch} ${points.join(' ')} ${pad + cw},${20 + ch}`;

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      <defs><linearGradient id="g-cum" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
      </linearGradient></defs>
      <!-- Platform cost line -->
      <line x1="${pad}" y1="${costY}" x2="${pad + cw}" y2="${costY}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="8,4"/>
      <text x="${pad + cw + 5}" y="${costY + 4}" fill="#ef4444" font-size="8" font-weight="600">Cost: ${fmtM(platformCost)}</text>
      <!-- Cumulative area -->
      <polygon points="${area}" fill="url(#g-cum)"/>
      <polyline points="${points.join(' ')}" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linejoin="round"/>
      ${monthly.map((m, i) => {
    const x = pad + (i / Math.max(monthly.length - 1, 1)) * cw;
    const y = 20 + ch - (m.cumulative_value / mx) * ch;
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="#22c55e" stroke="#0a0a1a" stroke-width="1.5"/>
                <text x="${x}" y="${20 + ch + 14}" text-anchor="middle" fill="#666" font-size="7">${formatMonth(m.month)}</text>`;
  }).join('')}
      <text x="${pad}" y="${20 + ch - (cumVals[cumVals.length - 1] / mx) * ch - 10}" fill="#22c55e" font-size="9" font-weight="700">${fmtM(cumVals[cumVals.length - 1])}</text>
    </svg>
    <div style="text-align:center;font-size:0.68rem;opacity:0.5;margin-top:4px">
      Green line = cumulative value · Red dashed = platform cost · Break-even when green crosses red
    </div>`;
}

function formatMonth(m) {
  if (!m) return '??';
  const d = new Date(m);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/roi?detail=full');
    _data = r;
    rerender();
  } catch (e) { console.error('[ROI]', e); }
}

function rerender() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading ROI intelligence...</div></div></div>`;
}
