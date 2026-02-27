/**
 * Executive – Risk Trends (Dedicated Page)
 * ═══════════════════════════════════════════
 * DEEP VIEW: 52-week history, daily drill-down, statistical summary
 * API: /owner/ccs/trends?range=full
 * Overview only shows 12 weeks — this page shows 1 YEAR + daily granularity
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;

export function renderPage() {
  if (!_data) { loadData(); return loadingState(); }
  const trend = _data.trend || [];
  const daily = _data.daily || [];
  const stats = _data.stats || {};
  if (!trend.length) return `<div class="exec-page"><div style="text-align:center;padding:4rem;color:var(--text-secondary)">No trend data available yet.</div></div>`;

  const fmtM = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + v;
  const latest = trend[trend.length - 1];
  const prev = trend.length > 1 ? trend[trend.length - 2] : latest;
  const tcarDelta = prev.tcar > 0 ? Math.round((latest.tcar - prev.tcar) / prev.tcar * 100) : 0;

  // Quarterly breakdown (last 4 quarters from 52 weeks)
  const quarters = [];
  const qSize = Math.ceil(trend.length / 4);
  for (let i = 0; i < 4; i++) {
    const slice = trend.slice(i * qSize, (i + 1) * qSize);
    if (slice.length > 0) {
      const avgTcar = Math.round(slice.reduce((s, t) => s + t.tcar, 0) / slice.length);
      const avgPF = Math.round(slice.reduce((s, t) => s + t.pFraud, 0) / slice.length * 100) / 100;
      const totalScans = slice.reduce((s, t) => s + t.scans, 0);
      quarters.push({ label: `Q${i + 1}`, weeks: slice.length, avgTcar, avgPF, totalScans, start: slice[0].week, end: slice[slice.length - 1].week });
    }
  }

  return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('barChart', 28)} Risk Trends — Deep Analysis</h1>
        <div class="exec-timestamp">${trend.length}-week history · ${daily.length} daily data points · ${(stats.scans?.total || 0).toLocaleString()} total scans</div>
      </div>

      <!-- Statistical Summary -->
      ${stats.tcar ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('target', 20)} Statistical Summary (${trend.length} weeks)</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${statCard('TCAR', fmtM(stats.tcar.avg), fmtM(stats.tcar.min), fmtM(stats.tcar.max), 'σ=' + fmtM(stats.tcar.std), '#ef4444')}
          ${statCard('P(Fraud)', stats.pFraud.avg + '%', stats.pFraud.min + '%', stats.pFraud.max + '%', '', '#f59e0b')}
          ${statCard('Scans/Week', stats.scans.avg.toLocaleString(), stats.scans.min.toLocaleString(), stats.scans.max.toLocaleString(), 'Total: ' + stats.scans.total.toLocaleString(), '#6366f1')}
          ${statCard('Trust Score', stats.trust.avg + '', stats.trust.min + '', stats.trust.max + '', '', '#22c55e')}
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;font-size:0.72rem;opacity:0.5">
          <span>📈 Peak risk: <strong>${formatWeek(stats.peak_risk_week)}</strong></span>
          <span>📉 Lowest risk: <strong>${formatWeek(stats.lowest_risk_week)}</strong></span>
        </div>
      </section>` : ''}

      <!-- 52-Week TCAR Chart (full year) -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('target', 20)} TCAR — ${trend.length}-Week History</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderLineChart(trend, 'tcar', '#ef4444', fmtM, 280, true)}
        </div>
      </section>

      <!-- Daily Drill-Down (30 days) -->
      ${daily.length > 0 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('clock', 20)} Daily Scan Activity — Last 30 Days</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderDailyBars(daily, 200)}
          <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;opacity:0.4">
            <span style="color:#22c55e">■ Authentic</span><span style="color:#f59e0b">■ Suspicious</span><span style="color:#ef4444">■ Counterfeit</span>
          </div>
        </div>
      </section>` : ''}

      <!-- ERL vs EBI Split -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Risk Components — ERL vs EBI (${trend.length}w)</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderDualChart(trend, 220)}
        </div>
      </section>

      <!-- P(Fraud) Trend -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('alertTriangle', 20)} Fraud Probability Trend</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px">
          ${renderLineChart(trend, 'pFraud', '#f59e0b', v => v + '%', 200, false)}
        </div>
      </section>

      <!-- Quarterly Comparison -->
      ${quarters.length > 1 ? `
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Quarterly Comparison</h2>
        <div style="display:grid;grid-template-columns:repeat(${Math.min(quarters.length, 4)},1fr);gap:10px">
          ${quarters.map((q, i) => {
    const prevQ = i > 0 ? quarters[i - 1] : null;
    const tcarDelta = prevQ ? Math.round((q.avgTcar - prevQ.avgTcar) / Math.max(prevQ.avgTcar, 1) * 100) : 0;
    const color = tcarDelta > 5 ? '#ef4444' : tcarDelta < -5 ? '#22c55e' : '#888';
    return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px">
              <div style="font-size:0.68rem;opacity:0.4">${q.label} (${q.weeks}w)</div>
              <div style="font-size:0.6rem;opacity:0.3;margin-top:2px">${formatWeek(q.start)} – ${formatWeek(q.end)}</div>
              <div style="font-size:1.3rem;font-weight:800;margin:8px 0">${fmtM(q.avgTcar)}</div>
              <div style="font-size:0.7rem;opacity:0.5">Avg TCAR</div>
              ${prevQ ? `<div style="font-size:0.68rem;font-weight:600;color:${color};margin-top:4px">${tcarDelta > 0 ? '↑' : '↓'} ${Math.abs(tcarDelta)}% vs ${quarters[i - 1].label}</div>` : ''}
              <div style="font-size:0.62rem;opacity:0.35;margin-top:6px">P(F): ${q.avgPF}% · ${q.totalScans.toLocaleString()} scans</div>
            </div>`;
  }).join('')}
        </div>
      </section>` : ''}

      <!-- Full Week-over-Week Table -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('list', 20)} Week-over-Week Detail (${trend.length} weeks)</h2>
        <div style="max-height:400px;overflow-y:auto;border:1px solid rgba(255,255,255,0.06);border-radius:10px">
        <table class="ccs-table" style="font-size:0.75rem">
          <thead style="position:sticky;top:0;background:var(--surface-color,#12122a);z-index:1">
            <tr><th>Week</th><th>Scans</th><th>Sus.</th><th>Cnt.</th><th>P(F)%</th><th>Trust</th><th>ERL</th><th>EBI</th><th>TCAR</th><th>Δ</th></tr>
          </thead>
          <tbody>
            ${trend.slice().reverse().map((w, idx) => {
    const i = trend.length - 1 - idx;
    const prevT = i > 0 ? trend[i - 1].tcar : w.tcar;
    const delta = w.tcar - prevT;
    const deltaPct = prevT > 0 ? Math.round(delta / prevT * 100) : 0;
    return `<tr>
                <td><strong>${formatWeek(w.week)}</strong></td>
                <td>${w.scans.toLocaleString()}</td>
                <td style="color:#f59e0b">${w.suspicious}</td>
                <td style="color:#ef4444">${w.counterfeit}</td>
                <td style="font-weight:600;color:${w.pFraud > 5 ? '#ef4444' : w.pFraud > 2 ? '#f59e0b' : '#22c55e'}">${w.pFraud}%</td>
                <td>${w.avg_trust.toFixed(1)}</td>
                <td>${fmtM(w.erl)}</td><td>${fmtM(w.ebi)}</td>
                <td><strong>${fmtM(w.tcar)}</strong></td>
                <td style="color:${delta > 0 ? '#ef4444' : delta < 0 ? '#22c55e' : '#888'};font-weight:600">${delta > 0 ? '+' : ''}${deltaPct}%</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  `;
}

function statCard(label, avg, min, max, extra, color) {
  return `
    <div style="background:linear-gradient(135deg,${color}0a,transparent);border:1px solid ${color}20;border-radius:12px;padding:16px">
      <div style="font-size:0.68rem;opacity:0.5">${label}</div>
      <div style="font-size:1.3rem;font-weight:800;color:${color};margin:4px 0">${avg}</div>
      <div style="font-size:0.62rem;opacity:0.4;line-height:1.8">Min: ${min} · Max: ${max}${extra ? '<br>' + extra : ''}</div>
    </div>`;
}

function renderLineChart(data, key, color, fmt, h, compact) {
  const w = 800;
  const vals = data.map(d => d[key]);
  const mx = Math.max(...vals) * 1.1 || 1;
  const mn = Math.min(...vals) * 0.9;
  const range = mx - mn || 1;
  const pad = 40;
  const cw = w - pad * 2;
  const ch = h - 40;
  const showLabels = !compact || data.length <= 16;

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * cw;
    const y = 20 + ch - ((d[key] - mn) / range) * ch;
    return `${x},${y}`;
  });

  const area = `${pad},${20 + ch} ${points.join(' ')} ${pad + cw},${20 + ch}`;

  // Show every Nth label if compact
  const labelEvery = compact ? Math.max(1, Math.ceil(data.length / 12)) : 1;

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      <defs><linearGradient id="g-${key}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#g-${key})"/>
      <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      ${data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * cw;
    const y = 20 + ch - ((d[key] - mn) / range) * ch;
    const showLabel = i % labelEvery === 0 || i === data.length - 1;
    return `<circle cx="${x}" cy="${y}" r="${compact ? 2.5 : 4}" fill="${color}" stroke="#0a0a1a" stroke-width="1.5"/>
                ${showLabel ? `<text x="${x}" y="${20 + ch + 14}" text-anchor="middle" fill="#666" font-size="7">${formatWeek(d.week)}</text>` : ''}`;
  }).join('')}
      ${/* First and last value labels */''}
      <text x="${pad}" y="${20 + ch - ((data[0][key] - mn) / range) * ch - 8}" text-anchor="start" fill="${color}" font-size="8" font-weight="600">${fmt(data[0][key])}</text>
      <text x="${pad + cw}" y="${20 + ch - ((data[data.length - 1][key] - mn) / range) * ch - 8}" text-anchor="end" fill="${color}" font-size="9" font-weight="700">${fmt(data[data.length - 1][key])}</text>
    </svg>`;
}

function renderDualChart(data, h) {
  const w = 800;
  const pad = 40;
  const cw = w - pad * 2;
  const ch = h - 40;
  const mx = Math.max(...data.map(d => Math.max(d.erl, d.ebi))) * 1.2 || 1;
  const labelEvery = Math.max(1, Math.ceil(data.length / 12));

  const erlPts = data.map((d, i) => `${pad + (i / Math.max(data.length - 1, 1)) * cw},${20 + ch - (d.erl / mx) * ch}`).join(' ');
  const ebiPts = data.map((d, i) => `${pad + (i / Math.max(data.length - 1, 1)) * cw},${20 + ch - (d.ebi / mx) * ch}`).join(' ');

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      <polyline points="${erlPts}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,3"/>
      <polyline points="${ebiPts}" fill="none" stroke="#6366f1" stroke-width="2"/>
      ${data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * cw;
    return i % labelEvery === 0 ? `<text x="${x}" y="${20 + ch + 14}" text-anchor="middle" fill="#666" font-size="7">${formatWeek(d.week)}</text>` : '';
  }).join('')}
    </svg>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:0.65rem;opacity:0.4">
      <span style="color:#f59e0b">- - ERL (Revenue Loss)</span>
      <span style="color:#6366f1">── EBI (Brand Impact)</span>
    </div>`;
}

function renderDailyBars(daily, h) {
  const w = 800;
  const pad = 30;
  const cw = w - pad * 2;
  const ch = h - 40;
  const mx = Math.max(...daily.map(d => d.scans)) * 1.1 || 1;
  const barW = Math.min(16, cw / daily.length * 0.75);
  const labelEvery = Math.max(1, Math.ceil(daily.length / 10));

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
      ${daily.map((d, i) => {
    const x = pad + (i / Math.max(daily.length - 1, 1)) * cw - barW / 2;
    const authH = ((d.authentic || 0) / mx) * ch;
    const susH = (d.suspicious / mx) * ch;
    const cntH = (d.counterfeit / mx) * ch;
    const baseY = 20 + ch;
    const showLabel = i % labelEvery === 0;
    return `
          <rect x="${x}" y="${baseY - authH - susH - cntH}" width="${barW}" height="${authH}" fill="#22c55e" rx="1" opacity="0.7"/>
          <rect x="${x}" y="${baseY - susH - cntH}" width="${barW}" height="${susH}" fill="#f59e0b" opacity="0.7"/>
          <rect x="${x}" y="${baseY - cntH}" width="${barW}" height="${cntH}" fill="#ef4444" opacity="0.7"/>
          ${showLabel ? `<text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" fill="#666" font-size="7">${formatDay(d.day)}</text>` : ''}
        `;
  }).join('')}
    </svg>`;
}

function formatWeek(w) {
  if (!w) return '??';
  const d = new Date(w);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatDay(d) {
  if (!d) return '??';
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

async function loadData() {
  try {
    const r = await api.get('/tenant/owner/ccs/trends?range=full');
    _data = r;
    rerender();
  } catch (e) { console.error('[Trends]', e); }
}

function rerender() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
}

function loadingState() {
  return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading risk trends (full history)...</div></div></div>`;
}
