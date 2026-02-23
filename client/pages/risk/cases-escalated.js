/**
 * Risk – Escalated Cases
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const cases = [
        { id: 'RC-0009', title: 'Gray market distribution — Cambodia network', escalatedTo: 'CEO / Legal', reason: 'Organized counterfeit operation, potential legal action required', escalatedAt: '3d ago', status: 'pending_review' },
        { id: 'RC-0007', title: 'Insider threat — warehouse HCM-03', escalatedTo: 'CEO / HR', reason: 'Employee device used for fraudulent scans during off-hours', escalatedAt: '1w ago', status: 'action_taken' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alert', 28)} Escalated Cases</h1></div>

      <div class="sa-card">
        ${cases.map(c => `
          <div style="padding:1.25rem;margin-bottom:0.75rem;border-radius:10px;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.03)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span class="sa-code" style="font-weight:700">${c.id}</span>
                <span class="sa-status-pill sa-pill-${c.status === 'pending_review' ? 'orange' : 'green'}">${c.status.replace('_', ' ')}</span>
              </div>
              <span style="font-size:0.72rem;color:var(--text-secondary)">Escalated: ${c.escalatedAt}</span>
            </div>
            <div style="font-size:0.92rem;font-weight:600;margin-bottom:0.35rem">${c.title}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.25rem"><strong>Escalated to:</strong> ${c.escalatedTo}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${c.reason}</div>
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
              <button class="btn btn-xs btn-primary">View Full Case</button>
              <button class="btn btn-xs btn-outline">Add Note</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
