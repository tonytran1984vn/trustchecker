/**
 * Risk – Forensic Investigation
 * Hidden links and cross-tenant analysis from /api/risk-graph
 */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let D = {};
async function load() {
  const h = { 'Authorization': 'Bearer ' + State.token };
  const [hidden, fraud] = await Promise.all([
    fetch('/api/risk-graph/hidden-links', { headers: h }).then(r => r.json()).catch(() => ({})),
    fetch('/api/risk-graph/fraud-feed', { headers: h }).then(r => r.json()).catch(() => ({})),
  ]);
  D = { links: hidden.links || hidden.hidden_links || [], feed: fraud.events || fraud.feed || [] };
}
export function renderPage() {
  load();
  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('search', 28)} Forensic Investigation</h1></div>
      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>Hidden Links / Connections</h3>
          ${D.links.length === 0 ? '<p style="color:var(--text-secondary)">No hidden links detected</p>' :
      D.links.map(l => `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <span style="font-size:0.82rem">${l.source || '—'} → ${l.target || '—'}</span>
              <span class="sa-status-pill sa-pill-${l.risk === 'high' ? 'red' : 'orange'}">${l.risk || l.confidence || '—'}</span>
            </div>`).join('')}
        </div>
        <div class="sa-card">
          <h3>Fraud Feed</h3>
          ${D.feed.length === 0 ? '<p style="color:var(--text-secondary)">No fraud events in feed</p>' :
      D.feed.slice(0, 15).map(f => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.8rem">
              <span class="sa-code" style="margin-right:0.5rem">${f.type || '—'}</span>${f.description || f.message || '—'}
            </div>`).join('')}
        </div>
      </div></div>`;
}
