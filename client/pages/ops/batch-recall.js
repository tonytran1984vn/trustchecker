/**
 * Ops – Recall / Destroy Batch
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} Recall / Destroy</h1></div>

      <div class="sa-grid-2col">
        <div class="sa-card" style="border:1px solid rgba(239,68,68,0.2)">
          <h3 style="color:#ef4444">${icon('alert', 16)} Initiate Recall</h3>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Recall a batch from the supply chain. Affected nodes will be notified.</p>
          <div class="ops-form">
            ${field('Batch ID', 'Select batch to recall')}
            ${field('Reason', 'Select reason')}
            ${field('Scope', 'Full batch / Partial')}
            ${field('Notes', 'Describe the issue')}
          </div>
          <button class="btn btn-sm" style="background:#ef4444;color:#fff;margin-top:1rem"><span class="status-icon status-warn" aria-label="Warning">!</span> Initiate Recall</button>
        </div>

        <div class="sa-card" style="border:1px solid rgba(239,68,68,0.3)">
          <h3 style="color:#ef4444">${icon('alertTriangle', 16)} Confirm Destruction</h3>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Mark a recalled batch as destroyed. Requires evidence upload.</p>
          <div class="ops-form">
            ${field('Recalled Batch', 'Select recalled batch')}
            ${field('Method', 'Incineration / Disposal / Return')}
            ${field('Evidence', 'Upload photo/document')}
            ${field('Witness', 'Name & role')}
          </div>
          <button class="btn btn-sm" style="background:#7f1d1d;color:#fff;margin-top:1rem">Confirm Destruction</button>
        </div>
      </div>

      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">Recall History</h2>
        <div class="sa-card">
          <table class="sa-table">
            <thead><tr><th>Batch</th><th>Reason</th><th>Scope</th><th>Status</th><th>Initiated</th><th>Resolved</th></tr></thead>
            <tbody>
              <tr><td class="sa-code">B-2026-0888</td><td>Quality defect — contamination risk</td><td>Full</td><td><span class="sa-status-pill sa-pill-orange">in progress</span></td><td>1d ago</td><td>—</td></tr>
              <tr><td class="sa-code">B-2026-0812</td><td>Labeling error</td><td>Partial (200/500)</td><td><span class="sa-status-pill sa-pill-green">destroyed</span></td><td>7d ago</td><td>5d ago</td></tr>
              <tr><td class="sa-code">B-2025-1290</td><td>Expiry exceeded</td><td>Full</td><td><span class="sa-status-pill sa-pill-green">destroyed</span></td><td>30d ago</td><td>28d ago</td></tr>
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
