/**
 * Risk – Open Cases (Strategic investigation)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const cases = [
        { id: 'RC-0012', title: 'Cross-border counterfeit ring — BKK/PNH corridor', batches: 'B-0892, B-0891, B-0887', events: 14, score: 91, assigned: 'risk-lead@company.com', age: '2d', status: 'active' },
        { id: 'RC-0011', title: 'Systematic duplicate scan pattern — HCM retail', batches: 'B-0850, B-0841', events: 8, score: 78, assigned: 'analyst@company.com', age: '5d', status: 'active' },
        { id: 'RC-0010', title: 'Distributor D-204 anomalous volume spike', batches: 'Multiple', events: 6, score: 65, assigned: 'risk-lead@company.com', age: '1w', status: 'investigation' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alertTriangle', 28)} Open Cases</h1>
        <div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Create Case</button></div>
      </div>

      <div class="sa-card">
        ${cases.map(c => `
          <div style="padding:1.25rem;margin-bottom:0.75rem;border-radius:10px;border-left:4px solid ${c.score >= 80 ? '#ef4444' : '#f59e0b'};background:${c.score >= 80 ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.03)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span class="sa-code" style="font-weight:700">${c.id}</span>
                <span class="sa-score sa-score-${c.score >= 80 ? 'danger' : 'warning'}">${c.score}</span>
                <span class="sa-status-pill sa-pill-${c.status === 'active' ? 'red' : 'orange'}">${c.status}</span>
              </div>
              <span style="font-size:0.72rem;color:var(--text-secondary)">Age: ${c.age}</span>
            </div>
            <div style="font-size:0.92rem;font-weight:600;margin-bottom:0.35rem">${c.title}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);display:flex;gap:2rem">
              <span>Batches: ${c.batches}</span>
              <span>Events: ${c.events}</span>
              <span>Assigned: ${c.assigned}</span>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
              <button class="btn btn-xs btn-primary">View Timeline</button>
              <button class="btn btn-xs btn-outline">Add Evidence</button>
              <button class="btn btn-xs btn-ghost">Escalate</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
