/**
 * Compliance – Legal Hold (Evidence preservation)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const holds = [
        { id: 'LH-003', matter: 'Cambodia Gray Market Investigation', scope: 'All scan data, fraud events, QR records (Cambodia region)', held: 'admin@trustchecker.io', since: 'Feb 5, 2026', status: 'active', records: '12,400' },
        { id: 'LH-002', matter: 'Distributor D-180 Termination', scope: 'All D-180 transactions, communications, transfer records', held: 'compliance@company.com', since: 'Jan 20, 2026', status: 'active', records: '8,200' },
        { id: 'LH-001', matter: 'Q3 2025 External Audit', scope: 'All audit logs, policy changes, user activity Q3', held: 'compliance@company.com', since: 'Oct 1, 2025', status: 'released', records: '45,000' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('lock', 28)} Legal Hold</h1>
        <div class="sa-title-actions"><button class="btn btn-primary btn-sm">+ Initiate Hold</button></div>
      </div>

      <div class="sa-card">
        ${holds.map(h => `
          <div style="padding:1.25rem;margin-bottom:0.75rem;border-radius:10px;border-left:4px solid ${h.status === 'active' ? '#a855f7' : '#22c55e'};background:${h.status === 'active' ? 'rgba(168,85,247,0.04)' : 'rgba(34,197,94,0.03)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span class="sa-code" style="font-weight:700">${h.id}</span>
                <span class="sa-status-pill sa-pill-${h.status === 'active' ? 'purple' : 'green'}">${h.status}</span>
                <span style="font-size:0.72rem;color:var(--text-secondary)">${h.records} records preserved</span>
              </div>
              <span style="font-size:0.72rem;color:var(--text-secondary)">Since: ${h.since}</span>
            </div>
            <div style="font-size:0.92rem;font-weight:600;margin-bottom:0.35rem">${h.matter}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.25rem"><strong>Scope:</strong> ${h.scope}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)"><strong>Held by:</strong> ${h.held}</div>
            ${h.status === 'active' ? `<div style="display:flex;gap:0.5rem;margin-top:0.75rem"><button class="btn btn-xs btn-outline">View Records</button><button class="btn btn-xs btn-ghost">Release Hold</button></div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
