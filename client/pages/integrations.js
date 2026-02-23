/**
 * TrustChecker – Integrations Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';

export function renderPage() {
  const schema = State.integrationsSchema;
  const data = State.integrationsData || {};
  if (!schema) return `<div class="empty-state"><div class="empty-icon">🔌</div><div class="empty-text">Loading integrations...</div></div>`;

  const cards = Object.entries(schema).map(([cat, def]) => {
    const catData = data[cat] || {};
    const isEnabled = catData.enabled?.value === 'true';
    const hasAnyValue = Object.keys(catData).length > 0;
    const lastUpdate = Object.values(catData).find(v => v.updated_at)?.updated_at;

    return `
      <div class="integration-card ${isEnabled ? 'integration-active' : ''}" id="integ-${cat}">
        <div class="integration-header" onclick="toggleIntegSection('${cat}')">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:1.8rem">${def.icon}</span>
            <div>
              <div class="integration-title">${def.label}</div>
              <div class="integration-desc">${def.description}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${isEnabled ? '<span class="integration-status status-active">● Active</span>' : hasAnyValue ? '<span class="integration-status status-configured">● Configured</span>' : '<span class="integration-status status-inactive">○ Not configured</span>'}
            <span class="integration-chevron" id="chevron-${cat}">▶</span>
          </div>
        </div>
        <div class="integration-body" id="body-${cat}" style="display:none">
          <div class="integration-fields">
            ${def.settings.map(s => {
      const current = catData[s.key];
      const currentVal = current?.value || '';
      return `
              <div class="integration-field">
                <label class="integration-label">
                  ${s.label}
                  ${s.secret ? '<span class="secret-badge">🔒 ENCRYPTED</span>' : ''}
                </label>
                <div style="display:flex;gap:8px">
                  <input class="input integration-input" 
                    id="integ-${cat}-${s.key}"
                    type="${s.secret ? 'password' : 'text'}" 
                    placeholder="${s.placeholder}"
                    value="${currentVal}"
                    autocomplete="off"
                  >
                  ${s.secret ? `<button class="btn btn-sm" onclick="toggleIntegSecret('integ-${cat}-${s.key}')" title="Show/Hide" style="min-width:36px">👁</button>` : ''}
                </div>
                ${current?.updated_at ? `<div class="integration-meta">Last updated: ${new Date(current.updated_at).toLocaleString()} by ${current.updated_by || 'admin'}</div>` : ''}
              </div>`;
    }).join('')}
          </div>
          <div class="integration-actions">
            <button class="btn btn-primary" onclick="saveIntegration('${cat}')">💾 Save</button>
            <button class="btn btn-secondary" onclick="testIntegration('${cat}')">🔗 Test Connection</button>
            <button class="btn btn-danger" onclick="clearIntegration('${cat}')">🗑️ Clear All</button>
          </div>
          <div id="integ-test-${cat}" class="integration-test-result" style="display:none"></div>
          ${lastUpdate ? `<div class="integration-meta" style="margin-top:8px;text-align:right">Last saved: ${new Date(lastUpdate).toLocaleString()}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="integrations-container">
      <div class="card" style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(88,86,214,0.08))">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">🔐</span>
          <div>
            <strong>API Key Security</strong>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">
              All secret keys are encrypted with AES-256 at rest. Only admins can view/modify these settings.
              Values with 🔒 are stored securely and shown masked.
            </div>
          </div>
        </div>
      </div>
      ${cards}
    </div>`;
}
function toggleIntegSection(cat) {
  const body = document.getElementById('body-' + cat);
  const chev = document.getElementById('chevron-' + cat);
  if (body.style.display === 'none') {
    body.style.display = 'block';
    chev.textContent = '▼';
    chev.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'none';
    chev.textContent = '▶';
  }
}
function toggleIntegSecret(inputId) {
  const inp = document.getElementById(inputId);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}
async function saveIntegration(cat) {
  try {
    const schema = State.integrationsSchema[cat];
    if (!schema) return;
    const payload = {};
    for (const s of schema.settings) {
      const inp = document.getElementById(`integ-${cat}-${s.key}`);
      if (inp) payload[s.key] = inp.value;
    }
    const result = await API.put(`/integrations/${cat}`, payload);
    showToast(`<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ${result.message}`, 'success');
    // Reload data
    State.integrationsData = await API.get('/integrations');
    render();
    // Re-open this section
    setTimeout(() => {
      const body = document.getElementById('body-' + cat);
      const chev = document.getElementById('chevron-' + cat);
      if (body) { body.style.display = 'block'; chev.textContent = '▼'; }
    }, 100);
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function testIntegration(cat) {
  const resultEl = document.getElementById('integ-test-' + cat);
  if (!resultEl) return;
  resultEl.style.display = 'block';
  resultEl.textContent = '⏳ Testing connection...';
  resultEl.style.color = 'var(--text-muted)';
  try {
    const result = await API.get(`/integrations/${cat}/test`);
    if (result.status === 'ok') {
      resultEl.textContent = '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> ' + (result.message || 'Connection successful');
      resultEl.style.color = 'var(--success)';
    } else if (result.status === 'disabled') {
      resultEl.textContent = '<span class="status-icon status-warn" aria-label="Warning">!</span> ' + (result.message || 'Integration disabled');
      resultEl.style.color = 'var(--warning)';
    } else {
      resultEl.textContent = '<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + (result.message || 'Test failed');
      resultEl.style.color = 'var(--danger)';
    }
  } catch (e) {
    resultEl.textContent = '<span class="status-icon status-fail" aria-label="Fail">✗</span> Test failed: ' + (e.message || 'Unknown error');
    resultEl.style.color = 'var(--danger)';
  }
}
async function clearIntegration(cat) {
  if (!confirm(`Clear all settings for this integration? This cannot be undone.`)) return;
  try {
    await API.delete(`/integrations/${cat}`);
    showToast('🗑️ Settings cleared', 'info');
    State.integrationsData = await API.get('/integrations');
    render();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// Window exports for onclick handlers
window.toggleIntegSection = toggleIntegSection;
window.toggleIntegSecret = toggleIntegSecret;
window.saveIntegration = saveIntegration;
window.testIntegration = testIntegration;
window.clearIntegration = clearIntegration;
