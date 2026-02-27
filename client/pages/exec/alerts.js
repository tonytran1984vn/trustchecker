/**
 * Executive – Intelligence Alerts (Dedicated Page)
 * ═══════════════════════════════════════════════════
 * Deep view: all alerts, severity distribution, filter/search, timeline
 * API: /owner/ccs/alerts
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _data = null;
let _filter = { severity: '', type: '', search: '' };
let _page = 0;
const PAGE_SIZE = 10;

export function renderPage() {
    if (!_data) { loadData(); return loadingState(); }
    const alerts = _data.alerts || [];

    // Severity distribution
    const dist = { critical: 0, high: 0, medium: 0, low: 0 };
    const types = { fraud: 0, anomaly: 0, trust_drop: 0 };
    alerts.forEach(a => { dist[a.severity] = (dist[a.severity] || 0) + 1; types[a.type] = (types[a.type] || 0) + 1; });

    // Filtered
    const filtered = alerts.filter(a => {
        if (_filter.severity && a.severity !== _filter.severity) return false;
        if (_filter.type && a.type !== _filter.type) return false;
        if (_filter.search && !a.title.toLowerCase().includes(_filter.search.toLowerCase()) && !a.description.toLowerCase().includes(_filter.search.toLowerCase())) return false;
        return true;
    });
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(_page * PAGE_SIZE, (_page + 1) * PAGE_SIZE);

    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('bell', 28)} Intelligence Alerts</h1>
        <div class="exec-timestamp">${alerts.length} total alerts · Real-time monitoring</div>
      </div>

      <!-- Severity Distribution -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Alert Distribution</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1rem">
          ${sevCard('Critical', dist.critical, '#dc2626', alerts.length)}
          ${sevCard('High', dist.high, '#ef4444', alerts.length)}
          ${sevCard('Medium', dist.medium, '#f59e0b', alerts.length)}
          ${sevCard('Low', dist.low, '#22c55e', alerts.length)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${typeCard('🚨 Fraud Alerts', types.fraud, alerts.length)}
          ${typeCard('📈 Anomaly Spikes', types.anomaly, alerts.length)}
          ${typeCard('📉 Trust Drops', types.trust_drop, alerts.length)}
        </div>
      </section>

      <!-- Filter & Search -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('search', 20)} Alert Feed</h2>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem">
          <input type="text" placeholder="Search alerts..."
                 value="${_filter.search}"
                 oninput="window.__alertFilter('search', this.value)"
                 style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:0.82rem;flex:1;min-width:200px">
          <select onchange="window.__alertFilter('severity', this.value)"
                  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:0.82rem">
            <option value="" ${!_filter.severity ? 'selected' : ''}>All Severity</option>
            <option value="critical" ${_filter.severity === 'critical' ? 'selected' : ''}>Critical</option>
            <option value="high" ${_filter.severity === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${_filter.severity === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${_filter.severity === 'low' ? 'selected' : ''}>Low</option>
          </select>
          <select onchange="window.__alertFilter('type', this.value)"
                  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:0.82rem">
            <option value="" ${!_filter.type ? 'selected' : ''}>All Types</option>
            <option value="fraud" ${_filter.type === 'fraud' ? 'selected' : ''}>Fraud</option>
            <option value="anomaly" ${_filter.type === 'anomaly' ? 'selected' : ''}>Anomaly</option>
            <option value="trust_drop" ${_filter.type === 'trust_drop' ? 'selected' : ''}>Trust Drop</option>
          </select>
        </div>

        <!-- Alert List -->
        ${paged.length > 0 ? paged.map(a => alertRow(a)).join('') : '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">No alerts match your filters</div>'}

        <!-- Pagination -->
        ${totalPages > 1 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;font-size:0.8rem">
          <span style="opacity:0.5">${filtered.length} alerts · Page ${_page + 1} of ${totalPages}</span>
          <div style="display:flex;gap:0.5rem">
            <button onclick="window.__alertPage(-1)" ${_page === 0 ? 'disabled' : ''} style="padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e2e8f0;cursor:pointer;font-size:0.78rem">← Prev</button>
            <button onclick="window.__alertPage(1)" ${_page >= totalPages - 1 ? 'disabled' : ''} style="padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e2e8f0;cursor:pointer;font-size:0.78rem">Next →</button>
          </div>
        </div>` : ''}
      </section>

      <!-- Alert Timeline -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('clock', 20)} Alert Timeline</h2>
        <div style="position:relative;padding-left:24px;border-left:2px solid rgba(109,40,217,0.2)">
          ${alerts.slice(0, 15).map(a => {
        const sevColors = { critical: '#dc2626', high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
        const c = sevColors[a.severity] || '#888';
        return `
            <div style="position:relative;margin-bottom:16px;padding-left:20px">
              <div style="position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:${c};border:2px solid rgba(10,10,26,0.8)"></div>
              <div style="font-size:0.68rem;opacity:0.4;margin-bottom:2px">${a.timestamp ? timeAgo(a.timestamp) : ''}</div>
              <div style="font-weight:600;font-size:0.82rem">${a.title}</div>
              <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">${a.description}</div>
            </div>`;
    }).join('')}
        </div>
      </section>
    </div>
  `;
}

function sevCard(label, count, color, total) {
    const pct = total > 0 ? Math.round(count / total * 100) : 0;
    return `
    <div style="background:linear-gradient(135deg,${color}12,${color}05);border:1px solid ${color}30;border-radius:12px;padding:16px;text-align:center">
      <div style="font-size:1.5rem;font-weight:800;color:${color}">${count}</div>
      <div style="font-size:0.72rem;font-weight:600;margin-top:2px">${label}</div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
      </div>
      <div style="font-size:0.6rem;opacity:0.4;margin-top:4px">${pct}% of total</div>
    </div>`;
}

function typeCard(label, count, total) {
    return `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:1.2rem;font-weight:700">${count}</div>
      <div style="font-size:0.72rem;opacity:0.5;margin-top:2px">${label}</div>
    </div>`;
}

function alertRow(a) {
    const sevColors = { critical: '#dc2626', high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    const sevBg = { critical: 'rgba(220,38,38,0.08)', high: 'rgba(239,68,68,0.06)', medium: 'rgba(245,158,11,0.06)', low: 'rgba(34,197,94,0.06)' };
    const typeIcons = { fraud: '🚨', anomaly: '📈', trust_drop: '📉' };
    const c = sevColors[a.severity] || '#888';
    return `
    <div style="background:${sevBg[a.severity] || 'transparent'};border:1px solid ${c}20;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:1.2rem;flex-shrink:0;margin-top:2px">${typeIcons[a.type] || '⚠️'}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div style="font-weight:600;font-size:0.85rem">${a.title}</div>
          <span style="flex-shrink:0;font-size:0.6rem;font-weight:600;padding:2px 8px;border-radius:10px;background:${c}18;color:${c};text-transform:uppercase">${a.severity}</span>
        </div>
        <div style="font-size:0.75rem;opacity:0.6;margin-top:4px">${a.description}</div>
        <div style="font-size:0.65rem;opacity:0.35;margin-top:4px">${a.timestamp ? timeAgo(a.timestamp) : ''} · ${a.type.replace('_', ' ')}</div>
      </div>
    </div>`;
}

function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

async function loadData() {
    try {
        const r = await api.get('/tenant/owner/ccs/alerts');
        _data = r;
        window.__alertFilter = (key, val) => { _filter[key] = val; _page = 0; rerender(); };
        window.__alertPage = (dir) => { _page = Math.max(0, _page + dir); rerender(); };
        rerender();
    } catch (e) { console.error('[Alerts]', e); }
}

function rerender() {
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
}

function loadingState() {
    return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading intelligence alerts...</div></div></div>`;
}
