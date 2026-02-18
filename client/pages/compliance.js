/**
 * TrustChecker – Compliance Page
 */
import { State, render } from '../core/state.js';
import { timeAgo } from '../utils/helpers.js';

export function renderPage() {
  const d = State.complianceData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading compliance data...</span></div>';
  const s = d.stats || {};
  return `
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">📜</div><div class="stat-value">${s.compliance_rate || 0}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card rose"><div class="stat-icon">⚠️</div><div class="stat-value">${s.non_compliant || 0}</div><div class="stat-label">Non-Compliant</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📋</div><div class="stat-value">${s.total_records || 0}</div><div class="stat-label">Total Records</div></div>
      <div class="stat-card violet"><div class="stat-icon">🗂️</div><div class="stat-value">${(d.policies || []).length}</div><div class="stat-label">Retention Policies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 Compliance Records</div></div>
      <table class="data-table"><thead><tr><th>Entity</th><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr></thead><tbody>
        ${(d.records || []).map(r => `<tr><td>${r.entity_type}/${r.entity_id?.slice(0, 8) || '—'}</td><td><strong>${r.framework}</strong></td><td>${r.requirement || '—'}</td><td><span class="badge ${r.status === 'compliant' ? 'badge-green' : 'badge-red'}">${r.status}</span></td><td>${r.next_review ? timeAgo(r.next_review) : '—'}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🗂️ Data Retention Policies</div></div>
      <table class="data-table"><thead><tr><th>Table</th><th>Retention</th><th>Action</th><th>Active</th><th>Last Run</th></tr></thead><tbody>
        ${(d.policies || []).map(p => `<tr><td><code>${p.table_name}</code></td><td>${p.retention_days} days</td><td>${p.action}</td><td>${p.is_active ? '✅' : '❌'}</td><td>${p.last_run ? timeAgo(p.last_run) : 'Never'}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// Window exports for onclick handlers

