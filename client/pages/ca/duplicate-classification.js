/**
 * CA – Duplicate Classification Intelligence
 * Classify duplicates: Consumer Curiosity vs Channel Leakage vs Counterfeit
 * Solves the "5.8% panic" problem — not all duplicates are counterfeit
 */
import { icon } from '../../core/icons.js';

const OVERALL = { total: 5800, curiosity: 3480, leakage: 1160, counterfeit: 870, unclassified: 290 };

const CLASSIFICATION_RULES = [
    { type: 'Consumer Curiosity', pct: '60%', color: '#22c55e', icon: '👤', description: 'Same consumer re-scanning for info, warranty, or loyalty', signals: 'Same device, same city, gap >24h, ≤3 scans total', risk: 'None', action: 'Exclude from risk KPIs', count: OVERALL.curiosity },
    { type: 'Channel Leakage', pct: '20%', color: '#f59e0b', icon: '🔀', description: 'Product sold outside authorized distribution zone', signals: 'Different geo from assigned distributor, sequential codes, same batch', risk: 'Medium', action: 'Flag distributor + Ops case', count: OVERALL.leakage },
    { type: 'Counterfeit', pct: '15%', color: '#ef4444', icon: '🚨', description: 'Confirmed or high-confidence counterfeit scan', signals: 'Different device + country + short gap, cluster pattern, known counterfeit zone', risk: 'Critical', action: 'Lock batch + Risk case + CEO', count: OVERALL.counterfeit },
    { type: 'Unclassified', pct: '5%', color: '#94a3b8', icon: '❓', description: 'Insufficient signals for classification', signals: 'Ambiguous context — requires manual review', risk: 'Pending', action: 'Queue for analyst review', count: OVERALL.unclassified },
];

const CEO_VIEW = {
    rawDup: '5.8%',
    adjDup: '2.3%',
    curiosity: '3.5%',
    leakage: '1.2%',
    counterfeit: '0.87%',
    unclass: '0.23%',
};

const DISTRIBUTOR_LEAKAGE = [
    { distributor: 'D-KH-001 (Phnom Penh Corp)', zone: 'Cambodia only', foundIn: 'Thailand, Vietnam', dupRate: '22.9%', classified: 'Leakage: 68%, Counterfeit: 25%, Curiosity: 7%', action: 'Investigation open', severity: 'Critical' },
    { distributor: 'D-TH-003 (Bangkok Trade)', zone: 'Thailand', foundIn: 'Myanmar, Laos', dupRate: '12.0%', classified: 'Leakage: 72%, Counterfeit: 8%, Curiosity: 20%', action: 'Warning issued', severity: 'High' },
    { distributor: 'D-ID-005 (Jakarta Link)', zone: 'Indonesia', foundIn: 'Malaysia', dupRate: '6.0%', classified: 'Leakage: 45%, Counterfeit: 5%, Curiosity: 50%', action: 'Monitoring', severity: 'Medium' },
];

export function renderPage() {
    const totalDup = OVERALL.total;
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Duplicate Classification</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Raw Duplicate Rate', CEO_VIEW.rawDup, '<span class="status-icon status-warn" aria-label="Warning">!</span> Misleading without classification', 'orange', 'alert')}
        ${m('Adjusted Risk Rate', CEO_VIEW.adjDup, 'Leakage + Counterfeit only', 'red', 'target')}
        ${m('Curiosity (benign)', CEO_VIEW.curiosity, '${OVERALL.curiosity.toLocaleString()} scans — not risk', 'green', 'users')}
        ${m('Counterfeit (real)', CEO_VIEW.counterfeit, '${OVERALL.counterfeit.toLocaleString()} scans — actual threat', 'red', 'alertTriangle')}
      </div>

      <!-- CEO INSIGHT: THE KEY MESSAGE -->
      <div class="sa-card" style="margin-bottom:1.5rem;border-left:4px solid #6366f1;background:rgba(99,102,241,0.02)">
        <h3>🎯 CEO Insight: Not All Duplicates Are Counterfeit</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.5rem"><span class="status-icon status-fail" aria-label="Fail">✗</span> Without Classification (causes panic)</div>
            <div style="background:rgba(239,68,68,0.05);border-radius:8px;padding:1rem;text-align:center">
              <div style="font-size:2.5rem;font-weight:800;color:#ef4444">${CEO_VIEW.rawDup}</div>
              <div style="font-weight:600">Duplicate Rate</div>
              <div style="font-size:0.72rem;color:#ef4444;margin-top:0.3rem"><span class="status-icon status-warn" aria-label="Warning">!</span> Above 5% threshold — looks alarming</div>
            </div>
          </div>
          <div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.5rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> With Classification (accurate picture)</div>
            <div style="background:rgba(34,197,94,0.03);border-radius:8px;padding:0.75rem">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;text-align:center">
                <div style="background:rgba(34,197,94,0.08);border-radius:6px;padding:0.5rem">
                  <div style="font-size:1.5rem;font-weight:800;color:#22c55e">${CEO_VIEW.curiosity}</div>
                  <div style="font-size:0.72rem">👤 Curiosity</div>
                  <div style="font-size:0.62rem;color:var(--text-secondary)">Benign — exclude</div>
                </div>
                <div style="background:rgba(245,158,11,0.08);border-radius:6px;padding:0.5rem">
                  <div style="font-size:1.5rem;font-weight:800;color:#f59e0b">${CEO_VIEW.leakage}</div>
                  <div style="font-size:0.72rem">🔀 Leakage</div>
                  <div style="font-size:0.62rem;color:var(--text-secondary)">Distribution issue</div>
                </div>
                <div style="background:rgba(239,68,68,0.08);border-radius:6px;padding:0.5rem">
                  <div style="font-size:1.5rem;font-weight:800;color:#ef4444">${CEO_VIEW.counterfeit}</div>
                  <div style="font-size:0.72rem">🚨 Counterfeit</div>
                  <div style="font-size:0.62rem;color:var(--text-secondary)">Real threat</div>
                </div>
                <div style="background:rgba(148,163,184,0.1);border-radius:6px;padding:0.5rem">
                  <div style="font-size:1.5rem;font-weight:800;color:#94a3b8">${CEO_VIEW.unclass}</div>
                  <div style="font-size:0.72rem">❓ Unclassified</div>
                  <div style="font-size:0.62rem;color:var(--text-secondary)">Needs review</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CLASSIFICATION METHODOLOGY -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📐 Classification Methodology</h3>
        ${CLASSIFICATION_RULES.map(c => `
          <div style="display:flex;gap:1rem;padding:0.75rem;border-bottom:1px solid var(--border)">
            <div style="font-size:1.5rem;width:40px;text-align:center">${c.icon}</div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="color:${c.color}">${c.type} (${c.pct})</strong>
                <span style="font-weight:700;font-size:1.1rem;color:${c.color}">${c.count.toLocaleString()}</span>
              </div>
              <div style="font-size:0.78rem;margin:0.2rem 0">${c.description}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)"><strong>Signals:</strong> ${c.signals}</div>
              <div style="font-size:0.68rem;margin-top:0.2rem"><strong>Risk:</strong> <span style="color:${c.color}">${c.risk}</span> · <strong>Action:</strong> ${c.action}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- DISTRIBUTOR LEAKAGE DRILL-DOWN -->
      <div class="sa-card" style="border-left:4px solid #f59e0b">
        <h3>🔀 Channel Leakage Analysis</h3>
        <table class="sa-table"><thead><tr><th>Distributor</th><th>Zone</th><th>Found In</th><th>Dup Rate</th><th>Classification Breakdown</th><th>Severity</th><th>Action</th></tr></thead><tbody>
          ${DISTRIBUTOR_LEAKAGE.map(d => `<tr class="${d.severity === 'Critical' ? 'ops-alert-row' : ''}">
            <td><strong>${d.distributor}</strong></td>
            <td style="font-size:0.78rem">${d.zone}</td>
            <td style="font-size:0.78rem;color:#ef4444">${d.foundIn}</td>
            <td style="font-weight:700;color:${parseFloat(d.dupRate) > 10 ? '#ef4444' : '#f59e0b'}">${d.dupRate}</td>
            <td style="font-size:0.72rem">${d.classified}</td>
            <td><span class="sa-status-pill sa-pill-${d.severity === 'Critical' ? 'red' : d.severity === 'High' ? 'orange' : 'blue'}">${d.severity}</span></td>
            <td style="font-size:0.72rem">${d.action}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
