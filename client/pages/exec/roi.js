/**
 * Executive – Platform ROI (Dedicated Page)
 * ═══════════════════════════════════════════
 * Deep view: ROI breakdown, cost analysis, projections, monthly trends
 * API: /owner/ccs/roi + /owner/ccs/trends
 */
import { icon } from '../../core/icons.js';
import { API as api } from '../../core/api.js';

let _roi = null;
let _trends = null;

export function renderPage() {
    if (!_roi) { loadData(); return loadingState(); }
    const r = _roi;
    const fmtM = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v;
    const fmtFull = v => '$' + Math.round(v).toLocaleString();

    const totalValue = (r.detection_value || 0) + (r.cost_savings || 0);
    const dvPct = totalValue > 0 ? Math.round((r.detection_value || 0) / totalValue * 100) : 0;
    const csPct = 100 - dvPct;

    // Monthly value for projection
    const monthlyValue = r.months_active > 0 ? totalValue / r.months_active : 0;
    const annualProjection = monthlyValue * 12;

    return `
    <div class="exec-page">
      <div class="exec-header">
        <h1>${icon('creditCard', 28)} Platform ROI Intelligence</h1>
        <div class="exec-timestamp">${r.months_active || 0} months active · ${(r.total_scans || 0).toLocaleString()} scans processed</div>
      </div>

      <!-- ROI Hero -->
      <section class="exec-section">
        <div style="text-align:center;padding:2rem;background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(34,197,94,0.05));border-radius:16px;border:1px solid rgba(99,102,241,0.15)">
          <div style="font-size:0.75rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em">Return on Investment</div>
          <div style="font-size:3.5rem;font-weight:900;background:linear-gradient(135deg,#22c55e,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:8px 0">${r.roi_multiple || 0}x</div>
          <div style="font-size:0.85rem;opacity:0.6">Every $1 invested returns $${r.roi_multiple || 0} in value</div>
          <div style="margin-top:12px;display:flex;justify-content:center;gap:24px;font-size:0.75rem">
            <span>💰 Total Value: <strong>${fmtM(totalValue)}</strong></span>
            <span>💳 Platform Cost: <strong>${fmtFull(r.platform_cost || 0)}</strong></span>
            <span>⏱️ Payback: <strong>${r.payback_months || 0} months</strong></span>
          </div>
        </div>
      </section>

      <!-- Value Breakdown -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('layers', 20)} Value Breakdown</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <!-- Detection Value -->
          <div style="background:linear-gradient(135deg,rgba(34,197,94,0.08),transparent);border:1px solid rgba(34,197,94,0.15);border-radius:14px;padding:20px">
            <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em">Detection Value</div>
            <div style="font-size:1.8rem;font-weight:800;color:#22c55e;margin:6px 0">${fmtM(r.detection_value || 0)}</div>
            <div style="font-size:0.75rem;opacity:0.6;margin-bottom:12px">${dvPct}% of total value generated</div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:12px">
              <div style="width:${dvPct}%;height:100%;background:#22c55e;border-radius:3px"></div>
            </div>
            <div style="font-size:0.72rem;opacity:0.5;line-height:1.8">
              🔍 Counterfeits detected: <strong>${(r.counterfeits_detected || 0).toLocaleString()}</strong><br>
              💲 Avg unit value: <strong>${fmtFull(r.avg_unit_value || 0)}</strong><br>
              📊 Formula: counterfeits × unit value
            </div>
          </div>
          <!-- Cost Savings -->
          <div style="background:linear-gradient(135deg,rgba(99,102,241,0.08),transparent);border:1px solid rgba(99,102,241,0.15);border-radius:14px;padding:20px">
            <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.08em">Manual Cost Savings</div>
            <div style="font-size:1.8rem;font-weight:800;color:#6366f1;margin:6px 0">${fmtM(r.cost_savings || 0)}</div>
            <div style="font-size:0.75rem;opacity:0.6;margin-bottom:12px">${csPct}% of total value generated</div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:12px">
              <div style="width:${csPct}%;height:100%;background:#6366f1;border-radius:3px"></div>
            </div>
            <div style="font-size:0.72rem;opacity:0.5;line-height:1.8">
              📦 Total scans: <strong>${(r.total_scans || 0).toLocaleString()}</strong><br>
              💲 Manual cost/check: <strong>$${r.manual_cost_per_check || 5}</strong><br>
              📊 Formula: scans × manual cost
            </div>
          </div>
        </div>
      </section>

      <!-- Protection Metrics -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('shield', 20)} Protection Metrics</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${metricCard('Revenue Protected', fmtM(r.protected_revenue || 0), 'Fraud loss avoided', '#22c55e')}
          ${metricCard('Auth Rate', (r.authentication_rate || 0) + '%', 'Detection effectiveness', '#6366f1')}
          ${metricCard('Cost/Detection', '$' + (r.cost_per_detection || 0), 'Platform cost per flag', '#f59e0b')}
          ${metricCard('Avg Detection Time', (r.avg_detection_days || 0) + ' days', 'Time to first detection', '#06b6d4')}
        </div>
      </section>

      <!-- Cost vs Value Comparison -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('barChart', 20)} Cost vs Value Analysis</h2>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px">
          ${renderCostValueBar(r)}
        </div>
      </section>

      <!-- Projections -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('star', 20)} Annual Projection</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;text-align:center">
            <div style="font-size:0.68rem;opacity:0.5">Monthly Value</div>
            <div style="font-size:1.5rem;font-weight:800;color:#22c55e;margin:6px 0">${fmtM(monthlyValue)}</div>
            <div style="font-size:0.68rem;opacity:0.4">based on ${r.months_active} months data</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;text-align:center">
            <div style="font-size:0.68rem;opacity:0.5">Annual Projection</div>
            <div style="font-size:1.5rem;font-weight:800;color:#6366f1;margin:6px 0">${fmtM(annualProjection)}</div>
            <div style="font-size:0.68rem;opacity:0.4">monthly × 12</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;text-align:center">
            <div style="font-size:0.68rem;opacity:0.5">Annual ROI</div>
            <div style="font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,#22c55e,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:6px 0">${r.platform_cost > 0 ? Math.round(annualProjection / r.platform_cost) : 0}x</div>
            <div style="font-size:0.68rem;opacity:0.4">projected full-year return</div>
          </div>
        </div>
      </section>

      <!-- Scan Breakdown -->
      <section class="exec-section">
        <h2 class="exec-section-title">${icon('search', 20)} Scan Breakdown</h2>
        <table class="ccs-table" style="font-size:0.82rem">
          <thead><tr><th>Metric</th><th>Count</th><th>% of Total</th><th>Value Impact</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>✅ Authentic</strong></td>
              <td>${((r.total_scans || 0) - (r.counterfeits_detected || 0) - (r.suspicious_flagged || 0)).toLocaleString()}</td>
              <td>${r.authentication_rate || 0}%</td>
              <td style="color:#22c55e">Brand trust maintained</td>
            </tr>
            <tr>
              <td><strong>⚠️ Suspicious</strong></td>
              <td>${(r.suspicious_flagged || 0).toLocaleString()}</td>
              <td>${r.total_scans > 0 ? Math.round((r.suspicious_flagged || 0) / r.total_scans * 100) : 0}%</td>
              <td style="color:#f59e0b">Under investigation</td>
            </tr>
            <tr>
              <td><strong>🚫 Counterfeit</strong></td>
              <td>${(r.counterfeits_detected || 0).toLocaleString()}</td>
              <td>${r.total_scans > 0 ? Math.round((r.counterfeits_detected || 0) / r.total_scans * 100) : 0}%</td>
              <td style="color:#ef4444">${fmtM(r.detection_value || 0)} protected</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function metricCard(label, value, sub, color) {
    return `
    <div style="background:linear-gradient(135deg,${color}08,transparent);border:1px solid ${color}20;border-radius:12px;padding:16px;text-align:center">
      <div style="font-size:0.68rem;opacity:0.5">${label}</div>
      <div style="font-size:1.3rem;font-weight:800;color:${color};margin:6px 0">${value}</div>
      <div style="font-size:0.65rem;opacity:0.4">${sub}</div>
    </div>`;
}

function renderCostValueBar(r) {
    const totalValue = (r.detection_value || 0) + (r.cost_savings || 0);
    const platformCost = r.platform_cost || 6000;
    const maxVal = Math.max(totalValue, platformCost);
    const costW = Math.max(2, Math.round(platformCost / maxVal * 100));
    const valW = Math.max(2, Math.round(totalValue / maxVal * 100));
    const fmtM = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v;

    return `
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:6px">
        <span style="opacity:0.5">Platform Cost</span>
        <span style="font-weight:700">${fmtM(platformCost)}</span>
      </div>
      <div style="height:20px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden">
        <div style="width:${costW}%;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b);border-radius:10px"></div>
      </div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:6px">
        <span style="opacity:0.5">Total Value Generated</span>
        <span style="font-weight:700;color:#22c55e">${fmtM(totalValue)}</span>
      </div>
      <div style="height:20px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden">
        <div style="width:${valW}%;height:100%;background:linear-gradient(90deg,#22c55e,#6366f1);border-radius:10px"></div>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:0.78rem;opacity:0.6">
      Value is <strong style="color:#22c55e;font-size:1rem">${r.roi_multiple || 0}x</strong> the platform cost
    </div>`;
}

async function loadData() {
    try {
        const [roi, trends] = await Promise.all([
            api.get('/tenant/owner/ccs/roi'),
            api.get('/tenant/owner/ccs/trends').catch(() => null),
        ]);
        _roi = roi;
        _trends = trends;
        rerender();
    } catch (e) { console.error('[ROI]', e); }
}

function rerender() {
    const el = document.getElementById('main-content');
    if (el) el.innerHTML = renderPage();
}

function loadingState() {
    return `<div class="exec-page"><div style="text-align:center;padding:4rem"><div class="loading-spinner"></div><div style="margin-top:1rem;color:var(--text-secondary)">Loading ROI intelligence...</div></div></div>`;
}
