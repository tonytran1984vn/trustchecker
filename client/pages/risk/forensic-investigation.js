/** Risk – Forensic Investigation — reads from State._riskForensic */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
export function renderPage() {
  const D = State._riskForensic || {};
  const links = D.links || []; const feed = D.feed || [];
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('search', 28)} Forensic Investigation</h1></div>
    <div class="sa-grid-2col">
      <div class="sa-card"><h3>Hidden Links (${links.length})</h3>
        ${links.length === 0 ? '<p style="color:var(--text-secondary)">No hidden links</p>' :
      links.slice(0, 10).map(l => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between">
            <span class="sa-code">${l.from || l.source || '—'} → ${l.to || l.target || '—'}</span>
            <span class="sa-status-pill sa-pill-${(l.risk_score || 0) > 0.5 ? 'red' : 'orange'}">${(l.risk_score || l.weight || 0).toFixed?.(2) || 0}</span></div>`).join('')}
      </div>
      <div class="sa-card"><h3>Fraud Feed (${feed.length})</h3>
        ${feed.length === 0 ? '<p style="color:var(--text-secondary)">No fraud events</p>' :
      feed.slice(0, 10).map(f => `<div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span class="sa-code">${f.type || f.event_type || '—'}</span> <span style="font-size:0.8rem;color:var(--text-secondary)">${f.description?.slice(0, 40) || ''}</span></div>`).join('')}
      </div></div></div>`;
}
