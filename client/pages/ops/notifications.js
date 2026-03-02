/**
 * Ops – Notifications Center
 * ═══════════════════════════
 * Real-time alerts for batch recalls, SLA breaches, duplicate spikes
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const notifications = [
        { id: 'N-0127', type: 'critical', icon: '🚨', title: 'Batch B-2026-0888 Recall Initiated', detail: 'Contamination risk detected — immediate recall required. 200 units affected.', time: '12 min ago', read: false },
        { id: 'N-0126', type: 'warning', icon: '⚠️', title: 'SLA Breach: Transfer T-4521', detail: 'Transfer HCM → BKK exceeded 48h SLA. Current status: stuck at customs.', time: '35 min ago', read: false },
        { id: 'N-0125', type: 'warning', icon: '🔁', title: 'Duplicate Spike: Thai Region', detail: '3 duplicate QR scans detected in Chiang Mai within 15 minutes. Pattern: retail shelf.', time: '1h ago', read: false },
        { id: 'N-0124', type: 'info', icon: '📦', title: 'Batch B-2026-0892 Created', detail: 'Factory HCM-01 • 500 units • SKU: COFFEE-PRE-250. QR codes generated.', time: '2h ago', read: true },
        { id: 'N-0123', type: 'info', icon: '✅', title: 'Transfer T-4519 Confirmed', detail: 'HCM → SGN • 300 units received and verified. No mismatches.', time: '3h ago', read: true },
        { id: 'N-0122', type: 'success', icon: '🎯', title: 'Weekly SLA Target Met', detail: 'Transfer SLA compliance: 97.2% (target: 95%). Great job, team!', time: '5h ago', read: true },
        { id: 'N-0121', type: 'info', icon: '📊', title: 'Weekly Report Ready', detail: 'RPT-W09: Weekly Operations Summary (Feb 24 – Mar 2) is ready for review.', time: '6h ago', read: true },
        { id: 'N-0120', type: 'warning', icon: '🏭', title: 'Warehouse HCM-03 at 94% Capacity', detail: 'Congestion alert: incoming batches may be delayed. Consider rerouting.', time: '8h ago', read: true },
    ];

    const unread = notifications.filter(n => !n.read).length;
    const typeColors = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#22c55e' };

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('bell', 28)} Notifications</h1>
        <div class="sa-title-actions">
          ${unread > 0 ? `<span style="background:#ef4444;color:#fff;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:700">${unread} unread</span>` : ''}
          <button class="btn btn-outline btn-sm">Mark All Read</button>
          <button class="btn btn-ghost btn-sm">⚙ Preferences</button>
        </div>
      </div>

      <!-- Notification Filters -->
      <div style="display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary">All</button>
        <button class="btn btn-sm btn-outline">🚨 Critical</button>
        <button class="btn btn-sm btn-outline">⚠️ Warning</button>
        <button class="btn btn-sm btn-outline">ℹ️ Info</button>
        <button class="btn btn-sm btn-outline">✅ Success</button>
      </div>

      <!-- Notification List -->
      <div style="display:flex;flex-direction:column;gap:8px">
        ${notifications.map(n => `
          <div class="sa-card" style="padding:14px 18px;border-left:4px solid ${typeColors[n.type]};${n.read ? 'opacity:0.7' : ''}cursor:pointer;transition:transform 0.1s" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform=''">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
              <div style="display:flex;gap:12px;flex:1">
                <span style="font-size:1.5rem;line-height:1">${n.icon}</span>
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                    <strong style="font-size:0.88rem">${n.title}</strong>
                    ${!n.read ? '<span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block"></span>' : ''}
                  </div>
                  <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4">${n.detail}</div>
                </div>
              </div>
              <div style="text-align:right;white-space:nowrap">
                <div style="font-size:0.7rem;color:var(--text-secondary)">${n.time}</div>
                <span class="sa-code" style="font-size:0.65rem">${n.id}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
