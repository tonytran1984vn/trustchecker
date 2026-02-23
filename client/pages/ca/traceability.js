/**
 * Company Admin – Traceability View
 * ════════════════════════════════════
 * Real data from /api/scm/events + /api/scm/batches
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let events = null, batches = null, loading = false, activeTab = 'timeline';
window._caTraceTab = (t) => { activeTab = t; render(); };

async function load() {
  if (loading) return; loading = true;
  try {
    const [evRes, bRes] = await Promise.all([
      API.get('/scm/events?limit=50').catch(() => ({ events: [] })),
      API.get('/scm/batches?limit=20').catch(() => ({ batches: [] })),
    ]);
    events = Array.isArray(evRes) ? evRes : (evRes.events || []);
    batches = Array.isArray(bRes) ? bRes : (bRes.batches || []);
  } catch (e) { events = []; batches = []; }
  loading = false;
}

export function renderPage() {
  if (!events && !loading) { load().then(() => render()); }
  if (loading && !events) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Traceability...</div></div>`;

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('search', 28)} Traceability</h1>
        <div class="sa-title-actions">
          <input class="sa-search-input" placeholder="Search by batch ID or serial..." style="min-width:280px" />
        </div>
      </div>

      <div class="sa-tabs">
        ${tab('timeline', 'Timeline View')}
        ${tab('batches', 'Batch Trace')}
        ${tab('geo', 'Geo View')}
      </div>

      ${renderTabContent()}
    </div>
  `;
}

function tab(id, label) {
  return `<button class="sa-tab ${activeTab === id ? 'active' : ''}" onclick="_caTraceTab('${id}')">${label}</button>`;
}

function renderTabContent() {
  const evList = events || [];
  const bList = batches || [];

  if (activeTab === 'timeline') {
    if (evList.length === 0) return `<div class="sa-card"><div style="text-align:center;padding:40px;color:var(--text-muted)">No supply chain events found</div></div>`;
    return `
      <div class="sa-card">
        <h3>Supply Chain Events Timeline</h3>
        <div class="sa-spike-list" style="margin-top:1rem">
          ${evList.slice(0, 20).map(e => {
      const time = e.created_at ? new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      const level = e.event_type === 'anomaly' || e.event_type === 'alert' ? 'critical' : e.event_type === 'transfer' ? 'warning' : 'info';
      return timelineItem(time, (e.event_type || 'event').replace(/_/g, ' ') + (e.location ? ' — ' + e.location : ''), e.description || e.notes || (e.product_id ? 'Product: ' + e.product_id.substring(0, 8) : '—'), level);
    }).join('')}
        </div>
      </div>
    `;
  }

  if (activeTab === 'batches') {
    if (bList.length === 0) return `<div class="sa-card"><div style="text-align:center;padding:40px;color:var(--text-muted)">No batches found</div></div>`;
    return `
      <div class="sa-card">
        <h3>Batch Traceability</h3>
        <table class="sa-table"><thead><tr><th>Batch</th><th>Product</th><th>Qty</th><th>Origin</th><th>Destination</th><th>Status</th><th>Created</th></tr></thead><tbody>
          ${bList.map(b => `
            <tr class="sa-row-clickable">
              <td><strong class="sa-code">${b.batch_code || b.id?.substring(0, 12) || '—'}</strong></td>
              <td>${b.product_name || '—'}</td>
              <td class="sa-code">${(b.quantity || 0).toLocaleString()}</td>
              <td>${b.origin || '—'}</td>
              <td>${b.destination || '—'}</td>
              <td><span class="sa-status-pill sa-pill-${b.status === 'delivered' ? 'green' : b.status === 'in_transit' ? 'blue' : 'orange'}">${(b.status || 'pending').replace(/_/g, ' ')}</span></td>
              <td style="color:var(--text-secondary)">${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US') : '—'}</td>
            </tr>
          `).join('')}
        </tbody></table>
      </div>
    `;
  }

  // geo tab
  const uniqueLocations = [...new Set(evList.map(e => e.location).filter(Boolean))];
  return `
    <div class="sa-card">
      <h3>Geographic View</h3>
      <div class="sa-chart-placeholder" style="min-height:200px">
        ${icon('globe', 48)}<br>
        Interactive map — ${uniqueLocations.length} unique locations tracked.<br>
        <small style="color:var(--text-secondary)">Map integration available with Google Maps or Mapbox API key.</small>
      </div>
      <div class="sa-metrics-row" style="margin-top:1rem">
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${uniqueLocations.length}</div><div class="sa-metric-label">Locations</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${evList.length}</div><div class="sa-metric-label">Total Events</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${bList.length}</div><div class="sa-metric-label">Batches Tracked</div></div></div>
      </div>
    </div>
  `;
}

function timelineItem(time, title, detail, level) {
  return `
    <div class="sa-spike-item sa-spike-${level}">
      <div class="sa-spike-header">
        <strong>${title}</strong>
        <span style="font-size:0.7rem;color:var(--text-secondary)">${time}</span>
      </div>
      <div class="sa-spike-detail">${detail}</div>
    </div>
  `;
}
