/**
 * Super Admin – Data Governance (Interactive)
 * Retention policies, auto-purge, GDPR queue, export restrictions
 */
import { icon } from '../../core/icons.js';

/* ── Editable state ── */
let retention = {
  'Scan Logs': 365,
  'Audit Logs': 730,
  'User Sessions': 90,
  'API Request Logs': 180,
  'Fraud Events': 1095,
};
let autoPurge = { enabled: true, schedule: 'Weekly (Sunday 02:00 UTC)', lastRun: '2026-02-16 · 14.2K records purged', nextRun: '2026-02-23 02:00 UTC' };
let editingRetention = false;
let purging = false;

function formatDays(d) {
  if (d >= 365) { const y = Math.round(d / 365); return `${d} days (${y} year${y > 1 ? 's' : ''})`; }
  return `${d} days`;
}

function doRender() {
  const el = document.getElementById('data-gov-root');
  if (el) el.innerHTML = renderContent();
}

function renderContent() {
  return `
    <div class="sa-grid-2col">
      <!-- ═══ Retention Policy ═══ -->
      <div class="sa-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 style="margin:0">${icon('clock', 16)} Data Retention Policy</h3>
          <button onclick="window._dgToggleEdit()" class="sa-btn-sm"
            style="padding:4px 12px;border-radius:8px;font-size:0.7rem;font-weight:600;cursor:pointer;
              border:1px solid ${editingRetention ? '#10b981' : 'var(--border)'};
              background:${editingRetention ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)'};
              color:${editingRetention ? '#10b981' : 'var(--text-secondary)'}">
            ${editingRetention ? '✓ Save' : '✏️ Edit'}
          </button>
        </div>
        <div class="sa-detail-grid">
          ${Object.entries(retention).map(([key, days]) => `
            <div class="sa-detail-item">
              <span class="sa-detail-label">${key}</span>
              ${editingRetention
                ? `<select onchange="window._dgSetRetention('${key}', Number(this.value))"
                    style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);
                      border-radius:6px;padding:3px 8px;font-size:0.78rem;cursor:pointer">
                    ${[30, 60, 90, 180, 365, 730, 1095, 1825].map(v =>
                      `<option value="${v}" ${v === days ? 'selected' : ''}>${formatDays(v)}</option>`
                    ).join('')}
                  </select>`
                : `<span>${formatDays(days)}</span>`
              }
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ Auto-Purge Config ═══ -->
      <div class="sa-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 style="margin:0">${icon('trash', 16)} Auto-Purge Configuration</h3>
          <button onclick="window._dgRunPurge()" ${purging ? 'disabled' : ''}
            style="padding:4px 14px;border-radius:8px;font-size:0.7rem;font-weight:600;cursor:pointer;
              border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.1);color:#ef4444;
              transition:all 0.2s"
            onmouseover="this.style.background='rgba(239,68,68,0.2)'"
            onmouseout="this.style.background='rgba(239,68,68,0.1)'">
            ${purging ? '⏳ Running...' : '🗑️ Run Purge Now'}
          </button>
        </div>
        <div class="sa-detail-grid">
          <div class="sa-detail-item">
            <span class="sa-detail-label">Auto-Purge</span>
            <span style="cursor:pointer" onclick="window._dgTogglePurge()">
              <span class="${autoPurge.enabled ? 'sa-mfa-on' : 'sa-mfa-off'}" style="cursor:pointer">${autoPurge.enabled ? 'Enabled' : 'Disabled'}</span>
              <span style="font-size:0.6rem;color:var(--text-muted);margin-left:4px">(click to toggle)</span>
            </span>
          </div>
          <div class="sa-detail-item"><span class="sa-detail-label">Schedule</span><span>${autoPurge.schedule}</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Last Run</span><span>${autoPurge.lastRun}</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Next Run</span><span>${autoPurge.nextRun}</span></div>
        </div>
      </div>

      <!-- ═══ GDPR Deletion Queue ═══ -->
      <div class="sa-card">
        <h3>${icon('shield', 16)} GDPR Deletion Queue</h3>
        <table class="sa-table sa-table-compact">
          <thead><tr><th>Request ID</th><th>Organization</th><th>Type</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td class="sa-code">DEL-0089</td><td>FreshMart EU</td><td>User Data Erasure</td><td>2026-02-18</td><td><span class="sa-status-pill sa-pill-orange">Pending</span></td>
              <td><button onclick="alert('Processing DEL-0089...')" style="padding:2px 8px;border-radius:6px;font-size:0.65rem;font-weight:600;cursor:pointer;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.1);color:#10b981">Process</button></td></tr>
            <tr><td class="sa-code">DEL-0088</td><td>HealthPlus Co</td><td>Account Deletion</td><td>2026-02-15</td><td><span class="sa-status-pill sa-pill-green">Completed</span></td>
              <td><span style="font-size:0.65rem;color:var(--text-muted)">Done</span></td></tr>
            <tr><td class="sa-code">DEL-0087</td><td>GreenLeaf Org</td><td>Data Export + Delete</td><td>2026-02-10</td><td><span class="sa-status-pill sa-pill-green">Completed</span></td>
              <td><span style="font-size:0.65rem;color:var(--text-muted)">Done</span></td></tr>
          </tbody>
        </table>
      </div>

      <!-- ═══ Export Restrictions ═══ -->
      <div class="sa-card">
        <h3>${icon('download', 16)} Export Restrictions</h3>
        <div class="sa-detail-grid">
          <div class="sa-detail-item"><span class="sa-detail-label">Bulk Export</span><span>Admin approval required</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">Cross-Border</span><span>EU → Non-EU restricted</span></div>
          <div class="sa-detail-item"><span class="sa-detail-label">PII in Exports</span><span>Auto-masked unless authorized</span></div>
        </div>
      </div>
    </div>
  `;
}

/* ── Global handlers ── */
window._dgToggleEdit = () => { editingRetention = !editingRetention; doRender(); };
window._dgSetRetention = (key, val) => { retention[key] = val; };
window._dgTogglePurge = () => { autoPurge.enabled = !autoPurge.enabled; doRender(); };
window._dgRunPurge = () => {
  if (purging) return;
  purging = true;
  doRender();
  setTimeout(() => {
    const now = new Date();
    const recs = Math.floor(Math.random() * 5000 + 8000);
    autoPurge.lastRun = `${now.toISOString().slice(0, 10)} · ${(recs / 1000).toFixed(1)}K records purged`;
    purging = false;
    doRender();
    alert(`✅ Manual purge complete — ${recs.toLocaleString()} records purged`);
  }, 2500);
};

export function renderPage() {
  return `
    <div class="sa-page" id="data-gov-root">
      <div class="sa-page-title"><h1>${icon('lock', 28)} Data Governance</h1></div>
      ${renderContent()}
    </div>
  `;
}
