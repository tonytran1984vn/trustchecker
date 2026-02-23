/**
 * Compliance – Data Governance (Retention, Masking, Export Control, Legal Hold, GDPR)
 */
import { icon } from '../../core/icons.js';

const RETENTION = [
    { type: 'Scan Events', retention: '3 years', basis: 'Business', deletable: false, status: 'active' },
    { type: 'Fraud Alerts', retention: '7 years', basis: 'Regulatory', deletable: false, status: 'active' },
    { type: 'Audit Logs', retention: '7 years', basis: 'SOC / ISO 27001', deletable: false, status: 'active' },
    { type: 'User PII', retention: '5 years post-account', basis: 'GDPR Art.17', deletable: true, status: 'active' },
    { type: 'API Request Logs', retention: '1 year', basis: 'Operational', deletable: true, status: 'active' },
    { type: 'Session Logs', retention: '90 days', basis: 'Security', deletable: true, status: 'active' },
];

const MASKING = [
    { field: 'user.email', rule: 'Show first 3 chars + domain', example: 'adm***@company.com', roles: 'admin, compliance', status: 'active' },
    { field: 'user.phone', rule: 'Show last 4 digits', example: '****1234', roles: 'admin, compliance', status: 'active' },
    { field: 'user.national_id', rule: 'Full mask', example: '********', roles: 'compliance only', status: 'active' },
    { field: 'payment.card', rule: 'Show last 4', example: '**** **** **** 4242', roles: 'billing', status: 'active' },
    { field: 'batch.serial', rule: 'No mask (public)', example: 'B-2026-0893', roles: 'all', status: 'active' },
];

const LEGAL_HOLDS = [
    { id: 'LH-003', subject: 'Fraud Case FC-2025-1847', scope: 'All related scan events, user actions, batch records', created: '2026-01-15', createdBy: 'compliance@company.com', status: 'active' },
    { id: 'LH-002', subject: 'Regulatory Inquiry #R-2025-445', scope: 'Distributor network D-VN-045 full data', created: '2025-11-01', createdBy: 'legal@company.com', status: 'active' },
    { id: 'LH-001', subject: 'Tax Audit FY2025', scope: 'All financial transactions, invoices', created: '2025-09-01', createdBy: 'cfo@company.com', status: 'released' },
];

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Data Governance</h1></div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Retention Policies</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Data retention aligned with regulatory requirements. Immutable data cannot be manually deleted.</p>
        <table class="sa-table"><thead><tr><th>Data Type</th><th>Retention</th><th>Legal Basis</th><th>Deletable</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${RETENTION.map(r => `<tr>
            <td><strong>${r.type}</strong></td><td>${r.retention}</td><td style="font-size:0.82rem">${r.basis}</td>
            <td>${r.deletable ? '<span class="sa-status-pill sa-pill-orange">on expiry</span>' : '<span class="sa-status-pill sa-pill-red">never</span>'}</td>
            <td><span class="sa-status-pill sa-pill-green">${r.status}</span></td>
            <td><button class="btn btn-xs btn-outline">Edit</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🎭 Data Masking Rules</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">PII masking rules control which roles see sensitive data fields.</p>
        <table class="sa-table"><thead><tr><th>Field</th><th>Masking Rule</th><th>Example Output</th><th>Visible To</th><th>Status</th></tr></thead><tbody>
          ${MASKING.map(m => `<tr>
            <td class="sa-code" style="font-size:0.78rem">${m.field}</td><td style="font-size:0.82rem">${m.rule}</td>
            <td class="sa-code" style="font-size:0.78rem">${m.example}</td><td style="font-size:0.78rem">${m.roles}</td>
            <td><span class="sa-status-pill sa-pill-green">${m.status}</span></td>
          </tr>`).join('')}
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Add Masking Rule</button>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>⚖ Legal Holds</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem">Data under legal hold cannot be modified, deleted, or overwritten regardless of retention policy.</p>
        <table class="sa-table"><thead><tr><th>ID</th><th>Subject</th><th>Scope</th><th>Created</th><th>By</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${LEGAL_HOLDS.map(h => `<tr>
            <td class="sa-code">${h.id}</td><td><strong>${h.subject}</strong></td>
            <td style="font-size:0.78rem;max-width:250px">${h.scope}</td>
            <td>${h.created}</td><td style="font-size:0.78rem">${h.createdBy}</td>
            <td><span class="sa-status-pill sa-pill-${h.status === 'active' ? 'red' : 'green'}">${h.status}</span></td>
            <td>${h.status === 'active' ? '<button class="btn btn-xs btn-outline">Release (6-Eyes)</button>' : ''}</td>
          </tr>`).join('')}
        </tbody></table>
        <button class="btn btn-sm btn-ghost" style="margin-top:0.75rem">+ Create Legal Hold</button>
      </div>

      <div class="sa-card">
        <h3>🌍 Data Residency & GDPR</h3>
        <div class="sa-threshold-list">
          ${th('Primary Region', 'Asia-Pacific (Singapore)')}
          ${th('Backup Region', 'Asia-Pacific (Tokyo) — encrypted replica')}
          ${th('GDPR Subject Requests', '3 pending (avg response: 18 days)')}
          ${th('Right to Erasure', 'Supported (except data under legal hold)')}
          ${th('Data Processing Agreement', 'Signed — expires 2027-06-01')}
          ${th('Cross-border Transfer', 'EU SCCs + APEC CBPR certified')}
        </div>
      </div>
    </div>`;
}
function th(n, v) { return `<div class="sa-threshold-item"><div class="sa-threshold-header"><strong>${n}</strong><input class="ops-input" value="${v}" style="width:320px;text-align:center;font-size:0.78rem" /></div></div>`; }
