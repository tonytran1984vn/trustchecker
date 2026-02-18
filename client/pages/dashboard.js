/**
 * TrustChecker – Dashboard Page
 */
import { State } from '../core/state.js';
import { timeAgo, scoreColor, eventIcon } from '../utils/helpers.js';

export function renderPage() {
    const s = State.dashboardStats;
    if (!s) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading dashboard...</span></div>';

    return `
    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${s.total_products}</div>
        <div class="stat-label">Registered Products</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">📱</div>
        <div class="stat-value">${s.total_scans}</div>
        <div class="stat-label">Total Scans</div>
        <div class="stat-change up">↗ ${s.today_scans} today</div>
      </div>
      <div class="stat-card ${s.open_alerts > 0 ? 'rose' : 'emerald'}">
        <div class="stat-icon">🚨</div>
        <div class="stat-value">${s.open_alerts}</div>
        <div class="stat-label">Open Alerts</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${s.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${s.total_blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
    </div>

    <div class="grid-2-1">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Recent Activity</div>
        </div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Result</th><th>Fraud</th><th>Trust</th><th>Time</th></tr>
            ${(s.recent_activity || []).map(a => `
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">${a.product_name || '—'}</td>
                <td><span class="badge ${a.result}">${a.result}</span></td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${a.fraud_score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(a.fraud_score * 100).toFixed(0)}%</td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${scoreColor(a.trust_score)}">${Math.round(a.trust_score)}</td>
                <td class="event-time">${timeAgo(a.scanned_at)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Live Events</div>
        </div>
        <div class="event-feed" id="event-feed">${renderEventFeed()}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">📈 Scan Results Distribution</div></div>
        <div style="position:relative;height:260px;padding:10px"><canvas id="scanDoughnutChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">⚠️ Alert Severity</div></div>
        <div style="position:relative;height:260px;padding:10px"><canvas id="alertPolarChart"></canvas></div>
      </div>
    </div>
  `;
}

function renderEventFeed() {
    if (!State.events.length) return '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-text">Waiting for events...</div></div>';
    return State.events.slice(0, 20).map(ev => `
    <div class="event-item">
      <div class="event-icon">${eventIcon(ev.type)}</div>
      <div class="event-content">
        <div class="event-title">${ev.type}</div>
        <div class="event-desc">${ev.data?.product_name || ev.data?.message || ev.data?.type || JSON.stringify(ev.data || {}).substring(0, 60)}</div>
      </div>
      <div class="event-time">${ev.timestamp ? timeAgo(ev.timestamp) : 'now'}</div>
    </div>
  `).join('');
}

export function initDashboardCharts() {
    const s = State.dashboardStats;
    if (!s) return;
    const scanData = s.scans_by_result || [];
    const scanCanvas = document.getElementById('scanDoughnutChart');
    if (scanCanvas && scanData.length) {
        const colorMap = { valid: '#00d264', warning: '#ffa500', suspicious: '#ff6b6b', counterfeit: '#ff3366', pending: '#636e7b' };
        new Chart(scanCanvas, {
            type: 'doughnut',
            data: {
                labels: scanData.map(d => d.result),
                datasets: [{ data: scanData.map(d => d.count), backgroundColor: scanData.map(d => colorMap[d.result] || '#00d2ff'), borderWidth: 0, borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
                cutout: '65%'
            }
        });
    }
    const alertData = s.alerts_by_severity || [];
    const alertCanvas = document.getElementById('alertPolarChart');
    if (alertCanvas && alertData.length) {
        const sevColors = { critical: '#ff3366', high: '#ffa500', medium: '#a855f7', low: '#00d2ff' };
        new Chart(alertCanvas, {
            type: 'polarArea',
            data: {
                labels: alertData.map(d => d.severity),
                datasets: [{ data: alertData.map(d => d.count), backgroundColor: alertData.map(d => (sevColors[d.severity] || '#00d2ff') + '99'), borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
                scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } }
            }
        });
    }
}

window.initDashboardCharts = initDashboardCharts;
