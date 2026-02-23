/**
 * TrustChecker – Branding Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';

export function renderPage() {
  const d = State.brandingData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading branding settings...</span></div>';
  return `
    <div class="card">
      <div class="card-header"><div class="card-title">🎨 White-Label Configuration</div></div>
      <div style="padding:20px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
          <div>
            <label class="form-label">Company Name</label>
            <input class="form-input" value="${d.company_name || 'TrustChecker'}" id="brand-name" />
          </div>
          <div>
            <label class="form-label">Primary Color</label>
            <div style="display:flex;gap:8px;align-items:center"><input type="color" value="${d.primary_color || '#06b6d4'}" id="brand-color" style="width:40px;height:40px;border:none;cursor:pointer"/><code>${d.primary_color || '#06b6d4'}</code></div>
          </div>
          <div>
            <label class="form-label">Logo URL</label>
            <input class="form-input" value="${d.logo_url || ''}" placeholder="https://..." id="brand-logo" />
          </div>
          <div>
            <label class="form-label">Support Email</label>
            <input class="form-input" value="${d.support_email || ''}" placeholder="support@company.com" id="brand-email" />
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px">
          <button class="btn" onclick="saveBranding()">💾 Save Branding</button>
          <button class="btn btn-secondary" onclick="resetBranding()">↩️ Reset to Default</button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">👁️ Preview</div></div>
      <div style="padding:20px;background:var(--bg-tertiary);border-radius:8px;display:flex;align-items:center;gap:16px">
        ${d.logo_url ? `<img src="${d.logo_url}" alt="Organization logo" style="height:48px;border-radius:8px"/>` : '<div style="width:48px;height:48px;background:var(--cyan);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem">🛡️</div>'}
        <div>
          <div style="font-weight:700;font-size:1.2rem">${d.company_name || 'TrustChecker'}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Enterprise Digital Trust Platform</div>
        </div>
      </div>
    </div>`;
}
async function saveBranding() {
  try {
    await API.put('/branding', { company_name: document.getElementById('brand-name')?.value, primary_color: document.getElementById('brand-color')?.value, logo_url: document.getElementById('brand-logo')?.value, support_email: document.getElementById('brand-email')?.value });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Branding saved', 'success');
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function resetBranding() {
  try { await API.delete('/branding'); showToast('↩️ Branding reset', 'info'); loadPageData('branding'); } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// Window exports for onclick handlers
window.saveBranding = saveBranding;
window.resetBranding = resetBranding;
