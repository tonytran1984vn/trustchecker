/** Compliance – Data Governance — Jurisdictions, frameworks, certifications */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';

export function renderPage() {
  const raw = State._dataGov || {};
  const jurisdictions = Array.isArray(raw.jurisdictions) ? raw.jurisdictions : [];
  const frameworks = Array.isArray(raw.frameworks) ? raw.frameworks : [];
  const certs = Array.isArray(raw.certs) ? raw.certs : [];
  const FLAGS = { EU: '🇪🇺', US: '🇺🇸', VN: '🇻🇳', GLOBAL: '🌍', CN: '🇨🇳', JP: '🇯🇵', AU: '🇦🇺', UK: '🇬🇧' };

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('globe', 28)} Data Governance</h1></div>

    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${_m('Jurisdictions', jurisdictions.length, '', 'blue', 'globe')}
      ${_m('Frameworks', frameworks.length, '', 'purple', 'shield')}
      ${_m('Certifications', certs.length, '', 'teal', 'award')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('globe', 18)} Jurisdictions</h3>
        ${jurisdictions.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No jurisdictions loaded</p>' : `
        <div style="display:grid;gap:0.5rem;max-height:350px;overflow-y:auto">
          ${jurisdictions.map(j => `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem;background:var(--bg-secondary);border-radius:6px">
            <span style="font-size:1.2rem">${FLAGS[j.code] || '🏳️'}</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.78rem">${j.code || '—'}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${(j.frameworks || []).length} frameworks${j.strict ? ' · Strict' : ''}${j.cbam_affected ? ' · CBAM' : ''}</div>
            </div>
            <span class="sa-code" style="font-size:0.72rem">${j.code || '—'}</span>
          </div>`).join('')}
        </div>`}
      </div>

      <div class="sa-card">
        <h3 style="margin-bottom:1rem">${icon('shield', 18)} Regulatory Frameworks</h3>
        ${frameworks.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:1.5rem">No frameworks loaded</p>' : `
        <div style="display:grid;gap:0.5rem;max-height:350px;overflow-y:auto">
          ${frameworks.map(f => `<div style="padding:0.6rem;background:var(--bg-secondary);border-radius:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
              <span style="font-weight:600;font-size:0.78rem">${f.name || f.id || '—'}</span>
              <span class="sa-code" style="font-size:0.68rem">${f.region || '—'}</span>
            </div>
            <div style="font-size:0.68rem;color:var(--text-secondary)">${f.description || `${f.requirements?.length || 0} requirements`}</div>
          </div>`).join('')}
        </div>`}
      </div>
    </div>

    ${certs.length > 0 ? `<div class="sa-card" style="margin-top:1.5rem">
      <h3 style="margin-bottom:1rem">${icon('award', 18)} Certifications</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem">
        ${certs.map(c => `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--accent-teal,#14b8a6)">
          <div style="font-weight:700;font-size:0.82rem;margin-bottom:0.25rem">${c.cert_name || c.name || '—'}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary)">
            <div>Issuer: ${c.cert_body || c.issuer || '—'}</div>
            <div>Status: <span class="sa-status-pill sa-pill-${c.status === 'active' ? 'green' : 'orange'}" style="font-size:0.68rem">${c.status || '—'}</span></div>
            ${c.expiry_date ? `<div>Expires: ${new Date(c.expiry_date).toLocaleDateString()}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function _m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div>${s ? `<div class="sa-metric-sub">${s}</div>` : ''}</div></div>`; }
