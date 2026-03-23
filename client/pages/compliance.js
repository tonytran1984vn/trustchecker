/**
 * TrustChecker – Compliance Page (GDPR + Framework Compliance)
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { timeAgo } from '../utils/helpers.js';

let _productMap = null;

export function renderPage() {
  const d = State.complianceData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading compliance data...</span></div>';

  // Fetch products for name lookup (once)
  if (!_productMap && !window._complianceProdLoading) {
    window._complianceProdLoading = true;
    API.get('/products').then(res => {
      _productMap = {};
      (res.products || []).forEach(p => { _productMap[p.id] = p.name; });
      render();
    }).catch(() => { _productMap = {}; });
  }
  const pMap = _productMap || {};

  const s = d.stats || {};
  const records = d.records || [];
  const complianceRate = s.compliance_score ?? s.compliance_rate ?? 0;
  const totalRecords = s.compliance_records ?? s.total_records ?? records.length;
  const gdprRequests = (s.gdpr?.exports || 0) + (s.gdpr?.deletions || 0) + (s.audit_entries ? Math.min(s.audit_entries, 6) : 0);

  return `
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">📜</div><div class="stat-value">${complianceRate}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card rose"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${s.non_compliant || 0}</div><div class="stat-label">Non-Compliant</div></div>
      <div class="stat-card cyan"><div class="stat-icon">📋</div><div class="stat-value">${totalRecords}</div><div class="stat-label">Total Records</div></div>
      <div class="stat-card violet"><div class="stat-icon">🗂️</div><div class="stat-value">${(d.policies || []).length}</div><div class="stat-label">Retention Policies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📋 Compliance Records</div></div>
      <table class="data-table"><thead><tr><th>Entity</th><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr></thead><tbody>
        ${records.map(r => {
          const entityName = pMap[r.entity_id] || (r.entity_id ? r.entity_id.slice(0, 8) : '—');
          const nextReview = r.next_review || r.last_audit ? computeNextReview(r.next_review || r.last_audit) : '—';
          return `<tr><td>${entityName}</td><td><strong>${r.framework}</strong></td><td>${r.requirement || '—'}</td><td><span class="badge ${r.status === 'compliant' ? 'badge-green' : r.status === 'expired' ? 'badge-red' : 'badge-yellow'}">${(r.status || '').toUpperCase()}</span></td><td>${nextReview}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🗂️ Data Retention Policies</div></div>
      <table class="data-table"><thead><tr><th>Table</th><th>Retention</th><th>Action</th><th>Active</th><th>Last Run</th></tr></thead><tbody>
        ${(d.policies || []).map(p => `<tr><td><code>${p.table_name}</code></td><td>${p.retention_days} days</td><td>${p.action}</td><td>${p.is_active ? '<span class="status-icon status-pass" aria-label="Pass">✓</span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</td><td>${p.last_run ? timeAgo(p.last_run) : 'Never'}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

function computeNextReview(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 90); // Standard 90-day audit cycle
    const now = new Date();
    const diff = d - now;
    if (diff < 0) return '<span style="color:var(--danger,#e74c3c)">Overdue</span>';
    const days = Math.ceil(diff / 86400000);
    if (days <= 30) return `<span style="color:var(--warning,#f59e0b)">In ${days}d</span>`;
    return `In ${days}d`;
  } catch { return '—'; }
}
