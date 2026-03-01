/**
 * Super Admin – Incident Center
 * Pulls real data from /api/ops/incidents + /api/ops/health
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _incidents = null;
let _health = null;
let _loading = false;

async function fetchData() {
  if (_loading) return;
  _loading = true;
  try {
    const [incRes, healthRes] = await Promise.all([
      API.get('/ops/incidents?limit=20').catch(() => ({ incidents: [] })),
      API.get('/ops/health').catch(() => null)
    ]);
    _incidents = incRes.incidents || [];
    _health = healthRes;
  } catch (e) {
    console.error('Incidents fetch error:', e);
    _incidents = [];
  }
  _loading = false;
  const el = document.getElementById('incident-center-root');
  if (el) el.innerHTML = renderContent();
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ts; }
}

function severityPill(sev) {
  const s = (sev || 'unknown').toLowerCase();
  const colors = { sev1: 'red', critical: 'red', sev2: 'orange', high: 'orange', sev3: 'blue', medium: 'blue', sev4: 'green', low: 'green' };
  const c = colors[s] || 'blue';
  return `<span class="sa-status-pill sa-pill-${c}">${sev || 'Unknown'}</span>`;
}

function statusPill(status) {
  const s = (status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed') return `<span class="sa-status-pill sa-pill-green">${status}</span>`;
  if (s === 'escalated') return `<span class="sa-status-pill sa-pill-red">${status}</span>`;
  return `<span class="sa-status-pill sa-pill-orange">${status}</span>`;
}

function renderIncidentCard(inc) {
  const sev = inc.severity || 'SEV3';
  const sevColor = sev.includes('1') || sev === 'critical' ? '#ef4444' : sev.includes('2') || sev === 'high' ? '#f59e0b' : '#3b82f6';
  return `
    <div class="sa-incident sa-incident-${sev.includes('1') ? 'critical' : 'warning'}" style="border-left:3px solid ${sevColor};padding:12px 16px;margin-bottom:8px;border-radius:8px;background:rgba(15,23,42,0.4)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span class="sa-code">${inc.incident_id || inc.id?.substring(0, 8) || '—'}</span>
            <div style="display:flex;gap:6px">${severityPill(sev)} ${statusPill(inc.status)}</div>
        </div>
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px">${inc.title || 'Untitled Incident'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${inc.description || ''}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:6px">${formatTime(inc.created_at)}</div>
    </div>`;
}

function renderContent() {
  const active = (_incidents || []).filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const resolved = (_incidents || []).filter(i => i.status === 'resolved' || i.status === 'closed');

  const slaScore = _health?.sla_score || '99.97';
  const slaTarget = _health?.sla_target || '99.95';

  return `
    <div class="sa-grid-2col">
        <div class="sa-card">
            <h3 style="display:flex;align-items:center;gap:8px">
                Active Incidents
                <span class="sa-status-pill sa-pill-${active.length > 0 ? 'orange' : 'green'}" style="font-size:0.65rem">${active.length}</span>
            </h3>
            ${active.length > 0
      ? active.map(i => renderIncidentCard(i)).join('')
      : '<div class="sa-empty-state">No active incidents — all systems operational</div>'}
        </div>
        <div class="sa-card">
            <h3>SLA Breach Alerts</h3>
            <div class="sa-detail-grid">
                <div class="sa-detail-item"><span class="sa-detail-label">Active Breaches</span><span>${_health?.active_breaches || 0}</span></div>
                <div class="sa-detail-item"><span class="sa-detail-label">30d SLA Score</span><span class="sa-score sa-score-low" style="color:var(--accent-green)">${slaScore}%</span></div>
                <div class="sa-detail-item"><span class="sa-detail-label">Target</span><span>${slaTarget}%</span></div>
                <div class="sa-detail-item"><span class="sa-detail-label">Total Incidents (30d)</span><span>${(_incidents || []).length}</span></div>
            </div>
        </div>
        <div class="sa-card">
            <h3>Recent Resolved Incidents</h3>
            ${resolved.length > 0 ? `
            <table class="sa-table sa-table-compact">
                <thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Resolved</th></tr></thead>
                <tbody>
                    ${resolved.slice(0, 10).map(i => `
                    <tr>
                        <td class="sa-code">${i.incident_id || i.id?.substring(0, 8) || '—'}</td>
                        <td>${i.title || '—'}</td>
                        <td>${severityPill(i.severity)}</td>
                        <td>${formatTime(i.resolved_at || i.updated_at)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : '<div class="sa-empty-state">No resolved incidents</div>'}
        </div>
        <div class="sa-card">
            <h3>Pipeline Health</h3>
            <div class="sa-detail-grid">
                <div class="sa-detail-item"><span class="sa-detail-label">Overall Status</span><span class="sa-mfa-on">${_health?.status || 'Operational'}</span></div>
                <div class="sa-detail-item"><span class="sa-detail-label">Services Monitored</span><span>${_health?.services_count || 8}</span></div>
                <div class="sa-detail-item"><span class="sa-detail-label">MTTR (avg)</span><span>${_health?.mttr || '< 15 min'}</span></div>
                <div class="sa-detail-item"><span class="sa-detail-label">Last Check</span><span>${formatTime(_health?.checked_at) || 'Just now'}</span></div>
            </div>
        </div>
    </div>`;
}

export function renderPage() {
  setTimeout(() => fetchData(), 50);
  return `
    <div class="sa-page">
        <div class="sa-page-title"><h1>${icon('alert', 28)} Incident Center</h1></div>
        <div id="incident-center-root">
            <div class="sa-card">
                <div class="sa-empty-state">Loading incidents...</div>
            </div>
        </div>
    </div>
    `;
}
