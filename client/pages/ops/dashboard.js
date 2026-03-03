/**
 * Ops – Operations Dashboard (Landing Page)
 * ═══════════════════════════════════════════
 * Live operational metrics aggregated from workspace cache
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
  // Aggregate metrics from available caches
  const prodCache = window._opsProdCache || {};
  const whCache = window._opsWhCache || {};
  const monCache = window._opsMonCache || {};
  const incCache = window._opsIncCache || {};

  const batchCount = prodCache.batches?.batches?.length || 0;
  const activeBatches = (prodCache.batches?.batches || []).filter(b => b.status === 'active').length;
  const transitBatches = (prodCache.batches?.batches || []).filter(b => b.status === 'in_transit').length;
  const shipmentCount = whCache.shipments?.shipments?.length || 0;
  const pendingShipments = (whCache.shipments?.shipments || []).filter(s => s.status === 'pending' || s.status === 'in_transit').length;
  const openIncidents = (incCache.openCases?.incidents || monCache.openCases?.incidents || []).length;
  const scanCount = monCache.scanHistory?.scans?.length || 0;
  const anomalyCount = (monCache.scanHistory?.scans || []).filter(s => s.fraud_score > 0.3).length;

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('zap', 28)} Operations Dashboard</h1>
        <div class="sa-title-actions">
          <span class="ops-live-dot"></span>
          <span style="font-size:0.75rem;color:#22c55e;font-weight:600">LIVE</span>
        </div>
      </div>

      <!-- Live Operational Metrics -->
      <section class="sa-section">
        <h2 class="sa-section-title">Current Metrics</h2>
        <div class="sa-metrics-row">
          ${metric('Total Batches', String(batchCount), `${activeBatches} active`, 'green', 'products')}
          ${metric('In Transit', String(transitBatches), `${shipmentCount} total shipments`, 'blue', 'network')}
          ${metric('Pending Transfers', String(pendingShipments), pendingShipments > 3 ? 'Above average' : 'Normal', pendingShipments > 3 ? 'orange' : 'blue', 'clock')}
          ${metric('Open Incidents', String(openIncidents), openIncidents > 0 ? 'Requires attention' : 'All clear ✓', openIncidents > 0 ? 'red' : 'green', 'alertTriangle')}
          ${metric('Scan Events', String(scanCount), `${anomalyCount} anomalies`, anomalyCount > 5 ? 'orange' : 'green', 'search')}
        </div>
      </section>

      <!-- Quick Links -->
      <section class="sa-section">
        <h2 class="sa-section-title">${icon('workflow', 18)} Quick Actions</h2>
        <div class="sa-grid-2col">
          <div class="sa-card">
            <h3>🏭 Production</h3>
            ${quickLink('Create new batch', 'ops-production', 'create')}
            ${quickLink('View batch list', 'ops-production', 'batches')}
            ${quickLink('Quality control checks', 'ops-production', 'quality')}
          </div>
          <div class="sa-card">
            <h3>📊 Monitoring</h3>
            ${quickLink('View scan feed', 'ops-monitor', 'scans')}
            ${quickLink('Check duplicate alerts', 'ops-monitor', 'duplicates')}
            ${quickLink('Review open cases', 'ops-incidents', 'open')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function metric(label, value, sub, color, iconName) {
  return `
    <div class="sa-metric-card sa-metric-${color}">
      <div class="sa-metric-icon">${icon(iconName, 22)}</div>
      <div class="sa-metric-body">
        <div class="sa-metric-value">${value}</div>
        <div class="sa-metric-label">${label}</div>
        <div class="sa-metric-sub">${sub}</div>
      </div>
    </div>
  `;
}

function quickLink(label, workspace, tab) {
  return `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer" onclick="showToast('Navigate to ${label}','info')">
      <span style="color:var(--text-secondary);font-size:0.82rem">→</span>
      <span style="font-size:0.82rem">${label}</span>
    </div>
  `;
}
