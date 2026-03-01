/**
 * My Carbon Actions Widget
 * Self-contained widget that fetches and renders assigned carbon actions
 * for the current user. Can be injected into any dashboard.
 */

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' };
const STATUS_ICONS = { open: '📋', in_progress: '🔄', done: '✅', dismissed: '⏭️' };
const ROLE_LABELS = { coo: 'COO', cfo: 'CFO', procurement: 'Procurement', product_manager: 'Product Mgr', carbon_officer: 'Carbon Officer' };

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

/**
 * Inject the "My Carbon Actions" widget into a target element.
 * Automatically hides itself if the user has no assigned actions.
 * @param {string} targetId - ID of the container element to inject into
 */
export async function injectMyActionsWidget(targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    try {
        const API = window.API;
        if (!API) return;

        const data = await API.get('/carbon-actions/my').catch(() => ({ actions: [], total: 0 }));
        const actions = data.actions || [];

        // Don't show widget if no actions assigned
        if (actions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const criticalCount = actions.filter(a => a.priority === 'critical').length;
        const highCount = actions.filter(a => a.priority === 'high').length;
        const borderColor = criticalCount > 0 ? '#ef4444' : highCount > 0 ? '#f59e0b' : '#3b82f6';

        const actionRows = actions.slice(0, 5).map(a => `
      <div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border,#e2e8f0)">
        <span style="font-size:1rem;cursor:pointer" onclick="window._myActionCycle('${a.id}','${a.status}')" title="Click to update status">${STATUS_ICONS[a.status] || '📋'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</div>
          <div style="font-size:0.62rem;color:var(--text-muted,#94a3b8);margin-top:2px">
            From: ${a.creator_email ? esc(a.creator_email) : 'Carbon Officer'} · ${a.category || 'general'}
          </div>
        </div>
        <span style="font-size:0.56rem;padding:2px 8px;border-radius:8px;font-weight:700;background:${PRIORITY_COLORS[a.priority] || '#6b7280'}18;color:${PRIORITY_COLORS[a.priority] || '#6b7280'};white-space:nowrap">${(a.priority || 'medium').toUpperCase()}</span>
      </div>
    `).join('');

        container.innerHTML = `
      <div class="card" style="border-left:4px solid ${borderColor};margin-bottom:16px;background:linear-gradient(135deg,${borderColor}04,transparent)">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <div class="card-title" style="color:${borderColor}">⚡ My Carbon Actions</div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:0.68rem;padding:3px 10px;border-radius:10px;font-weight:700;background:${borderColor}15;color:${borderColor}">${actions.length} pending</span>
          </div>
        </div>
        <div style="padding:0 16px 12px">
          ${actionRows}
          ${actions.length > 5 ? `<div style="text-align:center;padding:8px 0;font-size:0.68rem;color:var(--text-muted)">+ ${actions.length - 5} more actions</div>` : ''}
        </div>
      </div>
    `;
    } catch (e) {
        console.error('[MyActions] Widget error:', e);
        container.style.display = 'none';
    }
}

// Window function for status cycling from the widget
window._myActionCycle = async function (id, current) {
    const next = current === 'open' ? 'in_progress' : current === 'in_progress' ? 'done' : 'open';
    try {
        const API = window.API;
        if (!API) return;
        await API.patch(`/carbon-actions/${id}`, { status: next });
        // Re-inject to refresh
        const widget = document.getElementById('my-actions-widget');
        if (widget) injectMyActionsWidget('my-actions-widget');
    } catch (e) {
        console.error('[MyActions] Status update error:', e);
    }
};
