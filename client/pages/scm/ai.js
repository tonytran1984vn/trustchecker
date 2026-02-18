/**
 * TrustChecker – Scm Ai Page
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';
import { showToast } from '../../components/toast.js';

export function renderPage() {
  const d = State.aiData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading AI models...</span></div>';
  const f = d.forecast || {};
  const s = d.sensing || {};
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">🧠</div><div class="stat-value">${f.algorithm ? 'Active' : 'Off'}</div><div class="stat-label">Holt-Winters</div></div>
      <div class="stat-card violet"><div class="stat-icon">📈</div><div class="stat-value">${(f.forecast || []).length}</div><div class="stat-label">Forecast Periods</div></div>
      <div class="stat-card ${s.change_detected ? 'rose' : 'emerald'}"><div class="stat-icon">⚡</div><div class="stat-value">${s.change_detected ? 'Detected!' : 'Stable'}</div><div class="stat-label">Demand Shift</div></div>
      <div class="stat-card amber"><div class="stat-icon">🎯</div><div class="stat-value">${s.data_points || 0}</div><div class="stat-label">Data Points</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📈 Demand Forecast (Holt-Winters)</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" onclick="runMonteCarlo()">🎲 Monte Carlo</button>
          <button class="btn btn-sm" onclick="runRootCause()">🔍 Root Cause</button>
          <button class="btn btn-sm" onclick="runWhatIf()">🔮 What-If</button>
        </div>
      </div>
      <div style="padding:16px">
        <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap">
          <div><span style="color:var(--text-muted);font-size:0.8rem">MAE</span><br><strong>${f.model_fit?.MAE?.toFixed(2) || '—'}</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.8rem">MAPE</span><br><strong>${f.model_fit?.MAPE?.toFixed(1) || '—'}%</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.8rem">Season Length</span><br><strong>${f.season_length || '—'}</strong></div>
        </div>
        <div class="mini-chart-row">
          ${(f.forecast || []).slice(0, 14).map((v, i) => {
    const h = Math.max(5, Math.min(60, v / 2));
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:20px;height:${h}px;background:var(--cyan);border-radius:4px" title="Period ${i + 1}: ${v.toFixed(1)}"></div><span style="font-size:0.6rem;color:var(--text-muted)">${i + 1}</span></div>`;
  }).join('')}
        </div>
      </div>
    </div>
    <div id="ai-result" class="card" style="margin-top:20px;display:none">
      <div class="card-header"><div class="card-title" id="ai-result-title">—</div></div>
      <pre id="ai-result-data" style="padding:16px;font-size:0.8rem;max-height:400px;overflow:auto;background:var(--bg-tertiary);border-radius:8px;color:var(--text-primary)"></pre>
    </div>`;
}
async function runMonteCarlo() {
  try { showToast('🎲 Running Monte Carlo...', 'info'); const r = await API.post('/scm/ai/monte-carlo', {}); showAIResult('🎲 Monte Carlo Risk Simulation', r); } catch (e) { showToast('❌ ' + e.message, 'error'); }
}
async function runRootCause() {
  try { showToast('🔍 Analyzing delays...', 'info'); const r = await API.get('/scm/ai/delay-root-cause'); showAIResult('🔍 Causal Delay Analysis', r); } catch (e) { showToast('❌ ' + e.message, 'error'); }
}
async function runWhatIf() {
  try { showToast('🔮 Simulating...', 'info'); const r = await API.post('/scm/ai/what-if', { type: 'partner_failure', severity: 0.3 }); showAIResult('🔮 What-If Simulation', r); } catch (e) { showToast('❌ ' + e.message, 'error'); }
}
function showAIResult(title, data) {
  const el = document.getElementById('ai-result'); if (el) { el.style.display = 'block'; }
  const t = document.getElementById('ai-result-title'); if (t) { t.textContent = title; }
  const d = document.getElementById('ai-result-data'); if (d) { d.textContent = JSON.stringify(data, null, 2); }
}

// Window exports for onclick handlers
window.runMonteCarlo = runMonteCarlo;
window.runRootCause = runRootCause;
window.runWhatIf = runWhatIf;
window.showAIResult = showAIResult;
