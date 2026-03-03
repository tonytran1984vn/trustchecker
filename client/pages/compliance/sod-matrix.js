/** Compliance – SoD Matrix — Separation of Duties — reads from /api/compliance-regtech/gaps + /api/compliance/policies */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [gaps, policies] = await Promise.all([
    fetch('/api/compliance-regtech/gaps', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/compliance/policies', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { gaps: gaps.gaps || [], policies: policies.policies || [] };
}
export function renderPage() {
  load();
  const sod = D.policies.filter(p => p.type?.includes('sod') || p.type?.includes('separation'));
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('shield', 28)} Separation of Duties (SoD) Matrix</h1></div>
    <div class="sa-metrics-row" style="margin-bottom:1.5rem">
      ${m('SoD Policies', sod.length || D.policies.length, '', 'blue', 'shield')}
      ${m('Compliance Gaps', D.gaps.length, '', D.gaps.length > 0 ? 'orange' : 'green', 'alertTriangle')}
    </div>
    <div class="sa-card"><h3>SoD Controls</h3>
      ${D.policies.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No SoD policies configured</p>' : `
      <table class="sa-table"><thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Enforced</th></tr></thead>
      <tbody>${D.policies.map(p => `<tr><td style="font-weight:600">${p.name || '—'}</td><td class="sa-code">${p.type || '—'}</td><td><span class="sa-status-pill sa-pill-${p.status === 'active' ? 'green' : 'orange'}">${p.status || '—'}</span></td><td>${p.enforced !== false ? '✅' : '❌'}</td></tr>`).join('')}</tbody></table>`}
    </div></div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
