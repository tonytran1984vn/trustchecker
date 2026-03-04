/** Compliance – Data Governance — reads from State._dataGov */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._dataGov || {};
  const jurisdictions = D.jurisdictions || []; const certs = D.certs || []; const frameworks = D.frameworks || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('globe', 28)} Data Governance</h1></div>
    <div class="sa-grid-2col" style="margin-bottom:1.5rem">
      <div class="sa-card"><h3>Jurisdictions (${jurisdictions.length})</h3>
        ${jurisdictions.length === 0 ? '<p style="color:var(--text-secondary)">No jurisdiction data</p>' :
      jurisdictions.map(j => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-weight:600">${typeof j === 'string' ? j : j.name || j.country || '—'}</span><span class="sa-code">${typeof j === 'object' ? j.framework || '' : ''}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Certifications (${certs.length})</h3>
        ${certs.length === 0 ? '<p style="color:var(--text-secondary)">No certifications</p>' :
      certs.map(c => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-weight:600">${c.name || c.cert_name || '—'}</span><span class="sa-status-pill sa-pill-${c.status === 'active' ? 'green' : 'orange'}" style="font-size:0.65rem">${c.status || '—'}</span></div>`).join('')}
      </div></div></div>`;
}
