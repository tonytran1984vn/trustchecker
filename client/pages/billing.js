/**
 * TrustChecker – Billing Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';

const PLAN_DEFAULTS = {
    core: ['qr', 'products'],
    pro: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory'],
    enterprise: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory', 'risk_radar', 'ai_forecast', 'digital_twin', 'blockchain', 'kyc', 'overclaim', 'exec_dashboard'],
};

const FEATURE_LIST = [
    { id: 'qr', label: 'QR Traceability', icon: '📱', price: 0, minTier: 'core' },
    { id: 'products', label: 'Product Catalog', icon: '📦', price: 0, minTier: 'core' },
    { id: 'scm_tracking', label: 'Supply Chain Tracking', icon: '🚚', price: 99, minTier: 'core' },
    { id: 'inventory', label: 'Inventory Management', icon: '🏭', price: 49, minTier: 'core' },
    { id: 'support', label: 'Premium Support', icon: '🎧', price: 199, minTier: 'core' },
    { id: 'partners', label: 'Partner Portal', icon: '🤝', price: 49, minTier: 'core' },
    { id: 'carbon', label: 'Carbon Tracking', icon: '🌱', price: 199, minTier: 'pro' },
    { id: 'risk_radar', label: 'Risk Radar', icon: '🛡', price: 299, minTier: 'pro' },
    { id: 'ai_forecast', label: 'AI Forecaster', icon: '🤖', price: 499, minTier: 'pro' },
    { id: 'digital_twin', label: 'Digital Twin', icon: '🪞', price: 149, minTier: 'pro' },
    { id: 'kyc', label: 'KYC / AML', icon: '🔍', price: 249, minTier: 'pro' },
    { id: 'overclaim', label: 'Overclaim Detection', icon: '⚠️', price: 399, minTier: 'enterprise' },
    { id: 'lineage', label: 'Lineage Replay', icon: '⏪', price: 499, minTier: 'enterprise' },
    { id: 'governance', label: 'Advanced Governance', icon: '🏛', price: 299, minTier: 'enterprise' },
    { id: 'registry_export', label: 'Registry Export API', icon: '📤', price: 599, minTier: 'enterprise' },
    { id: 'erp_integration', label: 'ERP Integration', icon: '🔌', price: 999, minTier: 'enterprise' },
    { id: 'exec_dashboard', label: 'Exec Risk Dashboard', icon: '📈', price: 199, minTier: 'enterprise' },
    { id: 'ivu_cert', label: 'IVU Premium Audit', icon: '🏅', price: 499, minTier: 'enterprise' },
    { id: 'blockchain', label: 'Blockchain Anchoring', icon: '⛓', price: 199, minTier: 'pro' },
    { id: 'nft', label: 'NFT Certificates', icon: '🎫', price: 99, minTier: 'pro' },
];

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
      ${(Array.isArray(d.available) ? d.available.map(p => [p.slug || p.name.toLowerCase(), p]) : Object.entries(d.available)).map(([key, p]) => {
        const isCurrent = plan?.slug === key;
        const displayName = isCurrent ? plan.name : p.name;
        const displayPrice = isCurrent ? plan.price_monthly : p.price_monthly;
        
        const TIER_RANK = { core: 1, pro: 2, enterprise: 3 };
        const defaults = PLAN_DEFAULTS[key] || [];
        const includedFeatures = FEATURE_LIST.filter(f => defaults.includes(f.id));
        
        const myActiveIds = new Set(isCurrent && plan.active_features ? plan.active_features : defaults);
        const myActiveAddons = isCurrent && plan.addons ? plan.addons.map(a => a.id) : [];
        const activeAddonFeatures = FEATURE_LIST.filter(f => myActiveAddons.includes(f.id));
        
        const availableFeatures = FEATURE_LIST.filter(f => {
            if (myActiveIds.has(f.id)) return false;
            return TIER_RANK[f.minTier] <= TIER_RANK[key];
        });

        const renderChip = (f, type) => {
            const isActive = type === 'included' || type === 'active_addon';
            const color = isActive ? '#3b82f6' : 'var(--text-muted)';
            const bg = isActive ? '#eff6ff' : 'transparent';
            const border = isActive ? '#bfdbfe' : 'var(--border)';
            return `
            <div style="display:inline-flex;align-items:center;padding:4px 10px;border:1px solid ${border};background:${bg};border-radius:20px;font-size:0.7rem;margin:3px 2px;white-space:nowrap;color:${color}">
              <span style="font-size:0.8rem;margin-right:5px">${f.icon}</span> 
              <span style="font-weight:500">${f.label}</span>
              ${isActive ? '<span style="color:#10b981;font-weight:900;margin-left:4px;font-size:0.75rem">✓</span>' : `<span style="opacity:0.8;font-size:0.65rem;margin-left:6px;font-weight:800;color:var(--text-muted)">+$${f.price}</span>`}
            </div>
            `;
        };

        return `
        <div class="card" style="border:${isCurrent ? '2px solid ' + planColors[key] : '1px solid var(--border)'};cursor:${isCurrent ? 'default' : 'pointer'};position:relative;display:flex;flex-direction:column;" onclick="${!isCurrent && State.user?.role === 'admin' ? `upgradePlan('${key}')` : ''}">
          ${isCurrent ? '<div style="position:absolute;top:8px;right:8px;font-size:0.65rem;background:var(--emerald);color:#000;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>' : ''}
          <div style="padding:var(--gap);text-align:center;flex:1;display:flex;flex-direction:column;">
            <div style="font-size:2rem">${planIcons[key]}</div>
            <div style="font-size:1.1rem;font-weight:700;color:${planColors[key]};margin:8px 0">${displayName}</div>
            <div style="font-size:1.5rem;font-weight:800">${displayPrice != null ? '$' + displayPrice : 'Custom'}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
            
            ${isCurrent && plan.addons?.length > 0 ? `
              <div style="margin-top:12px;font-size:0.7rem;color:var(--text-muted);border-top:1px dashed var(--border);padding-top:12px;text-align:left">
                <div style="font-weight:600;margin-bottom:6px;color:var(--text);display:flex;justify-content:space-between"><span>Base Plan</span><span>$${plan.base_price}/mo</span></div>
                <div style="font-weight:600;margin-bottom:6px;color:var(--text);display:flex;justify-content:space-between"><span>Active Add-ons</span><span style="color:var(--cyan)">+$${plan.addon_cost}/mo</span></div>
              </div>
            ` : ''}

            <!-- Features Chips Section -->
            <div style="margin-top:16px;text-align:left">
                <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">✓ Included in Plan</div>
                <div style="display:flex;flex-wrap:wrap">
                    ${includedFeatures.map(f => renderChip(f, 'included')).join('')}
                </div>

                ${activeAddonFeatures.length > 0 ? `
                <div style="font-size:0.65rem;color:#3b82f6;font-weight:700;margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.5px">★ Active Upgrades</div>
                <div style="display:flex;flex-wrap:wrap">
                    ${activeAddonFeatures.map(f => renderChip(f, 'active_addon')).join('')}
                </div>
                ` : ''}

                ${availableFeatures.length > 0 ? `
                <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.5px">+ Available Upgrades</div>
                <div style="display:flex;flex-wrap:wrap">
                    ${availableFeatures.map(f => renderChip(f, 'available')).join('')}
                </div>
                ` : ''}
            </div>

            <div style="margin-top:auto;padding-top:12px;text-align:left;border-top:1px dashed var(--border);font-size:0.72rem;color:var(--text-muted);margin-top:16px">
              <div>📱 ${(p.limits?.scans ?? p.scan_limit ?? 0) < 0 ? 'Unlimited' : (p.limits?.scans ?? p.scan_limit ?? 0).toLocaleString()} scans &nbsp; | &nbsp; 🔌 ${(p.limits?.api_calls ?? p.api_limit ?? 0) < 0 ? 'Unlimited' : (p.limits?.api_calls ?? p.api_limit ?? 0).toLocaleString()} API &nbsp; | &nbsp; 💾 ${(p.limits?.storage_mb ?? p.storage_mb ?? 0) < 0 ? 'Unlimited' : (p.limits?.storage_mb ?? p.storage_mb ?? 0).toLocaleString()} MB</div>
            </div>
          </div>
        </div>
      `;}).join('')}
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
