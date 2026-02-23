/**
 * Risk – Scoring Engine (Enterprise Anti-Counterfeit)
 * 4-Tier Architecture: Event Risk → Batch Risk → Channel Risk → Brand Risk
 * Deterministic + Explainable + ML-upgradable
 */
import { icon } from '../../core/icons.js';

// ─── FACTOR DEFINITIONS ───────────────────────────────────────
const SCAN_FREQUENCY = [
  { id: 'F1', factor: 'Scan Count', logic: 'First scan = 0, 2nd = +8, 3rd = +15, 4+ = +25, 10+ = +30', range: '0–30', weight: 1.0 },
  { id: 'F2', factor: 'Time Gap', logic: '< 10 min between scans = +10, < 3 min = +15, < 1 min = +20', range: '0–20', weight: 0.9 },
  { id: 'F3', factor: 'Burst Scan', logic: '> 5 scans/hr = +15, > 10/hr = +20, > 20/hr = +25', range: '0–25', weight: 0.85 },
];
const GEO_RISK = [
  { id: 'G1', factor: 'Distance Anomaly', logic: '> 200km in 1hr = +20, > 500km = +25, > 1000km = +30', range: '0–30', weight: 1.0 },
  { id: 'G2', factor: 'Cross-Country', logic: 'Different country from last scan = +30, blacklisted country = +40', range: '0–40', weight: 1.2 },
  { id: 'G3', factor: 'Outside Distribution Zone', logic: 'Not in assigned distributor region = +25', range: '0–25', weight: 0.9 },
];
const DEVICE_TECH = [
  { id: 'T1', factor: 'Same Device Repeat', logic: 'Same device hash > 3x = +5, > 10x = +10', range: '0–10', weight: 0.7 },
  { id: 'T2', factor: 'IP Cluster', logic: '> 5 unique codes from same IP/24h = +10, > 20 = +20', range: '0–20', weight: 0.8 },
  { id: 'T3', factor: 'Bot Signature', logic: 'Headless browser / API scraping pattern = +50', range: '0–50', weight: 1.5 },
];
const BEHAVIORAL = [
  { id: 'B1', factor: 'Night Burst', logic: 'Scan cluster between 00:00–05:00 local = +15', range: '0–15', weight: 0.8 },
  { id: 'B2', factor: 'Flagged IP', logic: 'IP in blacklist from previous investigation = +30', range: '0–30', weight: 1.0 },
  { id: 'B3', factor: 'Known Counterfeit Zone', logic: 'Geo matches confirmed counterfeit cluster = +35', range: '0–35', weight: 1.3 },
];

const ERS_LEVELS = [
  { range: '0–30', level: 'Low', color: '#22c55e', action: 'Log only — no action required' },
  { range: '31–60', level: 'Medium', color: '#f59e0b', action: 'Create soft case → Ops dashboard' },
  { range: '61–80', level: 'High', color: '#ef4444', action: 'Create high-risk case → Notify Risk team → Flag product' },
  { range: '81–100', level: 'Critical', color: '#991b1b', action: 'Lock batch → Escalate Compliance → CEO alert panel' },
];

const LIVE_EVENTS = [
  { ts: '19:01:42', code: 'ACME-2026-004891-3L', ers: 82, level: 'Critical', factors: 'G2:40 + F3:25 + B3:17', batch: 'B-2026-0895', region: 'Phnom Penh, KH', action: 'Batch locked + CEO notified' },
  { ts: '19:01:38', code: 'ACME-2026-001233-9K', ers: 64, level: 'High', factors: 'F1:25 + G3:25 + T2:14', batch: 'B-2026-0891', region: 'Jakarta, ID', action: 'Case created → Risk team' },
  { ts: '19:01:30', code: 'ACME-D-VN045-000891', ers: 42, level: 'Medium', factors: 'F2:15 + G1:20 + B1:7', batch: 'B-2026-0887', region: 'Bangkok, TH', action: 'Soft case → Ops' },
  { ts: '19:01:22', code: 'ACME-2026-000142-7K', ers: 12, level: 'Low', factors: 'F1:8 + T1:4', batch: 'B-2026-0895', region: 'HCM, VN', action: 'Logged' },
  { ts: '19:01:15', code: 'ACME-2026-007100-2M', ers: 95, level: 'Critical', factors: 'T3:50 + G2:30 + B2:15', batch: 'B-2026-0891', region: 'Unknown VPN', action: 'Batch locked + IP blocked' },
];

const BRS_DATA = [
  { batch: 'B-2026-0895', product: 'Coffee Blend', codes: 10000, avgERS: 28, highERS: 3, multiplier: '1.0×', brs: 28, level: 'Low' },
  { batch: 'B-2026-0891', product: 'Tea Collection', codes: 5000, avgERS: 52, highERS: 8, multiplier: '1.2× (cluster)', brs: 62, level: 'High' },
  { batch: 'B-2026-0887', product: 'Manuka Honey', codes: 2000, avgERS: 35, highERS: 2, multiplier: '1.0×', brs: 35, level: 'Medium' },
];

const CRS_DATA = [
  { distributor: 'D-VN-012 (Saigon Trading)', region: 'VN-South', units: 5200, duplicates: 42, rate: '0.8%', crs: 'Low', trend: '→' },
  { distributor: 'D-KH-001 (Phnom Penh Corp)', region: 'Cambodia', units: 1800, duplicates: 412, rate: '22.9%', crs: 'Investigate', trend: '↑↑' },
  { distributor: 'D-ID-005 (Jakarta Link)', region: 'Indonesia', units: 3100, duplicates: 186, rate: '6.0%', crs: 'Medium', trend: '↑' },
  { distributor: 'D-TH-003 (Bangkok Trade)', region: 'Thailand', units: 2400, duplicates: 288, rate: '12.0%', crs: 'High', trend: '↑' },
];

export function renderPage() {
  const allFactors = [...SCAN_FREQUENCY, ...GEO_RISK, ...DEVICE_TECH, ...BEHAVIORAL];
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('target', 28)} Risk Scoring Engine</h1><div class="sa-title-actions"><span style="font-size:0.72rem;color:var(--text-secondary)">4-Tier + Advanced Models · Deterministic + Self-calibrating · &lt;300ms</span></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Events Scored (24h)', '4,892', 'Avg 1.8ms per eval', 'blue', 'zap')}
        ${m('False Positive Rate', '8.2%', '↓ from 14.1% (recalibrated)', 'green', 'target')}
        ${m('Brand Risk Index', '0.23', '↓ from 0.31 last month', 'green', 'shield')}
        ${m('Recalibration', 'Weekly', 'Last: Feb 17 · 3 weights adjusted', 'blue', 'settings')}
      </div>

      <!-- TIER ARCHITECTURE (UPGRADED) -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🏗 4-Tier Scoring Architecture (Advanced)</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin:1rem 0">
          ${[
      ['Tier 1', 'Event Risk (ERS)', 'Per scan event', '#3b82f6', 'ERS = Σ(W × F × Decay × Recal)'],
      ['Tier 2', 'Batch Risk (BRS)', 'Per production batch', '#6366f1', 'BRS = AVG(ERS) × ClusterMult'],
      ['Tier 3', 'Channel Risk (CRS)', 'Per distributor', '#8b5cf6', 'CRS = Duplicates / Units'],
      ['Tier 4', 'Brand Risk (BRI)', 'Enterprise-wide', '#a855f7', 'BRI = Weighted(all tiers)'],
    ].map(([tier, name, scope, color, formula]) => `
            <div style="background:${color}08;border:1px solid ${color}20;border-top:3px solid ${color};border-radius:8px;padding:0.75rem;text-align:center">
              <div style="font-size:0.68rem;font-weight:600;color:${color}">${tier}</div>
              <div style="font-size:0.92rem;font-weight:700;margin:0.3rem 0">${name}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${scope}</div>
              <div style="font-size:0.65rem;font-family:monospace;margin-top:0.4rem;color:${color}">${formula}</div>
            </div>
          `).join('<div style="display:flex;align-items:center;color:var(--text-secondary)">→</div>')}
        </div>
      </div>

      <!-- ADVANCED RISK MODELS -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #6366f1">
        <h3>🧬 Advanced Risk Models</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Beyond rule-based: self-calibrating, time-aware, learning from outcomes.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          ${advModel('⏳ Risk Decay Function', '#3b82f6',
      'effective_score = raw_score × e^(-λt)',
      'λ = 0.015 · half-life ≈ 46 days',
      'Score decays over time if no new events. Scan #2 after 6 months ≠ scan #2 after 3 minutes.',
      [['ERS 82, t=0', '82.0', '→ Critical'], ['ERS 82, t=7d', '73.6', '→ High'], ['ERS 82, t=30d', '52.5', '→ Medium'], ['ERS 82, t=90d', '21.2', '→ Low']]
    )}
          ${advModel('🔄 Dynamic Recalibration', '#22c55e',
      'adj_weight = base × (1 + α × FP_rate)',
      'α = -0.1 · Review: weekly · Auto',
      'Factors with high false positive rate get weight reduced. Factors that catch real fraud get boosted.',
      [['F1 (Scan Count)', '1.0× → 0.92×', 'FP rate 18%'], ['G2 (Cross-Country)', '1.2× → 1.35×', 'FP rate 3%'], ['T1 (Device Repeat)', '0.7× → 0.58×', 'FP rate 24%'], ['B3 (Counterfeit Zone)', '1.3× → 1.42×', 'FP rate 5%']]
    )}
          ${advModel('📍 Historical Weighting', '#f59e0b',
      'ctx = f(time_gap, geo, device)',
      'Context multiplier: 0.2× – 3.0×',
      'Same context (device+city+long gap) = low multiplier. Different context (new device+new country+short gap) = high multiplier.',
      [['Same device, same city, 6mo', '0.3×', 'Likely same owner'], ['Same device, diff city, 1d', '1.2×', 'Travel possible'], ['Diff device, diff country, 3min', '2.5×', 'Impossible travel'], ['Unknown device, VPN, burst', '3.0×', 'Bot signature']]
    )}
          ${advModel('🔁 False Positive Feedback', '#8b5cf6',
      'case_closed → extract factors → adjust',
      'Closed FP: weight -5% · Confirmed: +3%',
      'Each resolved case feeds back into the model. Over time, the engine becomes more accurate.',
      [['FC-079 Confirmed', 'G2+1.5%, B3+1.2%', 'Cross-country risk validated'], ['FC-082 False Positive', 'F1-5%, T1-8%', 'Warehouse re-scan pattern'], ['FC-075 Confirmed', 'T3+2%, T2+1.5%', 'Bot pattern validated'], ['Cumulative effect', 'FP rate: 14.1% → 8.2%', '6 weeks of learning']]
    )}
        </div>
      </div>

      <!-- CALIBRATION AUDIT LOG -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📐 Weight Calibration Audit</h3>
        <table class="sa-table"><thead><tr><th>Date</th><th>Trigger</th><th>Factor</th><th>Old Weight</th><th>New Weight</th><th>Reason</th><th>FP Impact</th></tr></thead><tbody>
          ${[
      ['Feb 17', 'Weekly review', 'F1 (Scan Count)', '1.0×', '0.92×', 'FP rate 18% — warehouse scan patterns', '↓ -2.1%'],
      ['Feb 17', 'Weekly review', 'T1 (Device Repeat)', '0.7×', '0.58×', 'FP rate 24% — stocktake workflows', '↓ -1.8%'],
      ['Feb 17', 'Case FC-079', 'G2 (Cross-Country)', '1.2×', '1.35×', 'Confirmed counterfeit ring in KH', '→ stable'],
      ['Feb 10', 'Weekly review', 'B3 (Counterfeit Zone)', '1.2×', '1.30×', 'Zone accuracy improved after KH case', '→ stable'],
      ['Feb 10', 'Case FC-075', 'T3 (Bot Detect)', '1.4×', '1.50×', 'Confirmed API scraping pattern', '↓ -0.5%'],
    ].map(([d, t, f, ow, nw, r, fp]) => `<tr>
            <td class="sa-code">${d}</td><td style="font-size:0.78rem">${t}</td><td><strong>${f}</strong></td>
            <td class="sa-code">${ow}</td><td class="sa-code" style="font-weight:700;color:#6366f1">${nw}</td>
            <td style="font-size:0.72rem">${r}</td>
            <td style="color:${fp.includes('↓') ? '#22c55e' : 'var(--text-secondary)'}">${fp}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- EVENT RISK FACTORS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        ${factorTable('📡 A. Scan Frequency', SCAN_FREQUENCY, '#3b82f6')}
        ${factorTable('🌍 B. Geo Risk', GEO_RISK, '#ef4444')}
        ${factorTable('📱 C. Device / Technical', DEVICE_TECH, '#f59e0b')}
        ${factorTable('🧠 D. Behavioral Pattern', BEHAVIORAL, '#8b5cf6')}
      </div>

      <!-- ERS CLASSIFICATION -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 ERS Classification → Action Mapping</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;margin:1rem 0">
          ${ERS_LEVELS.map(l => `
            <div style="background:${l.color}08;border:1px solid ${l.color}20;border-left:4px solid ${l.color};border-radius:8px;padding:0.75rem">
              <div style="font-size:1.1rem;font-weight:800;color:${l.color}">${l.range}</div>
              <div style="font-weight:700;margin:0.2rem 0">${l.level}</div>
              <div style="font-size:0.72rem;color:var(--text-secondary)">${l.action}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- LIVE EVENT FEED -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>⚡ Live Risk Scoring Feed</h3>
        <table class="sa-table"><thead><tr><th>Time</th><th>Code</th><th>ERS</th><th>Level</th><th>Factors</th><th>Batch</th><th>Region</th><th>Action Taken</th></tr></thead><tbody>
          ${LIVE_EVENTS.map(e => {
      const lvl = ERS_LEVELS.find(l => l.level === e.level);
      return `<tr class="${e.ers > 60 ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-size:0.78rem">${e.ts}</td>
              <td class="sa-code" style="font-size:0.68rem;color:#6366f1">${e.code}</td>
              <td style="font-weight:800;color:${lvl?.color || '#64748b'};font-size:1.1rem">${e.ers}</td>
              <td><span class="sa-status-pill" style="background:${lvl?.color || '#64748b'}15;color:${lvl?.color || '#64748b'};border:1px solid ${lvl?.color || '#64748b'}30">${e.level}</span></td>
              <td class="sa-code" style="font-size:0.65rem;max-width:180px">${e.factors}</td>
              <td class="sa-code">${e.batch}</td>
              <td style="font-size:0.78rem">${e.region}</td>
              <td style="font-size:0.78rem">${e.action}</td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <!-- BATCH RISK (TIER 2) -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Tier 2: Batch Risk Score (BRS)</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem">BRS = AVG(ERS) × Multiplier. Multiplier increases when cluster patterns detected: >5 high ERS (+20%), >3 provinces in 24h (+30%).</p>
        <table class="sa-table"><thead><tr><th>Batch</th><th>Product</th><th>Codes</th><th>Avg ERS</th><th>High ERS Events</th><th>Multiplier</th><th>BRS</th><th>Level</th></tr></thead><tbody>
          ${BRS_DATA.map(b => {
      const color = b.brs > 60 ? '#ef4444' : b.brs > 30 ? '#f59e0b' : '#22c55e';
      return `<tr class="${b.brs > 60 ? 'ops-alert-row' : ''}">
              <td class="sa-code">${b.batch}</td><td>${b.product}</td>
              <td style="text-align:right">${b.codes.toLocaleString()}</td>
              <td style="text-align:center;font-weight:600">${b.avgERS}</td>
              <td style="text-align:center;color:${b.highERS > 5 ? '#ef4444' : 'inherit'}">${b.highERS}</td>
              <td class="sa-code">${b.multiplier}</td>
              <td style="font-weight:800;color:${color};font-size:1.1rem">${b.brs}</td>
              <td><span class="sa-status-pill sa-pill-${b.level === 'Low' ? 'green' : b.level === 'Medium' ? 'orange' : 'red'}">${b.level}</span></td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <!-- CHANNEL RISK (TIER 3) -->
      <div class="sa-card">
        <h3>🔗 Tier 3: Channel Risk Score (CRS)</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem">CRS = Duplicate scans / Total units. &gt;5% = Medium, &gt;10% = High, &gt;20% = Investigate distributor.</p>
        <table class="sa-table"><thead><tr><th>Distributor</th><th>Region</th><th>Units Sold</th><th>Duplicate Scans</th><th>Dup Rate</th><th>CRS Level</th><th>Trend</th><th>Actions</th></tr></thead><tbody>
          ${CRS_DATA.map(c => {
      const color = c.crs === 'Investigate' ? 'red' : c.crs === 'High' ? 'red' : c.crs === 'Medium' ? 'orange' : 'green';
      return `<tr class="${c.crs === 'Investigate' || c.crs === 'High' ? 'ops-alert-row' : ''}">
              <td><strong>${c.distributor}</strong></td><td>${c.region}</td>
              <td style="text-align:right">${c.units.toLocaleString()}</td>
              <td style="text-align:right;color:${parseFloat(c.rate) > 10 ? '#ef4444' : 'inherit'}">${c.duplicates}</td>
              <td style="font-weight:700;color:${parseFloat(c.rate) > 10 ? '#ef4444' : parseFloat(c.rate) > 5 ? '#f59e0b' : '#22c55e'}">${c.rate}</td>
              <td><span class="sa-status-pill sa-pill-${color}">${c.crs}</span></td>
              <td>${c.trend}</td>
              <td>${c.crs === 'Investigate' ? '<button class="btn btn-xs btn-primary">Investigate</button>' : c.crs === 'High' ? '<button class="btn btn-xs btn-outline">Review</button>' : ''}</td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function factorTable(title, factors, color) {
  return `<div class="sa-card">
    <h3>${title}</h3>
    <table class="sa-table"><thead><tr><th>ID</th><th>Factor</th><th>Logic</th><th>Range</th><th>Weight</th></tr></thead><tbody>
      ${factors.map(f => `<tr>
        <td class="sa-code" style="color:${color};font-weight:700">${f.id}</td>
        <td><strong>${f.factor}</strong></td>
        <td style="font-size:0.72rem;max-width:220px">${f.logic}</td>
        <td class="sa-code" style="font-size:0.78rem">${f.range}</td>
        <td style="font-weight:600">${f.weight}×</td>
      </tr>`).join('')}
    </tbody></table>
  </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

function advModel(title, color, formula, params, desc, data) {
  return `<div style="background:${color}04;border:1px solid ${color}12;border-top:3px solid ${color};border-radius:8px;padding:0.75rem">
    <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.3rem">${title}</div>
    <div style="font-family:monospace;font-size:0.75rem;font-weight:600;color:${color};background:${color}08;padding:0.3rem 0.5rem;border-radius:4px;margin-bottom:0.3rem">${formula}</div>
    <div style="font-size:0.68rem;color:var(--text-secondary);margin-bottom:0.4rem">${params}</div>
    <div style="font-size:0.72rem;margin-bottom:0.5rem">${desc}</div>
    <table style="width:100%;font-size:0.68rem;border-collapse:collapse">${data.map(([a, b, c2]) => `<tr style="border-top:1px solid var(--border)"><td style="padding:2px 4px">${a}</td><td style="padding:2px 4px;font-weight:600;color:${color}">${b}</td><td style="padding:2px 4px;color:var(--text-secondary)">${c2}</td></tr>`).join('')}</table>
  </div>`;
}

