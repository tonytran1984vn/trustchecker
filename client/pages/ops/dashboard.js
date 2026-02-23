/**
 * Ops – Operations Dashboard (Landing Page)
 * ═══════════════════════════════════════════
 * Live operational metrics + bottleneck indicators
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
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
        <h2 class="sa-section-title">Today's Metrics</h2>
        <div class="sa-metrics-row">
          ${metric('Batches Created', '24', '+6 vs yesterday', 'green', 'products')}
          ${metric('Batches Transferred', '18', '3 in transit', 'blue', 'network')}
          ${metric('Pending Transfers', '7', '2 overdue', 'orange', 'clock')}
          ${metric('Pending Approvals', '3', 'Urgent: 1', 'red', 'check')}
          ${metric('Failed Scans', '12', '−8% vs avg', 'green', 'alert')}
          ${metric('Duplicate Alerts', '2', 'Thai region', 'orange', 'shield')}
        </div>
      </section>

      <!-- Bottleneck Indicators -->
      <section class="sa-section">
        <h2 class="sa-section-title">${icon('alertTriangle', 18)} Bottleneck Indicators</h2>
        <div class="sa-grid-2col">
          <div class="sa-card">
            <h3>🏭 Production Bottlenecks</h3>
            ${bottleneck('Warehouse HCM-03', 'Congestion: 94% capacity', 'critical')}
            ${bottleneck('Factory DN-01', '3 unverified batches pending', 'warning')}
            ${bottleneck('Lab QC Queue', '8 items waiting > 4h', 'warning')}
          </div>
          <div class="sa-card">
            <h3>🚚 Shipping Bottlenecks</h3>
            ${bottleneck('Route HCM → BKK', 'Delayed: 2 shipments (customs)', 'critical')}
            ${bottleneck('QR Activation Lag', 'Avg 2.3h (target: 30min)', 'warning')}
            ${bottleneck('Receiving Queue', '4 transfers awaiting confirmation', 'info')}
          </div>
        </div>
      </section>

      <!-- Recent Activity Feed -->
      <section class="sa-section">
        <h2 class="sa-section-title">${icon('scroll', 18)} Recent Activity</h2>
        <div class="sa-card">
          ${activity('Batch B-2026-0892 created', 'Factory HCM-01 · 500 units', '2 min ago')}
          ${activity('Transfer T-4521 confirmed', 'HCM → SGN · 200 units received', '8 min ago')}
          ${activity('Duplicate QR flagged', 'QR-9847231 scanned from 2 locations', '15 min ago')}
          ${activity('Batch B-2026-0891 in transit', 'HCM → BKK · 1000 units', '22 min ago')}
          ${activity('Mismatch detected', 'T-4520 quantity: expected 300, received 280', '35 min ago')}
          ${activity('Batch B-2026-0890 completed', 'Full lifecycle · 750 units verified', '1h ago')}
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

function bottleneck(location, issue, severity) {
    const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6';
    return `
    <div style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.65rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};margin-top:6px;flex-shrink:0"></span>
      <div>
        <strong style="font-size:0.85rem">${location}</strong>
        <div style="font-size:0.75rem;color:var(--text-secondary)">${issue}</div>
      </div>
    </div>
  `;
}

function activity(title, detail, time) {
    return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0.65rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <div>
        <div style="font-size:0.85rem;font-weight:500">${title}</div>
        <div style="font-size:0.72rem;color:var(--text-secondary)">${detail}</div>
      </div>
      <span style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap">${time}</span>
    </div>
  `;
}
