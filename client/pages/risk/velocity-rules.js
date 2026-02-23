/**
 * Risk – Velocity Rules
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('zap', 28)} Velocity Rules</h1></div>

      <div class="sa-card" style="margin-bottom:1rem">
        <h3>Scan Velocity Limits</h3>
        <div class="sa-threshold-list">
          ${threshold('Per-QR Velocity', 'Max scans per QR within', '5 scans / 1 hour')}
          ${threshold('Per-Device Velocity', 'Max scans per device within', '20 scans / 1 hour')}
          ${threshold('Per-IP Velocity', 'Max scans per IP within', '50 scans / 1 hour')}
          ${threshold('Regional Spike', 'Flag if region scan rate exceeds', '200% of daily average')}
          ${threshold('Burst Detection', 'Flag if > N scans in short window', '10 scans / 5 minutes')}
        </div>
      </div>

      <div class="sa-card">
        <h3>Velocity Actions</h3>
        <div class="sa-threshold-list">
          ${threshold('Soft Limit Action', 'When velocity soft limit reached', 'Flag + Alert')}
          ${threshold('Hard Limit Action', 'When velocity hard limit reached', 'Block + Alert + Auto-Case')}
          ${threshold('Cooldown Period', 'Time before QR/device is unblocked', '24 hours')}
        </div>
      </div>

      <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.5rem">
        <button class="btn btn-outline">Reset to Default</button>
        <button class="btn btn-primary">Save Rules</button>
      </div>
    </div>
  `;
}

function threshold(name, desc, value) {
    return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${name}</strong><input class="ops-input" value="${value}" style="width:200px;text-align:center" /></div><div class="sa-threshold-desc">${desc}</div></div>`;
}
