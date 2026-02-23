/**
 * Compliance – Workflow Control (Approval workflows)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const workflows = [
        { name: 'Batch Recall Approval', steps: 'Ops → Risk → Admin', sod: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Enforced', status: 'active', lastUsed: '1d ago' },
        { name: 'Role Escalation Approval', steps: 'Requester → Admin → Super Admin', sod: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Enforced', status: 'active', lastUsed: '3d ago' },
        { name: 'Data Export Approval', steps: 'Requester → Compliance', sod: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Enforced', status: 'active', lastUsed: 'Today' },
        { name: 'Risk Rule Modification', steps: 'Risk → Admin Review', sod: '<span class="status-icon status-warn" aria-label="Warning">!</span> Partial', status: 'active', lastUsed: 'Today' },
        { name: 'User Offboarding', steps: 'HR Req → Admin → Compliance Verify', sod: '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Enforced', status: 'active', lastUsed: '2w ago' },
        { name: 'Emergency QR Lockdown', steps: 'Any → Auto-execute → Post-review', sod: '<span class="status-icon status-fail" aria-label="Fail">✗</span> Bypassed', status: 'active', lastUsed: '1w ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Workflow Control</h1></div>
      <div class="sa-card">
        <table class="sa-table">
          <thead><tr><th>Workflow</th><th>Approval Steps</th><th>Separation of Duties</th><th>Status</th><th>Last Used</th></tr></thead>
          <tbody>
            ${workflows.map(w => `
              <tr>
                <td><strong>${w.name}</strong></td>
                <td style="font-size:0.78rem">${w.steps}</td>
                <td>${w.sod}</td>
                <td><span class="sa-status-pill sa-pill-green">${w.status}</span></td>
                <td style="color:var(--text-secondary)">${w.lastUsed}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
