/**
 * TrustChecker – Stakeholder Page
 */
import { State, render } from '../core/state.js';

export function renderPage() {
  const d = State.stakeholderData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Trust data…</div></div>';
  const db = d.dashboard;

  const starBar = (score, maxCount) => {
    const pct = maxCount > 0 ? (score / maxCount) * 100 : 0;
    return `<div style="display:flex;align-items:center;gap:8px">
      <span style="width:10px;font-size:0.75rem">${score}</span>
      <div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--amber);border-radius:4px"></div>
      </div>
    </div>`;
  };
  const maxDist = Math.max(...Object.values(db.ratings.distribution || {}), 1);

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">⭐ ${db.ratings.average}</div><div class="stat-label">${db.ratings.total} Ratings</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${db.certifications.active}</div><div class="stat-label">Active Certs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${db.certifications.expired}</div><div class="stat-label">Expired Certs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${db.compliance.rate}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${db.compliance.non_compliant}</div><div class="stat-label">Non-Compliant</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--gap)">
      <div class="card">
        <div class="card-header"><div class="card-title">⭐ Rating Distribution</div></div>
        <div style="padding:0 var(--gap) var(--gap);display:flex;flex-direction:column;gap:6px">
          ${[5, 4, 3, 2, 1].map(i => `
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:14px;font-size:0.8rem;color:var(--amber)">${'★'.repeat(i)}</span>
              ${starBar(db.ratings.distribution?.[i] || 0, maxDist)}
              <span style="font-size:0.72rem;color:var(--text-muted);width:20px">${db.ratings.distribution?.[i] || 0}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">📜 Certifications</div></div>
        <div class="table-container">
          <table>
            <tr><th>Certification</th><th>Issuing Body</th><th>Cert #</th><th>Issued</th><th>Expires</th><th>Status</th></tr>
            ${d.certifications.map(c => `
              <tr>
                <td style="font-weight:600">${c.cert_name}</td>
                <td>${c.cert_body}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${c.cert_number}</td>
                <td style="font-size:0.75rem">${c.issued_date || '—'}</td>
                <td style="font-size:0.75rem">${c.expiry_date || '—'}</td>
                <td><span class="badge ${c.status === 'active' ? 'valid' : 'suspicious'}">${c.status}</span></td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📋 Compliance Records</div></div>
      <div class="table-container">
        <table>
          <tr><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr>
          ${d.compliance.map(r => `
            <tr>
              <td style="font-weight:600">${r.framework}</td>
              <td>${r.requirement}</td>
              <td><span class="badge ${r.status === 'compliant' ? 'valid' : 'suspicious'}">${r.status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${r.next_review || '—'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// Window exports for onclick handlers

