/**
 * Risk – Forensic Investigation (Timeline Forensic for Ops & Risk)
 * Scan chain visualization, device comparison, geo trace, evidence builder
 */
import { icon } from '../../core/icons.js';

const INVESTIGATION = {
    caseId: 'FC-2026-089',
    code: 'ACME-2026-004891-3L',
    product: 'Premium Coffee Blend 250g',
    batch: 'B-2026-0895',
    batchSize: 10000,
    currentERS: 82,
    status: 'Under Investigation',
};

const SCAN_CHAIN = [
    { seq: 1, ts: '2026-01-15 10:23:42 UTC', geo: 'Ho Chi Minh City, VN', lat: 10.762, lng: 106.660, device: 'iPhone 14 Pro (dev-hash-A1B2)', ip: '116.96.xx.xx', ers: 0, level: 'First Scan', note: 'Legitimate first scan — within distributor zone' },
    { seq: 2, ts: '2026-02-12 14:05:18 UTC', geo: 'Ho Chi Minh City, VN', lat: 10.775, lng: 106.699, device: 'iPhone 14 Pro (dev-hash-A1B2)', ip: '116.96.xx.xx', ers: 8, level: 'Low', note: 'Same device, same city, 28 days gap — consumer curiosity' },
    { seq: 3, ts: '2026-02-18 02:14:33 UTC', geo: 'Phnom Penh, Cambodia', lat: 11.556, lng: 104.917, device: 'Samsung A54 (dev-hash-X9Y8)', ip: '203.189.xx.xx', ers: 72, level: 'High', note: '<span class="status-icon status-warn" aria-label="Warning">!</span> Different device + Different country + 6 day gap + night scan' },
    { seq: 4, ts: '2026-02-18 02:18:07 UTC', geo: 'Phnom Penh, Cambodia', lat: 11.558, lng: 104.921, device: 'Unknown (dev-hash-Z7W6)', ip: '203.189.xx.xx', ers: 82, level: 'Critical', note: '🚨 3rd device, same IP, 4 min gap, same block — counterfeit cluster' },
    { seq: 5, ts: '2026-02-18 02:19:52 UTC', geo: 'Phnom Penh, Cambodia', lat: 11.557, lng: 104.919, device: 'Unknown (dev-hash-Q5P4)', ip: '203.189.xx.xx', ers: 95, level: 'Critical', note: '🚨 4th device, same IP block, 1.7 min gap — batch locked' },
];

const DEVICE_COMPARE = [
    { field: 'Device', scan1: 'iPhone 14 Pro', scan3: 'Samsung A54', scan4: 'Unknown', match: '<span class="status-icon status-fail" aria-label="Fail">✗</span>' },
    { field: 'Device Hash', scan1: 'A1B2...', scan3: 'X9Y8...', scan4: 'Z7W6...', match: '<span class="status-icon status-fail" aria-label="Fail">✗</span>' },
    { field: 'OS', scan1: 'iOS 17.3', scan3: 'Android 14', scan4: 'Android 13', match: '<span class="status-icon status-fail" aria-label="Fail">✗</span>' },
    { field: 'Screen', scan1: '2556×1179', scan3: '2340×1080', scan4: '2400×1080', match: '<span class="status-icon status-fail" aria-label="Fail">✗</span>' },
    { field: 'IP Block', scan1: '116.96.xx', scan3: '203.189.xx', scan4: '203.189.xx', match: '<span class="status-icon status-warn" aria-label="Warning">!</span> 3,4 match' },
    { field: 'Country', scan1: 'Vietnam 🇻🇳', scan3: 'Cambodia 🇰🇭', scan4: 'Cambodia 🇰🇭', match: '<span class="status-icon status-warn" aria-label="Warning">!</span> 3,4 match' },
    { field: 'User Agent', scan1: 'Safari/605.1', scan3: 'Chrome/121', scan4: 'No UA', match: '<span class="status-icon status-fail" aria-label="Fail">✗</span> #4 suspicious' },
];

const FACTOR_BREAKDOWN = [
    { factor: 'G2 Cross-Country', contribution: 40, pct: '48.8%', detail: 'VN → KH = confirmed cross-border' },
    { factor: 'F1 Scan Count', contribution: 15, detail: '5th scan total — elevated' },
    { factor: 'F2 Time Gap', contribution: 10, detail: '< 2 min between scan 4 & 5' },
    { factor: 'T2 IP Cluster', contribution: 12, detail: '3 unique devices from same /24 IP' },
    { factor: 'B1 Night Burst', contribution: 5, detail: '02:14-02:19 local time' },
];

export function renderPage() {
    const inv = INVESTIGATION;
    const ersColor = inv.currentERS > 80 ? '#991b1b' : inv.currentERS > 60 ? '#ef4444' : '#f59e0b';
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Forensic Investigation</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">Export Evidence Package</button></div></div>

      <!-- CASE HEADER -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid ${ersColor}">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:1rem">
          <div><div style="font-size:0.68rem;color:var(--text-secondary)">Case ID</div><div style="font-weight:700;color:#6366f1">${inv.caseId}</div></div>
          <div><div style="font-size:0.68rem;color:var(--text-secondary)">Code</div><div style="font-family:monospace;font-size:0.78rem">${inv.code}</div></div>
          <div><div style="font-size:0.68rem;color:var(--text-secondary)">Product</div><div style="font-size:0.82rem">${inv.product}</div></div>
          <div><div style="font-size:0.68rem;color:var(--text-secondary)">Batch</div><div style="font-family:monospace">${inv.batch} (${inv.batchSize.toLocaleString()} codes)</div></div>
          <div><div style="font-size:0.68rem;color:var(--text-secondary)">Current ERS</div><div style="font-size:1.8rem;font-weight:800;color:${ersColor}">${inv.currentERS}</div></div>
        </div>
      </div>

      <!-- SCAN CHAIN TIMELINE -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔗 Scan Chain Timeline (Forensic)</h3>
        <div style="position:relative;padding-left:2rem">
          ${SCAN_CHAIN.map((s, i) => {
        const clr = s.level === 'First Scan' ? '#22c55e' : s.level === 'Low' ? '#22c55e' : s.level === 'High' ? '#ef4444' : '#991b1b';
        const isAlert = s.ers > 60;
        return `
            <div style="position:relative;padding:0.75rem;margin-bottom:0.5rem;border-left:3px solid ${clr};background:${isAlert ? clr + '06' : 'transparent'};border-radius:0 8px 8px 0">
              <div style="position:absolute;left:-1.35rem;top:0.75rem;width:12px;height:12px;border-radius:50%;background:${clr};border:2px solid var(--bg-primary)"></div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <span style="font-weight:700;color:${clr}">Scan #${s.seq}</span>
                  <span class="sa-code" style="font-size:0.72rem;margin-left:0.5rem">${s.ts}</span>
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center">
                  <span style="font-weight:800;font-size:1.1rem;color:${clr}">${s.ers}</span>
                  <span class="sa-status-pill" style="background:${clr}12;color:${clr};border:1px solid ${clr}25;font-size:0.62rem">${s.level}</span>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-top:0.4rem;font-size:0.72rem">
                <div>📍 <strong>${s.geo}</strong></div>
                <div>📱 ${s.device}</div>
                <div>🌐 ${s.ip}</div>
              </div>
              <div style="font-size:0.72rem;margin-top:0.3rem;color:var(--text-secondary)">${s.note}</div>
              ${i < SCAN_CHAIN.length - 1 ? `<div style="font-size:0.62rem;color:#6366f1;margin-top:0.3rem">↓ ${timeDiff(s.ts, SCAN_CHAIN[i + 1].ts)} · ${geoDist(s, SCAN_CHAIN[i + 1])}</div>` : ''}
            </div>`;
    }).join('')}
        </div>
      </div>

      <!-- DEVICE COMPARISON + FACTOR BREAKDOWN -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>📱 Device Comparison Matrix</h3>
          <table class="sa-table"><thead><tr><th>Field</th><th>Scan #1 (VN)</th><th>Scan #3 (KH)</th><th>Scan #4 (KH)</th><th>Match</th></tr></thead><tbody>
            ${DEVICE_COMPARE.map(d => `<tr>
              <td><strong>${d.field}</strong></td><td style="font-size:0.72rem">${d.scan1}</td>
              <td style="font-size:0.72rem">${d.scan3}</td><td style="font-size:0.72rem">${d.scan4}</td>
              <td style="font-size:1rem;text-align:center">${d.match}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
        <div class="sa-card">
          <h3>📐 ERS Factor Contribution (Scan #4)</h3>
          <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.5rem">Explainable scoring — audit can reconstruct this calculation.</p>
          ${FACTOR_BREAKDOWN.map(f => {
        const w = Math.min(f.contribution * 2, 100);
        return `<div style="margin-bottom:0.5rem">
              <div style="display:flex;justify-content:space-between;font-size:0.78rem">
                <strong>${f.factor}</strong><span style="font-weight:700;color:#6366f1">+${f.contribution}</span>
              </div>
              <div style="height:6px;background:var(--border);border-radius:3px;margin:0.2rem 0"><div style="height:100%;width:${w}%;background:#6366f1;border-radius:3px"></div></div>
              <div style="font-size:0.62rem;color:var(--text-secondary)">${f.detail}</div>
            </div>`;
    }).join('')}
          <div style="border-top:2px solid var(--border);padding-top:0.5rem;margin-top:0.5rem;display:flex;justify-content:space-between">
            <strong>Total ERS</strong><span style="font-size:1.2rem;font-weight:800;color:#991b1b">${inv.currentERS}</span>
          </div>
        </div>
      </div>

      <!-- EVIDENCE BUILDER -->
      <div class="sa-card" style="border-left:4px solid #22c55e">
        <h3>📦 Evidence Package Builder</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.75rem">Regulator-ready export: PDF + signed JSON + hash verification chain.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
          ${[
            ['📋 Scan Logs', `${SCAN_CHAIN.length} events`, 'Complete chain with timestamps'],
            ['📐 Risk Breakdown', 'ERS factor detail', 'Explainable + reconstructable'],
            ['📱 Device Analysis', `${DEVICE_COMPARE.length} fields compared`, '3 devices compared'],
            ['🌍 Geo Trace', 'Coordinate + distance', 'VN → KH impossible travel'],
            ['🔒 Hash Proof', 'SHA-256 chain', 'Immutable + verifiable'],
            ['✍️ Digital Signature', 'RSA-2048', 'Non-repudiation'],
        ].map(([t, v, d]) => `<div style="padding:0.5rem;background:rgba(34,197,94,0.03);border:1px solid rgba(34,197,94,0.1);border-radius:6px">
            <div style="font-weight:600;font-size:0.82rem">${t}</div>
            <div style="font-size:0.78rem;color:#22c55e">${v}</div>
            <div style="font-size:0.62rem;color:var(--text-secondary)">${d}</div>
          </div>`).join('')}
        </div>
        <div style="margin-top:0.75rem;display:flex;gap:0.5rem">
          <button class="btn btn-primary btn-sm">Export PDF + JSON</button>
          <button class="btn btn-outline btn-sm">Verify Hash Chain</button>
          <button class="btn btn-ghost btn-sm">Freeze Case Data</button>
        </div>
      </div>
    </div>`;
}
function timeDiff(a, b) {
    const d1 = new Date(a), d2 = new Date(b);
    const mins = Math.round((d2 - d1) / 60000);
    if (mins < 60) return mins + ' min';
    if (mins < 1440) return Math.round(mins / 60) + 'h';
    return Math.round(mins / 1440) + 'd';
}
function geoDist(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))) + ' km';
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
