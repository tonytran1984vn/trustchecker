/**
 * TrustChecker – Supplier Dashboard
 * My Trust Score, Profile, Network, Improvements
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { scoreColor } from '../utils/helpers.js';

export function renderPage() {
  const profile = State.supplierProfile?.profile || null;
  const scores = State.supplierScores || [];
  const improvements = State.supplierImprovements?.suggestions || [];
  const latestScore = scores[0] || {};

  // Score factors
  const factors = [
    { label: 'Compliance', val: latestScore.compliance_factor, icon: '📋', color: '#6366f1' },
    { label: 'Delivery', val: latestScore.delivery_factor || latestScore.consistency_factor, icon: '🚚', color: '#06b6d4' },
    { label: 'Quality', val: latestScore.quality_factor || latestScore.fraud_factor, icon: '✅', color: '#22c55e' },
    { label: 'Financial', val: latestScore.financial_factor || latestScore.history_factor, icon: '💰', color: '#f59e0b' },
  ];

  return `
    <style>
      .sup-hero { text-align: center; margin-bottom: 30px; }
      .sup-hero h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 4px; }
      .sup-hero p { color: var(--text-muted); font-size: 0.82rem; }

      .sup-score-ring { position: relative; width: 180px; height: 180px; margin: 20px auto; }
      .sup-score-ring svg { width: 100%; height: 100%; }
      .sup-score-val { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
      .sup-score-num { font-size: 3rem; font-weight: 800; }
      .sup-score-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; }

      .sup-factors { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
      @media (max-width: 700px) { .sup-factors { grid-template-columns: repeat(2, 1fr); } }
      .sup-factor { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
      .sup-factor-icon { font-size: 1.4rem; margin-bottom: 6px; }
      .sup-factor-val { font-size: 1.6rem; font-weight: 800; }
      .sup-factor-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

      .sup-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 900px) { .sup-sections { grid-template-columns: 1fr; } }

      .sup-panel { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
      .sup-panel-title { font-size: 0.92rem; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

      .sup-profile-field { margin-bottom: 12px; }
      .sup-profile-field label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .sup-profile-field input, .sup-profile-field textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.82rem; color: var(--text); font-family: inherit; }
      .sup-profile-field textarea { resize: vertical; min-height: 60px; }

      .sup-save-btn { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 600; font-size: 0.82rem; cursor: pointer; }

      .sup-improvement { padding: 12px 14px; background: var(--bg); border-radius: 10px; margin-bottom: 8px; }
      .sup-improvement-title { font-weight: 600; font-size: 0.82rem; margin-bottom: 4px; }
      .sup-improvement-desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }
      .sup-improvement-impact { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-top: 4px; background: rgba(34,197,94,0.15); color: #22c55e; }

      .sup-empty { text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.82rem; }
    
      .sup-my-badge { display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 14px; font-size: 0.85rem; text-align: left; }
      .sup-my-badge-premium { background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1)); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; }
      .sup-my-badge-trusted { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #818cf8; }
      .sup-my-badge-verified { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); color: #4ade80; }
      .sup-my-badge-none { background: rgba(100,116,139,0.1); border: 1px solid rgba(100,116,139,0.2); color: #94a3b8; }
    </style>

    <!-- Hero -->
    <div class="sup-hero">
      <h1>${profile?.public_name || 'My Supplier Profile'}</h1>
      <p>${profile?.country || ''} ${profile?.is_published ? '• 🌐 Public Profile' : '• 🔒 Private'}</p>
    </div>

    <!-- Trust Score Ring -->
    <div class="sup-score-ring">
      <svg viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="78" fill="none" stroke="var(--border)" stroke-width="8"/>
        <circle cx="90" cy="90" r="78" fill="none" stroke="${scoreColor(latestScore.score || profile?.public_trust_score || 0)}" stroke-width="8"
          stroke-dasharray="${((latestScore.score || profile?.public_trust_score || 0) / 100) * 490} 490"
          stroke-linecap="round" transform="rotate(-90 90 90)" style="transition: stroke-dasharray 1s ease"/>
      </svg>
      <div class="sup-score-val">
        <div class="sup-score-num" style="color:${scoreColor(latestScore.score || profile?.public_trust_score || 0)}">${latestScore.score || profile?.public_trust_score || '—'}</div>
        <div class="sup-score-label">Trust Score</div>
      </div>
    </div>

    
    <!-- My Badge -->
    <div style="text-align:center;margin-bottom:24px">
      ${(() => {
        const s = latestScore.score || profile?.public_trust_score || 0;
        const kyc = profile?.kyc_status || 'pending';
        if (s >= 92)
          return '<div class="sup-my-badge sup-my-badge-premium"><span style="font-size:1.5rem">⭐</span><div><strong>Premium Partner</strong><div style="font-size:0.7rem;opacity:0.7">Top-tier verified supplier</div></div></div>';
        if (s >= 80 && kyc === 'verified')
          return '<div class="sup-my-badge sup-my-badge-trusted"><span style="font-size:1.5rem">🛡️</span><div><strong>Trusted</strong><div style="font-size:0.7rem;opacity:0.7">Verified & reliable partner</div></div></div>';
        if (kyc === 'verified')
          return '<div class="sup-my-badge sup-my-badge-verified"><span style="font-size:1.5rem">✅</span><div><strong>Verified</strong><div style="font-size:0.7rem;opacity:0.7">Identity confirmed</div></div></div>';
        return '<div class="sup-my-badge sup-my-badge-none"><span style="font-size:1.5rem">🔓</span><div><strong>Unverified</strong><div style="font-size:0.7rem;opacity:0.7">Complete your profile to earn badges</div></div></div>';
      })()}
    </div>

    <!-- Factors -->
    <div class="sup-factors">
      ${factors.map(f => `
        <div class="sup-factor">
          <div class="sup-factor-icon">${f.icon}</div>
          <div class="sup-factor-val" style="color:${f.color}">${f.val != null ? Math.round(f.val * 100) : '—'}</div>
          <div class="sup-factor-label">${f.label}</div>
        </div>
      `).join('')}
    </div>

    <!-- Profile + Improvements -->
    <div class="sup-sections">
      <div class="sup-panel">
        <div class="sup-panel-title">🏭 My Profile</div>
        <form onsubmit="saveSupplierProfile(event)">
          <div class="sup-profile-field">
            <label>Company Name</label>
            <input type="text" id="sp-name" value="${profile?.public_name || ''}" />
          </div>
          <div class="sup-profile-field">
            <label>Description</label>
            <textarea id="sp-desc">${profile?.description || ''}</textarea>
          </div>
          <div class="sup-profile-field">
            <label>Website</label>
            <input type="url" id="sp-website" value="${profile?.website || ''}" placeholder="https://" />
          </div>
          <div class="sup-profile-field">
            <label>Country</label>
            <input type="text" id="sp-country" value="${profile?.country || ''}" />
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <label style="font-size:0.78rem;cursor:pointer">
              <input type="checkbox" id="sp-public" ${profile?.is_published ? 'checked' : ''} /> Make profile public
            </label>
          </div>
          <button type="submit" class="sup-save-btn">Save Profile</button>
        </form>
      </div>

      <div class="sup-panel">
        <div class="sup-panel-title">💡 Improvement Plan</div>
        ${improvements.length === 0 ? '<div class="sup-empty">Complete your profile to receive AI-powered improvement suggestions</div>' :
          improvements.map(imp => `
            <div class="sup-improvement">
              <div class="sup-improvement-title">${imp.title || imp.area || 'Suggestion'}</div>
              <div class="sup-improvement-desc">${imp.description || imp.recommendation || ''}</div>
              ${imp.impact ? '<span class="sup-improvement-impact">+' + imp.impact + ' score impact</span>' : ''}
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

// Global: save profile
window.saveSupplierProfile = async function(e) {
  e.preventDefault();
  try {
    const res = await API.put('/supplier-portal/my/profile', {
      public_name: document.getElementById('sp-name').value.trim(),
      description: document.getElementById('sp-desc').value.trim(),
      website: document.getElementById('sp-website').value.trim(),
      country: document.getElementById('sp-country').value.trim(),
      is_published: document.getElementById('sp-public').checked
    });
    if (res.status === 'saved') {
      showToast('Profile saved successfully', 'success');
      State.supplierProfile = { profile: res.profile };
    } else {
      showToast('Failed to save profile', 'error');
    }
  } catch (e) {
    showToast(e.message || 'Failed to save profile', 'error');
  }
};
