/** Compliance – Regulatory Export — reads from /api/compliance-regtech/report */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [report, frameworks] = await Promise.all([
    fetch('/api/compliance-regtech/report', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/compliance-regtech/frameworks', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { report, frameworks: frameworks.frameworks || [] };
}
export function renderPage() {
  load();
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe', 28)} Regulatory Export</h1></div>
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Compliance Report</h3>
        <p style="color:var(--text-secondary);font-size:0.85rem">${D.report?.summary || 'Run regulatory compliance export to generate report.'}</p>
        ${D.report?.score !== undefined ? `<div style="margin-top:1rem"><span style="font-size:2rem;font-weight:800;color:#10b981">${D.report.score}%</span><span style="color:var(--text-secondary);margin-left:0.5rem">Compliance Score</span></div>` : ''}
      </div>
      <div class="sa-card"><h3>Frameworks (${D.frameworks.length})</h3>
        ${D.frameworks.length === 0 ? '<p style="color:var(--text-secondary)">No frameworks configured</p>' :
      D.frameworks.map(f => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-weight:600">${f.name || f}</span><span class="sa-code">${f.version || ''}</span></div>`).join('')}
      </div>
    </div></div>`;
}
