/**
 * TrustChecker – Reports Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';

export function renderPage() {
  const d = State.reportsData;
  if (!d) return '<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading reports...</span></div>';
  return `
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">📊</div><div class="stat-value">${(d.templates || []).length}</div><div class="stat-label">Report Templates</div></div>
      <div class="stat-card violet"><div class="stat-icon">📋</div><div class="stat-value">${d.formats?.length || 3}</div><div class="stat-label">Export Formats</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">📊 Report Templates</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:16px">
        ${(d.templates || []).map(t => `
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:12px;cursor:pointer" onclick="generateReport('${t.id}')">
            <div style="font-weight:700;margin-bottom:4px">${t.name || t.id}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">${t.description || ''}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${(t.sections || []).map(s => `<span class="badge">${s}</span>`).join('')}</div>
            <button class="btn btn-sm" style="margin-top:12px;width:100%">📄 Generate</button>
          </div>`).join('')}
      </div>
    </div>`;
}
async function generateReport(templateId) {
  try { showToast('📊 Generating report...', 'info'); const r = await API.get(`/reports/generate/${templateId}`); downloadJSON(r, `report_${templateId}.json`); showToast('✅ Report generated', 'success'); } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

// Window exports for onclick handlers
window.generateReport = generateReport;
