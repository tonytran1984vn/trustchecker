/**
 * Company Admin – Code Format Rules (Full Feature)
 * CRUD, Test/Preview, Templates, Audit Log, Statistics
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false, activeTab = 'rules', editingRuleId = null;

async function load() {
  if (loading) return; loading = true;
  try {
    if (window._caIdReady) { try { await window._caIdReady; } catch { } }
    const ic = window._caIdCache;
    let rulesRes, statsRes, auditRes, templatesRes;
    if (ic?.formatRules && ic?.formatRulesStats && ic?.formatRulesAudit && ic?.formatRulesTemplates && ic._loadedAt && !data) {
      rulesRes = ic.formatRules; statsRes = ic.formatRulesStats; auditRes = ic.formatRulesAudit; templatesRes = ic.formatRulesTemplates;
    } else {
      [rulesRes, statsRes, auditRes, templatesRes] = await Promise.all([
        API.get('/scm/code-gov/format-rules').catch(() => ({ rules: [] })),
        API.get('/scm/code-gov/format-rules/stats').catch(() => ({})),
        API.get('/scm/code-gov/format-rules/audit?limit=30').catch(() => ({ logs: [] })),
        API.get('/scm/code-gov/format-rules/templates').catch(() => ({ templates: [] })),
      ]);
    }
    data = {
      rules: rulesRes.rules || [],
      stats: statsRes || {},
      audit: auditRes.logs || [],
      templates: templatesRes.templates || [],
    };
  } catch (e) { data = { rules: [], stats: {}, audit: [], templates: [] }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('code-format-root'); if (el) el.innerHTML = renderContent(); }, 50);
}

// ── Create / Update Rule ──
window._cfCreateRule = async () => {
  const name = document.getElementById('cf-name')?.value?.trim();
  if (!name) return alert('Rule name is required');
  const body = {
    name,
    prefix: document.getElementById('cf-prefix')?.value?.trim() || '',
    pattern: document.getElementById('cf-pattern')?.value?.trim() || '',
    separator: document.getElementById('cf-separator')?.value || '-',
    code_length: parseInt(document.getElementById('cf-length')?.value) || 24,
    charset: document.getElementById('cf-charset')?.value || 'ALPHANUMERIC_UPPER',
    check_digit_algo: document.getElementById('cf-algo')?.value || 'HMAC-SHA256',
    description: document.getElementById('cf-desc')?.value?.trim() || '',
  };
  try {
    if (editingRuleId) {
      await API.put(`/scm/code-gov/format-rules/${editingRuleId}`, body);
      editingRuleId = null;
    } else {
      await API.post('/scm/code-gov/format-rules', body);
    }
    activeTab = 'rules';
    data = null; load();
  } catch (e) { alert('Error: ' + (e.message || 'Failed to save rule')); }
};

// ── Edit Rule ── (load into form)
window._cfEditRule = (id) => {
  const rule = data?.rules?.find(r => r.id === id);
  if (!rule) return;
  editingRuleId = id;
  activeTab = 'create';
  const el = document.getElementById('code-format-root');
  if (el) el.innerHTML = renderContent();
  // Fill form after render
  setTimeout(() => {
    const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v || ''; };
    set('cf-name', rule.name);
    set('cf-prefix', rule.prefix);
    set('cf-pattern', rule.pattern);
    set('cf-separator', rule.separator);
    set('cf-length', rule.code_length);
    set('cf-charset', rule.charset);
    set('cf-algo', rule.check_digit_algo);
    set('cf-desc', rule.description);
  }, 50);
};

// ── Delete Rule ──
window._cfDeleteRule = async (id) => {
  if (!confirm('Delete this format rule?')) return;
  try {
    await API.delete(`/scm/code-gov/format-rules/${id}`);
    data = null; load();
  } catch (e) { alert('Error: ' + (e.message || 'Failed to delete')); }
};

// ── Toggle Status ──
window._cfToggleStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  try {
    await API.put(`/scm/code-gov/format-rules/${id}`, { status: newStatus });
    data = null; load();
  } catch (e) { alert('Error: ' + (e.message || 'Failed to update')); }
};

// ── Test Code ──
window._cfTestCode = async () => {
  const code = document.getElementById('cf-test-input')?.value?.trim();
  if (!code) return alert('Enter a code to test');
  const resultEl = document.getElementById('cf-test-result');
  if (resultEl) resultEl.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted)">⏳ Testing...</div>';
  try {
    const res = await API.post('/scm/code-gov/format-rules/test', { code });
    if (resultEl) resultEl.innerHTML = renderTestResult(res);
  } catch (e) {
    if (resultEl) resultEl.innerHTML = `<div style="color:#ef4444;padding:8px">❌ ${e.message || 'Test failed'}</div>`;
  }
};

// ── Use Template ──
window._cfUseTemplate = (idx) => {
  const t = data?.templates?.[idx];
  if (!t) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('cf-name', t.name);
  set('cf-prefix', t.prefix);
  set('cf-pattern', t.pattern);
  set('cf-separator', t.separator);
  set('cf-length', t.code_length);
  set('cf-charset', t.charset);
  set('cf-algo', t.check_digit_algo);
  set('cf-desc', t.description);
};

// ── Tab Switch ──
window._cfSwitchTab = (tab) => {
  activeTab = tab;
  const el = document.getElementById('code-format-root');
  if (el) el.innerHTML = renderContent();
};

function renderTestResult(res) {
  if (res.overall === 'no_rules') {
    return `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-top:8px">
      <div style="font-weight:600;margin-bottom:4px">⚠️ No active format rules</div>
      <div style="font-size:0.78rem;color:var(--text-secondary)">${res.message}</div>
      <div style="margin-top:6px;font-size:0.78rem">Entropy: <strong style="color:${res.entropy?.passed ? '#16a34a' : '#ef4444'}">${res.entropy?.bits} bits ${res.entropy?.passed ? '✓' : '✗'}</strong></div>
    </div>`;
  }
  return `<div style="padding:12px;border:1px solid ${res.overall === 'pass' ? '#dcfce7' : '#fee2e2'};border-radius:8px;margin-top:8px;background:${res.overall === 'pass' ? '#f0fdf4' : '#fef2f2'}">
    <div style="font-weight:700;font-size:0.88rem;color:${res.overall === 'pass' ? '#16a34a' : '#ef4444'};margin-bottom:8px">${res.overall === 'pass' ? '✅ All checks passed' : '❌ Some checks failed'}</div>
    ${res.results.map(r => `
      <div style="margin-bottom:8px;padding:8px;background:rgba(255,255,255,0.6);border-radius:6px">
        <div style="font-weight:600;font-size:0.78rem;margin-bottom:4px">${r.rule_name} — ${r.passed ? '<span style="color:#16a34a">PASS</span>' : '<span style="color:#ef4444">FAIL</span>'}</div>
        ${r.checks.map(c => `<div style="font-size:0.72rem;padding:2px 0;display:flex;gap:8px">
          <span style="color:${c.passed ? '#16a34a' : '#ef4444'}">${c.passed ? '✓' : '✗'}</span>
          <span style="font-weight:500">${c.name}</span>
          <span style="color:var(--text-secondary)">${c.expected || ''}${c.actual !== undefined ? ' → ' + c.actual : ''}</span>
        </div>`).join('')}
      </div>
    `).join('')}
  </div>`;
}

function renderContent() {
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Format Rules...</div></div>`;
  if (!data) data = { rules: [], stats: {}, audit: [], templates: [] };

  const rules = data.rules || [];
  const stats = data.stats || {};
  const audit = data.audit || [];
  const templates = data.templates || [];

  const tabs = [
    { key: 'rules', label: '📐 Rules', count: rules.length },
    { key: 'create', label: '➕ Create Rule' },
    { key: 'test', label: '🧪 Test Code' },
    { key: 'templates', label: '📋 Templates', count: templates.length },
    { key: 'audit', label: '📜 Audit Log', count: audit.length },
    { key: 'stats', label: '📊 Statistics' },
  ];

  return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('settings', 28)} Code Format Rules</h1></div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Active Rules', String(rules.filter(r => r.status === 'active').length), 'Format definitions', 'green', 'settings')}
        ${m('Total Codes', String(stats.total_codes || 0), 'In platform', 'blue', 'zap')}
        ${m('Audit Events', String(audit.length), 'Change history', 'orange', 'clock')}
        ${m('Engine', 'Active', 'Validation enforced', 'green', 'shield')}
      </div>

      <!-- Tab bar -->
      <div style="display:flex;gap:2px;margin-bottom:1.5rem;border-bottom:2px solid var(--border-color,#e2e8f0);flex-wrap:wrap">
        ${tabs.map(t => `<button onclick="_cfSwitchTab('${t.key}')" style="padding:8px 16px;font-size:0.78rem;font-weight:${activeTab === t.key ? '700' : '500'};border:none;background:${activeTab === t.key ? 'var(--primary,#6366f1)' : 'transparent'};color:${activeTab === t.key ? '#fff' : 'var(--text-secondary)'};border-radius:6px 6px 0 0;cursor:pointer;transition:all 0.15s">${t.label}${t.count !== undefined ? ` <span style="background:rgba(255,255,255,0.2);padding:0 5px;border-radius:8px;font-size:0.65rem">${t.count}</span>` : ''}</button>`).join('')}
      </div>

      <!-- Tab content -->
      ${activeTab === 'rules' ? renderRulesTab(rules) : ''}
      ${activeTab === 'create' ? renderCreateTab() : ''}
      ${activeTab === 'test' ? renderTestTab() : ''}
      ${activeTab === 'templates' ? renderTemplatesTab(templates) : ''}
      ${activeTab === 'audit' ? renderAuditTab(audit) : ''}
      ${activeTab === 'stats' ? renderStatsTab(rules, stats) : ''}

      <!-- System enforcement rules (always shown) -->
      <div class="sa-card" style="margin-top:1.5rem">
        <h3>🛡 System Enforcement Rules</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Built-in rules enforced across all format definitions.</p>
        <table class="sa-table"><thead><tr><th>Rule</th><th>Description</th><th>Enforcement</th><th>Scope</th></tr></thead><tbody>
          ${[
      ['Uniqueness Check', 'Every code must be globally unique', 'HARD BLOCK', 'Platform-wide'],
      ['Check Digit Validation', 'Check digit verified on every scan', 'HARD BLOCK', 'Every scan event'],
      ['Prefix Reservation', 'Brand prefix reserved per tenant', 'HARD BLOCK', 'Platform-wide'],
      ['Expiry Enforcement', 'Expired codes return "expired" on scan', 'SOFT (log)', 'Per code'],
      ['Re-scan Throttle', 'Codes exceeding limit trigger velocity alert', 'SOFT (flag)', 'Per code'],
    ].map(([rule, desc, enforcement, scope]) => `<tr>
            <td><strong>${rule}</strong></td>
            <td style="font-size:0.82rem">${desc}</td>
            <td><span class="sa-status-pill sa-pill-${enforcement.includes('HARD') ? 'red' : 'orange'}">${enforcement}</span></td>
            <td style="font-size:0.78rem">${scope}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function renderRulesTab(rules) {
  if (rules.length === 0) return `<div class="sa-card"><div style="text-align:center;padding:40px;color:var(--text-muted)">No format rules yet. Use <strong>Create Rule</strong> or <strong>Templates</strong> to get started.</div></div>`;
  return `<div class="sa-card">
    <table class="sa-table"><thead><tr><th>Name</th><th>Prefix</th><th>Length</th><th>Charset</th><th>Check Digit</th><th>Example</th><th>Codes</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${rules.map(r => `<tr>
        <td><strong>${r.name}</strong>${r.description ? `<div style="font-size:0.68rem;color:var(--text-secondary)">${r.description.substring(0, 50)}</div>` : ''}</td>
        <td class="sa-code" style="font-size:0.72rem">${r.prefix || '—'}</td>
        <td style="text-align:center">${r.code_length}</td>
        <td style="font-size:0.72rem">${r.charset}</td>
        <td style="font-size:0.72rem">${r.check_digit_algo}</td>
        <td class="sa-code" style="font-size:0.68rem;max-width:180px;overflow:hidden;text-overflow:ellipsis">${r.example || '—'}</td>
        <td style="text-align:center;font-weight:600">${(r.codes_generated || 0).toLocaleString()}</td>
        <td><span class="sa-status-pill sa-pill-${r.status === 'active' ? 'green' : 'orange'}">${r.status}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-xs btn-primary" onclick="_cfEditRule('${r.id}')">✏️ Edit</button>
          <button class="btn btn-xs btn-outline" onclick="_cfToggleStatus('${r.id}','${r.status}')">${r.status === 'active' ? 'Pause' : 'Activate'}</button>
          <button class="btn btn-xs btn-ghost" style="color:#ef4444" onclick="_cfDeleteRule('${r.id}')">Delete</button>
        </td>
      </tr>`).join('')}
    </tbody></table>
  </div>`;
}

function renderCreateTab() {
  const isEditing = !!editingRuleId;
  return `<div class="sa-card">
    <h3>${isEditing ? '✏️ Edit Format Rule' : '➕ Create New Format Rule'}${isEditing ? ` <button style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:0.72rem;margin-left:8px" onclick="editingRuleId=null;_cfSwitchTab('create')">(Cancel Edit → New)</button>` : ''}</h3>
    <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">${isEditing ? 'Update the rule fields below and save.' : 'Define how codes are structured. You can also start from a <button style="background:none;border:none;color:var(--primary,#6366f1);cursor:pointer;font-weight:600;padding:0;text-decoration:underline;font-size:0.78rem" onclick="_cfSwitchTab(\'templates\')">template</button>.'}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="ops-field"><label class="ops-label">Rule Name *</label><input id="cf-name" class="ops-input" placeholder="e.g. TrustChecker Standard"></div>
      <div class="ops-field"><label class="ops-label">Prefix</label><input id="cf-prefix" class="ops-input" placeholder="e.g. TK-"></div>
      <div class="ops-field"><label class="ops-label">Pattern (Regex)</label><input id="cf-pattern" class="ops-input" placeholder="e.g. ^TK-[A-Z]+-\\d{4}-"></div>
      <div class="ops-field"><label class="ops-label">Separator</label><input id="cf-separator" class="ops-input" value="-"></div>
      <div class="ops-field"><label class="ops-label">Code Length</label><input id="cf-length" class="ops-input" type="number" value="24" min="4" max="64"></div>
      <div class="ops-field"><label class="ops-label">Charset</label>
        <select id="cf-charset" class="ops-input">
          <option value="ALPHANUMERIC_UPPER">Alphanumeric (A-Z, 0-9)</option>
          <option value="NUMERIC">Numeric Only (0-9)</option>
          <option value="HEX">Hexadecimal (0-9, A-F)</option>
          <option value="ALPHA_LOWER">Lowercase Alpha (a-z, 0-9)</option>
        </select></div>
      <div class="ops-field"><label class="ops-label">Check Digit Algorithm</label>
        <select id="cf-algo" class="ops-input">
          <option value="HMAC-SHA256">HMAC-SHA256</option>
          <option value="Modulo-10">Modulo-10 (GS1)</option>
          <option value="Luhn">Luhn Algorithm</option>
          <option value="CRC-32">CRC-32</option>
          <option value="None">None</option>
        </select></div>
      <div class="ops-field"><label class="ops-label">Description</label><input id="cf-desc" class="ops-input" placeholder="Optional description"></div>
    </div>
    <button class="btn btn-primary" onclick="_cfCreateRule()">${isEditing ? '💾 Save Changes' : '⚡ Create Format Rule'}</button>
  </div>`;
}

function renderTestTab() {
  return `<div class="sa-card">
    <h3>🧪 Test Code Against Rules</h3>
    <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Enter any code to validate against all active format rules. Checks prefix, length, charset, pattern, and entropy.</p>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input id="cf-test-input" class="ops-input" style="flex:1" placeholder="e.g. TK-AQM-2026-1208450015-Q">
      <button class="btn btn-primary" onclick="_cfTestCode()">🔍 Run Test</button>
    </div>
    <div id="cf-test-result"></div>
  </div>`;
}

function renderTemplatesTab(templates) {
  return `<div class="sa-card">
    <h3>📋 Pre-built Templates</h3>
    <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">Click "Use" to pre-fill the Create Rule form with a template.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
      ${templates.map((t, i) => `
        <div style="border:1px solid var(--border-color,#e2e8f0);border-radius:8px;padding:12px;background:var(--bg-secondary,#f8fafc)">
          <div style="font-weight:700;font-size:0.85rem;margin-bottom:4px">${t.name}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:8px">${t.description}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            ${t.prefix ? `<span class="sa-status-pill sa-pill-blue" style="font-size:0.6rem">Prefix: ${t.prefix}</span>` : ''}
            <span class="sa-status-pill sa-pill-blue" style="font-size:0.6rem">Length: ${t.code_length}</span>
            <span class="sa-status-pill sa-pill-blue" style="font-size:0.6rem">${t.charset}</span>
            <span class="sa-status-pill sa-pill-orange" style="font-size:0.6rem">${t.check_digit_algo}</span>
          </div>
          <button class="btn btn-sm btn-primary" onclick="_cfUseTemplate(${i});_cfSwitchTab('create')">Use Template →</button>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderAuditTab(audit) {
  if (audit.length === 0) return `<div class="sa-card"><div style="text-align:center;padding:40px;color:var(--text-muted)">No audit events yet. Changes to format rules will be logged here.</div></div>`;
  return `<div class="sa-card">
    <h3>📜 Change History</h3>
    <table class="sa-table"><thead><tr><th>Time</th><th>Action</th><th>Rule</th><th>User</th><th>Changes</th></tr></thead><tbody>
      ${audit.map(a => {
    let changes = {};
    try { changes = JSON.parse(a.changes || '{}'); } catch (e) { }
    const changeStr = Object.entries(changes).map(([k, v]) => {
      if (v && typeof v === 'object' && v.from !== undefined) return `${k}: ${v.from} → ${v.to}`;
      return `${k}: ${JSON.stringify(v)}`;
    }).join(', ') || '—';
    return `<tr>
          <td style="font-size:0.72rem;white-space:nowrap">${a.created_at ? new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
          <td><span class="sa-status-pill sa-pill-${a.action === 'created' ? 'green' : a.action === 'deleted' ? 'red' : 'orange'}">${a.action}</span></td>
          <td><strong>${a.rule_name || a.rule_id?.substring(0, 8) || '—'}</strong></td>
          <td style="font-size:0.78rem">${a.actor_name || '—'}</td>
          <td style="font-size:0.72rem;max-width:250px;overflow:hidden;text-overflow:ellipsis">${changeStr}</td>
        </tr>`;
  }).join('')}
    </tbody></table>
  </div>`;
}

function renderStatsTab(rules, stats) {
  const active = rules.filter(r => r.status === 'active').length;
  const paused = rules.filter(r => r.status === 'paused').length;

  return `<div class="sa-card">
    <h3>📊 Format Rule Statistics</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:1.5rem">
      ${m2('Total Rules', rules.length, '#6366f1')}
      ${m2('Active', active, '#16a34a')}
      ${m2('Paused', paused, '#f59e0b')}
      ${m2('Total Codes', stats.total_codes || 0, '#3b82f6')}
    </div>
    ${rules.length > 0 ? `
    <h4 style="margin-bottom:8px;font-size:0.85rem">Per-Rule Usage</h4>
    <table class="sa-table"><thead><tr><th>Rule</th><th>Prefix</th><th>Status</th><th>Codes Generated</th><th>Created</th></tr></thead><tbody>
      ${rules.map(r => `<tr>
        <td><strong>${r.name}</strong></td>
        <td class="sa-code">${r.prefix || '—'}</td>
        <td><span class="sa-status-pill sa-pill-${r.status === 'active' ? 'green' : 'orange'}">${r.status}</span></td>
        <td style="text-align:center;font-weight:600">${(r.codes_generated || r.usage_count || 0).toLocaleString()}</td>
        <td style="font-size:0.78rem;color:var(--text-secondary)">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-US') : '—'}</td>
      </tr>`).join('')}
    </tbody></table>` : '<div style="text-align:center;padding:30px;color:var(--text-muted)">Create some rules to see statistics.</div>'}
  </div>`;
}

export function renderPage() {
  if (!data && !loading) load();
  return `<div id="code-format-root">${renderContent()}</div>`;
}
function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }
function m2(label, value, color) { return `<div style="text-align:center;padding:16px;border-radius:8px;border:1px solid var(--border-color,#e2e8f0)"><div style="font-size:1.5rem;font-weight:800;color:${color}">${typeof value === 'number' ? value.toLocaleString() : value}</div><div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px">${label}</div></div>`; }
