/**
 * Ops – Activity Log (Team Audit Trail)
 * ═══════════════════════════════════════
 * Premium timeline design with human-readable summaries,
 * working filters, and pagination.
 * Reads from /api/ops/data/activity-log (audit_log table)
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let _activities = null;
let _filter = 'all';
let _page = 0;
const PAGE_SIZE = 15;

async function loadActivities() {
  if (_activities) return _activities;
  try {
    const res = await API.get('/ops/data/activity-log');
    _activities = (res.activities || []).map(a => {
      const d = parseDetails(a.details);
      return {
        action: a.action || '',
        entityType: a.entity_type || '',
        entityId: a.entity_id || '',
        actorId: a.actor_id || 'system',
        detail: d,
        time: a.timestamp,
        type: actionType(a.action),
      };
    });
    if (typeof window.render === 'function') window.render();
    return _activities;
  } catch (e) {
    _activities = [];
    if (typeof window.render === 'function') window.render();
    return [];
  }
}

loadActivities();

/* ─── Helpers ──────────────────────────────────────────────── */
function parseDetails(details) {
  if (!details) return {};
  if (typeof details === 'string') {
    try { return JSON.parse(details); } catch { return {}; }
  }
  return details;
}

function actionType(action) {
  if (!action) return 'system';
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('auth') || a.includes('register')) return 'auth';
  if (a.includes('notify') || a.includes('broadcast')) return 'notify';
  if (a.includes('create') || a.includes('batch_created') || a.includes('generate')) return 'create';
  if (a.includes('confirm') || a.includes('transfer_confirmed')) return 'confirm';
  if (a.includes('approve') || a.includes('qc_') || a.includes('kyc')) return 'approve';
  if (a.includes('escalat') || a.includes('critical') || a.includes('recall')) return 'critical';
  if (a.includes('update') || a.includes('split') || a.includes('modify') || a.includes('config')) return 'modify';
  if (a.includes('mismatch') || a.includes('warning') || a.includes('breach')) return 'warning';
  if (a.includes('export') || a.includes('report') || a.includes('download')) return 'export';
  if (a.includes('scan') || a.includes('qr')) return 'scan';
  if (a.includes('delete') || a.includes('remove')) return 'delete';
  return 'system';
}

const META = {
  auth:     { icon: 'shield',      color: '#6366f1', bg: 'rgba(99,102,241,0.08)', label: 'Auth' },
  notify:   { icon: 'bell',        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Notification' },
  create:   { icon: 'filePlus',    color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  label: 'Created' },
  confirm:  { icon: 'checkCircle', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'Confirmed' },
  approve:  { icon: 'check',       color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Approved' },
  critical: { icon: 'alertTriangle',color:'#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Critical' },
  modify:   { icon: 'edit',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'Updated' },
  warning:  { icon: 'alertTriangle',color:'#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Warning' },
  export:   { icon: 'download',    color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',  label: 'Export' },
  scan:     { icon: 'search',      color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', label: 'Scan' },
  delete:   { icon: 'x',           color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Deleted' },
  system:   { icon: 'settings',    color: '#64748b', bg: 'rgba(100,116,139,0.08)',label: 'System' },
};

function humanAction(a) {
  const act = a.action;
  const d = a.detail || {};
  const actLower = act.toLowerCase();

  // Auth events
  if (actLower === 'new_ip_login') return { title: 'New IP Address Login', desc: d.message || `Login from ${d.new_ip || 'unknown IP'}` };
  if (actLower.includes('login')) return { title: 'User Login', desc: d.message || 'Session started' };
  if (actLower.includes('register')) return { title: 'Account Created', desc: d.message || 'New user registered' };
  if (actLower.includes('password')) return { title: 'Password Changed', desc: 'Security credentials updated' };

  // Notifications
  if (actLower.startsWith('notify_critical')) return { title: d.title || 'Critical Alert', desc: d.message || 'Critical notification sent' };
  if (actLower.startsWith('notify_warning')) return { title: d.title || 'Warning Alert', desc: d.message || 'Warning notification sent' };
  if (actLower.startsWith('notify_success')) return { title: d.title || 'Success', desc: d.message || 'Success notification' };
  if (actLower.startsWith('notify_info')) return { title: d.title || 'Information', desc: d.message || 'Info notification' };
  if (actLower.startsWith('notify_')) return { title: d.title || 'Notification', desc: d.message || '' };

  // Financial
  if (actLower.includes('financial_config')) return { title: 'Financial Config Updated', desc: `Revenue: $${fmt(d.annual_revenue)} · Industry: ${d.industry_type || '—'}` };

  // GDPR
  if (actLower.includes('gdpr') || actLower.includes('data_export')) return { title: 'Data Export', desc: `${d.records_exported || '—'} records exported` };

  // KYC
  if (actLower.includes('kyc')) return { title: 'KYC Verification', desc: d.message || `Verification for ${a.entityType || 'entity'}` };

  // Batches
  if (actLower.includes('batch_created')) return { title: 'Batch Created', desc: d.batch_id ? `Batch ${shortId(d.batch_id)}` : 'New production batch' };
  if (actLower.includes('batch_split')) return { title: 'Batch Split', desc: d.message || 'Batch subdivided' };

  // Transfers
  if (actLower.includes('transfer')) return { title: 'Transfer', desc: d.message || `${d.from || ''} → ${d.to || ''}`.trim() || 'Stock transfer processed' };

  // QC
  if (actLower.includes('qc_')) return { title: 'Quality Check', desc: d.result || d.message || 'QC inspection completed' };

  // Scans
  if (actLower.includes('scan') || actLower.includes('qr_scanned')) return { title: 'QR Scan', desc: d.product || d.message || 'Product verification scan' };

  // Incidents
  if (actLower.includes('incident') || actLower.includes('recall')) return { title: 'Incident', desc: d.title || d.message || 'Incident recorded' };

  // Config
  if (actLower.includes('config') || actLower.includes('setting')) return { title: 'Configuration Updated', desc: d.message || summarizeConfig(d) };

  // Fallback — format the action name nicely
  const niceAction = act.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { title: niceAction, desc: d.title || d.message || d.summary || '' };
}

function summarizeConfig(d) {
  const keys = Object.keys(d).filter(k => d[k] !== null && d[k] !== undefined && d[k] !== '');
  if (!keys.length) return 'Settings modified';
  return keys.slice(0, 3).map(k => k.replace(/_/g, ' ')).join(', ') + ' updated';
}

function shortId(id) { return id ? id.slice(0, 8) : '—'; }
function fmt(n) { return n ? Number(n).toLocaleString() : '—'; }

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Filter + Pagination handlers ────────────────────────── */
window._actLogFilter = function (f) {
  _filter = f;
  _page = 0;
  if (typeof window.render === 'function') window.render();
};
window._actLogPage = function (p) {
  _page = p;
  if (typeof window.render === 'function') window.render();
  // Scroll to top of content
  document.querySelector('.sa-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ─── Render ──────────────────────────────────────────────── */
export function renderPage() {
  const all = _activities || [];
  const filters = [
    { key: 'all',      label: 'All',         icon: '' },
    { key: 'auth',     label: 'Auth',        icon: '🔐' },
    { key: 'notify',   label: 'Alerts',      icon: '🔔' },
    { key: 'critical', label: 'Critical',    icon: '🚨' },
    { key: 'modify',   label: 'Changes',     icon: '✏️' },
    { key: 'create',   label: 'Created',     icon: '➕' },
    { key: 'scan',     label: 'Scans',       icon: '📷' },
    { key: 'export',   label: 'Exports',     icon: '📥' },
  ];

  const filtered = _filter === 'all' ? all : all.filter(a => a.type === _filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page = Math.min(_page, totalPages - 1);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Count per filter
  const counts = {};
  filters.forEach(f => { counts[f.key] = f.key === 'all' ? all.length : all.filter(a => a.type === f.key).length; });

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('scroll', 28)} Activity Log</h1>
        <div class="sa-title-actions">
          <button class="btn btn-outline btn-sm" onclick="(function(){try{const rows=document.querySelectorAll('.sa-page table tbody tr');if(!rows.length){showToast('No data to export','warning');return};const hdr='Time,User,Action,Target,Details';const csv=[hdr,...[...rows].map(r=>[...r.cells].map(c=>'&quot;'+c.textContent.trim().replace(/&quot;/g,'&quot;&quot;')+'&quot;').join(','))].join('\\n');const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='activity-log-'+new Date().toISOString().slice(0,10)+'.csv';a.click();showToast('✅ Activity log exported','success')}catch(e){showToast('Export failed','error')}})()">
            ${icon('download', 14)} Export
          </button>
        </div>
      </div>

      <!-- Stats bar -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:1.5rem">
        <div style="background:var(--card-bg);border-radius:10px;padding:14px 16px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
          <div style="font-size:1.5rem;font-weight:700;color:var(--text-primary)">${all.length}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">Total Events</div>
        </div>
        <div style="background:var(--card-bg);border-radius:10px;padding:14px 16px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
          <div style="font-size:1.5rem;font-weight:700;color:#ef4444">${counts.critical || 0}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">Critical</div>
        </div>
        <div style="background:var(--card-bg);border-radius:10px;padding:14px 16px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
          <div style="font-size:1.5rem;font-weight:700;color:#6366f1">${counts.auth || 0}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">Auth Events</div>
        </div>
        <div style="background:var(--card-bg);border-radius:10px;padding:14px 16px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
          <div style="font-size:1.5rem;font-weight:700;color:#22c55e">${counts.create || 0}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">Created</div>
        </div>
      </div>

      <!-- Filters -->
      <div style="display:flex;gap:6px;margin-bottom:1.5rem;flex-wrap:wrap">
        ${filters.map(f => {
          const isActive = _filter === f.key;
          const count = counts[f.key];
          return `<button style="padding:4px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid ${isActive ? '#0d9488' : 'var(--border-color,rgba(0,0,0,0.1))'};background:${isActive ? '#0d9488' : 'transparent'};color:${isActive ? '#fff' : 'var(--text-primary)'};${!isActive ? 'opacity:0.8;' : ''}${count === 0 && f.key !== 'all' ? 'opacity:0.4;' : ''}"
            onclick="window._actLogFilter('${f.key}')">
            ${f.icon ? f.icon + ' ' : ''}${f.label}${count > 0 ? ` <span style="font-size:0.65rem;opacity:0.7;margin-left:2px">${count}</span>` : ''}
          </button>`;
        }).join('')}
      </div>

      ${_activities === null ? loadingState() : filtered.length === 0 ? emptyState() : `
      <!-- Timeline -->
      <div style="display:flex;flex-direction:column;gap:0">
        ${paged.map((a, i) => renderActivity(a, i, paged.length)).join('')}
      </div>

      <!-- Pagination -->
      ${totalPages > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;padding:12px 0">
        <span style="font-size:0.75rem;color:var(--text-secondary)">
          Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}
        </span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-ghost" ${page === 0 ? 'disabled style="opacity:0.3"' : ''}
            onclick="window._actLogPage(${page - 1})">← Prev</button>
          ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = totalPages <= 5 ? i : page <= 2 ? i : page >= totalPages - 3 ? totalPages - 5 + i : page - 2 + i;
            return `<button style="min-width:32px;padding:4px 8px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid ${p === page ? '#0d9488' : 'transparent'};background:${p === page ? '#0d9488' : 'transparent'};color:${p === page ? '#fff' : 'var(--text-primary)'}"
              onclick="window._actLogPage(${p})">${p + 1}</button>`;
          }).join('')}
          <button class="btn btn-sm btn-ghost" ${page >= totalPages - 1 ? 'disabled style="opacity:0.3"' : ''}
            onclick="window._actLogPage(${page + 1})">Next →</button>
        </div>
      </div>` : ''}
      `}
    </div>
  `;
}

function renderActivity(a, i, total) {
  const m = META[a.type] || META.system;
  const h = humanAction(a);
  const isLast = i === total - 1;

  return `
    <div style="display:flex;gap:16px;position:relative">
      <!-- Timeline line -->
      ${!isLast ? `<div style="position:absolute;left:18px;top:44px;bottom:0;width:2px;background:var(--border-color,rgba(0,0,0,0.06))"></div>` : ''}
      
      <!-- Icon -->
      <div style="width:36px;height:36px;border-radius:10px;background:${m.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1;border:2px solid var(--card-bg,#fff)">
        ${icon(m.icon, 16, m.color)}
      </div>

      <!-- Content -->
      <div style="flex:1;padding-bottom:${isLast ? '0' : '20px'};min-width:0">
        <div style="background:var(--card-bg);border-radius:10px;padding:14px 18px;border:1px solid var(--border-color,rgba(0,0,0,0.06));transition:box-shadow 0.15s" 
          onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow=''">
          
          <!-- Header row -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:8px;min-width:0">
              <span style="font-weight:600;font-size:0.85rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.title}</span>
              <span style="font-size:0.6rem;padding:2px 7px;border-radius:6px;background:${m.bg};color:${m.color};font-weight:600;white-space:nowrap">${m.label.toUpperCase()}</span>
            </div>
            <span style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap;flex-shrink:0" title="${formatDate(a.time)}">${timeAgo(a.time)}</span>
          </div>

          <!-- Description -->
          ${h.desc ? `<div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5;margin-top:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${h.desc}</div>` : ''}

        </div>
      </div>
    </div>
  `;
}

function loadingState() {
  return `<div style="text-align:center;padding:4rem">
    <div class="sa-spinner" style="margin:0 auto 12px"></div>
    <div style="color:var(--text-secondary);font-size:0.85rem">Loading activity log…</div>
  </div>`;
}

function emptyState() {
  return `<div style="text-align:center;padding:4rem;color:var(--text-secondary)">
    <div style="font-size:2.5rem;margin-bottom:12px;opacity:0.5">📋</div>
    <div style="font-size:0.9rem;font-weight:500">No matching activities</div>
    <div style="font-size:0.75rem;margin-top:4px;color:var(--text-muted)">Try changing filters or check back later</div>
  </div>`;
}
