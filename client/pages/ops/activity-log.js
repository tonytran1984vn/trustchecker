/**
 * Ops – Activity Log (Team Audit Trail)
 * ═══════════════════════════════════════
 * Track who did what in the ops team
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  const activities = [
    { user: 'ops@tonyisking.com', action: 'Created batch', target: 'B-2026-0892', detail: 'Factory HCM-01 • 500 units • COFFEE-PRE-250', time: '12 min ago', type: 'create' },
    { user: 'warehouse@tonyisking.com', action: 'Confirmed receiving', target: 'T-4521', detail: 'HCM → SGN • 200 units • No mismatches', time: '25 min ago', type: 'confirm' },
    { user: 'ops@tonyisking.com', action: 'Created shipment', target: 'SH-8827', detail: 'DHL • HCM → BKK • Tracking: DHL-9928371', time: '35 min ago', type: 'create' },
    { user: 'field@tonyisking.com', action: 'Escalated incident', target: 'OPS-0044', detail: 'Quantity mismatch T-4520 — escalated to manager', time: '1h ago', type: 'escalate' },
    { user: 'ops@tonyisking.com', action: 'Initiated recall', target: 'B-2026-0888', detail: 'Contamination risk • 200 units • NOODLE-RC-400', time: '1.5h ago', type: 'critical' },
    { user: 'qc@tonyisking.com', action: 'Approved QC check', target: 'B-2026-0891', detail: 'Quality control passed • 1000 units • TEA-ORG-100', time: '2h ago', type: 'approve' },
    { user: 'ops@tonyisking.com', action: 'Split batch', target: 'B-2026-0885', detail: 'Split into B-2026-0885A (300) + B-2026-0885B (200)', time: '3h ago', type: 'modify' },
    { user: 'warehouse@tonyisking.com', action: 'Reported mismatch', target: 'T-4520', detail: 'Expected: 300 units • Received: 280 units • −20 variance', time: '4h ago', type: 'warning' },
    { user: 'ops@tonyisking.com', action: 'Updated supplier score', target: 'SUP-VN-003', detail: 'Score adjusted 85 → 78 (late deliveries)', time: '5h ago', type: 'modify' },
    { user: 'system', action: 'Auto-generated report', target: 'RPT-W09', detail: 'Weekly Operations Summary (Feb 24 – Mar 2)', time: '6h ago', type: 'system' },
  ];

  const typeColors = { create: '#22c55e', confirm: '#3b82f6', approve: '#10b981', escalate: '#f59e0b', critical: '#ef4444', modify: '#8b5cf6', warning: '#f59e0b', system: '#64748b' };
  const typeIcons = { create: '➕', confirm: '✅', approve: '✓', escalate: '⬆️', critical: '🚨', modify: '✏️', warning: '⚠️', system: '🤖' };

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Activity Log</h1>
        <div class="sa-title-actions">
          <button class="btn btn-outline btn-sm" onclick="showToast('📥 Exporting activity log as CSV…','info')">📥 Export Log</button>
        </div>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="showToast('Showing all activity','info')">All Activity</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: My actions only','info')">My Actions</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Critical events','info')">🚨 Critical</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Batch events','info')">📦 Batches</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Transfer events','info')">🚚 Transfers</button>
        <button class="btn btn-sm btn-outline" onclick="showToast('Filtering: Incident events','info')">🧾 Incidents</button>
      </div>

      <!-- Activity Timeline -->
      <div class="sa-card">
        ${activities.map((a, i) => `
          <div style="display:flex;gap:14px;padding:12px 0;${i < activities.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.04)' : ''}">
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:32px">
              <span style="font-size:1.2rem">${typeIcons[a.type]}</span>
              ${i < activities.length - 1 ? '<div style="width:2px;flex:1;background:rgba(255,255,255,0.06);border-radius:1px"></div>' : ''}
            </div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <span style="font-weight:600;font-size:0.85rem;color:${typeColors[a.type]}">${a.action}</span>
                  <span class="sa-code" style="margin-left:6px;font-size:0.8rem">${a.target}</span>
                </div>
                <span style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap">${a.time}</span>
              </div>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">${a.detail}</div>
              <div style="font-size:0.68rem;color:var(--text-muted,#64748b);margin-top:2px">${a.user}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
