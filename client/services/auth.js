/**
 * TrustChecker – Auth Service
 * Login, MFA, Logout handlers.
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { loadFeatureFlags } from '../core/features.js';
import { connectWS } from '../core/websocket.js';
import { loadBranding } from './branding.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';
import { escapeHTML } from '../utils/sanitize.js';

let _mfaToken = null;

export function renderLogin() {
  return `
    <div class="login-container">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">🛡️</div>
          <div class="login-logo-text">TrustChecker</div>
          <div class="login-logo-sub">Digital Trust Infrastructure</div>
        </div>
        <div id="login-error" class="alert-error" style="display:none"></div>
        ${_mfaToken ? `
          <div class="input-group">
            <label>MFA Code (6 digits)</label>
            <input type="text" id="mfa-code" class="input" placeholder="000000" maxlength="6" autocomplete="one-time-code"
              onkeydown="if(event.key==='Enter')doMfaVerify()">
          </div>
          <button class="btn btn-primary" style="width:100%" onclick="doMfaVerify()">Verify MFA</button>
        ` : `
          <div class="input-group">
            <label>Email</label>
            <input type="email" id="login-user" class="input" placeholder="admin@company.com" autocomplete="email"
              onkeydown="if(event.key==='Enter')document.getElementById('login-pass').focus()">
          </div>
          <div class="input-group">
            <label>Password</label>
            <input type="password" id="login-pass" class="input" placeholder="••••••••" autocomplete="current-password"
              onkeydown="if(event.key==='Enter')doLogin()">
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="doLogin()">Sign In</button>
          <div class="login-footer">
            <a href="#" onclick="navigate('pricing')">Pricing</a> ·
            <a href="check.html" target="_blank" rel="noopener noreferrer">Public Verify</a>
          </div>
        `}
      </div>
    </div>
  `;
}

export async function doLogin() {
  const email = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  if (!email || !password) {
    errEl.style.display = 'block';
    errEl.textContent = 'Please enter email and password';
    return;
  }

  // Show loading state on button
  const btn = document.querySelector('.login-card .btn-primary');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled = true; }

  try {
    const res = await API.post('/auth/login', { email, password });

    if (res.mfa_required) {
      _mfaToken = res.mfa_token;
      render();
      setTimeout(() => document.getElementById('mfa-code')?.focus(), 100);
      return;
    }

    // Force password change check
    if (res.must_change_password) {
      errEl.style.display = 'block';
      errEl.textContent = '🔒 Password change required. Please contact your admin.';
      if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
      return;
    }

    API.setToken(res.token, res.refresh_token);
    State.user = res.user;
    State.plan = res.user?.plan || 'free';
    localStorage.setItem('tc_user', JSON.stringify(res.user));
    sessionStorage.setItem('tc_user', JSON.stringify(res.user));

    await Promise.all([loadFeatureFlags(), loadBranding()]);

    connectWS();
    navigate('dashboard');
    showToast('✅ Welcome back, ' + escapeHTML(res.user.email), 'success');
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent = e.message;
    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
  }
}

export async function doMfaVerify() {
  const code = document.getElementById('mfa-code')?.value;
  const errEl = document.getElementById('login-error');
  if (!code || code.length !== 6) return;
  try {
    const res = await API.post('/auth/login', { mfa_token: _mfaToken, mfa_code: code });
    _mfaToken = null;
    API.setToken(res.token, res.refresh_token);
    State.user = res.user;
    State.plan = res.user?.plan || 'free';
    localStorage.setItem('tc_user', JSON.stringify(res.user));
    sessionStorage.setItem('tc_user', JSON.stringify(res.user));

    await Promise.all([loadFeatureFlags(), loadBranding()]);

    connectWS();
    navigate('dashboard');
    showToast('✅ Welcome back, ' + escapeHTML(res.user.email) + ' (MFA verified)', 'success');
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent = e.message;
  }
}

export function doLogout() {
  API.clearToken();
  State.user = null;
  render();
}

window.doLogin = doLogin;
window.doMfaVerify = doMfaVerify;
window.doLogout = doLogout;
