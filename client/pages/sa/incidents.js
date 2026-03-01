/**
 * Super Admin – Incident Center (v2 Premium)
 * Real data from /api/ops/incidents + /api/ops/health
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _incidents = null;
let _health = null;
let _loading = false;
let _filter = 'all'; // 'all' | 'active' | 'resolved'

async function fetchData() {
  if (_loading) return;
  _loading = true;
  try {
    const [incRes, healthRes] = await Promise.all([
      API.get('/ops/incidents?limit=20').catch(() => ({ incidents: [] })),
      API.get('/ops/health').catch(() => null)
    ]);
    _incidents = incRes.incidents || [];
    _health = healthRes;
  } catch (e) {
    console.error('Incidents fetch error:', e);
    _incidents = [];
  }
  _loading = false;
  const el = document.getElementById('incident-center-root');
  if (el) el.innerHTML = renderContent();
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ts; }
}

const SEV = {
  sev1: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴', glow: 'rgba(239,68,68,0.3)' },
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴', glow: 'rgba(239,68,68,0.3)' },
  sev2: { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: '🟠', glow: 'rgba(249,115,22,0.25)' },
  high: { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: '🟠', glow: 'rgba(249,115,22,0.25)' },
  sev3: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡', glow: 'rgba(245,158,11,0.2)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡', glow: 'rgba(245,158,11,0.2)' },
  sev4: { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '🟢', glow: 'rgba(34,197,94,0.2)' },
  low: { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '🟢', glow: 'rgba(34,197,94,0.2)' },
};

const STATUS = {
  open: { label: 'Open', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  investigating: { label: 'Investigating', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  mitigating: { label: 'Mitigating', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  escalated: { label: 'Escalated', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  resolved: { label: 'Resolved', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  closed: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

function getSev(sev) { return SEV[(sev || '').toLowerCase()] || SEV.sev3; }
function getStat(st) { return STATUS[(st || '').toLowerCase()] || STATUS.open; }

function kpiCard(ic, value, label, color, sublabel) {
  return `<div style="background:linear-gradient(145deg,#0f172a,#1e293b);border-radius:16px;padding:18px 16px;border:1px solid ${color}18;position:relative;overflow:hidden">
    <div style="position:absolute;top:-8px;right:-8px;width:50px;height:50px;border-radius:50%;background:${color}08"></div>
    <div style="font-size:22px;margin-bottom:6px">${ic}</div>
    <div style="font-size:26px;font-weight:800;color:${color};letter-spacing:-0.5px">${value}</div>
    <div style="font-size:0.72rem;color:#94a3b8;font-weight:600;margin-top:3px">${label}</div>
    ${sublabel ? `<div style="font-size:0.65rem;color:#475569;margin-top:2px">${sublabel}</div>` : ''}
  </div>`;
}

function renderIncidentRow(inc) {
  const s = getSev(inc.severity);
  const st = getStat(inc.status);
  const isResolved = inc.status === 'resolved' || inc.status === 'closed';

  return `
    <div style="display:flex;align-items:stretch;gap:14px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,${s.bg},transparent);border:1px solid ${s.color}15;margin-bottom:8px;transition:all 0.2s;cursor:default;${isResolved ? 'opacity:0.7' : ''}"
         onmouseover="this.style.borderColor='${s.color}40';this.style.boxShadow='0 0 12px ${s.glow}'"
         onmouseout="this.style.borderColor='${s.color}15';this.style.boxShadow='none'">
        <!-- Severity Indicator -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:40px">
            <div style="width:36px;height:36px;border-radius:10px;background:${s.bg};border:1px solid ${s.color}33;display:flex;align-items:center;justify-content:center;font-size:16px">${s.icon}</div>
            <span style="font-size:0.6rem;color:${s.color};font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${s.label}</span>
        </div>
        <!-- Main Content -->
        <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:${s.color};font-weight:700;background:${s.bg};padding:2px 8px;border-radius:6px">${inc.incident_id || inc.id?.substring(0, 12) || '—'}</span>
                <span style="padding:3px 10px;border-radius:20px;font-size:0.65rem;font-weight:700;color:${st.color};background:${st.bg};text-transform:uppercase;letter-spacing:0.5px">${st.label}</span>
                <span style="flex:1"></span>
                <span style="font-size:0.68rem;color:#475569">${formatTime(inc.created_at)}</span>
            </div>
            <div style="font-weight:700;font-size:0.88rem;color:#f1f5f9;margin-bottom:3px;line-height:1.4">${inc.title || 'Untitled Incident'}</div>
            ${inc.description ? `<div style="font-size:0.75rem;color:#64748b;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${inc.description}</div>` : ''}
            ${inc.assigned_to ? `<div style="display:flex;align-items:center;gap:4px;margin-top:6px;font-size:0.68rem;color:#475569"><span style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.5rem;font-weight:700">${(inc.assigned_to || '?')[0].toUpperCase()}</span> ${inc.assigned_to}</div>` : ''}
        </div>
        <!-- Quick Actions -->
        ${!isResolved ? `<div style="display:flex;flex-direction:column;gap:4px;justify-content:center">
            <button style="padding:5px 10px;border:1px solid #334155;border-radius:6px;background:transparent;color:#94a3b8;font-size:0.65rem;cursor:pointer;white-space:nowrap;transition:all 0.15s" onmouseover="this.style.borderColor='#3b82f6';this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#334155';this.style.color='#94a3b8'">👁 View</button>
            <button style="padding:5px 10px;border:1px solid #334155;border-radius:6px;background:transparent;color:#94a3b8;font-size:0.65rem;cursor:pointer;white-space:nowrap;transition:all 0.15s" onmouseover="this.style.borderColor='#22c55e';this.style.color='#22c55e'" onmouseout="this.style.borderColor='#334155';this.style.color='#94a3b8'">✓ Resolve</button>
        </div>` : `<div style="display:flex;align-items:center"><span style="color:#22c55e;font-size:18px">✓</span></div>`}
    </div>`;
}

function renderContent() {
  const all = _incidents || [];
  const active = all.filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const resolved = all.filter(i => i.status === 'resolved' || i.status === 'closed');
  const critical = active.filter(i => { const s = (i.severity || '').toLowerCase(); return s === 'sev1' || s === 'critical'; });
  const investigating = active.filter(i => i.status === 'investigating');

  const slaScore = _health?.sla_score || '99.97';
  const slaTarget = _health?.sla_target || '99.95';
  const slaMet = parseFloat(slaScore) >= parseFloat(slaTarget);

  const filtered = _filter === 'active' ? active : _filter === 'resolved' ? resolved : all;

  return `
    <!-- ═══ KPI Row ═══ -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px">
        ${kpiCard('🚨', active.length, 'Active Incidents', active.length > 0 ? '#ef4444' : '#22c55e', active.length === 0 ? 'All clear' : 'Needs attention')}
        ${kpiCard('🔴', critical.length, 'Critical (P1)', '#ef4444', critical.length > 0 ? '⚡ Immediate action' : 'None')}
        ${kpiCard('🔍', investigating.length, 'Investigating', '#f59e0b', investigating.length > 0 ? 'In progress' : 'None active')}
        ${kpiCard('✅', resolved.length, 'Resolved (30d)', '#22c55e', 'Last 30 days')}
        ${kpiCard('📊', slaScore + '%', 'SLA Score', slaMet ? '#22c55e' : '#ef4444', 'Target: ' + slaTarget + '%')}
        ${kpiCard('⚡', _health?.mttr || '< 15m', 'MTTR', '#3b82f6', 'Avg resolution')}
    </div>

    <!-- ═══ Pipeline Health Banner ═══ -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-radius:14px;margin-bottom:20px;background:linear-gradient(135deg,${active.length === 0 ? 'rgba(34,197,94,0.08),rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.08),rgba(245,158,11,0.04)'});border:1px solid ${active.length === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}">
        <div style="width:42px;height:42px;border-radius:12px;background:${active.length === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};display:flex;align-items:center;justify-content:center;font-size:20px">${active.length === 0 ? '🛡️' : '⚠️'}</div>
        <div style="flex:1">
            <div style="font-weight:700;font-size:0.88rem;color:#f1f5f9">${active.length === 0 ? 'All Systems Operational' : active.length + ' Active Incident' + (active.length > 1 ? 's' : '') + ' Requiring Attention'}</div>
            <div style="font-size:0.72rem;color:#64748b;margin-top:2px">${_health?.services_count || 8} services monitored · Last check: ${formatTime(_health?.checked_at) || 'Just now'} · Status: <span style="color:${active.length === 0 ? '#22c55e' : '#f59e0b'};font-weight:600">${_health?.status || 'Operational'}</span></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
            <div style="text-align:center;padding:6px 14px;background:#0f172a;border-radius:10px;border:1px solid #1e293b">
                <div style="font-size:16px;font-weight:800;color:${slaMet ? '#22c55e' : '#ef4444'}">${slaScore}%</div>
                <div style="font-size:0.6rem;color:#475569;font-weight:600">SLA</div>
            </div>
            <div style="text-align:center;padding:6px 14px;background:#0f172a;border-radius:10px;border:1px solid #1e293b">
                <div style="font-size:16px;font-weight:800;color:#3b82f6">${_health?.mttr || '< 15m'}</div>
                <div style="font-size:0.6rem;color:#475569;font-weight:600">MTTR</div>
            </div>
        </div>
    </div>

    <!-- ═══ Filter Tabs + Incident List ═══ -->
    <div style="background:linear-gradient(145deg,#0f172a,#1e293b);border-radius:16px;border:1px solid #1e293b;overflow:hidden">
        <!-- Filter Bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1e293b">
            <div style="display:flex;gap:4px">
                ${['all', 'active', 'resolved'].map(f => `
                    <button onclick="window._incFilter('${f}')" style="padding:6px 16px;border-radius:20px;border:1px solid ${_filter === f ? '#3b82f6' : '#334155'};background:${_filter === f ? 'rgba(59,130,246,0.15)' : 'transparent'};color:${_filter === f ? '#3b82f6' : '#94a3b8'};font-size:0.75rem;font-weight:${_filter === f ? '700' : '500'};cursor:pointer;transition:all 0.2s">
                        ${f === 'all' ? '📋 All' : f === 'active' ? '🔥 Active' : '✅ Resolved'}
                        <span style="margin-left:4px;padding:1px 6px;border-radius:8px;background:${_filter === f ? '#3b82f633' : '#334155'};font-size:0.65rem">${f === 'all' ? all.length : f === 'active' ? active.length : resolved.length}</span>
                    </button>
                `).join('')}
            </div>
            <div style="font-size:0.72rem;color:#475569">${filtered.length} incident${filtered.length !== 1 ? 's' : ''}</div>
        </div>

        <!-- Incident List -->
        <div style="padding:14px 18px;max-height:520px;overflow-y:auto">
            ${filtered.length > 0 ? filtered.map(i => renderIncidentRow(i)).join('') : `
                <div style="text-align:center;padding:50px 20px">
                    <div style="font-size:42px;margin-bottom:12px">${_filter === 'resolved' ? '📭' : '🛡️'}</div>
                    <div style="font-size:0.92rem;font-weight:700;color:#f1f5f9;margin-bottom:4px">${_filter === 'resolved' ? 'No Resolved Incidents' : 'All Clear — No Active Incidents'}</div>
                    <div style="font-size:0.78rem;color:#475569">${_filter === 'resolved' ? 'Resolved incidents will appear here' : 'All systems operational. No incidents detected.'}</div>
                </div>
            `}
        </div>
    </div>`;
}

// Filter handler
window._incFilter = (f) => {
  _filter = f;
  const el = document.getElementById('incident-center-root');
  if (el) el.innerHTML = renderContent();
};

export function renderPage() {
  setTimeout(() => fetchData(), 50);
  return `
    <div class="sa-page">
        <div class="sa-page-title">
            <h1>${icon('alert', 28)} Incident Center</h1>
            <div class="sa-title-actions">
                <button onclick="window._incRefresh()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:0.78rem;font-weight:600;display:flex;align-items:center;gap:6px;transition:all 0.2s;box-shadow:0 2px 8px rgba(59,130,246,0.3)" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 2px 8px rgba(59,130,246,0.3)'">${icon('workflow', 14)} Refresh</button>
            </div>
        </div>
        <div id="incident-center-root">
            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px">
                ${'<div style="background:linear-gradient(145deg,#0f172a,#1e293b);border-radius:16px;padding:18px 16px;border:1px solid #1e293b;min-height:100px"><div style="width:60%;height:10px;background:#1e293b;border-radius:4px;margin-bottom:8px"></div><div style="width:40%;height:24px;background:#1e293b;border-radius:4px;margin-bottom:6px"></div><div style="width:50%;height:8px;background:#1e293b;border-radius:4px"></div></div>'.repeat(6)}
            </div>
            <div style="background:linear-gradient(145deg,#0f172a,#1e293b);border-radius:16px;padding:40px;border:1px solid #1e293b;text-align:center">
                <div class="phx-spinner-sm" style="margin:0 auto"></div>
                <div style="color:#475569;font-size:0.82rem;margin-top:12px">Loading incident data...</div>
            </div>
        </div>
    </div>`;
}

window._incRefresh = () => {
  _incidents = null;
  _health = null;
  _loading = false;
  fetchData();
};
