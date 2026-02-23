/**
 * TrustChecker – Scm Partners Page
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { timeAgo, scoreColor } from '../../utils/helpers.js';
import { navigate } from '../../core/router.js';

export function renderPage() {
  const partners = State.scmPartners || [];

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:0.82rem;color:var(--text-muted)">${partners.length} partners onboarded</div>
      <div style="display:flex;gap:10px">
        <button class="btn" onclick="syncConnectors()">🔄 Sync Connectors</button>
        <button class="btn" onclick="checkConnectorStatus()">🔌 Connector Status</button>
      </div>
    </div>

    <div class="product-grid">
      ${partners.map((p, i) => `
        <div class="partner-card scm-animate" data-type="${(p.type || '').toLowerCase()}" onclick="showPartnerDetail('${p.id}')">
          <div class="partner-header">
            <div>
              <div class="partner-name">${p.name}</div>
              <div class="partner-type">${p.type} • ${p.country || '—'}</div>
            </div>
            <span class="badge ${p.kyc_status === 'verified' ? 'valid' : p.kyc_status === 'pending' ? 'warning' : 'suspicious'}">${p.kyc_status === 'verified' ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> KYC' : p.kyc_status === 'pending' ? '⏳ Pending' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> Failed'}</span>
          </div>
          <div class="partner-meta">
            <div class="partner-trust">
              <span class="partner-trust-score" style="color:${scoreColor(p.trust_score)}">${p.trust_score}</span>
              <span class="partner-trust-label">Trust</span>
            </div>
            <span class="badge ${p.risk_level === 'low' ? 'valid' : p.risk_level === 'medium' ? 'warning' : 'suspicious'}">${p.risk_level || '—'} risk</span>
          </div>
          <div class="partner-email">${p.contact_email || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}
async function showPartnerDetail(id) {
  try {
    const detail = await API.get(`/scm/partners/${id}`);
    const p = detail.partner;
    const r = detail.risk;
    State.modal = `
      <div class="modal" style="max-width:600px">
        <div class="modal-title">${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:0.82rem">
          <div><span style="color:var(--text-muted)">Type:</span> ${p.type}</div>
          <div><span style="color:var(--text-muted)">KYC:</span> <span class="badge ${p.kyc_status === 'verified' ? 'valid' : 'warning'}">${p.kyc_status}</span></div>
          <div><span style="color:var(--text-muted)">Country:</span> ${p.country} / ${p.region || '—'}</div>
          <div><span style="color:var(--text-muted)">Trust:</span> <span style="font-weight:800;color:${scoreColor(p.trust_score)}">${p.trust_score}</span></div>
          <div><span style="color:var(--text-muted)">Risk Grade:</span> <span style="font-weight:700">${r?.grade || '—'}</span></div>
          <div><span style="color:var(--text-muted)">Risk Level:</span> <span class="badge ${r?.risk_level === 'low' ? 'valid' : 'warning'}">${r?.risk_level || '—'}</span></div>
        </div>
        <div style="font-weight:700;margin-bottom:6px">Risk Factors</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.78rem;margin-bottom:16px">
          ${Object.entries(r?.factors || {}).map(([k, v]) => `<div style="color:var(--text-muted)">${k}:</div><div>${v}</div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="verifyPartner('${p.id}')" style="flex:1">🔍 Run KYC Verification</button>
          <button class="btn" onclick="State.modal=null;render()">Close</button>
        </div>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to load partner', 'error'); }
}
async function verifyPartner(id) {
  try {
    const res = await API.post(`/scm/partners/${id}/verify`);
    showToast(`KYC: ${res.badge}`, res.kyc_status === 'verified' ? 'success' : 'error');
    State.modal = null;
    navigate('scm-partners');
  } catch (e) { showToast('Verification failed: ' + e.message, 'error'); }
}
async function syncConnectors() {
  try {
    const res = await API.post('/scm/partners/connectors/sync', { connector_type: 'SAP' });
    showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Synced ${res.total_synced} records (${res.total_errors} errors) — Health: ${res.health}`, 'success');
  } catch (e) { showToast('Sync failed: ' + e.message, 'error'); }
}
async function checkConnectorStatus() {
  try {
    const res = await API.get('/scm/partners/connectors/status');
    State.modal = `
      <div class="modal">
        <div class="modal-title">🔌 Connector Status</div>
        <div style="margin-bottom:12px"><span class="badge ${res.overall_health === 'healthy' ? 'valid' : 'warning'}">Overall: ${res.overall_health}</span> • ${res.total_synced_today} synced today</div>
        ${(res.connectors || []).map(c => `
          <div class="connector-card">
            <div class="connector-header">
              <span class="connector-name">${c.name}</span>
              <span class="badge valid">${c.status}</span>
            </div>
            <div class="connector-detail">Entities: ${c.entities.join(', ')} • Last sync: ${timeAgo(c.last_sync)}</div>
          </div>
        `).join('')}
        <button class="btn" onclick="State.modal=null;render()" style="margin-top:12px;width:100%">Close</button>
      </div>
    `;
    render();
  } catch (e) { showToast('Failed to check connectors', 'error'); }
}

// Window exports for onclick handlers
window.showPartnerDetail = showPartnerDetail;
window.verifyPartner = verifyPartner;
window.syncConnectors = syncConnectors;
window.checkConnectorStatus = checkConnectorStatus;
