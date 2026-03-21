/**
 * Super Admin – Global Fraud Feed (Real-time)
 * Connects to /api/risk-graph/fraud-feed for real DB data
 * Uses CSS vars for full dark/light theme support
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let feedData = null;
let loading = false;
let loadedAt = 0;
let pageSize = 10;
let currentPage = 1;

async function loadFeed() {
  if (loading) return;
  const now = Date.now();
  if (feedData && now - loadedAt < 30000) return; // cache 30s
  loading = true;
  // Await workspace prefetch if it's in flight
  if (window._saRiskReady) {
    try { await window._saRiskReady; } catch { }
  }
  // Use prefetched data from workspace if available
  const cache = window._saRiskCache;
  if (cache?.fraudFeed && cache._loadedAt && !feedData) {
    feedData = cache.fraudFeed;
    loadedAt = cache._loadedAt;
    loading = false;
    setTimeout(() => { const el = document.getElementById('risk-feed-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
    return;
  }
  try {
    feedData = await API.get('/risk-graph/fraud-feed');
    loadedAt = now;
  } catch (e) { feedData = { alerts: [], summary: {}, topOrgs: [], topTypes: [], insights: [{ level: 'info', msg: 'Unable to load data — ' + e.message }] }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('risk-feed-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}

const SEV_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
const STATUS_COLOR = { open: '#ef4444', investigating: '#3b82f6', resolved: '#22c55e' };

/* ── Dark-theme-friendly insight styles ── */
const INSIGHT_STYLE = {
  critical: 'background:rgba(239,68,68,0.12);border-left:4px solid #ef4444;color:var(--text-primary)',
  danger:   'background:rgba(249,115,22,0.12);border-left:4px solid #f97316;color:var(--text-primary)',
  warning:  'background:rgba(234,179,8,0.12);border-left:4px solid #eab308;color:var(--text-primary)',
  info:     'background:rgba(59,130,246,0.12);border-left:4px solid #3b82f6;color:var(--text-primary)',
};
const INSIGHT_ICON = { critical: '🚨', danger: '⚠️', warning: '⚡', info: 'ℹ️' };

function renderContent() {
  if (!feedData && !loading) { loadFeed(); }

  if (loading && !feedData) {
    return `<div class="sa-page"><div class="sa-page-title"><h1>${icon('radio', 28)} Global Fraud Feed</h1></div>
        <div style="text-align:center;padding:60px;color:var(--text-muted)"><span class="phx-spinner-sm"></span> Loading live data...</div></div>`;
  }

  const d = feedData || { alerts: [], summary: {}, topOrgs: [], topTypes: [], insights: [] };
  const s = d.summary || {};

  return `
    <style>
      .rf-card {
        background: var(--bg-card, rgba(15,23,42,0.6));
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
      }
      .rf-kpi {
        background: var(--bg-card, rgba(15,23,42,0.6));
        border: 1px solid var(--border);
        border-radius: 12px; padding: 12px 14px;
        text-align: center; transition: transform 0.2s;
      }
      .rf-kpi:hover { transform: translateY(-2px); }
      .rf-kpi-val { font-size: 1.3rem; font-weight: 800; font-family:'JetBrains Mono',monospace; }
      .rf-kpi-label { font-size: 0.65rem; color: var(--text-muted); font-weight: 600; }
      .rf-insight {
        padding: 10px 14px; border-radius: 8px; font-size: 0.78rem; line-height: 1.5;
      }
      .rf-rank {
        width:18px; height:18px; border-radius:50%; color:#fff;
        font-size:0.6rem; display:flex; align-items:center; justify-content:center;
        font-weight:700; flex-shrink:0;
      }
      .rf-row {
        display:flex; align-items:center; gap:8px; padding:5px 0;
        border-bottom:1px solid var(--border); font-size:0.78rem;
      }
      .rf-row:last-child { border-bottom:none; }
      .rf-type-bar {
        flex:2; height:6px; background:var(--bg-secondary); border-radius:3px; overflow:hidden;
      }
      .rf-type-fill {
        height:100%; border-radius:3px;
        background:linear-gradient(90deg,#3b82f6,#8b5cf6);
      }
      .rf-table { width:100%; border-collapse:collapse; font-size:0.76rem; }
      .rf-table th {
        padding:8px 12px; text-align:left; font-size:0.68rem;
        color:var(--text-muted); font-weight:600;
        background:var(--bg-secondary);
      }
      .rf-table td { padding:8px 12px; }
      .rf-table tr { border-bottom:1px solid var(--border); transition:background 0.15s; }
      .rf-table tbody tr:hover { background:rgba(148,163,184,0.06); }
      .rf-badge {
        display:inline-block; padding:2px 8px; border-radius:10px;
        font-size:0.7rem; font-weight:600;
        background:var(--bg-secondary); color:var(--text-secondary);
      }
      .rf-status {
        display:inline-block; padding:2px 10px; border-radius:10px;
        font-size:0.68rem; font-weight:600; color:#fff;
      }
      .rf-pager {
        padding:4px 10px; border:1px solid var(--border); border-radius:6px;
        font-size:0.72rem; cursor:pointer; background:var(--bg-card);
        color:var(--text-primary); transition:all 0.15s;
      }
      .rf-pager:hover:not(:disabled) { border-color:var(--cyan); }
      .rf-pager:disabled { opacity:0.4; cursor:default; }
      .rf-pager-active {
        background:#3b82f6 !important; color:#fff !important;
        border-color:#3b82f6 !important; font-weight:700;
      }
    </style>

    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('radio', 28)} Global Fraud Feed</h1>
        <span class="sa-live-badge" onclick="window._rfRefresh()" style="cursor:pointer" title="Click to refresh">● LIVE</span>
      </div>

      <!-- ═══ KPI Row ═══ -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px">
        ${kpi('🚨', s.total || 0, 'Total Alerts', '#ef4444')}
        ${kpi('🔴', s.critical || 0, 'Critical', '#dc2626')}
        ${kpi('🟠', s.high || 0, 'High', '#ea580c')}
        ${kpi('🟡', s.medium || 0, 'Medium', '#ca8a04')}
        ${kpi('📂', s.open || 0, 'Open', '#f59e0b')}
        ${kpi('🔍', s.investigating || 0, 'Investigating', '#3b82f6')}
      </div>

      <!-- ═══ Executive Alert Panel ═══ -->
      <div class="rf-card" style="padding:16px 20px;margin-bottom:16px">
        <div style="font-size:0.82rem;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
          ${icon('alert-triangle', 16)} <span>Alerts & Recommendations for Admin</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${(d.insights || []).map(i => `
            <div class="rf-insight" style="${INSIGHT_STYLE[i.level] || INSIGHT_STYLE.info}">
              <strong>${INSIGHT_ICON[i.level] || '📋'} ${i.level.toUpperCase()}</strong>: ${i.msg}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ Top Risk Orgs + Type Breakdown ═══ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="rf-card" style="padding:14px 18px">
          <div style="font-size:0.75rem;font-weight:700;margin-bottom:8px;color:var(--text-muted)">🏢 TOP RISK ORGANIZATIONS</div>
          ${(d.topOrgs || []).map((t, i) => `
            <div class="rf-row">
              <span class="rf-rank" style="background:${['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'][i]}">
                ${i + 1}
              </span>
              <span style="flex:1;font-weight:600">${t.name}</span>
              <span style="font-weight:700;color:#ef4444">${t.count}</span>
              <span style="font-size:0.65rem;color:var(--text-muted)">(${t.pct}%)</span>
            </div>
          `).join('')}
        </div>
        <div class="rf-card" style="padding:14px 18px">
          <div style="font-size:0.75rem;font-weight:700;margin-bottom:8px;color:var(--text-muted)">📊 ALERT TYPES</div>
          ${(d.topTypes || []).map(t => `
            <div class="rf-row">
              <span style="flex:1;font-weight:500">${t.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              <div class="rf-type-bar">
                <div class="rf-type-fill" style="width:${Math.round(t.count / (s.total || 1) * 100)}%"></div>
              </div>
              <span style="font-weight:700;min-width:24px;text-align:right">${t.count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ═══ Fraud Feed Table ═══ -->
      ${(() => {
      const allAlerts = d.alerts || [];
      const totalAlerts = allAlerts.length;
      const totalPages = Math.ceil(totalAlerts / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const startIdx = (currentPage - 1) * pageSize;
      const pageAlerts = allAlerts.slice(startIdx, startIdx + pageSize);
      const showFrom = startIdx + 1;
      const showTo = Math.min(startIdx + pageSize, totalAlerts);

      return `
      <div class="rf-card">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <span style="font-size:0.82rem;font-weight:700">${icon('list', 16)} Fraud Alert Feed (${totalAlerts} alerts)</span>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="display:flex;align-items:center;gap:4px;font-size:0.72rem;color:var(--text-muted)">
              <span>Show</span>
              <select onchange="window._rfPageSize(Number(this.value))" style="border:1px solid var(--border);border-radius:6px;padding:2px 6px;font-size:0.72rem;background:var(--bg-secondary);color:var(--text-primary);cursor:pointer">
                ${[10, 20, 50, 100].map(n => '<option value="' + n + '"' + (n === pageSize ? ' selected' : '') + '>' + n + '</option>').join('')}
              </select>
              <span>/ page</span>
            </div>
            <span style="font-size:0.65rem;color:var(--text-muted)">Updated: ${loadedAt ? new Date(loadedAt).toLocaleTimeString('en-US') : '—'}</span>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="rf-table">
            <thead>
              <tr>
                <th>SEV</th><th>TIME</th><th>ORGANIZATION</th>
                <th>TYPE</th><th>DESCRIPTION</th><th>PRODUCT</th><th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${pageAlerts.map(a => `
                <tr>
                  <td>${SEV_ICON[a.severity] || '⚪'}</td>
                  <td style="color:var(--text-muted);white-space:nowrap">${timeAgo(a.created_at)}</td>
                  <td style="font-weight:600">${a.org_name || '—'}</td>
                  <td><span class="rf-badge">${(a.alert_type || '').replace(/_/g, ' ')}</span></td>
                  <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(a.description || '').replace(/"/g, '&quot;')}">${a.description || '—'}</td>
                  <td style="color:var(--text-muted);font-size:0.72rem">${a.product_name || '—'} <span style="color:var(--text-muted);font-size:0.65rem">${a.sku ? '(' + a.sku + ')' : ''}</span></td>
                  <td><span class="rf-status" style="background:${STATUS_COLOR[a.status] || '#94a3b8'}">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `
        <div style="padding:12px 18px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.72rem;color:var(--text-muted)">Showing ${showFrom}–${showTo} / ${totalAlerts}</span>
          <div style="display:flex;gap:4px;align-items:center">
            <button onclick="window._rfPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} class="rf-pager">← Prev</button>
            ${Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).reduce((acc, p, idx, arr) => {
        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('<span style="color:var(--text-muted);font-size:0.72rem">…</span>');
        acc.push('<button onclick="window._rfPage(' + p + ')" class="rf-pager' + (p === currentPage ? ' rf-pager-active' : '') + '">' + p + '</button>');
        return acc;
      }, []).join('')}
            <button onclick="window._rfPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} class="rf-pager">Next →</button>
          </div>
        </div>
        ` : ''}
      </div>`;
    })()}

    </div>`;
}

function kpi(ic, val, label, color) {
  return `<div class="rf-kpi">
      <div style="font-size:1.4rem">${ic}</div>
      <div class="rf-kpi-val" style="color:${color}">${val}</div>
      <div class="rf-kpi-label">${label}</div>
    </div>`;
}

window._rfRefresh = () => { feedData = null; loadedAt = 0; currentPage = 1; loadFeed(); };
window._rfPage = (p) => { currentPage = Math.max(1, p); { const _el = document.getElementById('risk-feed-root'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; } };
export function renderPage() {
  return `<div id="risk-feed-root">${renderContent()}</div>`;
}

window._rfPageSize = (n) => { pageSize = n; currentPage = 1; { const _el = document.getElementById('risk-feed-root'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; } };
