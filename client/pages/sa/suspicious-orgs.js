/**
 * Super Admin – Cases (Suspicious Organizations) — Real PG data
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

async function load() {
  if (loading) return; loading = true;
  // Await workspace prefetch if it's in flight
  if (window._saRiskReady) {
    try { await window._saRiskReady; } catch { }
  }
  // Use prefetched data from workspace if available
  const cache = window._saRiskCache;
  if (cache?.riskAnalytics && cache._loadedAt) {
    data = cache.riskAnalytics;
    loading = false;
    setTimeout(() => { const el = document.getElementById('suspicious-orgs-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
    return;
  }
  try { data = await API.get('/risk-graph/risk-analytics'); } catch (e) { data = { suspiciousOrgs: [] }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('suspicious-orgs-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

// ═══ Action handlers ═══
window._saRiskAction = async (action, orgId, orgName) => {
  if (action === 'suspend') {
    const reason = prompt(`⚠️ Suspend "${orgName}"?\n\nEnter reason for suspension:`);
    if (!reason) return; // cancelled
    try {
      await API.post(`/platform/orgs/${orgId}/suspend`, { reason });
      alert(`✅ "${orgName}" has been suspended.\nReason: ${reason}`);
      // Bust cache by forcing fresh reload
      data = null; loading = false;
      try { data = await API.get('/risk-graph/risk-analytics?_t=' + Date.now()); } catch (e) { data = { suspiciousOrgs: [] }; }
      const el = document.getElementById('suspicious-orgs-root');
      if (el) el.innerHTML = renderContent ? renderContent() : '';
    } catch (e) {
      alert(`❌ Failed to suspend: ${e.message || 'Unknown error'}`);
    }
  } else if (action === 'activate') {
    if (!confirm(`Reactivate "${orgName}"?`)) return;
    try {
      await API.post(`/platform/orgs/${orgId}/activate`, {});
      alert(`✅ "${orgName}" has been reactivated.`);
      data = null; loading = false;
      try { data = await API.get('/risk-graph/risk-analytics?_t=' + Date.now()); } catch (e) { data = { suspiciousOrgs: [] }; }
      const el = document.getElementById('suspicious-orgs-root');
      if (el) el.innerHTML = renderContent ? renderContent() : '';
    } catch (e) {
      alert(`❌ Failed to activate: ${e.message || 'Unknown error'}`);
    }
  } else if (action === 'review') {
    window.navigate('sa-org-detail', { orgId });
  } else if (action === 'monitor') {
    window.navigate('sa-risk-feed');
  }
};

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading risk data...</div></div>`;

  const orgs = data?.suspiciousOrgs || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('alert', 28)} Risk & Fraud Management</h1>
        <span style="font-size:0.72rem;color:var(--text-muted)">Monitor organization risk scores and take action on suspicious activity in real-time</span>
      </div>

      ${orgs.length === 0 ? '<div class="sa-card" style="text-align:center;padding:40px;color:var(--text-muted)">No suspicious organizations detected</div>' : ''}

      <style>
        .st-wrap{overflow-x:auto;border-radius:12px}
        .st-table{width:100%;border-collapse:separate;border-spacing:0;font-size:0.82rem}
        .st-table thead th{padding:14px 20px;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);border-bottom:2px solid var(--border);white-space:nowrap;background:var(--bg-card-hover)}
        .st-table tbody td{padding:14px 20px;border-bottom:1px solid var(--border);vertical-align:middle}
        .st-table tbody tr{transition:all 0.15s ease;cursor:pointer}
        .st-table tbody tr:hover{background:var(--bg-card-hover);box-shadow:inset 0 0 0 1px var(--border)}
        .st-row-alert{background:var(--color-danger-bg)}
        .st-row-alert:hover{background:var(--color-danger-bg)}
        .st-org{font-weight:700;color:var(--text-primary);font-size:0.84rem;white-space:nowrap}
        .st-slug{font-size:0.7rem;color:var(--text-secondary);margin-top:3px;font-family:'JetBrains Mono',monospace}
        .st-score{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:30px;border-radius:8px;font-weight:800;font-size:1.05rem;padding:0 8px}
        .st-score-crit{background:var(--color-danger-bg);color:var(--color-danger-text)}
        .st-score-high{background:var(--color-warning-bg);color:var(--color-warning-text)}
        .st-score-med{background:var(--color-warning-bg);color:var(--color-warning-text)}
        .st-score-low{background:var(--color-info-bg);color:var(--color-info-text)}
        .st-tag{display:inline-block;font-size:0.64rem;font-weight:500;padding:3px 10px;border-radius:9999px;margin:2px 3px;white-space:nowrap;line-height:1.3}
        .st-tag-red{background:var(--color-danger-bg);color:var(--color-danger-text)}
        .st-tag-amber{background:var(--color-warning-bg);color:var(--color-warning-text)}
        .st-tag-gray{background:var(--color-neutral-bg);color:var(--text-secondary)}
        .st-tag-more{background:var(--color-neutral-bg);color:var(--text-secondary);font-weight:600}
        .st-num{font-weight:700;font-size:0.88rem;font-variant-numeric:tabular-nums}
        .st-num-amber{color:var(--amber)}
        .st-num-red{color:var(--rose)}
        .st-btn-solid{padding:6px 16px;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;color:#fff}
        .st-btn-solid-red{background:var(--rose)}
        .st-btn-solid-red:hover{background:#DC2626;box-shadow:0 3px 10px rgba(239,68,68,0.3)}
        .st-btn-ghost{padding:5px 14px;border-radius:8px;font-size:0.72rem;font-weight:600;cursor:pointer;background:transparent;transition:all 0.15s}
        .st-btn-ghost-amber{color:var(--amber);border:1.5px solid var(--amber)}
        .st-btn-ghost-amber:hover{background:var(--color-warning-bg);box-shadow:0 2px 8px rgba(245,158,11,0.15)}
        .st-btn-ghost-blue{color:var(--cyan);border:1.5px solid var(--cyan)}
        .st-btn-ghost-blue:hover{background:var(--color-info-bg);box-shadow:0 2px 8px rgba(59,130,246,0.15)}
        .st-level{font-size:0.72rem;font-weight:700;padding:5px 12px;border-radius:9999px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
        .st-lv-high{background:var(--color-danger-bg);color:var(--color-danger-text)}
        .st-lv-med{background:var(--color-warning-bg);color:var(--color-warning-text)}
        .st-lv-low{background:var(--color-info-bg);color:var(--color-info-text)}
      </style>

      <div class="sa-card st-wrap">
        <table class="st-table">
          <thead><tr>
            <th style="text-align:left;min-width:170px">Organization</th>
            <th style="text-align:right">Risk Score</th>
            <th style="text-align:right">Fraud Alerts</th>
            <th style="text-align:right">Open Cases</th>
            <th style="text-align:right">Critical</th>
            <th style="text-align:left">Detected Patterns</th>
            <th style="text-align:center">Action</th>
            <th style="text-align:center">Level</th>
          </tr></thead>
          <tbody>
            ${orgs.map(t => {
    const s = t.risk_score;
    const tier = s >= 90 ? 'crit' : s >= 70 ? 'high' : s >= 40 ? 'med' : 'low';
    const tierLabel = tier === 'crit' || tier === 'high' ? 'High' : tier === 'med' ? 'Medium' : 'Low';
    const tierIcon = tier === 'crit' || tier === 'high' ? '🔥' : tier === 'med' ? '⚡' : '✅';
    const lvClass = tier === 'crit' || tier === 'high' ? 'st-lv-high' : tier === 'med' ? 'st-lv-med' : 'st-lv-low';
    const tid = t.org_id || t.id || '';
    const tName = (t.name || '').replace(/'/g, "\\'");
    const isSuspended = t.status === 'suspended';
    let action;
    if (isSuspended) {
      action = `<button class="st-btn-ghost st-btn-ghost-blue" onclick="event.stopPropagation();_saRiskAction('activate','${tid}','${tName}')" style="border-color:#10b981;color:#059669">Activate</button>`;
    } else if (tier === 'crit' || tier === 'high') {
      action = `<button class="st-btn-solid st-btn-solid-red" onclick="event.stopPropagation();_saRiskAction('suspend','${tid}','${tName}')">Suspend</button>`;
    } else if (tier === 'med') {
      action = `<button class="st-btn-ghost st-btn-ghost-amber" onclick="event.stopPropagation();_saRiskAction('review','${tid}','${tName}')">Review</button>`;
    } else {
      action = `<button class="st-btn-ghost st-btn-ghost-blue" onclick="event.stopPropagation();_saRiskAction('monitor','${tid}','${tName}')">Monitor</button>`;
    }
    const tagClass = (tier === 'crit' || tier === 'high') ? 'st-tag-red' : tier === 'med' ? 'st-tag-amber' : 'st-tag-gray';
    var pats = t.top_patterns || [];
    var shown = pats.slice(0, 2).map(function (p) { return '<span class="st-tag ' + tagClass + '">' + p + '</span>'; }).join('');
    if (pats.length > 2) shown += '<span class="st-tag st-tag-more">+' + (pats.length - 2) + '</span>';
    if (!pats.length) shown = '<span class="st-tag st-tag-gray">' + t.pattern_types + ' types</span>';
    var rowCls = isSuspended ? ' class="st-row-alert" style="opacity:0.7"' : (s >= 90 ? ' class="st-row-alert"' : '');
    const levelHtml = isSuspended
      ? '<span class="st-level st-lv-high">🚫 Suspended</span>'
      : '<span class="st-level ' + lvClass + '">' + tierIcon + ' ' + tierLabel + '</span>';
    const nameHtml = isSuspended
      ? '<div class="st-org" style="text-decoration:line-through;opacity:0.6">' + t.name + '</div>'
      : '<div class="st-org">' + t.name + '</div>';
    return '<tr' + rowCls + ' onclick="navigate(\'sa-org-detail\',{orgId:\'' + tid + '\'})">'
      + '<td style="text-align:left">' + nameHtml + '<div class="st-slug">' + t.slug + '</div></td>'
      + '<td style="text-align:right"><span class="st-score st-score-' + tier + '">' + s + '</span></td>'
      + '<td style="text-align:right"><span class="st-num">' + t.fraud_count + '</span></td>'
      + '<td style="text-align:right"><span class="st-num st-num-amber">' + t.open_count + '</span></td>'
      + '<td style="text-align:right"><span class="st-num st-num-red">' + t.critical_count + '</span></td>'
      + '<td style="text-align:left">' + shown + '</td>'
      + '<td style="text-align:center">' + action + '</td>'
      + '<td style="text-align:center">' + levelHtml + '</td>'
      + '</tr>';
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

export function renderPage() {
  return `<div id="suspicious-orgs-root">${renderContent()}</div>`;
}

