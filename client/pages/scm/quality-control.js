/**
 * SCM – Quality Control & Inspection
 * Enterprise: QC checkpoints, inspection results, batch certification, defect tracking
 */
import { icon } from '../../core/icons.js';

const QC_CHECKPOINTS = [
    { id: 'QC-INC', name: 'Incoming Raw Material', type: 'Mandatory', tests: ['Moisture %', 'Contaminant screen', 'Weight variance', 'Certificate match'], passRate: '97.2%', avgTime: '45min' },
    { id: 'QC-PROD', name: 'In-Process Production', type: 'Mandatory', tests: ['Temperature log', 'Roast level', 'Grind consistency', 'Metal detection'], passRate: '99.1%', avgTime: '30min' },
    { id: 'QC-PKG', name: 'Post-Packaging', type: 'Mandatory', tests: ['Seal integrity', 'Label accuracy', 'Weight check', 'Barcode/QR scan'], passRate: '98.8%', avgTime: '15min' },
    { id: 'QC-SHIP', name: 'Pre-Shipment', type: 'Optional', tests: ['Pallet count', 'Cold chain verify', 'Documentation check'], passRate: '99.5%', avgTime: '20min' },
];

const RECENT_INSPECTIONS = [
    { id: 'INS-2026-0892', batch: 'B-2026-0895', product: 'Premium Coffee Blend', checkpoint: 'QC-PROD', inspector: 'QC-Team-HCM', result: 'PASS', score: 98, defects: 0, ts: '2026-02-19 15:30', cert: 'GMP-certified' },
    { id: 'INS-2026-0891', batch: 'B-2026-0895', product: 'Premium Coffee Blend', checkpoint: 'QC-PKG', inspector: 'QC-Team-HCM', result: 'PASS', score: 96, defects: 2, ts: '2026-02-19 14:00', cert: 'ISO 22000' },
    { id: 'INS-2026-0890', batch: 'B-2026-0891', product: 'Organic Tea Collection', checkpoint: 'QC-INC', inspector: 'QC-Team-HN', result: 'CONDITIONAL', score: 82, defects: 5, ts: '2026-02-18 10:00', cert: 'Pending re-test' },
    { id: 'INS-2026-0889', batch: 'B-2026-0887', product: 'Manuka Honey UMF15+', checkpoint: 'QC-INC', inspector: 'QC-Team-SG', result: 'FAIL', score: 45, defects: 12, ts: '2026-02-17 09:00', cert: 'REJECTED' },
    { id: 'INS-2026-0888', batch: 'B-2026-0882', product: 'Dark Roast 500g', checkpoint: 'QC-SHIP', inspector: 'QC-Team-HCM', result: 'PASS', score: 100, defects: 0, ts: '2026-02-16 16:00', cert: 'Export cleared' },
];

const DEFECT_CATEGORIES = [
    { category: 'Moisture out of spec', count: 8, severity: 'High', trend: '↓ -3', impact: 'Raw material rejection' },
    { category: 'Label misprint', count: 5, severity: 'Medium', trend: '→ stable', impact: 'Repackaging required' },
    { category: 'Seal failure', count: 3, severity: 'Critical', trend: '↑ +1', impact: 'Product recall risk' },
    { category: 'Weight variance > 2%', count: 4, severity: 'Low', trend: '↓ -2', impact: 'Process adjustment' },
    { category: 'Foreign body (metal)', count: 1, severity: 'Critical', trend: '↓ -1', impact: 'Batch hold + investigation' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('check', 28)} Quality Control</h1><div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ New Inspection</button></div></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Inspections (30d)', '142', '94.4% pass rate', 'green', 'check')}
        ${m('Defects Found', '21', '3 critical', 'orange', 'alertTriangle')}
        ${m('Batches Certified', '38', 'All have QR certification', 'green', 'shield')}
        ${m('Avg Inspection Time', '32min', 'Target: <45min', 'blue', 'clock')}
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔬 QC Checkpoints</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem">
          ${QC_CHECKPOINTS.map((q, i) => `
            <div style="background:rgba(99,102,241,0.03);border:1px solid rgba(99,102,241,0.08);border-top:3px solid ${['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4'][i]};border-radius:8px;padding:0.75rem">
              <div style="font-size:0.65rem;color:var(--text-secondary)">${q.id}</div>
              <div style="font-weight:700;margin:0.2rem 0">${q.name}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${q.type} · ${q.avgTime}</div>
              <div style="font-size:1.1rem;font-weight:800;color:#22c55e;margin:0.3rem 0">${q.passRate}</div>
              <div style="font-size:0.65rem;color:var(--text-secondary)">${q.tests.join(' · ')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📋 Recent Inspections</h3>
        <table class="sa-table"><thead><tr><th>Inspection</th><th>Batch</th><th>Product</th><th>Checkpoint</th><th>Inspector</th><th>Score</th><th>Defects</th><th>Result</th><th>Certification</th><th>Time</th></tr></thead><tbody>
          ${RECENT_INSPECTIONS.map(r => {
        const color = r.result === 'PASS' ? '#22c55e' : r.result === 'CONDITIONAL' ? '#f59e0b' : '#ef4444';
        return `<tr class="${r.result === 'FAIL' ? 'ops-alert-row' : ''}">
              <td class="sa-code">${r.id}</td><td class="sa-code">${r.batch}</td>
              <td style="font-size:0.82rem">${r.product}</td>
              <td class="sa-code" style="font-size:0.72rem">${r.checkpoint}</td>
              <td style="font-size:0.78rem">${r.inspector}</td>
              <td style="font-weight:800;color:${color};font-size:1.1rem">${r.score}</td>
              <td style="text-align:center;color:${r.defects > 0 ? '#ef4444' : '#22c55e'}">${r.defects}</td>
              <td><span class="sa-status-pill" style="background:${color}12;color:${color};border:1px solid ${color}25">${r.result}</span></td>
              <td style="font-size:0.72rem">${r.cert}</td>
              <td class="sa-code" style="font-size:0.68rem">${r.ts}</td>
            </tr>`;
    }).join('')}
        </tbody></table>
      </div>

      <div class="sa-card">
        <h3>🐛 Defect Analysis (30 days)</h3>
        <table class="sa-table"><thead><tr><th>Category</th><th>Count</th><th>Severity</th><th>Trend</th><th>Impact</th></tr></thead><tbody>
          ${DEFECT_CATEGORIES.map(d => `<tr class="${d.severity === 'Critical' ? 'ops-alert-row' : ''}">
            <td><strong>${d.category}</strong></td>
            <td style="font-weight:600;text-align:center">${d.count}</td>
            <td><span class="sa-status-pill sa-pill-${d.severity === 'Critical' ? 'red' : d.severity === 'High' ? 'orange' : d.severity === 'Medium' ? 'blue' : 'green'}">${d.severity}</span></td>
            <td style="color:${d.trend.includes('↑') ? '#ef4444' : d.trend.includes('↓') ? '#22c55e' : 'var(--text-secondary)'}">${d.trend}</td>
            <td style="font-size:0.78rem">${d.impact}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
