/**
 * Company Admin – Risk Rules (Tenant Scope)
 * ═══════════════════════════════════════════
 * Real data from /api/scm/model/models + /api/scm/risk/alerts
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let rules = null, loading = false, showForm = false;

async function load() {
  if (loading) return; loading = true;
  const timer = setTimeout(() => {
    if (!rules) { rules = { models: [], risks: [] }; loading = false; const el = document.getElementById('risk-rules-root'); if (el) el.innerHTML = renderContent(); }
  }, 5000);
  try {
    if (window._caRiskReady) { try { await window._caRiskReady; } catch { } }
    const rc = window._caRiskCache;
    let models, risks, rulesConfig;
    if (rc?.riskModels && rc?.riskAlerts && rc?.rulesConfig && rc._loadedAt && !rules) {
      models = rc.riskModels; risks = rc.riskAlerts; rulesConfig = rc.rulesConfig;
    } else {
      [models, risks, rulesConfig] = await Promise.all([
        API.get('/scm/model/models').catch(() => ({ models: [] })),
        API.get('/scm/risk/alerts?limit=50').catch(() => ({ alerts: [] })),
        API.get('/scm/model/rules-config').catch(() => ({ grouped: {} })),
      ]);
    }
    const modelList = Array.isArray(models) ? models : (models.models || []);
    const riskList = Array.isArray(risks) ? risks : (risks.alerts || risks.rules || []);
    rules = { models: modelList, risks: riskList, config: rulesConfig?.grouped || {} };
  } catch (e) { rules = { models: [], risks: [] }; }
  clearTimeout(timer);
  loading = false;
  setTimeout(() => { const el = document.getElementById('risk-rules-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!rules && !loading) { load(); }
  if (loading && !rules) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Risk Rules...</div></div>`;

  const models = rules?.models || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('target', 28)} Risk Rules</h1>
        <span style="font-size:0.75rem;color:var(--text-secondary);background:rgba(255,255,255,0.04);padding:4px 10px;border-radius:6px">Organization Scope Only</span>
      </div>

      ${showForm ? renderCreateForm() : ''}

      <!-- Risk Models from DB -->
      <section class="sa-section" style="margin-bottom:1.5rem">
        <h2 class="sa-section-title">${icon('settings', 20)} Active Risk Models</h2>
        <div class="sa-card">
          ${models.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No risk models configured yet</div>' : `
          <table class="sa-table">
            <thead><tr><th>Version</th><th>Status</th><th>Factors</th><th>False Positive Rate</th><th>True Positive Rate</th><th>Change Summary</th><th>Created</th></tr></thead>
            <tbody>
              ${models.map(m => `
                <tr class="sa-row-clickable">
                  <td><strong class="sa-code">${m.version || '—'}</strong></td>
                  <td>
                    <select onchange="window._rrChangeStatus('${m.id}', this.value)"
                      style="border:none;font-weight:600;font-size:0.75rem;padding:4px 8px;border-radius:12px;cursor:pointer;
                      background:${m.status === 'production' ? 'rgba(16,185,129,0.12)' : m.status === 'sandbox' ? 'rgba(59,130,246,0.12)' : m.status === 'draft' ? 'rgba(249,115,22,0.12)' : 'rgba(148,163,184,0.12)'};
                      color:${m.status === 'production' ? '#10b981' : m.status === 'sandbox' ? '#3b82f6' : m.status === 'draft' ? '#f97316' : '#94a3b8'}">
                      ${['draft', 'sandbox', 'production', 'archived'].map(s => `<option value="${s}" ${m.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                    </select>
                  </td>
                  <td style="text-align:center">${m.factors || '—'}</td>
                  <td class="sa-code">${m.fp_rate || '—'}</td>
                  <td class="sa-code">${m.tp_rate || '—'}</td>
                  <td style="max-width:280px;font-size:0.78rem;color:var(--text-secondary);white-space:normal">${m.change_summary ? m.change_summary.substring(0, 80) + (m.change_summary.length > 80 ? '…' : '') : '—'}</td>
                  <td style="color:var(--text-secondary);white-space:nowrap">${m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
          <div style="margin-top:1rem;text-align:right">
            <button class="btn btn-primary btn-sm" onclick="window._rrToggleForm()">+ Add Risk Rule</button>
          </div>
        </div>
      </section>

      ${renderRuleSection('duplicate_detection', 'Duplicate Detection', 'alert')}
      ${renderRuleSection('geographic_restrictions', 'Geographic Restrictions', 'globe')}
      ${renderRuleSection('velocity_rules', 'Velocity Rules', 'zap')}
    </div>
  `;
}

function renderCreateForm() {
  return `
    <div class="sa-card" style="margin-bottom:1.5rem;border:2px solid var(--primary, #3b82f6);position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;color:var(--text-primary)">${icon('plus', 20)} Create New Risk Model</h3>
        <button class="btn btn-xs btn-ghost" onclick="window._rrToggleForm()">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Version *</label>
          <input id="rr-version" type="text" placeholder="e.g. v2.1" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Number of Risk Factors</label>
          <input id="rr-factors" type="number" placeholder="12" value="12" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px;box-sizing:border-box">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">How many factors the model uses to score risk (e.g. scan velocity, geo anomaly, etc.)</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">False Positive Rate</label>
          <input id="rr-fp" type="text" placeholder="e.g. 2.1%" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px;box-sizing:border-box">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">% legitimate scans wrongly flagged as fraud — lower is better</div>
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">True Positive Rate</label>
          <input id="rr-tp" type="text" placeholder="e.g. 97.5%" style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px;box-sizing:border-box">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">% actual fraud correctly detected — higher is better</div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Change Summary</label>
        <textarea id="rr-summary" rows="2" placeholder="What changed in this version..." style="width:100%;padding:8px 12px;border:1px solid var(--border-color, #334155);border-radius:6px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm btn-ghost" onclick="window._rrToggleForm()">Cancel</button>
        <button class="btn btn-sm btn-primary" onclick="window._rrCreate()">Create Model</button>
      </div>
    </div>
  `;
}

function renderRuleSection(category, title, iconName) {
  const config = rules?.config || {};
  const items = config[category] || [];
  if (items.length === 0) return '';
  const prettyName = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `
    <section class="sa-section" style="margin-top:1.5rem">
      <h2 class="sa-section-title">${icon(iconName, 20)} ${title}</h2>
      <div class="sa-card">
        <div class="sa-threshold-list">
          ${items.map(r => thresholdItem(prettyName(r.rule_key), r.description, r.rule_value, r.id)).join('')}
        </div>
      </div>
    </section>`;
}

function thresholdItem(name, desc, value, ruleId) {
  return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${name}</strong>
        <span id="rv-${ruleId}" style="font-weight:600;font-size:0.82rem;cursor:pointer;border-bottom:1px dashed var(--text-muted)" onclick="window._rrEditRule('${ruleId}', '${value.replace(/'/g, "\\'")}')"
              title="Click to edit">${value}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}

function refresh() {
  setTimeout(() => {
    const el = document.getElementById('risk-rules-root');
    if (el) el.innerHTML = renderContent();
  }, 50);
}

export function renderPage() {
  return `<div id="risk-rules-root">${renderContent()}</div>`;
}

// ─── Global handlers ────────────────────────────────────────
window._rrChangeStatus = async function (modelId, newStatus) {
  try {
    const { showToast } = await import('../../components/toast.js');
    await API.put(`/scm/model/models/${modelId}/status`, { status: newStatus });
    showToast(`✓ Status changed to ${newStatus}`, 'success');
    rules = null; load();
  } catch (e) {
    const { showToast } = await import('../../components/toast.js');
    showToast('✗ ' + (e.message || 'Failed'), 'error');
  }
};

window._rrToggleForm = function () {
  showForm = !showForm;
  refresh();
};

window._rrCreate = async function () {
  const version = document.getElementById('rr-version')?.value?.trim();
  if (!version) { alert('Version is required'); return; }

  const data = {
    version,
    factors: parseInt(document.getElementById('rr-factors')?.value) || 12,
    fp_rate: document.getElementById('rr-fp')?.value?.trim() || '',
    tp_rate: document.getElementById('rr-tp')?.value?.trim() || '',
    change_summary: document.getElementById('rr-summary')?.value?.trim() || '',
    weights: {},
  };

  try {
    await API.post('/scm/model/models', data);
    showForm = false;
    rules = null;
    loading = false;
    load();
  } catch (e) {
    alert('Failed to create risk model: ' + (e.message || 'Unknown error'));
  }
};

window._rrEditRule = function (ruleId, currentValue) {
  const span = document.getElementById(`rv-${ruleId}`);
  if (!span) return;
  span.outerHTML = `<input id="ri-${ruleId}" type="text" value="${currentValue}" 
    style="font-size:0.82rem;font-weight:600;padding:2px 6px;border:1px solid var(--primary, #3b82f6);border-radius:4px;background:var(--bg-secondary, #0f172a);color:var(--text-primary, #f1f5f9);width:140px"
    onkeydown="if(event.key==='Enter')window._rrSaveRule('${ruleId}',this.value);if(event.key==='Escape'){window._rrCancelEdit();}" 
    onblur="window._rrSaveRule('${ruleId}',this.value)" autofocus />`;
  document.getElementById(`ri-${ruleId}`)?.focus();
};

window._rrSaveRule = async function (ruleId, newValue) {
  try {
    await API.put(`/scm/model/rules-config/${ruleId}`, { rule_value: newValue });
    rules = null; loading = false; load();
  } catch (e) {
    alert('Failed to save: ' + (e.message || 'Unknown error'));
  }
};

window._rrCancelEdit = function () {
  rules = null; loading = false; load();
};
