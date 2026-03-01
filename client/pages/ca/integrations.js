/**
 * Company Admin – My Integrations (Per-Tenant)
 * ═════════════════════════════════════════════
 * Webhooks, API Keys, SMTP, Carrier, ERP — scoped by org_id
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let schema = null, data = null, loading = false, activeTab = null, editing = null, saving = false;

async function load() {
  if (loading) return; loading = true;
  const timer = setTimeout(() => {
    if (!schema) { schema = {}; data = {}; loading = false; refresh(); }
  }, 5000);
  try {
    if (window._caSetReady) { try { await window._caSetReady; } catch { } }
    const sc = window._caSetCache;
    let s, d;
    if (sc?.integrationsSchema && sc?.integrations && sc._loadedAt && !schema) {
      s = sc.integrationsSchema; d = sc.integrations;
    } else {
      [s, d] = await Promise.all([
        API.get('/tenant-integrations/schema').catch(() => ({})),
        API.get('/tenant-integrations').catch(() => ({})),
      ]);
    }
    schema = s || {};
    data = d || {};
    if (!activeTab) activeTab = Object.keys(schema)[0] || null;
  } catch (e) { schema = {}; data = {}; }
  clearTimeout(timer);
  loading = false;
  refresh();
}

function refresh() {
  setTimeout(() => {
    const el = document.getElementById('tenant-integrations-root');
    if (el) el.innerHTML = renderContent();
  }, 50);
}

function renderContent() {
  if (!schema && !loading) { load(); }
  if (loading && !schema) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading integrations...</div></div>`;

  const cats = Object.entries(schema || {});
  if (cats.length === 0) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">No integration categories available</div></div>`;

  if (!activeTab) activeTab = cats[0][0];
  const activeDef = schema[activeTab];
  const activeData = data?.[activeTab] || {};

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('plug', 28)} My Integrations</h1>
        <span style="font-size:0.75rem;color:var(--text-secondary);background:rgba(255,255,255,0.04);padding:4px 10px;border-radius:6px">Organization Scope</span>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:6px;margin-bottom:1.5rem;flex-wrap:wrap">
        ${cats.map(([key, def]) => {
    const hasData = data?.[key] && Object.keys(data[key]).length > 0;
    const isEnabled = data?.[key]?.enabled?.value === 'true';
    return `<button onclick="window._tiTab('${key}')" style="padding:8px 16px;border-radius:8px;border:2px solid ${activeTab === key ? 'var(--primary,#3b82f6)' : 'var(--border-color,#334155)'};background:${activeTab === key ? 'rgba(59,130,246,0.1)' : 'transparent'};color:${activeTab === key ? 'var(--primary,#3b82f6)' : 'var(--text-secondary)'};cursor:pointer;font-size:0.82rem;font-weight:${activeTab === key ? '700' : '500'};display:flex;align-items:center;gap:6px">
            <span style="font-size:18px">${def.icon}</span>
            ${def.label}
            ${hasData ? `<span style="width:8px;height:8px;border-radius:50%;background:${isEnabled ? '#10b981' : '#f59e0b'}"></span>` : ''}
          </button>`;
  }).join('')}
      </div>

      <!-- ACTIVE CATEGORY -->
      <div class="sa-card" style="border-left:4px solid var(--primary,#3b82f6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <h3 style="margin:0;color:var(--text-primary)">${activeDef.icon} ${activeDef.label}</h3>
            <p style="margin:4px 0 0;color:var(--text-secondary);font-size:0.82rem">${activeDef.description}</p>
          </div>
          <div style="display:flex;gap:8px">
            ${editing === activeTab ? `
              <button class="btn btn-sm btn-ghost" onclick="window._tiCancel()">Cancel</button>
              <button class="btn btn-sm btn-primary" onclick="window._tiSave('${activeTab}')">${saving ? 'Saving...' : 'Save'}</button>
            ` : `
              <button class="btn btn-sm btn-primary" onclick="window._tiEdit('${activeTab}')">Configure</button>
              ${Object.keys(activeData).length > 0 ? `<button class="btn btn-sm btn-ghost" style="color:#ef4444" onclick="window._tiClear('${activeTab}')">Clear All</button>` : ''}
            `}
          </div>
        </div>

        ${editing === activeTab ? renderEditForm(activeTab, activeDef, activeData) : renderViewMode(activeDef, activeData)}
      </div>

      <!-- STATUS OVERVIEW -->
      <div style="margin-top:1.5rem">
        <h3 style="color:var(--text-secondary);font-size:0.82rem;text-transform:uppercase;margin-bottom:12px">Integration Status Overview</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
          ${cats.map(([key, def]) => {
    const d = data?.[key] || {};
    const configured = Object.keys(d).length > 0;
    const enabled = d.enabled?.value === 'true';
    return `<div style="padding:12px;border-radius:8px;background:var(--bg-card,rgba(255,255,255,0.02));border:1px solid var(--border-color,#334155);text-align:center">
              <div style="font-size:24px;margin-bottom:4px">${def.icon}</div>
              <div style="font-size:0.78rem;font-weight:600;color:var(--text-primary)">${def.label}</div>
              <div style="margin-top:6px">
                <span style="padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600;background:${enabled ? 'rgba(16,185,129,0.1);color:#10b981' : configured ? 'rgba(245,158,11,0.1);color:#f59e0b' : 'rgba(100,116,139,0.1);color:#64748b'}">${enabled ? 'Active' : configured ? 'Configured' : 'Not Set'}</span>
              </div>
            </div>`;
  }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderViewMode(def, activeData) {
  if (Object.keys(activeData).length === 0) {
    return `<div style="text-align:center;padding:30px;color:var(--text-muted)">Not configured yet. Click <strong>Configure</strong> to set up.</div>`;
  }
  return `<div style="display:grid;gap:8px">
    ${def.settings.map(s => {
    const d = activeData[s.key];
    if (!d) return '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-secondary,#0f172a);border-radius:6px">
        <div>
          <div style="color:var(--text-primary);font-weight:600;font-size:0.82rem">${s.label}</div>
          ${d.updated_at ? `<div style="color:var(--text-secondary);font-size:0.68rem">Updated: ${new Date(d.updated_at).toLocaleDateString('en-US')}</div>` : ''}
        </div>
        <div style="font-family:monospace;font-size:0.82rem;color:${d.is_secret ? '#94a3b8' : 'var(--text-primary)'}">${d.value || '—'}</div>
      </div>`;
  }).join('')}
  </div>`;
}

function renderEditForm(cat, def, activeData) {
  return `<div style="display:grid;gap:12px" id="ti-form">
    ${def.settings.map(s => {
    const current = activeData[s.key]?.value || '';
    return `<div>
        <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">${s.label}${s.secret ? ' 🔒' : ''}</label>
        <input id="ti-${s.key}" type="${s.secret ? 'password' : 'text'}" value="${current}" placeholder="${s.placeholder || ''}"
          ${s.readonly ? 'readonly' : ''}
          style="width:100%;padding:8px 12px;border:1px solid var(--border-color,#334155);border-radius:6px;background:var(--bg-secondary,#0f172a);color:var(--text-primary);font-size:13px;font-family:${s.secret ? 'monospace' : 'inherit'}">
      </div>`;
  }).join('')}
  </div>`;
}

export function renderPage() {
  return `<div id="tenant-integrations-root">${renderContent()}</div>`;
}

// ─── Global handlers ────────────────────────────────────────
window._tiTab = function (tab) { activeTab = tab; editing = null; refresh(); };

window._tiEdit = function (cat) { editing = cat; refresh(); };
window._tiCancel = function () { editing = null; refresh(); };

window._tiSave = async function (cat) {
  if (saving) return; saving = true; refresh();
  const def = schema[cat];
  const body = {};
  for (const s of def.settings) {
    const el = document.getElementById('ti-' + s.key);
    if (el) body[s.key] = el.value;
  }
  try {
    await API.put('/tenant-integrations/' + cat, body);
    editing = null;
    data = null;
    await load();
  } catch (e) { alert('Save failed: ' + (e.message || 'Unknown error')); }
  saving = false;
  refresh();
};

window._tiClear = async function (cat) {
  if (!confirm(`Clear all ${schema[cat]?.label || cat} settings?`)) return;
  try {
    await API.delete('/tenant-integrations/' + cat);
    data = null;
    await load();
  } catch (e) { alert('Failed to clear'); }
};
