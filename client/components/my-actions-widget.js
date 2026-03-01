/**
 * My Carbon Actions Widget — v2 (Full Interactive)
 * Self-contained widget with status buttons, breakdown, and action controls.
 */

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' };
const PRIORITY_LABELS = { critical: '🔴 CRITICAL', high: '🟠 HIGH', medium: '🔵 MEDIUM', low: '⚪ LOW' };
const STATUS_CONFIG = {
  open: { label: 'Open', icon: '📋', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', nextLabel: '▶ Start', next: 'in_progress' },
  in_progress: { label: 'In Progress', icon: '🔄', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', nextLabel: '✅ Complete', next: 'done' },
  done: { label: 'Done', icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', nextLabel: '↩ Reopen', next: 'open' },
};
const CAT_LABELS = { scope_reduction: '🏭 Scope', partner_risk: '🤝 Partner', product_optimization: '📦 Product', offset: '🌱 Offset', compliance: '⚖️ Compliance', other: '📌 Other' };

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

/**
 * Inject "My Carbon Actions" widget into a target element.
 * Now shows full status breakdown plus actionable buttons.
 */
export async function injectMyActionsWidget(targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  try {
    const API = window.API;
    if (!API) return;

    const data = await API.get('/carbon-actions/my').catch(() => ({ actions: [], total: 0 }));
    const actions = data.actions || [];

    if (actions.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Status breakdown
    const openCount = actions.filter(a => a.status === 'open').length;
    const inProgressCount = actions.filter(a => a.status === 'in_progress').length;
    const criticalCount = actions.filter(a => a.priority === 'critical').length;
    const highCount = actions.filter(a => a.priority === 'high').length;
    const borderColor = criticalCount > 0 ? '#ef4444' : highCount > 0 ? '#f59e0b' : '#3b82f6';

    const actionRows = actions.slice(0, 8).map(a => {
      const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.open;
      const pc = PRIORITY_COLORS[a.priority] || '#6b7280';
      const catL = CAT_LABELS[a.category] || a.category || '';
      const dueStr = a.due_date ? `Due: ${a.due_date}` : '';
      const descSnippet = a.description ? esc(a.description).substring(0, 80) + (a.description.length > 80 ? '…' : '') : '';

      return `
      <div style="padding:12px;border-radius:10px;border:1px solid var(--border,#e2e8f0);margin-bottom:8px;background:${sc.bg};transition:all 0.15s">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:1.1rem;margin-top:2px">${sc.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.78rem;color:var(--text-primary,#1e293b)">${esc(a.title)}</div>
            ${descSnippet ? `<div style="font-size:0.65rem;color:var(--text-muted,#94a3b8);margin-top:3px;line-height:1.4">${descSnippet}</div>` : ''}
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap">
              <span style="font-size:0.56rem;padding:2px 8px;border-radius:8px;font-weight:700;background:${pc}18;color:${pc}">${(a.priority || 'medium').toUpperCase()}</span>
              <span style="font-size:0.56rem;padding:2px 8px;border-radius:8px;background:${sc.color}18;color:${sc.color};font-weight:600">${sc.label}</span>
              ${catL ? `<span style="font-size:0.56rem;color:var(--text-muted,#94a3b8)">${catL}</span>` : ''}
              ${dueStr ? `<span style="font-size:0.56rem;color:var(--text-muted,#94a3b8)">📅 ${dueStr}</span>` : ''}
              <span style="font-size:0.56rem;color:var(--text-muted,#94a3b8)">From: ${a.creator_email ? esc(a.creator_email.split('@')[0]) : 'Carbon Officer'}</span>
            </div>
          </div>
          <button onclick="window._myActionUpdate('${a.id}','${sc.next}')" style="padding:5px 14px;border-radius:8px;border:1px solid ${sc.color}40;background:${sc.color}12;color:${sc.color};font-size:0.65rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.15s" onmouseover="this.style.background='${sc.color}25'" onmouseout="this.style.background='${sc.color}12'">${sc.nextLabel}</button>
        </div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="card" style="border-left:4px solid ${borderColor};margin-bottom:16px;background:linear-gradient(135deg,${borderColor}06,transparent)">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div class="card-title" style="color:${borderColor}">⚡ My Carbon Actions</div>
          <div style="display:flex;gap:6px;align-items:center">
            ${openCount > 0 ? `<span style="font-size:0.62rem;padding:3px 10px;border-radius:10px;font-weight:700;background:rgba(59,130,246,0.12);color:#3b82f6">📋 ${openCount} open</span>` : ''}
            ${inProgressCount > 0 ? `<span style="font-size:0.62rem;padding:3px 10px;border-radius:10px;font-weight:700;background:rgba(245,158,11,0.12);color:#f59e0b">🔄 ${inProgressCount} in progress</span>` : ''}
            ${criticalCount > 0 ? `<span style="font-size:0.62rem;padding:3px 10px;border-radius:10px;font-weight:700;background:rgba(239,68,68,0.12);color:#ef4444">🔴 ${criticalCount} critical</span>` : ''}
          </div>
        </div>
        <div style="padding:0 16px 12px">
          ${actionRows}
          ${actions.length > 8 ? `<div style="text-align:center;padding:8px 0;font-size:0.68rem;color:var(--text-muted)">+ ${actions.length - 8} more actions</div>` : ''}
        </div>
      </div>
    `;
  } catch (e) {
    console.error('[MyActions] Widget error:', e);
    container.style.display = 'none';
  }
}

// Status update from widget
window._myActionUpdate = async function (id, newStatus) {
  try {
    const API = window.API;
    if (!API) return;
    await API.patch(`/carbon-actions/${id}`, { status: newStatus });
    // Re-inject to refresh
    injectMyActionsWidget('my-actions-widget');
  } catch (e) {
    console.error('[MyActions] Status update error:', e);
  }
};
