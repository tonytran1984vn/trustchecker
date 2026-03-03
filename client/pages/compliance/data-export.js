/** Compliance – Data Export — reads from /api/compliance/gdpr/export */
import { icon } from '../../core/icons.js';
import { State } from '../../core/state.js';
let _d = null;
async function load() { if (_d) return; try { _d = await fetch('/api/compliance/gdpr/export', { headers: { 'Authorization': 'Bearer ' + State.token } }).then(r => r.json()); } catch { _d = {}; } }
load();
export function renderPage() {
  const data = _d || {};
  return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('scroll', 28)} Data Export (GDPR)</h1></div>
    <div class="sa-card"><h3>Export Summary</h3>
      <p style="color:var(--text-secondary);font-size:0.85rem">${data.message || data.summary || 'GDPR data export available. Use the export endpoints to download personal data.'}</p>
      ${data.tables ? `<div style="margin-top:1rem">${Object.entries(data.tables || {}).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${k}</span><span style="font-weight:700">${Array.isArray(v) ? v.length : v} records</span></div>`).join('')}</div>` : ''}
    </div></div>`;
}
