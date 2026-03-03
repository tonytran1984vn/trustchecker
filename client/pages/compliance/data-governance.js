/** Compliance – Data Governance — reads from /api/compliance-regtech/jurisdictions + /api/compliance/certifications */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [jurisdictions, certs] = await Promise.all([
    fetch('/api/compliance-regtech/jurisdictions', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/compliance/certifications', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { jurisdictions: jurisdictions.jurisdictions || [], frameworks: jurisdictions.frameworks || [], certs: certs.certifications || [] };
}
export function renderPage() {
  load();
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe', 28)} Data Governance</h1></div>
    <div class="sa-grid-2col" style="margin-bottom:1.5rem">
      <div class="sa-card"><h3>Jurisdictions (${D.jurisdictions.length})</h3>
        ${D.jurisdictions.length === 0 ? '<p style="color:var(--text-secondary)">No jurisdiction data</p>' :
      D.jurisdictions.map(j => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-weight:600">${typeof j === 'string' ? j : j.name || j.country || '—'}</span><span class="sa-code">${typeof j === 'object' ? j.framework || '' : ''}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Certifications (${D.certs.length})</h3>
        ${D.certs.length === 0 ? '<p style="color:var(--text-secondary)">No certifications</p>' :
      D.certs.map(c => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-weight:600">${c.name || c.cert_name || '—'}</span><span class="sa-status-pill sa-pill-${c.status === 'active' ? 'green' : 'orange'}" style="font-size:0.65rem">${c.status || '—'}</span></div>`).join('')}
      </div>
    </div>
    ${D.frameworks.length > 0 ? `<div class="sa-card"><h3>Regulatory Frameworks</h3>${D.frameworks.map(f => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem">${typeof f === 'string' ? f : f.name || '—'}</div>`).join('')}</div>` : ''}
  </div>`;
}
