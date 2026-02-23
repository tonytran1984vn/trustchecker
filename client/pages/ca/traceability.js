/**
 * Company Admin – Traceability View
 * ════════════════════════════════════
 * Three views: Graph, Timeline, Geo — tab-based
 */
import { icon } from '../../core/icons.js';

let activeTab = 'graph';
window._caTraceTab = (t) => { activeTab = t; window.render(); };

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('search', 28)} Traceability</h1>
        <div class="sa-title-actions">
          <input class="sa-search-input" placeholder="Search by batch ID or serial..." style="min-width:280px" />
        </div>
      </div>

      <div class="sa-tabs">
        ${tab('graph', 'Graph View')}
        ${tab('timeline', 'Timeline View')}
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
    if (activeTab === 'graph') {
        return `
      <div class="sa-card">
        <h3>Supply Chain Graph — BATCH-2026-0142</h3>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;padding:1.5rem 0">
          ${graphNode('Factory HCM-01', 'Origin', 'green')}
          <span style="font-size:1.5rem;color:var(--text-secondary)">→</span>
          ${graphNode('Warehouse DN-02', 'Storage', 'blue')}
          <span style="font-size:1.5rem;color:var(--text-secondary)">→</span>
          ${graphNode('Dist. SG-01', 'Distribution', 'blue')}
          <span style="font-size:1.5rem;color:var(--text-secondary)">→</span>
          ${graphNode('Retail BKK-03', 'Point of Sale', 'orange')}
        </div>
        <div class="sa-detail-grid" style="margin-top:1rem">
          <div class="sa-detail-item"><span class="sa-detail-label">Product</span><span>Premium Coffee 250g</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Quantity</span><span class="sa-code">2,400 units</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Total Hops</span><span>4 nodes</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Transit Time</span><span>3 days 14 hours</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Verification</span><span class="sa-status-pill sa-pill-green">100% scanned</span></div>
        </div>
      </div>
    `;
    }
    if (activeTab === 'timeline') {
        return `
      <div class="sa-card">
        <h3>Timeline — BATCH-2026-0142</h3>
        <div class="sa-spike-list" style="margin-top:1rem">
          ${timelineItem('2026-02-18 08:00', 'Batch created at Factory HCM-01', '2,400 units produced', 'info')}
          ${timelineItem('2026-02-18 14:30', 'QR labels generated', '2,400 QR codes assigned', 'info')}
          ${timelineItem('2026-02-18 16:00', 'Shipped to Warehouse DN-02', 'Truck VN-51H-12345', 'info')}
          ${timelineItem('2026-02-19 09:00', 'Received at Warehouse DN-02', '2,398 units (2 damaged)', 'warning')}
          ${timelineItem('2026-02-19 14:00', 'Transfer to Dist. SG-01', 'Container SGEU-4412', 'info')}
        </div>
      </div>
    `;
    }
    // geo
    return `
    <div class="sa-card">
      <h3>Geographic View — BATCH-2026-0142</h3>
      <div class="sa-chart-placeholder" style="min-height:300px">
        ${icon('globe', 48)}<br>
        Interactive map showing node locations and batch movement paths.<br>
        <small style="color:var(--text-secondary)">Map integration available with Google Maps or Mapbox API key.</small>
      </div>
      <div class="sa-metrics-row" style="margin-top:1rem">
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">4</div><div class="sa-metric-label">Countries</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">2,847 km</div><div class="sa-metric-label">Total Distance</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">3.5 days</div><div class="sa-metric-label">Avg Transit</div></div></div>
      </div>
    </div>
  `;
}

function graphNode(name, role, color) {
    return `
    <div style="background:var(--card-bg, rgba(30,41,59,0.5));border:1px solid var(--border-color, rgba(255,255,255,0.06));border-left:3px solid ${color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#f59e0b'};border-radius:8px;padding:0.75rem 1rem;text-align:center;min-width:120px">
      <div style="font-weight:600;font-size:0.85rem">${name}</div>
      <div style="font-size:0.7rem;color:var(--text-secondary)">${role}</div>
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
