/**
 * Executive – Risk Trends (Dedicated Page)
 * ═══════════════════════════════════════════
 * Deep view: full-width charts, week-over-week table, multi-metric trends
 * API: /owner/ccs/trends (12 weekly data points)
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
    if (!_data) { loadData(); return loadingState(); }
    const trend = _data.trend || [];
    if (!trend.length) return `<div class="exec-page"><div style="text-align:center;padding:4rem;color:var(--text-secondary)">No trend data available. Scans need to be recorded for trends to appear.</div></div>`;

    const fmtM = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + v;
    const latest = trend[trend.length - 1];
    const prev = trend.length > 1 ? trend[trend.length - 2] : latest;
    const tcarChange = prev.tcar > 0 ? Math.round((latest.tcar - prev.tcar) / prev.tcar * 100) : 0;
    const pFraudChange = prev.pFraud > 0 ? Math.round((latest.pFraud - prev.pFraud) / prev.pFraud * 100) : 0;
    const scanChange = prev.scans > 0 ? Math.round((latest.scans - prev.scans) / prev.scans * 100) : 0;

    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('barChart', 28)} Risk Trends</h1>
        <div class="exec-timestamp">${trend.length}-week analysis · Updated weekly</div>
      </div>

      <!-- Summary KPI -->
      <section class="exec-section">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${kpiCard('TCAR (Latest)', fmtM(latest.tcar), tcarChange, tcarChange > 0)}
          ${kpiCard('P(Fraud)', latest.pFraud + '%', pFraudChange, pFraudChange > 0)}
          ${kpiCard('Scans/Week', latest.scans.toLocaleString(), scanChange, false)}
          ${kpiCard('Avg Trust', latest.avg_trust.toFixed(1), 0, false)}
        </div>
      </section>

      <!-- TCAR Trend Chart -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('target', 20)} Total Capital at Risk (TCAR) — 12 Week Trend</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderLineChart(trend, 'tcar', '#ef4444', fmtM, 300)}
          <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;opacity:0.4">
            <span>🔴 TCAR</span>
            <span>Scale: ${fmtM(Math.min(...trend.map(t => t.tcar)))} – ${fmtM(Math.max(...trend.map(t => t.tcar)))}</span>
          </div>
        </div>
      </section>

      <!-- ERL vs EBI Split -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Risk Components — ERL vs EBI</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderDualChart(trend, 220)}
        </div>
      </section>

      <!-- P(Fraud) Trend -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('alertTriangle', 20)} Fraud Probability — P(Fraud) %</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderLineChart(trend, 'pFraud', '#f59e0b', v => v + '%', 200)}
        </div>
      </section>

      <!-- Scan Volume Bars -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Weekly Scan Volume</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderStackedBars(trend, 200)}
          <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;opacity:0.4">
            <span style="color:#22c55e">■ Authentic</span>
            <span style="color:#f59e0b">■ Suspicious</span>
            <span style="color:#ef4444">■ Counterfeit</span>
          </div>
        </div>
      </section>

      <!-- Week-over-Week Table -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('list', 20)} Week-over-Week Detail</h2>
        <table class="ccs-table" style="font-size:0.78rem">
          <thead>
            <tr>
              <th>Week</th><th>Scans</th><th>Suspicious</th><th>Counterfeit</th>
              <th>P(Fraud)</th><th>Trust</th><th>ERL</th><th>EBI</th><th>TCAR</th><th>Δ TCAR</th>
            </tr>
          </thead>
          <tbody>
            ${trend.map((w, i) => {
        const prevTcar = i > 0 ? trend[i - 1].tcar : w.tcar;
        const delta = w.tcar - prevTcar;
        const deltaPct = prevTcar > 0 ? Math.round(delta / prevTcar * 100) : 0;
        return `
              <tr>
                <td><strong>${formatWeek(w.week)}</strong></td>
                <td>${w.scans.toLocaleString()}</td>
                <td style="color:#f59e0b">${w.suspicious}</td>
                <td style="color:#ef4444">${w.counterfeit}</td>
                <td style="font-weight:600;color:${w.pFraud > 5 ? '#ef4444' : w.pFraud > 2 ? '#f59e0b' : '#22c55e'}">${w.pFraud}%</td>
                <td>${w.avg_trust.toFixed(1)}</td>
                <td>${fmtM(w.erl)}</td>
                <td>${fmtM(w.ebi)}</td>
                <td><strong>${fmtM(w.tcar)}</strong></td>
                <td style="color:${delta > 0 ? '#ef4444' : delta < 0 ? '#22c55e' : '#888'};font-weight:600">${delta > 0 ? '+' : ''}${deltaPct}%</td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function kpiCard(label, value, change, isNeg) {
    const color = change === 0 ? '#888' : isNeg ? '#ef4444' : '#22c55e';
    return `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
      <div style="font-size:0.68rem;opacity:0.5;margin-bottom:4px">${label}</div>
      <div style="font-size:1.4rem;font-weight:800">${value}</div>
      ${change !== 0 ? `<div style="font-size:0.7rem;font-weight:600;color:${color};margin-top:4px">${change > 0 ? '↑' : '↓'} ${Math.abs(change)}% vs last week</div>` : ''}
    </div>`;
}

function renderLineChart(data, key, color, fmt, h) {
    const w = 800;
    const vals = data.map(d => d[key]);
    const mx = Math.max(...vals) * 1.1 || 1;
    const mn = Math.min(...vals) * 0.9;
    const range = mx - mn || 1;
    const pad = 40;
    const cw = w - pad * 2;
    const ch = h - 40;

    const points = data.map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * cw;
        const y = 20 + ch - ((d[key] - mn) / range) * ch;
        return `${x},${y}`;
    });

    const area = `${pad},${20 + ch} ${points.join(' ')} ${pad + cw},${20 + ch}`;

    return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      <defs><linearGradient id="grad-${key}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#grad-${key})"/>
      <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
      ${data.map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * cw;
        const y = 20 + ch - ((d[key] - mn) / range) * ch;
        return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#0a0a1a" stroke-width="2"/>
                <text x="${x}" y="${y - 10}" text-anchor="middle" fill="${color}" font-size="9" font-weight="600">${fmt(d[key])}</text>
                <text x="${x}" y="${20 + ch + 14}" text-anchor="middle" fill="#666" font-size="8">${formatWeek(d.week)}</text>`;
    }).join('')}
    </svg>`;
}

function renderDualChart(data, h) {
    const w = 800;
    const pad = 40;
    const cw = w - pad * 2;
    const ch = h - 40;
    const mx = Math.max(...data.map(d => d.erl + d.ebi)) * 1.1 || 1;

    const erlPts = data.map((d, i) => `${pad + (i / Math.max(data.length - 1, 1)) * cw},${20 + ch - (d.erl / mx) * ch}`).join(' ');
    const ebiPts = data.map((d, i) => `${pad + (i / Math.max(data.length - 1, 1)) * cw},${20 + ch - (d.ebi / mx) * ch}`).join(' ');

    return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      <polyline points="${erlPts}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,3"/>
      <polyline points="${ebiPts}" fill="none" stroke="#6366f1" stroke-width="2"/>
      ${data.map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * cw;
        return `<text x="${x}" y="${20 + ch + 14}" text-anchor="middle" fill="#666" font-size="8">${formatWeek(d.week)}</text>`;
    }).join('')}
    </svg>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;opacity:0.4">
      <span style="color:#f59e0b">- - ERL (Revenue Loss)</span>
      <span style="color:#6366f1">── EBI (Brand Impact)</span>
    </div>`;
}

function renderStackedBars(data, h) {
    const w = 800;
    const pad = 50;
    const cw = w - pad * 2;
    const ch = h - 40;
    const mx = Math.max(...data.map(d => d.scans)) * 1.1 || 1;
    const barW = Math.min(40, cw / data.length * 0.7);

    return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      ${data.map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * cw - barW / 2;
        const total = d.scans || 1;
        const authH = ((total - d.suspicious - d.counterfeit) / mx) * ch;
        const susH = (d.suspicious / mx) * ch;
        const cntH = (d.counterfeit / mx) * ch;
        const baseY = 20 + ch;
        return `
          <rect x="${x}" y="${baseY - authH - susH - cntH}" width="${barW}" height="${authH}" fill="#22c55e" rx="2" opacity="0.7"/>
          <rect x="${x}" y="${baseY - susH - cntH}" width="${barW}" height="${susH}" fill="#f59e0b" rx="0" opacity="0.7"/>
          <rect x="${x}" y="${baseY - cntH}" width="${barW}" height="${cntH}" fill="#ef4444" rx="0" opacity="0.7"/>
          <text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" fill="#666" font-size="8">${formatWeek(d.week)}</text>
          <text x="${x + barW / 2}" y="${baseY - authH - susH - cntH - 5}" text-anchor="middle" fill="#999" font-size="7">${d.scans.toLocaleString()}</text>
        `;
    }).join('')}
    </svg>`;
}

function formatWeek(w) {
    if (!w) return '??';
    const d = new Date(w);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

async function loadData() {
    try {
        const r = await api.get('/tenant/owner/ccs/trends');
        _data = r;
        rerender();
    } catch (e) { console.error('[Trends]', e); }
}

function rerender() {
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
}

function loadingState() {
    return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading risk trends...</div></div></div>`;
}
