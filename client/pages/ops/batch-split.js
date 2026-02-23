/**
 * Ops – Split / Merge Batch
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Split / Merge</h1></div>

      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>${icon('workflow', 16)} Split Batch</h3>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Divide a batch into multiple sub-batches for different destinations.</p>
          <div class="ops-form">
            ${field('Source Batch', 'Select batch ID')}
            ${field('Split Into', '2 sub-batches')}
            ${field('Sub-batch 1 Qty', 'Enter quantity')}
            ${field('Sub-batch 1 Dest', 'Select node')}
            ${field('Sub-batch 2 Qty', 'Remaining')}
            ${field('Sub-batch 2 Dest', 'Select node')}
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem">Execute Split</button>
        </div>

        <div class="sa-card">
          <h3>${icon('workflow', 16)} Merge Batches</h3>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Combine multiple batches of the same SKU into one batch.</p>
          <div class="ops-form">
            ${field('Batch A', 'Select first batch')}
            ${field('Batch B', 'Select second batch')}
            ${field('Merged Batch ID', 'Auto-generated')}
            ${field('Target Node', 'Select destination')}
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem">Execute Merge</button>
        </div>
      </div>

      <!-- Recent Operations -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">Recent Split / Merge Operations</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead><tr><th>Operation</th><th>Source</th><th>Result</th><th>Qty</th><th>Operator</th><th>Time</th></tr></thead>
            <tbody>
              <tr><td><span class="sa-status-pill sa-pill-blue">split</span></td><td class="sa-code">B-2026-0850</td><td class="sa-code">B-0850A, B-0850B</td><td>1000 → 600 + 400</td><td>ops@company.com</td><td style="color:var(--text-secondary)">2h ago</td></tr>
              <tr><td><span class="sa-status-pill sa-pill-green">merge</span></td><td class="sa-code">B-0840, B-0841</td><td class="sa-code">B-2026-0842</td><td>200 + 300 → 500</td><td>warehouse@company.com</td><td style="color:var(--text-secondary)">1d ago</td></tr>
              <tr><td><span class="sa-status-pill sa-pill-blue">split</span></td><td class="sa-code">B-2026-0830</td><td class="sa-code">B-0830A, B-0830B, B-0830C</td><td>900 → 300+300+300</td><td>ops@company.com</td><td style="color:var(--text-secondary)">3d ago</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function field(label, placeholder) {
    return `<div class="ops-field"><label class="ops-label">${label}</label><input class="ops-input" placeholder="${placeholder}" /></div>`;
}
