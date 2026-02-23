/**
 * TrustChecker – Public Dashboard Page
 */
import { State, render } from '../core/state.js';

export function renderPage() {
  const d = State.publicData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading public data…</span></div>';

  const s = d.stats;
  return `
    <div class="card" style="margin-bottom:24px;padding:20px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(168,85,247,0.08));border:1px solid rgba(0,210,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:2rem">🌐</span>
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">TrustChecker Public Transparency Dashboard</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">Real-time platform statistics • No authentication required • Last updated: ${new Date(s.last_updated).toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${s.total_products}</div>
        <div class="stat-label">Products Protected</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">📱</div>
        <div class="stat-value">${s.total_scans?.toLocaleString()}</div>
        <div class="stat-label">Scans Performed</div>
        <div class="stat-change up">↗ ${s.today_scans} today</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div>
        <div class="stat-value">${s.verification_rate}%</div>
        <div class="stat-label">Verification Rate</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🔗</div>
        <div class="stat-value">${s.blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${s.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">🤝</div>
        <div class="stat-value">${s.total_partners}</div>
        <div class="stat-label">Verified Partners</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">🏅</div>
        <div class="stat-value">${s.active_certifications}</div>
        <div class="stat-label">Active Certs</div>
      </div>
      <div class="stat-card rose">
        <div class="stat-icon">🚨</div>
        <div class="stat-value">${s.open_alerts}</div>
        <div class="stat-label">Active Alerts</div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:24px">
      <div class="card">
        <div class="card-header"><div class="card-title">📈 Scan Volume Trend (7 Days)</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicTrendChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🎯 Scan Results Breakdown</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicScanChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">🛡️ Trust Score Distribution</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicTrustChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> Alert Severity</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicAlertChart"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;padding:16px;text-align:center">
      <div style="color:var(--text-muted);font-size:0.85rem">
        🔓 This data is publicly accessible via <code style="background:rgba(0,210,255,0.1);padding:2px 8px;border-radius:4px;color:var(--cyan)">GET /api/public/stats</code>
        • Platform uptime: <span style="color:var(--emerald)">${s.platform_uptime}</span>
        • <a href="/api/docs/html" target="_blank" style="color:var(--cyan);text-decoration:none">View Full API Docs →</a>
      </div>
    </div>
  `;
}
export function initPublicCharts() {
  const d = State.publicData;
  if (!d) return;

  // Scan Trend Line Chart
  const trends = d.trends || [];
  const trendCanvas = document.getElementById('publicTrendChart');
  if (trendCanvas && trends.length) {
    new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: trends.map(t => t.date?.substring(5)),
        datasets: [
          { label: 'Total', data: trends.map(t => t.total), borderColor: '#00d2ff', backgroundColor: 'rgba(0,210,255,0.1)', fill: true, tension: 0.4, borderWidth: 2 },
          { label: 'Valid', data: trends.map(t => t.valid), borderColor: '#00d264', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, borderDash: [5, 3] },
          { label: 'Suspicious', data: trends.map(t => t.suspicious), borderColor: '#ff6b6b', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, borderDash: [5, 3] }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        scales: {
          x: { ticks: { color: '#636e7b', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#636e7b', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  }

  // Scan Results Doughnut
  const scanResults = d.scanResults || [];
  const scanCanvas = document.getElementById('publicScanChart');
  if (scanCanvas && scanResults.length) {
    const colorMap = { valid: '#00d264', warning: '#ffa500', suspicious: '#ff6b6b', counterfeit: '#ff3366', pending: '#636e7b' };
    new Chart(scanCanvas, {
      type: 'doughnut',
      data: {
        labels: scanResults.map(r => r.result),
        datasets: [{ data: scanResults.map(r => r.count), backgroundColor: scanResults.map(r => colorMap[r.result] || '#00d2ff'), borderWidth: 0, borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        cutout: '60%'
      }
    });
  }

  // Trust Distribution Bar
  const trustDist = d.trustDist || [];
  const trustCanvas = document.getElementById('publicTrustChart');
  if (trustCanvas && trustDist.length) {
    const barColors = ['#00d264', '#00d2ff', '#ffa500', '#ff6b6b', '#ff3366'];
    new Chart(trustCanvas, {
      type: 'bar',
      data: {
        labels: trustDist.map(t => t.bracket),
        datasets: [{ label: 'Products', data: trustDist.map(t => t.count), backgroundColor: barColors.slice(0, trustDist.length), borderWidth: 0, borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#636e7b', font: { family: 'Inter', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
          y: { ticks: { color: '#c8d6e5', font: { family: 'Inter', size: 10 } }, grid: { display: false } }
        }
      }
    });
  }

  // Alert Severity Polar
  const alertSev = d.alertSev || [];
  const alertCanvas = document.getElementById('publicAlertChart');
  if (alertCanvas && alertSev.length) {
    const sevColors = { critical: '#ff3366', high: '#ffa500', medium: '#a855f7', low: '#00d2ff' };
    new Chart(alertCanvas, {
      type: 'polarArea',
      data: {
        labels: alertSev.map(a => a.severity),
        datasets: [{ data: alertSev.map(a => a.count), backgroundColor: alertSev.map(a => (sevColors[a.severity] || '#00d2ff') + '99'), borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#c8d6e5', padding: 12, usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } }
      }
    });
  }
}

// Window exports for onclick handlers
window.initPublicCharts = initPublicCharts;
