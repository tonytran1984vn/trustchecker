/**
 * TrustChecker – Settings Page
 */
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { timeAgo } from '../utils/helpers.js';
import { escapeHTML } from '../utils/sanitize.js';

export function renderPage() {
  return `
    <div class="settings-grid">
      <!-- MFA Section -->
      <div class="card settings-card">
        <div class="card-header"><div class="card-title">🔐 Two-Factor Authentication</div></div>
        <div class="card-body">
          <div id="mfa-status" class="mfa-status">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- Password Change -->
      <div class="card settings-card">
        <div class="card-header"><div class="card-title">🔑 Change Password</div></div>
        <div class="card-body">
          <div id="pw-msg" class="settings-msg" style="display:none"></div>
          <div class="input-group">
            <label>Current Password</label>
            <input class="input" id="pw-current" type="password" placeholder="Current password">
          </div>
          <div class="input-group">
            <label>New Password</label>
            <input class="input" id="pw-new" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number">
          </div>
          <div class="input-group">
            <label>Confirm New Password</label>
            <input class="input" id="pw-confirm" type="password" placeholder="Confirm new password">
          </div>
          <button class="btn btn-primary" style="margin-top:8px" onclick="changePassword()">Update Password</button>
        </div>
      </div>

      <!-- Active Sessions -->
      <div class="card settings-card" style="grid-column:1/-1">
        <div class="card-header">
          <div class="card-title">📱 Active Sessions</div>
          <button class="btn btn-sm" onclick="revokeAllSessions()">Revoke All Others</button>
        </div>
        <div class="card-body">
          <div id="sessions-list" class="sessions-list">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
export async function loadSettingsData() {
  try {
    const me = await API.get('/auth/me');
    const mfaEl = document.getElementById('mfa-status');
    if (mfaEl) {
      mfaEl.innerHTML = me.user.mfa_enabled ? `
        <div class="mfa-enabled">
          <div class="mfa-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></div>
          <div class="mfa-text">MFA is <strong>enabled</strong></div>
          <div style="margin-top:12px">
            <div class="input-group">
              <label>Enter password to disable MFA</label>
              <input class="input" id="mfa-disable-pw" type="password" placeholder="Your password">
            </div>
            <button class="btn btn-sm" style="background:var(--rose);color:#fff" onclick="disableMfa()">Disable MFA</button>
          </div>
        </div>
      ` : `
        <div class="mfa-disabled">
          <div class="mfa-icon">🔓</div>
          <div class="mfa-text">MFA is <strong>not enabled</strong></div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="setupMfa()">Enable MFA</button>
        </div>
      `;
    }

    const sessRes = await API.get('/auth/sessions');
    const sessList = document.getElementById('sessions-list');
    if (sessList && sessRes.sessions) {
      sessList.innerHTML = sessRes.sessions.length ? sessRes.sessions.map((s, i) => `
        <div class="session-card ${i === 0 ? 'current' : ''}">
          <div class="session-info">
            <div class="session-device">${parseUA(s.user_agent)}</div>
            <div class="session-meta">${escapeHTML(s.ip_address)} • Created ${timeAgo(s.created_at)} • Active ${timeAgo(s.last_active)}</div>
          </div>
          <div class="session-actions">
            ${i === 0 ? '<span class="badge valid">Current</span>' : `<button class="btn btn-sm" onclick="revokeSession('${escapeHTML(s.id)}')">Revoke</button>`}
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-text">No active sessions</div></div>';
    }
  } catch (e) { console.error('Settings load error:', e); }
}
function parseUA(ua) {
  if (!ua) return '🖥️ Unknown Device';
  if (ua.includes('Chrome')) return '🌐 Chrome';
  if (ua.includes('Firefox')) return '🦊 Firefox';
  if (ua.includes('Safari')) return '🧭 Safari';
  if (ua.includes('curl')) return '📟 CLI (curl)';
  return '🖥️ ' + escapeHTML(ua.substring(0, 40));
}
async function setupMfa() {
  try {
    const res = await API.post('/auth/mfa/setup');
    const mfaEl = document.getElementById('mfa-status');
    if (mfaEl) {
      mfaEl.innerHTML = `
        <div class="mfa-setup">
          <div class="mfa-text" style="margin-bottom:12px">Scan this URI with your authenticator app:</div>
          <div class="mfa-qr-uri">${escapeHTML(res.otpauth_url)}</div>
          <div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted)">
            Manual entry key: <code style="color:var(--cyan)">${escapeHTML(res.secret)}</code>
          </div>
          <div class="mfa-backup" style="margin-top:12px">
            <div style="font-weight:600;margin-bottom:4px">Backup Codes (save these!):</div>
            <div class="backup-codes">${res.backup_codes.map(c => `<span class="backup-code">${escapeHTML(c)}</span>`).join('')}</div>
          </div>
          <div class="input-group" style="margin-top:12px">
            <label>Enter code from your app to verify</label>
            <input class="input mfa-code-input" id="mfa-verify-code" type="text" maxlength="6" placeholder="000000"
              oninput="if(this.value.length===6) verifyMfa()" onkeydown="if(event.key==='Enter') verifyMfa()">
          </div>
          <button class="btn btn-primary" onclick="verifyMfa()">Verify & Enable</button>
        </div>
      `;
    }
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function verifyMfa() {
  const code = document.getElementById('mfa-verify-code')?.value;
  if (!code || code.length !== 6) return;
  try {
    await API.post('/auth/mfa/verify', { code });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> MFA enabled successfully!', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function disableMfa() {
  const pw = document.getElementById('mfa-disable-pw')?.value;
  if (!pw) return showToast('Password required', 'error');
  try {
    await API.post('/auth/mfa/disable', { password: pw });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> MFA disabled', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function changePassword() {
  const cur = document.getElementById('pw-current')?.value;
  const nw = document.getElementById('pw-new')?.value;
  const conf = document.getElementById('pw-confirm')?.value;
  const msg = document.getElementById('pw-msg');

  if (!cur || !nw || !conf) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = 'All fields required'; return; }
  if (nw !== conf) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = 'Passwords do not match'; return; }

  try {
    await API.post('/auth/password', { current_password: cur, new_password: nw });
    msg.style.display = 'block'; msg.className = 'settings-msg success'; msg.textContent = 'Password changed successfully';
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } catch (e) { msg.style.display = 'block'; msg.className = 'settings-msg error'; msg.textContent = e.message; }
}
async function revokeSession(id) {
  try {
    await API.post('/auth/revoke', { session_id: id });
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Session revoked', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}
async function revokeAllSessions() {
  try {
    await API.post('/auth/revoke', {});
    showToast('<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> All other sessions revoked', 'success');
    loadSettingsData();
  } catch (e) { showToast('<span class="status-icon status-fail" aria-label="Fail">✗</span> ' + e.message, 'error'); }
}

// Window exports for onclick handlers
window.loadSettingsData = loadSettingsData;
window.parseUA = parseUA;
window.setupMfa = setupMfa;
window.verifyMfa = verifyMfa;
window.disableMfa = disableMfa;
window.changePassword = changePassword;
window.revokeSession = revokeSession;
window.revokeAllSessions = revokeAllSessions;
