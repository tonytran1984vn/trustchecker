/**
 * Company Admin – Scan Analytics (Internal Intelligence per Persona)
 * CEO metrics, Ops channel, Risk patterns, Compliance audit, IT traffic
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Scan Analytics</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Total Scans (30d)', '142,847', '+23.4% vs prev month', 'blue', 'search')}
        ${m('First Scan Rate', '94.2%', 'Target: >95%', 'green', 'check')}
        ${m('Duplicate Rate', '5.8%', '<span class="status-icon status-warn" aria-label="Warning">!</span> Above 5% threshold', 'orange', 'alertTriangle')}
        ${m('Anomaly Events', '23', '12 critical, 11 high', 'red', 'shield')}
      </div>

      <!-- CEO VIEW -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #a855f7">
        <h3>👔 CEO View — Brand Protection KPIs</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:1rem">Decision-ready metrics: What → So What → Now What</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
          ${[
            ['First Scan Rate', '94.2%', 'Below 95% target', '#f59e0b', 'Monitor — Ops investigating top 3 regions'],
            ['Duplicate Rate', '5.8%', 'Above 5% threshold', '#ef4444', 'ACTION: Approval needed for Cambodia investigation'],
            ['Brand Risk Index', '0.23', 'Down from 0.31', '#22c55e', 'Positive trend — continue current strategy'],
            ['Revenue Protected', '$2.4M', '+18% vs Q3', '#22c55e', 'Expand QR to Thailand (+$800K est.)'],
        ].map(([label, value, note, color, action]) => `
            <div style="background:${color}06;border:1px solid ${color}15;border-radius:8px;padding:0.75rem">
              <div style="font-size:0.68rem;color:var(--text-secondary)">${label}</div>
              <div style="font-size:1.4rem;font-weight:800;color:${color}">${value}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:0.2rem">${note}</div>
              <div style="font-size:0.68rem;margin-top:0.5rem;padding:0.3rem 0.5rem;background:${color}08;border-radius:4px"><strong>NOW:</strong> ${action}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:0.75rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div style="padding:0.6rem;background:rgba(239,68,68,0.04);border-radius:6px;font-size:0.78rem"><strong><span class="status-dot red"></span> Top Risk Regions:</strong> Cambodia (22.9%), Indonesia (6.0%), Thailand (12.0%)</div>
          <div style="padding:0.6rem;background:rgba(34,197,94,0.04);border-radius:6px;font-size:0.78rem"><strong><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Clean Regions:</strong> Singapore (0.8%), Japan (0%), Vietnam South (1.2%)</div>
        </div>
      </div>

      <!-- OPS VIEW -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #3b82f6">
        <h3>🏭 Ops View — Channel & Distribution Intelligence</h3>
        <table class="sa-table"><thead><tr><th>Channel</th><th>Region</th><th>Units</th><th>First Scans</th><th>Duplicates</th><th>Dup Rate</th><th>Channel Leakage</th><th>Status</th></tr></thead><tbody>
          ${[
            ['D-VN-012 (Saigon Trading)', 'VN-South', '5,200', '5,158', '42', '0.8%', 'None', 'green'],
            ['D-VN-008 (Hanoi Express)', 'VN-North', '3,400', '3,311', '89', '2.6%', 'None', 'green'],
            ['D-TH-003 (Bangkok Trade)', 'Thailand', '2,400', '2,112', '288', '12.0%', '<span class="status-icon status-warn" aria-label="Warning">!</span> Suspected', 'orange'],
            ['D-KH-001 (Phnom Penh Corp)', 'Cambodia', '1,800', '1,388', '412', '22.9%', '🚨 Confirmed', 'red'],
            ['D-ID-005 (Jakarta Link)', 'Indonesia', '3,100', '2,914', '186', '6.0%', '<span class="status-icon status-warn" aria-label="Warning">!</span> Under review', 'orange'],
        ].map(([ch, reg, units, first, dup, rate, leak, color]) => `<tr class="${color === 'red' ? 'ops-alert-row' : ''}">
            <td><strong>${ch}</strong></td><td>${reg}</td><td style="text-align:right">${units}</td>
            <td style="text-align:right">${first}</td><td style="text-align:right;color:${color === 'red' ? '#ef4444' : 'inherit'}">${dup}</td>
            <td style="font-weight:700;color:${color === 'red' ? '#ef4444' : color === 'orange' ? '#f59e0b' : '#22c55e'}">${rate}</td>
            <td>${leak}</td>
            <td><span class="sa-status-pill sa-pill-${color}">${color === 'red' ? 'investigate' : color === 'orange' ? 'review' : 'clean'}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <!-- RISK VIEW -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #ef4444">
        <h3>🎯 Risk View — Pattern Analysis</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">
          ${[
            ['Counterfeit Ring', 'KH-PP', '94%', '148 events clustered: same batch × 12 locations × 4h window', 'red'],
            ['Parallel Import', 'ID-JK', '87%', 'Products in unauthorized channel — distributor not registered', 'red'],
            ['Velocity Anomaly', 'TH-BKK', '78%', '8× normal scan rate from single IP range — possible bot', 'orange'],
        ].map(([type, region, conf, desc, color]) => `
            <div style="background:${color === 'red' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)'};border:1px solid ${color === 'red' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};border-radius:8px;padding:0.75rem">
              <div style="display:flex;justify-content:space-between"><strong>${type}</strong><span class="sa-code" style="font-size:0.72rem">${region}</span></div>
              <div style="font-size:1.2rem;font-weight:800;color:${color === 'red' ? '#ef4444' : '#f59e0b'};margin:0.3rem 0">${conf} confidence</div>
              <div style="font-size:0.72rem;color:var(--text-secondary)">${desc}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- COMPLIANCE VIEW -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #8b5cf6">
        <h3>📜 Compliance View — Audit & Evidence</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div>
            <div style="font-size:0.78rem;font-weight:600;margin-bottom:0.5rem">Evidence Packages Ready</div>
            ${[
            ['EP-2026-089', 'Counterfeit ring — Phnom Penh', '12 items', 'Ready for regulator'],
            ['EP-2026-088', 'Parallel import — Jakarta', '5 items', 'Under preparation'],
        ].map(([id, title, items, status]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:rgba(139,92,246,0.04);border-radius:6px;margin-bottom:0.3rem;font-size:0.78rem">
                <span class="sa-code">${id}</span><span>${title}</span><span>${items}</span><span class="sa-status-pill sa-pill-blue" style="font-size:0.65rem">${status}</span>
              </div>
            `).join('')}
          </div>
          <div style="padding:0.75rem;background:rgba(139,92,246,0.04);border-radius:8px">
            <div style="font-size:0.78rem;font-weight:600;margin-bottom:0.5rem">Regulatory Report Status</div>
            <div style="font-size:0.78rem;line-height:1.8">
              <div><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Immutable audit chain: 142,847 entries · 100% integrity</div>
              <div><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Legal holds: 2 active (FC-2026-089, FC-2026-088)</div>
              <div><span class="status-icon status-warn" aria-label="Warning">!</span> Pending: Regulator notification for KH counterfeit case</div>
              <div><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Export: Signed PDF/CSV available</div>
            </div>
          </div>
        </div>
      </div>

      <!-- IT VIEW -->
      <div class="sa-card" style="border-left:4px solid #06b6d4">
        <h3>🔧 IT View — Traffic & Security</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
          ${[
            ['API Requests (24h)', '28,450', 'Normal', 'green'],
            ['Bot Detected', '3', 'Blocked', 'red'],
            ['Rate Limited', '12', 'Throttled IPs', 'orange'],
            ['Avg Response', '45ms', 'P99: 210ms', 'green'],
        ].map(([label, value, status, color]) => `
            <div style="text-align:center;padding:0.75rem;background:${color === 'red' ? 'rgba(239,68,68,0.06)' : color === 'orange' ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.04)'};border-radius:8px">
              <div style="font-size:1.2rem;font-weight:700">${value}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${label}</div>
              <div style="font-size:0.65rem;margin-top:0.3rem"><span class="sa-status-pill sa-pill-${color}" style="font-size:0.6rem">${status}</span></div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:0.75rem;padding:0.5rem;background:rgba(239,68,68,0.04);border-radius:6px;font-size:0.78rem">
          <strong>🚨 Blocked IPs (24h):</strong> 103.45.67.0/24 (Phnom Penh, bot pattern), 185.92.xx.xx (VPN, auto-scanner), 45.12.xx.xx (Jakarta, rate abuse)
        </div>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
