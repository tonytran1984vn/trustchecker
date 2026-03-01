/**
 * Account Settings Component
 * Password change + 2FA setup/disable — available to ALL authenticated users.
 * Invoked via sidebar footer ⚙ icon as a modal overlay.
 */

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

const SETTINGS_CSS = `
.acct-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9990;display:flex;align-items:center;justify-content:center;animation:acctFade .15s ease}
.acct-modal{background:var(--bg-card,#fff);border-radius:16px;width:480px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:acctSlide .2s ease}
.acct-hdr{padding:20px 24px 12px;border-bottom:1px solid var(--border,#e2e8f0);display:flex;justify-content:space-between;align-items:center}
.acct-hdr h2{margin:0;font-size:1rem;font-weight:800;color:var(--text-primary,#1e293b)}
.acct-close{background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-muted,#94a3b8);padding:4px 8px;border-radius:8px}
.acct-close:hover{background:var(--border,#e2e8f0)}
.acct-body{padding:20px 24px}
.acct-section{margin-bottom:24px}
.acct-section h3{font-size:0.82rem;font-weight:700;margin:0 0 12px;display:flex;align-items:center;gap:8px}
.acct-label{font-size:0.72rem;color:var(--text-muted,#94a3b8);margin-bottom:4px;font-weight:600}
.acct-input{width:100%;padding:10px 14px;border:1px solid var(--border,#e2e8f0);border-radius:10px;font-size:0.78rem;background:var(--bg-app,#f8fafc);color:var(--text-primary,#1e293b);box-sizing:border-box;outline:none;transition:border .15s}
.acct-input:focus{border-color:#8b5cf6}
.acct-btn{padding:10px 20px;border-radius:10px;border:none;font-size:0.75rem;font-weight:700;cursor:pointer;transition:all .15s}
.acct-btn:disabled{opacity:0.5;cursor:not-allowed}
.acct-btn-primary{background:#8b5cf6;color:#fff}.acct-btn-primary:hover:not(:disabled){background:#7c3aed}
.acct-btn-danger{background:#ef4444;color:#fff}.acct-btn-danger:hover:not(:disabled){background:#dc2626}
.acct-btn-ghost{background:transparent;color:var(--text-muted);border:1px solid var(--border)}
.acct-msg{padding:10px 14px;border-radius:10px;font-size:0.72rem;margin-top:10px;font-weight:600}
.acct-msg-ok{background:#10b98115;color:#10b981;border:1px solid #10b98130}
.acct-msg-err{background:#ef444415;color:#ef4444;border:1px solid #ef444430}
.acct-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:10px;font-size:0.72rem;font-weight:700}
.acct-qr{text-align:center;padding:16px;background:var(--bg-app,#f8fafc);border-radius:12px;border:1px solid var(--border)}
.acct-backup{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
.acct-backup code{background:var(--bg-app,#f1f5f9);padding:6px 10px;border-radius:6px;font-size:0.72rem;text-align:center;font-weight:700;border:1px solid var(--border)}
@keyframes acctFade{from{opacity:0}to{opacity:1}}
@keyframes acctSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
`;

let _mfaStep = 'idle'; // idle | setup | verify | disable
let _mfaData = {};

export function openAccountSettings() {
    // Inject CSS once
    if (!document.getElementById('acct-settings-css')) {
        const style = document.createElement('style');
        style.id = 'acct-settings-css';
        style.textContent = SETTINGS_CSS;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'acct-overlay';
    overlay.id = 'acct-settings-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeAccountSettings(); };

    const user = window.State?.user || {};
    const mfaEnabled = user.mfa_enabled;

    overlay.innerHTML = `
    <div class="acct-modal">
      <div class="acct-hdr">
        <h2>⚙️ Account Settings</h2>
        <button class="acct-close" onclick="window._closeAcctSettings()">✕</button>
      </div>
      <div class="acct-body">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;padding:16px;background:var(--bg-app,#f8fafc);border-radius:12px;border:1px solid var(--border,#e2e8f0)">
          <div style="width:44px;height:44px;border-radius:12px;background:#8b5cf6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem">${(user.email || 'U')[0].toUpperCase()}</div>
          <div>
            <div style="font-weight:700;font-size:0.82rem">${esc(user.email || '')}</div>
            <div style="font-size:0.68rem;color:var(--text-muted)">${esc((user.role || '').replace(/_/g, ' '))} · ${esc(user.org?.name || '')}</div>
          </div>
        </div>

        <div class="acct-section">
          <h3>🔒 Change Password</h3>
          <div style="margin-bottom:10px">
            <div class="acct-label">Current Password</div>
            <input type="password" id="acct-cur-pwd" class="acct-input" placeholder="Enter current password">
          </div>
          <div style="margin-bottom:10px">
            <div class="acct-label">New Password</div>
            <input type="password" id="acct-new-pwd" class="acct-input" placeholder="Min 8 characters">
          </div>
          <div style="margin-bottom:12px">
            <div class="acct-label">Confirm New Password</div>
            <input type="password" id="acct-confirm-pwd" class="acct-input" placeholder="Repeat new password">
          </div>
          <button class="acct-btn acct-btn-primary" onclick="window._acctChangePassword()">🔐 Change Password</button>
          <div id="acct-pwd-msg"></div>
        </div>

        <div class="acct-section" style="border-top:1px solid var(--border,#e2e8f0);padding-top:20px">
          <h3>🛡️ Two-Factor Authentication (2FA)
            <span class="acct-badge" style="background:${mfaEnabled ? '#10b98115' : '#f59e0b15'};color:${mfaEnabled ? '#10b981' : '#f59e0b'}">${mfaEnabled ? '✅ Enabled' : '⚠️ Disabled'}</span>
          </h3>
          <div id="acct-mfa-content">
            ${mfaEnabled ? `
              <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px">2FA is active. You'll be prompted for a code on each login.</p>
              <div style="margin-bottom:10px">
                <div class="acct-label">Enter your password to disable 2FA</div>
                <input type="password" id="acct-mfa-disable-pwd" class="acct-input" placeholder="Your current password">
              </div>
              <button class="acct-btn acct-btn-danger" onclick="window._acctDisableMfa()">🚫 Disable 2FA</button>
            ` : `
              <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px">Protect your account with a TOTP authenticator app (Google Authenticator, Authy, etc.)</p>
              <button class="acct-btn acct-btn-primary" onclick="window._acctSetupMfa()">🛡️ Enable 2FA</button>
            `}
            <div id="acct-mfa-msg"></div>
          </div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);
}

function closeAccountSettings() {
    const overlay = document.getElementById('acct-settings-overlay');
    if (overlay) overlay.remove();
    _mfaStep = 'idle';
    _mfaData = {};
}

// ═══ Password Change ═══
window._acctChangePassword = async function () {
    const curPwd = document.getElementById('acct-cur-pwd')?.value;
    const newPwd = document.getElementById('acct-new-pwd')?.value;
    const confirmPwd = document.getElementById('acct-confirm-pwd')?.value;
    const msgEl = document.getElementById('acct-pwd-msg');

    if (!curPwd || !newPwd) { msgEl.innerHTML = `<div class="acct-msg acct-msg-err">Current and new password required</div>`; return; }
    if (newPwd.length < 8) { msgEl.innerHTML = `<div class="acct-msg acct-msg-err">New password must be at least 8 characters</div>`; return; }
    if (newPwd !== confirmPwd) { msgEl.innerHTML = `<div class="acct-msg acct-msg-err">Passwords do not match</div>`; return; }

    try {
        const API = window.API;
        await API.post('/auth/password', { current_password: curPwd, new_password: newPwd });
        msgEl.innerHTML = `<div class="acct-msg acct-msg-ok">✅ Password changed successfully! You may need to re-login.</div>`;
        document.getElementById('acct-cur-pwd').value = '';
        document.getElementById('acct-new-pwd').value = '';
        document.getElementById('acct-confirm-pwd').value = '';
    } catch (e) {
        const errMsg = e.response?.data?.error || e.message || 'Password change failed';
        msgEl.innerHTML = `<div class="acct-msg acct-msg-err">❌ ${esc(errMsg)}</div>`;
    }
};

// ═══ MFA Setup ═══
window._acctSetupMfa = async function () {
    const mfaContent = document.getElementById('acct-mfa-content');
    const msgEl = document.getElementById('acct-mfa-msg');
    if (!mfaContent) return;

    try {
        const API = window.API;
        const data = await API.post('/auth/mfa/setup', {});
        _mfaData = data;
        _mfaStep = 'verify';

        mfaContent.innerHTML = `
      <div class="acct-qr">
        <div style="font-size:0.75rem;font-weight:700;margin-bottom:10px">Scan this QR code with your authenticator app:</div>
        <div style="margin-bottom:10px">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.otpauth_url)}" alt="QR Code" style="border-radius:8px">
        </div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:6px">Or enter manually:</div>
        <code style="font-size:0.72rem;background:var(--border);padding:6px 12px;border-radius:6px;user-select:all">${data.secret}</code>
      </div>
      <div style="margin-top:12px">
        <div class="acct-label">Enter the 6-digit code from your authenticator:</div>
        <input type="text" id="acct-mfa-code" class="acct-input" placeholder="000000" maxlength="6" style="text-align:center;font-size:1.2rem;letter-spacing:8px;font-weight:800">
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="acct-btn acct-btn-primary" onclick="window._acctVerifyMfa()">✅ Verify & Enable</button>
        <button class="acct-btn acct-btn-ghost" onclick="window._acctCancelMfa()">Cancel</button>
      </div>
      ${data.backup_codes ? `
        <div style="margin-top:16px;padding:12px;background:#f59e0b10;border:1px solid #f59e0b30;border-radius:10px">
          <div style="font-size:0.72rem;font-weight:700;color:#f59e0b;margin-bottom:8px">⚠️ Save these backup codes (one-time use):</div>
          <div class="acct-backup">${data.backup_codes.map(c => `<code>${c}</code>`).join('')}</div>
        </div>
      ` : ''}
      <div id="acct-mfa-msg"></div>
    `;
    } catch (e) {
        const errMsg = e.response?.data?.error || e.message || 'MFA setup failed';
        if (msgEl) msgEl.innerHTML = `<div class="acct-msg acct-msg-err">❌ ${esc(errMsg)}</div>`;
    }
};

window._acctVerifyMfa = async function () {
    const code = document.getElementById('acct-mfa-code')?.value?.trim();
    const msgEl = document.getElementById('acct-mfa-msg');
    if (!code || code.length !== 6) { if (msgEl) msgEl.innerHTML = `<div class="acct-msg acct-msg-err">Enter a 6-digit code</div>`; return; }

    try {
        const API = window.API;
        await API.post('/auth/mfa/verify', { code });
        // Update user state
        if (window.State?.user) window.State.user.mfa_enabled = true;
        closeAccountSettings();
        if (window.showToast) window.showToast('✅ 2FA enabled successfully!', 'success');
    } catch (e) {
        const errMsg = e.response?.data?.error || e.message || 'Invalid code';
        if (msgEl) msgEl.innerHTML = `<div class="acct-msg acct-msg-err">❌ ${esc(errMsg)}</div>`;
    }
};

window._acctCancelMfa = function () {
    closeAccountSettings();
    openAccountSettings(); // Re-open fresh
};

// ═══ MFA Disable ═══
window._acctDisableMfa = async function () {
    const pwd = document.getElementById('acct-mfa-disable-pwd')?.value;
    const msgEl = document.getElementById('acct-mfa-msg');
    if (!pwd) { if (msgEl) msgEl.innerHTML = `<div class="acct-msg acct-msg-err">Password required to disable 2FA</div>`; return; }

    try {
        const API = window.API;
        await API.post('/auth/mfa/disable', { password: pwd });
        if (window.State?.user) window.State.user.mfa_enabled = false;
        closeAccountSettings();
        if (window.showToast) window.showToast('2FA disabled', 'info');
    } catch (e) {
        const errMsg = e.response?.data?.error || e.message || 'Failed to disable 2FA';
        if (msgEl) msgEl.innerHTML = `<div class="acct-msg acct-msg-err">❌ ${esc(errMsg)}</div>`;
    }
};

window._closeAcctSettings = closeAccountSettings;
window._openAcctSettings = openAccountSettings;
