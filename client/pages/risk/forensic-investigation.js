/** Risk – Forensic Investigation — reads from State._riskForensic */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskForensic || {};
  const links = D.links || [];
  const feed = D.feed || [];
  const feedAlerts = feed.alerts || feed;
  const feedSummary = feed.summary || {};
  const feedInsights = feed.insights || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Forensic Investigation</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      <div class="sa-metric-card sa-metric-${links.length > 0 ? 'orange' : 'green'}"><div class="sa-metric-body"><div class="sa-metric-value">${links.length}</div><div class="sa-metric-label">Hidden Links</div></div></div>
      <div class="sa-metric-card sa-metric-${(feedAlerts.length || feedSummary.total || 0) > 0 ? 'red' : 'green'}"><div class="sa-metric-body"><div class="sa-metric-value">${feedAlerts.length || feedSummary.total || 0}</div><div class="sa-metric-label">Fraud Events</div></div></div>
      <div class="sa-metric-card"><div class="sa-metric-body"><div class="sa-metric-value">${feedSummary.critical || 0}</div><div class="sa-metric-label">Critical</div></div></div>
      <div class="sa-metric-card"><div class="sa-metric-body"><div class="sa-metric-value">${feedSummary.open || 0}</div><div class="sa-metric-label">Open</div></div></div>
    </div>
    ${feedInsights.length > 0 ? `<div class="sa-card" style="margin-bottom:1rem"><h3>Intelligence Insights</h3>${feedInsights.map(i => `<div style="padding:0.4rem 0.6rem;margin:0.3rem 0;border-left:3px solid ${i.level === 'critical' ? '#ef4444' : i.level === 'danger' ? '#f97316' : i.level === 'warning' ? '#f59e0b' : '#3b82f6'};background:rgba(255,255,255,0.02);border-radius:0 4px 4px 0;font-size:0.8rem">${i.msg}</div>`).join('')}</div>` : ''}
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Hidden Links (${links.length})</h3>
        ${links.length === 0 ? '<p style="color:var(--text-secondary)">No hidden connections detected</p>' :
      links.slice(0, 15).map(l => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between">
            <span class="sa-code">${l.entity_a || l.from || l.source || '—'} → ${l.entity_b || l.to || l.target || '—'}</span>
            <span class="sa-status-pill sa-pill-${l.risk === 'high' ? 'red' : 'orange'}">${l.type || l.risk || '—'}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Fraud Feed (${feedAlerts.length || 0})</h3>
        ${(feedAlerts.length || 0) === 0 ? '<p style="color:var(--text-secondary)">No fraud events</p>' :
      (Array.isArray(feedAlerts) ? feedAlerts : []).slice(0, 15).map(f => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between">
            <span><span class="sa-code">${f.alert_type || f.type || f.event_type || '—'}</span> <span style="font-size:0.75rem;color:var(--text-secondary)">${f.product_name || f.sku || ''}</span></span>
            <span class="sa-status-pill sa-pill-${f.severity === 'critical' ? 'red' : f.severity === 'high' ? 'red' : 'orange'}">${f.severity || '—'}</span></div>`).join('')}
      </div></div></div>`;
}
