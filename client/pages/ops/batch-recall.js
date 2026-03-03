/**
 * Ops – Batch Recall Management
 * Reads recall history from API /ops/data/recall-history (ops_incidents_v2 WHERE module='recall')
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _recalls = null;
async function load() {
  if (_recalls) return;
  try {
    const res = await API.get('/ops/data/recall-history');
    _recalls = (res.recalls || []).map(r => ({
      id: r.incident_id || r.id?.slice(0, 12) || '—',
      title: r.title || '—',
      entity: r.affected_entity || '—',
      severity: r.severity || 'SEV3',
      status: r.status || 'open',
      resolution: r.resolution || '—',
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
    }));
  } catch (e) { _recalls = []; }
}
load();

export function renderPage() {
  const recalls = _recalls || [];
  const sevColors = { SEV1: 'danger', SEV2: 'warning', SEV3: 'info', SEV4: 'low' };

  return `
    <div class="sa-page">
        <div class="sa-page-title">
            <h1>${icon('alertTriangle', 28)} Batch Recall Management</h1>
        </div>

        <!-- Initiate Recall Form -->
        <div class="sa-card" style="margin-bottom:1.5rem">
            <h3 style="margin:0 0 1rem">${icon('alertTriangle', 18)} Initiate Recall</h3>
            <div class="ops-form-row">
                <div class="ops-field"><label class="ops-label">Batch ID</label><input class="ops-input" placeholder="e.g. B-2026-0888" /></div>
                <div class="ops-field"><label class="ops-label">Reason</label><input class="ops-input" placeholder="Contamination risk / Underweight / etc." /></div>
                <div class="ops-field"><label class="ops-label">Severity</label>
                    <select class="ops-input"><option>SEV1 — Critical</option><option>SEV2 — High</option><option selected>SEV3 — Medium</option><option>SEV4 — Low</option></select>
                </div>
            </div>
            <div style="margin-top:1rem;display:flex;gap:0.75rem">
                <button class="btn btn-primary btn-sm" style="background:#ef4444;border-color:#ef4444" onclick="showToast('🚨 Recall initiated — incident ticket created','warning')">Initiate Recall</button>
            </div>
        </div>

        <!-- Recall History -->
        <div class="sa-card">
            <h3 style="margin:0 0 1rem">Recall History</h3>
            ${recalls.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1rem">No recall records</p>' : `
            <table class="sa-table"><thead><tr><th>Recall ID</th><th>Description</th><th>Entity</th><th>Severity</th><th>Status</th><th>Resolution</th><th>Date</th></tr></thead>
            <tbody>${recalls.map(r => `<tr>
                <td class="sa-code">${r.id}</td>
                <td style="font-size:0.82rem">${r.title}</td>
                <td class="sa-code">${r.entity}</td>
                <td><span class="sa-score sa-score-${sevColors[r.severity] || 'info'}">${r.severity}</span></td>
                <td><span class="sa-status-pill sa-pill-${r.status === 'open' ? 'red' : r.status === 'resolved' ? 'green' : 'orange'}">${r.status}</span></td>
                <td style="font-size:0.75rem;color:var(--text-secondary)">${r.resolution}</td>
                <td style="color:var(--text-secondary)">${r.date}</td>
            </tr>`).join('')}
            </tbody></table>`}
        </div>
    </div>
  `;
}
