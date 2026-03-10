/** Risk – Dashboard — Premium redesign with high-contrast labels, sparklines, interactive alerts */
import { icon } from '../../core/icons.js';
import { State, render } from '../../core/state.js';

let _alertFilter = null; // null = all

/* ── Color system ──────────────────────────────── */
const SRC_COLORS = {
  leak: { bg: '#FEE2E2', text: '#991B1B', icon: '🔓' },
  sla: { bg: '#FEF3C7', text: '#92400E', icon: '⏱️' },
  anomaly: { bg: '#DBEAFE', text: '#1E40AF', icon: '⚡' },
  fraud: { bg: '#F3E8FF', text: '#6B21A8', icon: '🛡️' },
};
const SEV_COLORS = {
  critical: { bg: '#DC2626', text: '#fff' },
  high: { bg: '#EF4444', text: '#fff' },
  medium: { bg: '#F59E0B', text: '#fff' },
  low: { bg: '#9CA3AF', text: '#fff' },
};
function srcPill(source) {
  const s = source?.toLowerCase() || '';
  const c = SRC_COLORS[s] || { bg: '#F1F5F9', text: '#475569', icon: '📋' };
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:0.72rem;font-weight:700;background:${c.bg};color:${c.text};letter-spacing:0.02em">${c.icon} ${source || '—'}</span>`;
}
function sevPill(severity) {
  const c = SEV_COLORS[severity] || SEV_COLORS.low;
  return `<span style="padding:2px 10px;border-radius:6px;font-size:0.65rem;font-weight:700;background:${c.bg};color:${c.text};text-transform:uppercase;letter-spacing:0.04em">${severity || '—'}</span>`;
}

/* ── Mini sparkline SVG ──────────────────────────── */
function sparkline(data, color = '#6366f1', w = 80, h = 24) {
  if (!data || data.length < 2) return '';
  const vals = data.map(d => d.count || d.total || d.value || 0);
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ');
  return `<svg width="${w}" height="${h}" style="display:block;margin-top:4px"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ── Heatmap bar color ──────────────────────────── */
function heatColor(sc) {
  if (sc > 70) return '#EF4444';
  if (sc > 50) return '#F97316';
  if (sc > 30) return '#F59E0B';
  if (sc > 15) return '#84CC16';
  return '#22C55E';
}
function heatLabel(sc) {
  if (sc > 70) return { text: 'CRITICAL', bg: '#FEE2E2', fg: '#991B1B' };
  if (sc > 50) return { text: 'HIGH', bg: '#FFEDD5', fg: '#9A3412' };
  if (sc > 30) return { text: 'MEDIUM', bg: '#FEF3C7', fg: '#92400E' };
  return { text: 'LOW', bg: '#DCFCE7', fg: '#166534' };
}

/* ── Time helper ──────────────────────────── */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function renderPage() {
  /* Show loading spinner on first render before API data arrives */
  if (!State._riskData) {
    return `<div class="sa-page" style="display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:16px">
      <div style="width:48px;height:48px;border:4px solid #E5E7EB;border-top-color:#6366F1;border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <p style="color:var(--text-secondary);font-size:0.85rem">Loading Risk Dashboard…</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;
  }
  const D = State._riskData || {};
  const alerts = D.alerts?.alerts || [];
  const heatmap = D.heatmap?.regions || D.heatmap?.heatmap || [];
  const trends = D.trends || {};

  const openAlerts = alerts.filter(a => a.status === 'open').length;
  const critAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const regionCount = heatmap.length;
  const hotZones = heatmap.filter(r => (r.heat_score || r.risk_score || 0) > 70).length;
  const fraudTrend = trends.fraud_alerts || [];
  const leakTrend = trends.leak_alerts || [];
  const slaTrend = trends.sla_violations || [];

  // Source counts for filter
  const sources = [...new Set(alerts.map(a => a.source).filter(Boolean))];
  const filtered = _alertFilter ? alerts.filter(a => a.source === _alertFilter) : alerts;

  // Trend direction
  const trendDir = (arr) => {
    if (!arr || arr.length < 2) return '';
    const last = arr[arr.length - 1]?.count || 0;
    const prev = arr[arr.length - 2]?.count || 0;
    if (last > prev) return '<span style="color:#EF4444;font-weight:700">↑</span>';
    if (last < prev) return '<span style="color:#22C55E;font-weight:700">↓</span>';
    return '<span style="color:#9CA3AF">→</span>';
  };

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('shield', 28)} Risk Dashboard</h1>
      <div class="sa-title-actions" style="display:flex;align-items:center;gap:12px">
        <span style="font-size:0.7rem;color:var(--text-secondary)">Last updated: ${now}</span>
        <span class="ops-live-dot"></span><span style="font-size:0.75rem;color:#22c55e;font-weight:600">LIVE</span>
      </div>
    </div>

    <!-- KPI Cards with Sparklines -->
    <div class="sa-metrics-row">
      ${kpi('Active Alerts', openAlerts, `${alerts.length} total`, openAlerts > 5 ? '#EF4444' : '#22C55E', 'alert', sparkline(fraudTrend, openAlerts > 5 ? '#EF4444' : '#22C55E'), trendDir(fraudTrend))}
      ${kpi('Critical / High', critAlerts, critAlerts > 0 ? 'Requires attention' : 'All clear', critAlerts > 0 ? '#F59E0B' : '#22C55E', 'alertTriangle', sparkline(slaTrend, '#F59E0B'), trendDir(slaTrend))}
      ${kpi('Risk Regions', regionCount, `${hotZones} hot zone${hotZones !== 1 ? 's' : ''}`, '#6366F1', 'globe', '', '')}
      ${kpi('Fraud Signals', fraudTrend.reduce((s, d) => s + (d.count || 0), 0), `${leakTrend.reduce((s, d) => s + (d.count || 0), 0)} leak signals`, '#8B5CF6', 'search', sparkline(leakTrend, '#8B5CF6'), trendDir(leakTrend))}
    </div>

    <div class="sa-grid-2col">
      <!-- Recent Alerts with Filter -->
      <div class="sa-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
          <h3 style="margin:0">Recent Alerts</h3>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <span onclick="window._riskDashFilter(null)" style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:0.65rem;font-weight:600;background:${!_alertFilter ? '#6366F1' : '#F1F5F9'};color:${!_alertFilter ? '#fff' : '#64748B'}">All</span>
            ${sources.map(s => {
    const c = SRC_COLORS[s?.toLowerCase()] || { bg: '#F1F5F9', text: '#475569' };
    return `<span onclick="window._riskDashFilter('${s}')" style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:0.65rem;font-weight:600;background:${_alertFilter === s ? c.text : c.bg};color:${_alertFilter === s ? '#fff' : c.text}">${s}</span>`;
  }).join('')}
          </div>
        </div>
        ${filtered.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No alerts</p>' :
      filtered.slice(0, 8).map(a => `<div class="rd-alert-row" style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-bottom:1px solid rgba(0,0,0,0.04);cursor:pointer;border-radius:6px;transition:background 0.15s">
            ${srcPill(a.source || a.alert_type)}
            <span style="flex:1;font-size:0.8rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.description?.slice(0, 45) || '—'}</span>
            ${sevPill(a.severity)}
            <span style="font-size:0.6rem;color:var(--text-secondary);min-width:40px;text-align:right">${timeAgo(a.created_at)}</span>
          </div>`).join('')}
      </div>

      <!-- Risk Heatmap with Progress Bars -->
      <div class="sa-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem">
          <h3 style="margin:0">Risk Heatmap</h3>
          <span style="font-size:0.7rem;color:var(--text-secondary)">${regionCount} regions · ${hotZones} hot</span>
        </div>
        ${heatmap.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:2rem">No heatmap data</p>' :
      heatmap.slice(0, 8).map(r => {
        const sc = r.heat_score || r.risk_score || r.score || 0;
        const hc = heatColor(sc);
        const hl = heatLabel(sc);
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.04)">
              <span style="font-weight:700;min-width:60px;font-size:0.85rem">${r.region || r.country || '—'}</span>
              <div style="flex:1;position:relative">
                <div style="background:#F1F5F9;border-radius:6px;height:10px;overflow:hidden">
                  <div style="height:100%;width:${Math.min(100, sc)}%;background:linear-gradient(90deg,${hc}cc,${hc});border-radius:6px;transition:width 0.4s ease"></div>
                </div>
              </div>
              <span style="font-weight:800;font-size:0.8rem;color:${hc};min-width:36px;text-align:right">${sc.toFixed?.(0) || 0}%</span>
              <span style="padding:1px 6px;border-radius:4px;font-size:0.55rem;font-weight:700;background:${hl.bg};color:${hl.fg};min-width:48px;text-align:center">${hl.text}</span>
            </div>`;
      }).join('')}
      </div>
    </div>
  </div>`;
}

/* ── KPI card with sparkline ─────────────────── */
function kpi(label, value, sub, color, iconName, spark, trend) {
  return `<div class="sa-metric-card" style="border-top:3px solid ${color};position:relative">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div class="sa-metric-icon" style="color:${color}">${icon(iconName, 22)}</div>
      ${spark ? `<div style="opacity:0.7">${spark}</div>` : ''}
    </div>
    <div class="sa-metric-body">
      <div class="sa-metric-value" style="display:flex;align-items:center;gap:6px">${value} ${trend || ''}</div>
      <div class="sa-metric-label">${label}</div>
      <div class="sa-metric-sub">${sub}</div>
    </div>
  </div>`;
}

/* ── Hover styles (inject once) ──────────────── */
if (typeof window !== 'undefined') {
  if (!document.getElementById('rd-hover-css')) {
    const st = document.createElement('style');
    st.id = 'rd-hover-css';
    st.textContent = `.rd-alert-row:hover{background:rgba(99,102,241,0.06)!important}`;
    document.head.appendChild(st);
  }
  window._riskDashFilter = function (source) {
    _alertFilter = source;
    render();
  };
}
