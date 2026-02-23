/**
 * Company Admin – Code Lifecycle Management
 * Real data from /api/qr (QR codes with status) + /api/scm/batches
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { render } from '../../core/state.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  try {
    const [qrRes, batchRes] = await Promise.all([
      API.get('/qr?limit=100').catch(() => ({ codes: [] })),
      API.get('/scm/batches?limit=50').catch(() => ({ batches: [] })),
    ]);
    const codes = Array.isArray(qrRes) ? qrRes : (qrRes.codes || qrRes.qrCodes || []);
    data = { codes, batches: Array.isArray(batchRes) ? batchRes : (batchRes.batches || []) };
  } catch (e) { data = { codes: [], batches: [] }; }
  loading = false;
}

const STAGES = ['generated', 'printed', 'activated', 'scanned', 'flagged', 'locked', 'revoked'];
const STAGE_COLORS = { generated: '#64748b', printed: '#3b82f6', activated: '#22c55e', scanned: '#06b6d4', flagged: '#f59e0b', locked: '#ef4444', revoked: '#991b1b' };

export function renderPage() {
  if (!data && !loading) { load().then(() => render()); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Code Lifecycle...</div></div>`;

  const codes = data?.codes || [];
  const stageCounts = {};
  STAGES.forEach(s => { stageCounts[s] = codes.filter(c => (c.status || 'generated').toLowerCase() === s).length; });
  const maxCount = Math.max(...Object.values(stageCounts), 1);

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('workflow', 28)} Code Lifecycle</h1></div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📊 Lifecycle Pipeline</h3>
        <div style="display:flex;gap:0.25rem;margin:1rem 0">
          ${STAGES.map(s => {
    const count = stageCounts[s];
    const width = Math.max(8, (count / maxCount) * 100);
    const color = STAGE_COLORS[s];
    return `<div style="flex:${width};text-align:center">
              <div style="background:${color};color:#fff;padding:0.5rem 0.25rem;border-radius:6px;font-size:0.72rem;font-weight:700">${count.toLocaleString()}</div>
              <div style="font-size:0.68rem;font-weight:600;margin-top:0.3rem">${s.charAt(0).toUpperCase() + s.slice(1)}</div>
            </div>`;
  }).join('<div style="display:flex;align-items:center;color:var(--text-secondary);font-size:0.8rem">→</div>')}
        </div>
      </div>

      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔎 Code Lookup & Management</h3>
        ${codes.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">No QR codes found</div>' : `
        <table class="sa-table"><thead><tr><th>Code</th><th>Product</th><th>Stage</th><th>Scans</th><th>Last Scan</th><th>Risk</th><th>Actions</th></tr></thead><tbody>
          ${codes.slice(0, 20).map(c => {
    const stage = (c.status || 'generated').toLowerCase();
    const color = STAGE_COLORS[stage] || '#64748b';
    const risk = c.risk_score || 0;
    return `<tr class="${risk > 60 ? 'ops-alert-row' : ''}">
              <td class="sa-code" style="font-size:0.72rem;color:#6366f1">${c.code || c.serial || c.id?.substring(0, 16) || '—'}</td>
              <td style="font-size:0.82rem">${c.product_name || c.product_id?.substring(0, 8) || '—'}</td>
              <td><span class="sa-status-pill" style="background:${color}15;color:${color};border:1px solid ${color}30">${stage}</span></td>
              <td style="text-align:center">${c.scan_count || 0}</td>
              <td style="font-size:0.78rem">${c.last_scanned_at ? new Date(c.last_scanned_at).toLocaleDateString('en-US') : '—'}</td>
              <td style="font-weight:700;color:${risk > 60 ? '#ef4444' : risk > 30 ? '#f59e0b' : '#22c55e'}">${risk}</td>
              <td><button class="btn btn-xs btn-ghost">Details</button></td>
            </tr>`;
  }).join('')}
        </tbody></table>`}
      </div>
    </div>`;
}
