/**
 * TrustChecker – Billing Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';

export function renderPage() {
  const d = State.billingData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Billing…</div></div>';

  const plan = d.plan;
  const usage = d.usage;
  const planColors = { core: 'var(--cyan)', free: 'var(--text-muted)', starter: 'var(--cyan)', pro: 'var(--violet)', business: 'var(--amber)', enterprise: 'var(--amber)' };
  const planIcons = { core: '🏠', free: '🆓', starter: '🚀', pro: '⚡', business: '🏗️', enterprise: '🏢' };

  const usageBar = (used, limit, label) => {
    const isUnlimited = limit === '∞' || limit < 0;
    const pct = isUnlimited ? 5 : Math.min((used / limit) * 100, 100);
    const color = pct > 90 ? 'var(--rose)' : pct > 70 ? 'var(--amber)' : 'var(--emerald)';
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:0.8rem;font-weight:600">${label}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${typeof used === 'number' ? used.toLocaleString() : used} / ${isUnlimited ? '∞' : (typeof limit === 'number' ? limit.toLocaleString() : limit)}</span>
        </div>
        <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
        </div>
      </div>
    `;
  };

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button onclick="window.location.hash='#/pricing'" style="background:var(--bg-secondary);color:var(--text);border:1px solid var(--border);padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8rem;display:flex;align-items:center;gap:6px">
        <span>View Full Pricing & Add-ons</span> <span style="font-size:1.1rem">→</span>
      </button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:var(--gap);margin-bottom:var(--gap)">
      ${(Array.isArray(d.available) ? d.available.map(p => [p.slug || p.name.toLowerCase(), p]) : Object.entries(d.available)).map(([key, p]) => `
        <div class="card" style="border:${plan?.plan_name === key ? '2px solid ' + planColors[key] : '1px solid var(--border)'};cursor:pointer;position:relative" onclick="${plan?.plan_name !== key && State.user?.role === 'admin' ? `upgradePlan('${key}')` : ''}">
          ${plan?.plan_name === key ? '<div style="position:absolute;top:8px;right:8px;font-size:0.65rem;background:var(--emerald);color:#000;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>' : ''}
          <div style="padding:var(--gap);text-align:center">
            <div style="font-size:2rem">${planIcons[key]}</div>
            <div style="font-size:1.1rem;font-weight:700;color:${planColors[key]};margin:8px 0">${p.name}</div>
            <div style="font-size:1.5rem;font-weight:800">${p.price_monthly != null ? '$' + p.price_monthly : 'Custom'}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:12px;text-align:left">
              <div>📱 ${(p.limits?.scans ?? p.scan_limit ?? 0) < 0 ? 'Unlimited' : (p.limits?.scans ?? p.scan_limit ?? 0).toLocaleString()} scans</div>
              <div>🔌 ${(p.limits?.api_calls ?? p.api_limit ?? 0) < 0 ? 'Unlimited' : (p.limits?.api_calls ?? p.api_limit ?? 0).toLocaleString()} API calls</div>
              <div>💾 ${(p.limits?.storage_mb ?? p.storage_mb ?? 0) < 0 ? 'Unlimited' : (p.limits?.storage_mb ?? p.storage_mb ?? 0).toLocaleString()} MB storage</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap)">
      <div class="card">
        <div class="card-header"><div class="card-title">📊 Current Usage (${d.period})</div></div>
        <div style="padding:0 var(--gap) var(--gap)">
          ${usage ? `
            ${usageBar(usage.scans.used, usage.scans.limit, '📱 Scans')}
            ${usageBar(usage.api_calls.used, usage.api_calls.limit, '🔌 API Calls')}
            ${usageBar(usage.storage_mb.used, usage.storage_mb.limit, '💾 Storage (MB)')}
          ` : '<div class="empty-state">No usage data</div>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">🧾 Invoice History</div></div>
        <div class="table-container">
          <table>
            <tr><th>Plan</th><th>Amount</th><th>Status</th><th>Period</th></tr>
            ${d.invoices.map(inv => `
              <tr>
                <td style="font-weight:600;text-transform:capitalize">${inv.plan_name}</td>
                <td style="font-family:'JetBrains Mono'">$${inv.amount}</td>
                <td>
                  ${inv.status === 'pending'
                    ? `<span class="badge" style="background:var(--rose);color:white;margin-right:8px">PENDING</span>
                       <button onclick="payInvoice('${inv.id}')" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.7rem;font-weight:800;text-transform:uppercase">Pay $${inv.amount}</button>`
                    : `<span class="badge valid">${inv.status}</span>`}
                </td>
                <td style="font-size:0.72rem;color:var(--text-muted)">${inv.period_start?.substring(0, 7) || '—'}</td>
              </tr>
            `).join('')}
            ${d.invoices.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No invoices</td></tr>' : ''}
          </table>
        </div>
      </div>
    </div>
  `;
}
async function upgradePlan(plan) {
  if (!confirm(`Upgrade to ${plan}? Pending charges will be invoiced.`)) return;
  try {
    const res = await API.post('/billing/upgrade', { plan_name: plan });
    if (res.status === 'pending') {
        showToast(`Upgraded to ${plan} – Prorated Invoice generated for $${res.amount}`, 'warning');
    } else {
        showToast(`Upgraded to ${plan} successfully`, 'success');
    }
    navigate(window.location.hash.includes('governance') ? 'billing' : window.location.hash);
  } catch (e) { showToast(e.message || 'Upgrade failed', 'error'); }
}

async function payInvoice(id) {
  if (!confirm('Simulate paying this invoice via Stripe?')) return;
  try {
    await API.post(`/billing/pay/${id}`);
    showToast('Payment successful, unrestricted access restored.', 'success');
    navigate(window.location.hash);
  } catch(e) { showToast(e.message || 'Payment failed', 'error'); }
}

// Window exports for onclick handlers
window.upgradePlan = upgradePlan;
window.payInvoice = payInvoice;
