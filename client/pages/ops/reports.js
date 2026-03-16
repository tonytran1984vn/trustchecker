/**
 * Ops – Reports & Export (Premium Design)
 * ═══════════════════════════════════════════
 * Clean report cards, quick export grid, and generated reports table.
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

const ACCENT = '#0d9488';

// Real CSV export function
window._opsExportCSV = async function(type) {
  showToast('📥 Preparing export…', 'info');
  try {
    let rows = [], headers = [];
    if (type === 'batch') {
      const res = await API.get('/ops/data/batches?limit=200');
      headers = ['Batch ID','Product','Status','Origin','Created'];
      rows = (res.batches||[]).map(b => [b.batch_number, b.product_name||b.product_id, b.status, b.origin||'—', b.created_at?.slice(0,10)||'—']);
    } else if (type === 'shipment') {
      const res = await API.get('/ops/data/shipments?limit=200');
      headers = ['Batch','Carrier','Origin','Destination','Status','ETA'];
      rows = (res.shipments||[]).map(s => [s.batch_id, s.carrier, s.origin, s.destination, s.status, s.eta?.slice(0,10)||'—']);
    } else if (type === 'scan') {
      const res = await API.get('/ops/data/anomaly-summary');
      headers = ['Type','Count','Period'];
      rows = Object.entries(res.summary||{}).map(([k,v]) => [k,v,'Current']);
    } else if (type === 'incident') {
      const res = await API.get('/ops/incidents?limit=200');
      headers = ['ID','Title','Severity','Status','Created','Resolved'];
      rows = (res.incidents||[]).map(i => [i.incident_id, i.title, i.severity, i.status, i.created_at?.slice(0,10)||'—', i.resolved_at?.slice(0,10)||'—']);
    }
    if (rows.length === 0) { showToast('No data to export', 'warning'); return; }
    const csv = [headers.join(','), ...rows.map(r => r.map(c => '"'+(c||'').toString().replace(/"/g,'""')+'"').join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `trustchecker-${type}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    showToast(`✅ Exported ${rows.length} ${type} records`, 'success');
  } catch (e) { showToast('Export failed: ' + (e.message||'Unknown error'), 'error'); }
};

export function renderPage() {
  const prodCache = window._opsProdCache || {};
  const whCache = window._opsWhCache || {};
  const incCache = window._opsIncCache || {};
  const batchCount = prodCache.batches?.batches?.length || 0;
  const shipDone = (whCache.shipments?.shipments || []).filter(s => s.status === 'delivered').length;
  const totalShip = (whCache.shipments?.shipments || []).length;
  const slaPct = totalShip > 0 ? (100 * shipDone / totalShip).toFixed(1) : '—';
  const openInc = (incCache.openCases?.incidents || []).length;

  const reports = [
    { id: 'RPT-W09', title: 'Weekly Operations Summary', period: 'Feb 24 – Mar 2, 2026', type: 'weekly', status: 'ready', generated: '2h ago' },
    { id: 'RPT-W08', title: 'Weekly Operations Summary', period: 'Feb 17 – Feb 23, 2026', type: 'weekly', status: 'ready', generated: '7d ago' },
    { id: 'RPT-M02', title: 'Monthly Batch Report', period: 'February 2026', type: 'monthly', status: 'ready', generated: '1d ago' },
    { id: 'RPT-SLA', title: 'SLA Compliance Report', period: 'February 2026', type: 'sla', status: 'ready', generated: '1d ago' },
    { id: 'RPT-INC', title: 'Incident Analysis Report', period: 'Feb 2026', type: 'incident', status: 'generating', generated: 'In progress' },
  ];

  return `
    <div class="sa-page">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <h2 style="margin:0;font-size:1.1rem;font-weight:600">Reports & Export</h2>
        <div style="display:flex;gap:8px">
          <button style="padding:6px 16px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer" onclick="showToast('📊 Report generation queued — check back shortly','info')">+ Generate Report</button>
          <button class="btn btn-outline btn-sm" onclick="window._opsExportCSV('incident')">${icon('download', 14)} Export All</button>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:1.8rem">
        ${rStat(icon('products', 20, ACCENT), 'Batches This Week', batchCount, ACCENT)}
        ${rStat(icon('check', 20, '#22c55e'), 'Transfers Done', shipDone, '#22c55e')}
        ${rStat(icon('clock', 20, '#6366f1'), 'SLA Compliance', slaPct + '%', '#6366f1')}
        ${rStat(icon('alertTriangle', 20, '#ef4444'), 'Open Incidents', openInc, openInc > 0 ? '#ef4444' : '#22c55e')}
      </div>

      <!-- Quick Export -->
      <h3 style="margin:0 0 12px;font-size:0.95rem;font-weight:600">Quick Export</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:2rem">
        ${exportCard('📊', 'Batch Summary', 'All batches with lifecycle status, origin, destination', 'CSV')}
        ${exportCard('🚚', 'Shipment Log', 'Transfer orders with carrier, tracking, SLA status', 'CSV')}
        ${exportCard('🔍', 'Scan Analytics', 'Scan volume, anomaly rate, duplicate detection', 'PDF')}
        ${exportCard('🧾', 'Incident Report', 'Open/closed cases, SLA compliance, resolution time', 'PDF')}
      </div>

      <!-- Generated Reports -->
      <div style="background:var(--card-bg);border-radius:12px;border:1px solid var(--border-color,rgba(0,0,0,0.06));padding:20px 24px">
        <h3 style="margin:0 0 16px;font-size:0.95rem;font-weight:600">Generated Reports</h3>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem">
            <thead><tr>
              <th style="${th}">ID</th><th style="${th}">Report</th><th style="${th}">Period</th>
              <th style="${th}">Status</th><th style="${th}">Generated</th><th style="${th}text-align:right">Actions</th>
            </tr></thead>
            <tbody>
              ${reports.map(r => {
                const stC = r.status === 'ready' ? '#22c55e' : '#f59e0b';
                const stBg = r.status === 'ready' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)';
                return `<tr style="transition:background 0.15s" onmouseover="this.style.background='rgba(13,148,136,0.02)'" onmouseout="this.style.background=''">
                  <td style="${td}"><span style="font-weight:600;color:${ACCENT}">${r.id}</span></td>
                  <td style="${td}font-weight:500">${r.title}</td>
                  <td style="${td}color:var(--text-secondary)">${r.period}</td>
                  <td style="${td}"><span style="font-size:0.65rem;padding:3px 10px;border-radius:20px;font-weight:600;background:${stBg};color:${stC}">${r.status}</span></td>
                  <td style="${td}color:var(--text-secondary);font-size:0.78rem">${r.generated}</td>
                  <td style="${td}text-align:right">
                    ${r.status === 'ready'
                      ? `<button style="padding:5px 14px;border:1px solid var(--border-color,rgba(0,0,0,0.1));border-radius:6px;background:transparent;color:var(--text-primary);font-size:0.72rem;cursor:pointer" onclick="window._opsExportCSV('${r.type === 'incident' ? 'incident' : r.type === 'sla' ? 'shipment' : 'batch'}')">${icon('download', 12)} Download</button>`
                      : `<span style="font-size:0.72rem;color:var(--text-secondary)">Generating…</span>`}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

const th = 'padding:10px 12px;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);border-bottom:1px solid var(--border-color,rgba(0,0,0,0.06));text-align:left;';
const td = 'padding:12px 12px;border-bottom:1px solid var(--border-color,rgba(0,0,0,0.04));';

function rStat(iconHtml, label, value, color) {
  return `<div style="background:var(--card-bg);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06))">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}10;display:flex;align-items:center;justify-content:center">${iconHtml}</div>
    </div>
    <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-secondary);font-weight:600">${label}</div>
    <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1.2">${value}</div>
  </div>`;
}

function exportCard(emoji, title, desc, format) {
  return `<div style="background:var(--card-bg);border-radius:10px;padding:16px 20px;border:1px solid var(--border-color,rgba(0,0,0,0.06));cursor:pointer;transition:box-shadow 0.15s,transform 0.15s"
    onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)';this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='';this.style.transform=''"
    onclick="window._opsExportCSV('${title === 'Batch Summary' ? 'batch' : title === 'Shipment Log' ? 'shipment' : title === 'Scan Analytics' ? 'scan' : 'incident'}')">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:1.2rem">${emoji}</span>
          <span style="font-weight:600;font-size:0.88rem;color:var(--text-primary)">${title}</span>
        </div>
        <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.4">${desc}</div>
      </div>
      <span style="font-size:0.65rem;padding:3px 8px;border-radius:6px;background:rgba(13,148,136,0.06);color:${ACCENT};font-weight:600">${format} ↓</span>
    </div>
  </div>`;
}
