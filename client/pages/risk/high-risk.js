/**
 * Risk – High Risk Events (Critical/High only)
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    const events = [
        { id: 'FE-9843', type: 'Behavioral', qr: 'QR-9840500', product: 'SAUCE-FS-350', detail: 'Rooted device, scripted scan pattern, 50+ scans in 2h', score: 91, severity: 'critical', time: '5h ago' },
        { id: 'FE-9844', type: 'Duplicate', qr: 'QR-9841050', product: 'OIL-COC-500', detail: 'Same QR scanned at 2 retail locations simultaneously', score: 88, severity: 'critical', time: '3h ago' },
        { id: 'FE-9847', type: 'Duplicate', qr: 'QR-9847231', product: 'COFFEE-PRE-250', detail: 'Cross-border duplicate: BKK → PNH in 2 min', score: 82, severity: 'high', time: '2 min ago' },
        { id: 'FE-9842', type: 'Geo Anomaly', qr: 'QR-9840100', product: 'SAUCE-FS-350', detail: 'Scan from blocked region (Cambodia)', score: 76, severity: 'high', time: '1d ago' },
    ];

    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('alertTriangle', 28)} High Risk Events</h1></div>

      <div class="sa-card">
        ${events.map(e => `
          <div style="padding:1rem;margin-bottom:0.75rem;border-radius:10px;border-left:4px solid ${e.severity === 'critical' ? '#ef4444' : '#f59e0b'};background:${e.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.04)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <span class="sa-code" style="font-weight:600">${e.id}</span>
                <span class="sa-score sa-score-${e.severity === 'critical' ? 'danger' : 'warning'}">${e.severity.toUpperCase()} · ${e.score}</span>
                <span class="sa-status-pill sa-pill-${e.severity === 'critical' ? 'red' : 'orange'}">${e.type}</span>
              </div>
              <span style="font-size:0.72rem;color:var(--text-secondary)">${e.time}</span>
            </div>
            <div style="font-size:0.88rem;font-weight:500;margin-bottom:0.25rem">${e.product} · <span class="sa-code">${e.qr}</span></div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${e.detail}</div>
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
              <button class="btn btn-xs btn-primary">Investigate</button>
              <button class="btn btn-xs btn-outline">Create Case</button>
              <button class="btn btn-xs btn-ghost">Dismiss</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
