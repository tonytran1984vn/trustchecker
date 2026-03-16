/**
 * TrustChecker – Scm Partners Page
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';
import { timeAgo, scoreColor } from '../../utils/helpers.js';
import { navigate } from '../../core/router.js';


function trustBadge(score, kyc, risk, comp, del, conn, rat) {
  var s = score || 0, k = kyc || 'pending', r = (risk || 'high').toLowerCase();
  var c = comp || 0, d = del || 0, cn = conn || 0, ra = rat || 0;
  if (s >= 92 && cn >= 2 && ra >= 4.5 && d >= 85 && c >= 85)
    return '<span class="trust-badge trust-badge-premium">⭐ Premium</span>';
  if (s >= 80 && k === 'verified' && (r === 'low' || r === 'medium') && c >= 70)
    return '<span class="trust-badge trust-badge-trusted">🛡️ Trusted</span>';
  if (k === 'verified')
    return '<span class="trust-badge trust-badge-verified">✅ Verified</span>';
  return '';
}
function trustBadgeFromObj(p) {
  return trustBadge(p.trust_score, p.kyc_status, p.risk_level, p.compliance_score, p.delivery_score, p.network_connections, p.avg_community_rating);
}

export function renderPage() {
  const partners = State.scmPartners || [];

  return `
    <style>
      .trust-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 20px; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; vertical-align: middle; margin-left: 4px; }
      .trust-badge-premium { background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.15)); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
      .trust-badge-trusted { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }
      .trust-badge-verified { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
</style>

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
              <div class="partner-name">${p.name} ${trustBadgeFromObj(p)}</div>
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
          <button style="flex:1;padding:9px 18px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer" onclick="verifyPartner('${p.id}')">🔍 Run KYC Verification</button>
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
