/**
 * TrustChecker – Billing Page
 * Dynamic pricing with auto-upgrade chassis logic matching SA orgs behavior.
 * Supports upgrade, downgrade (with feature stripping), and price-based plan comparison.
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../core/router.js';

const PLAN_BASE_PRICES = { core: 0, pro: 299, enterprise: 5000 };

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

const TIER_RANK = { core: 1, pro: 2, enterprise: 3 };
const TIER_LABELS = { core: 'Core', pro: 'Pro', enterprise: 'Enterprise' };

/**
 * Custom in-page confirmation modal (replaces native confirm() which can be blocked by browsers).
 * Returns a Promise<boolean>.
 */
function billingConfirm(message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    // Remove any existing modal
    const existing = document.getElementById('billing-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'billing-confirm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.15s ease';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--card-bg, #fff);border-radius:16px;padding:28px 32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid var(--border, #e5e7eb);font-family:inherit;animation:slideUp 0.2s ease';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:1rem;font-weight:700;color:var(--text, #1e293b);margin-bottom:12px;display:flex;align-items:center;gap:8px';
    title.innerHTML = '💳 Billing Confirmation';

    const body = document.createElement('pre');
    body.style.cssText = 'font-size:0.82rem;color:var(--text-muted, #64748b);white-space:pre-wrap;word-break:break-word;line-height:1.6;margin:0 0 20px;font-family:inherit;background:var(--bg-subtle, #f8fafc);padding:16px;border-radius:10px;border:1px solid var(--border, #e5e7eb);max-height:300px;overflow-y:auto';
    body.textContent = message;

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 24px;border-radius:10px;border:1px solid var(--border, #e5e7eb);background:var(--card-bg, #fff);color:var(--text-muted, #64748b);cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s';
    cancelBtn.onmouseover = () => { cancelBtn.style.background = '#f1f5f9'; };
    cancelBtn.onmouseout = () => { cancelBtn.style.background = 'var(--card-bg, #fff)'; };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmLabel;
    confirmBtn.style.cssText = 'padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;cursor:pointer;font-size:0.85rem;font-weight:700;transition:all 0.2s;box-shadow:0 2px 8px rgba(59,130,246,0.3)';
    confirmBtn.onmouseover = () => { confirmBtn.style.transform = 'translateY(-1px)'; confirmBtn.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)'; };
    confirmBtn.onmouseout = () => { confirmBtn.style.transform = 'none'; confirmBtn.style.boxShadow = '0 2px 8px rgba(59,130,246,0.3)'; };

    const cleanup = (result) => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    };

    cancelBtn.onclick = () => cleanup(false);
    confirmBtn.onclick = () => cleanup(true);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    modal.appendChild(title);
    modal.appendChild(body);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 100);
  });
}

/**
 * Compute projected cost if switching to a different plan with current active addons.
 * Returns: { baseCost, addonCost, totalMRR, compatibleAddons, strippedFeatures }
 */
function projectPlanSwitch(targetPlan, currentActiveIds, currentAddons) {
    const targetDefaults = PLAN_DEFAULTS[targetPlan] || [];
    const baseCost = PLAN_BASE_PRICES[targetPlan] || 0;

    let addonCost = 0;
    const compatibleAddons = [];
    const strippedFeatures = [];

    // Check which current addons survive on the target plan
    for (const addonId of currentAddons) {
        const feat = FEATURE_LIST.find(f => f.id === addonId);
        if (!feat) continue;

        if (TIER_RANK[feat.minTier] > TIER_RANK[targetPlan]) {
            // Incompatible — will be stripped
            strippedFeatures.push(feat);
        } else if (targetDefaults.includes(addonId)) {
            // Now included by default — no addon cost
            compatibleAddons.push({ ...feat, becomesDefault: true });
        } else {
            // Still an addon — keep cost
            addonCost += feat.price || 0;
            compatibleAddons.push({ ...feat, becomesDefault: false });
        }
    }

    // Also check features that were defaults on current plan but NOT on target
    // These would need to become addons if compatible, or be stripped
    const currentPlanDefaults = new Set(currentActiveIds.filter(id => !currentAddons.includes(id)));
    for (const featureId of currentPlanDefaults) {
        if (targetDefaults.includes(featureId)) continue; // Still default
        const feat = FEATURE_LIST.find(f => f.id === featureId);
        if (!feat) continue;
        if (TIER_RANK[feat.minTier] > TIER_RANK[targetPlan]) {
            strippedFeatures.push(feat);
        } else {
            // Becomes an addon with cost
            addonCost += feat.price || 0;
        }
    }

    return {
        baseCost,
        addonCost,
        totalMRR: baseCost + addonCost,
        compatibleAddons,
        strippedFeatures,
    };
}

/**
 * Compute what the total MRR would be if a feature were added to the current plan.
 * Mirrors the SA orgs _saCalcDynamicPrice logic.
 */
function computeProjectedCost(currentPlanSlug, activeFeatureIds, newFeatureId) {
    const allFeatures = new Set(activeFeatureIds);
    allFeatures.add(newFeatureId);

    let requiredTier = currentPlanSlug;
    for (const id of allFeatures) {
        const feat = FEATURE_LIST.find(f => f.id === id);
        if (feat && TIER_RANK[feat.minTier] > TIER_RANK[requiredTier]) {
            requiredTier = feat.minTier;
        }
    }

    let bestPlan = requiredTier;
    let bestCost = Infinity;
    let bestAddonCost = 0;

    ['core', 'pro', 'enterprise'].forEach(p => {
        if (TIER_RANK[p] < TIER_RANK[requiredTier]) return;
        const defaults = PLAN_DEFAULTS[p] || [];
        const basePrice = PLAN_BASE_PRICES[p] || 0;
        let addonCost = 0;
        allFeatures.forEach(id => {
            if (!defaults.includes(id)) {
                const feat = FEATURE_LIST.find(f => f.id === id);
                if (feat) addonCost += feat.price || 0;
            }
        });
        const totalCost = basePrice + addonCost;
        if (totalCost < bestCost || (totalCost === bestCost && basePrice > (PLAN_BASE_PRICES[bestPlan] || 0))) {
            bestCost = totalCost;
            bestPlan = p;
            bestAddonCost = addonCost;
        }
    });

    return {
        newPlan: bestPlan,
        baseCost: PLAN_BASE_PRICES[bestPlan],
        addonCost: bestAddonCost,
        totalMRR: bestCost,
        upgraded: bestPlan !== currentPlanSlug,
    };
}

export function renderPage() {
  const d = State.billingData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Billing…</div></div>';

  const plan = d.plan;
  const usage = d.usage;
  const currentSlug = plan?.slug || 'core';
  const currentMRR = plan?.price_monthly ?? 0;
  const planColors = { core: 'var(--cyan)', pro: 'var(--violet)', enterprise: 'var(--amber)' };
  const planIcons = { core: '🏠', pro: '⚡', enterprise: '🏢' };

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

  // Get active features for current plan
  const currentActiveIds = plan?.active_features || PLAN_DEFAULTS[currentSlug] || [];
  const currentActiveAddons = plan?.addons ? plan.addons.map(a => a.id) : [];

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button onclick="window.location.hash='#/pricing'" style="background:var(--bg-secondary);color:var(--text);border:1px solid var(--border);padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8rem;display:flex;align-items:center;gap:6px">
        <span>View Full Pricing & Add-ons</span> <span style="font-size:1.1rem">→</span>
      </button>
    </div>

    ${plan?.pending_downgrade ? `
    <!-- Pending Downgrade Banner -->
    <div style="background:linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.12));border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 20px;margin-bottom:var(--gap);display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.3rem">⏳</span>
        <div>
          <div style="font-size:0.82rem;font-weight:700;color:#92400e">Downgrade Scheduled</div>
          <div style="font-size:0.72rem;color:#a16207">Your plan will switch to <strong>${TIER_LABELS[plan.pending_downgrade] || plan.pending_downgrade}</strong> on <strong>${plan.downgrade_at ? new Date(plan.downgrade_at).toLocaleDateString() : 'end of cycle'}</strong>. You keep all current features until then.</div>
        </div>
      </div>
      <button onclick="cancelDowngrade()" style="background:#fff;border:1px solid #fbbf24;color:#92400e;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.75rem;white-space:nowrap;transition:all 0.2s" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fff'">✖ Cancel Downgrade</button>
    </div>
    ` : ''}

    ${plan?.credit_balance > 0 ? `
    <!-- Credit Balance Banner -->
    <div style="background:linear-gradient(135deg, rgba(16,185,129,0.06), rgba(5,150,105,0.1));border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:12px 20px;margin-bottom:var(--gap);display:flex;align-items:center;gap:10px">
      <span style="font-size:1.2rem">💰</span>
      <div style="font-size:0.78rem;color:#059669;font-weight:600">Credit Balance: <span style="font-family:'JetBrains Mono',monospace;font-weight:800">$${plan.credit_balance.toFixed(2)}</span> — will be applied to your next upgrade or invoice</div>
    </div>
    ` : ''}

    <div class="card" style="border:2px solid ${planColors[currentSlug] || 'var(--border)'};margin-bottom:var(--gap);position:relative;">
      <div style="padding:var(--gap);">
        <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0">
            <div style="font-size:2.5rem">${planIcons[currentSlug] || '🏠'}</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:1.3rem;font-weight:800;color:${planColors[currentSlug]}">${plan?.name || 'Core'}</span>
                <span style="font-size:0.6rem;background:var(--emerald);color:#000;padding:3px 10px;border-radius:99px;font-weight:700;white-space:nowrap">CURRENT PLAN</span>
              </div>
              <div style="font-size:2rem;font-weight:900;font-family:'JetBrains Mono',monospace">$${currentMRR}<span style="font-size:0.8rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
            </div>
          </div>
          ${plan?.addons?.length > 0 ? `
          <div style="text-align:right;font-size:0.78rem;color:var(--text-muted);border-left:1px solid var(--border);padding-left:16px;flex-shrink:0">
            <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px"><span style="font-weight:600;color:var(--text)">Base Plan</span><span style="font-weight:700">$${plan.base_price}/mo</span></div>
            <div style="display:flex;justify-content:space-between;gap:24px"><span style="font-weight:600;color:var(--text)">Active Add-ons</span><span style="font-weight:700;color:var(--cyan)">+$${plan.addon_cost}/mo</span></div>
          </div>
          ` : ''}
        </div>

        ${plan?.billing_cycle_anchor ? `
        <div style="display:flex;gap:16px;margin-bottom:12px;padding:8px 12px;background:var(--bg-secondary);border-radius:8px;font-size:0.7rem;color:var(--text-muted)">
          <span>📅 Billing cycle: <strong>${new Date(plan.billing_cycle_anchor).toLocaleDateString()}</strong> → <strong>${new Date(new Date(plan.billing_cycle_anchor).getTime() + 30*24*60*60*1000).toLocaleDateString()}</strong></span>
        </div>
        ` : ''}

        <!-- Included Features -->
        <div style="margin-bottom:12px">
          <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">✓ Included in ${TIER_LABELS[currentSlug] || 'Current'} Plan</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${FEATURE_LIST.filter(f => currentActiveIds.includes(f.id) && !currentActiveAddons.includes(f.id)).map(f => `
              <div style="display:inline-flex;align-items:center;padding:4px 10px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:20px;font-size:0.7rem;white-space:nowrap;color:#3b82f6">
                <span style="font-size:0.8rem;margin-right:5px">${f.icon}</span>
                <span style="font-weight:500">${f.label}</span>
                <span style="color:#10b981;font-weight:900;margin-left:4px;font-size:0.75rem">✓</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Active Addons (clickable to remove) -->
        ${currentActiveAddons.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:0.65rem;color:#3b82f6;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">★ Active Upgrades (Click to Remove)</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${FEATURE_LIST.filter(f => currentActiveAddons.includes(f.id)).map(f => `
              <div onclick="event.stopPropagation(); toggleAddon('${f.id}', true, '${f.label}', ${f.price})"
                   onmouseover="this.style.filter='brightness(0.92)'" onmouseout="this.style.filter='none'"
                   style="display:inline-flex;align-items:center;padding:4px 10px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:20px;font-size:0.7rem;white-space:nowrap;color:#3b82f6;cursor:pointer;transition:all 0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
                <span style="font-size:0.8rem;margin-right:5px">${f.icon}</span>
                <span style="font-weight:500">${f.label}</span>
                <span style="color:#10b981;font-weight:900;margin-left:4px;font-size:0.75rem">✓</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Available Upgrades (ALL features not currently active — matching SA orgs logic) -->
        ${(() => {
          const activeSet = new Set(currentActiveIds);
          const availableFeatures = FEATURE_LIST.filter(f => !activeSet.has(f.id));
          if (availableFeatures.length === 0) return '';

          const sameTier = availableFeatures.filter(f => TIER_RANK[f.minTier] <= TIER_RANK[currentSlug]);
          const needsUpgrade = availableFeatures.filter(f => TIER_RANK[f.minTier] > TIER_RANK[currentSlug]);

          const renderAvailChip = (f) => {
            const needsHigherTier = TIER_RANK[f.minTier] > TIER_RANK[currentSlug];
            const tierBadge = needsHigherTier ? `<span style="font-size:0.55rem;margin-left:4px;padding:1px 5px;border-radius:8px;background:${f.minTier === 'enterprise' ? '#fef3c7' : '#ede9fe'};color:${f.minTier === 'enterprise' ? '#92400e' : '#6d28d9'};font-weight:700;white-space:nowrap">⬆ ${TIER_LABELS[f.minTier]}</span>` : '';
            return `
              <div onclick="event.stopPropagation(); toggleAddon('${f.id}', false, '${f.label}', ${f.price})"
                   onmouseover="this.style.borderColor='#3b82f6';this.style.background='rgba(59,130,246,0.04)'" 
                   onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'"
                   style="display:inline-flex;align-items:center;padding:4px 10px;border:1px solid var(--border);background:transparent;border-radius:20px;font-size:0.7rem;white-space:nowrap;color:var(--text-muted);cursor:pointer;transition:all 0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
                <span style="font-size:0.8rem;margin-right:5px">${f.icon}</span>
                <span style="font-weight:500">${f.label}</span>
                <span style="opacity:0.8;font-size:0.65rem;margin-left:6px;font-weight:800;color:var(--text-muted)">+$${f.price}</span>
                ${tierBadge}
              </div>
            `;
          };

          let html = '<div style="margin-bottom:12px">';
          html += '<div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">+ Available Upgrades (Click to Add)</div>';

          if (sameTier.length > 0) {
            html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${sameTier.map(renderAvailChip).join('')}</div>`;
          }
          if (needsUpgrade.length > 0) {
            html += `<div style="font-size:0.6rem;color:#8b5cf6;font-weight:600;margin:8px 0 6px;display:flex;align-items:center;gap:4px">
              <span style="font-size:0.7rem">🔓</span> Higher Tier Features <span style="font-size:0.55rem;color:var(--text-muted);font-weight:400">(auto-upgrades your plan)</span>
            </div>`;
            html += `<div style="display:flex;flex-wrap:wrap;gap:4px">${needsUpgrade.map(renderAvailChip).join('')}</div>`;
          }
          html += '</div>';
          return html;
        })()}

        <!-- Usage Limits -->
        <div style="border-top:1px dashed var(--border);padding-top:12px;font-size:0.72rem;color:var(--text-muted);margin-top:12px">
          <div>📱 ${(plan?.limits?.scans ?? 0) < 0 ? 'Unlimited' : (plan?.limits?.scans ?? 0).toLocaleString()} scans &nbsp; | &nbsp; 🔌 ${(plan?.limits?.api_calls ?? 0) < 0 ? 'Unlimited' : (plan?.limits?.api_calls ?? 0).toLocaleString()} API &nbsp; | &nbsp; 💾 ${(plan?.limits?.storage_mb ?? 0) < 0 ? 'Unlimited' : (plan?.limits?.storage_mb ?? 0).toLocaleString()} MB</div>
        </div>
      </div>
    </div>

    <!-- Other Plans — PRICE-BASED comparison -->
    <div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">📦 Compare Plans</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--gap);margin-bottom:var(--gap)">
      ${(Array.isArray(d.available) ? d.available : []).filter(p => (p.slug || p.name?.toLowerCase()) !== currentSlug).map(p => {
        const key = p.slug || p.name.toLowerCase();
        const defaults = PLAN_DEFAULTS[key] || [];
        const includedFeatures = FEATURE_LIST.filter(f => defaults.includes(f.id));

        // === PRICE-BASED comparison ===
        const projected = projectPlanSwitch(key, currentActiveIds, currentActiveAddons);
        const priceDiff = projected.totalMRR - currentMRR;
        const isMoreExpensive = priceDiff > 0;
        const isCheaper = priceDiff < 0;
        const isTierHigher = TIER_RANK[key] > TIER_RANK[currentSlug];

        // Badge logic: compare actual projected price, not just tier  
        let badgeHtml, badgeAction;
        if (isTierHigher) {
            badgeHtml = `<div style="position:absolute;top:8px;right:8px;font-size:0.6rem;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:2px 8px;border-radius:99px;font-weight:700">⬆ UPGRADE</div>`;
            badgeAction = 'upgrade';
        } else {
            badgeHtml = `<div style="position:absolute;top:8px;right:8px;font-size:0.6rem;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-weight:700">⬇ DOWNGRADE</div>`;
            badgeAction = 'downgrade';
        }

        // Price comparison section
        const priceChangeHtml = priceDiff !== 0 ? `
          <div style="margin-top:8px;padding:8px 10px;background:${isCheaper ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)'};border-radius:8px;font-size:0.68rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-weight:600">Base Plan</span>
              <span style="font-weight:700">$${projected.baseCost}/mo</span>
            </div>
            ${projected.addonCost > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-weight:600">Carried Add-ons</span>
              <span style="font-weight:700;color:var(--cyan)">+$${projected.addonCost}/mo</span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:4px;margin-top:4px">
              <span style="font-weight:700">Projected Total</span>
              <span style="font-weight:900;color:${isCheaper ? '#10b981' : '#ef4444'}">$${projected.totalMRR}/mo (${priceDiff > 0 ? '+' : ''}$${priceDiff})</span>
            </div>
          </div>
        ` : '';

        // Stripped features warning for downgrades
        const strippedHtml = projected.strippedFeatures.length > 0 ? `
          <div style="margin-top:8px;padding:6px 8px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:6px;font-size:0.62rem;color:#dc2626">
            <div style="font-weight:700;margin-bottom:3px">⚠️ Features that will be removed:</div>
            ${projected.strippedFeatures.map(f => `<div style="margin-left:8px">• ${f.icon} ${f.label} (requires ${TIER_LABELS[f.minTier]})</div>`).join('')}
          </div>
        ` : '';

        return `
        <div class="card" style="border:1px solid var(--border);cursor:pointer;position:relative;" onclick="switchPlan('${key}')">
          ${badgeHtml}
          <div style="padding:var(--gap);">
            <div style="text-align:center;margin-bottom:12px">
              <div style="font-size:1.8rem">${planIcons[key] || '📦'}</div>
              <div style="font-size:1rem;font-weight:700;color:${planColors[key]};margin:6px 0">${p.name}</div>
              <div style="font-size:1.1rem;font-weight:800">Base: $${PLAN_BASE_PRICES[key] ?? 0}<span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
            </div>
            <div style="text-align:left">
              <div style="font-size:0.6rem;color:var(--text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">✓ Includes ${includedFeatures.length} Features</div>
              <div style="display:flex;flex-wrap:wrap;gap:3px">
                ${includedFeatures.slice(0, 8).map(f => `
                  <span style="display:inline-flex;align-items:center;padding:2px 8px;border:1px solid #e2e8f0;border-radius:12px;font-size:0.6rem;color:var(--text-muted);white-space:nowrap">
                    ${f.icon} ${f.label}
                  </span>
                `).join('')}
                ${includedFeatures.length > 8 ? `<span style="padding:2px 8px;font-size:0.6rem;color:var(--text-muted)">+${includedFeatures.length - 8} more</span>` : ''}
              </div>
            </div>
            ${priceChangeHtml}
            ${strippedHtml}
            <div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:8px;font-size:0.65rem;color:var(--text-muted)">
              📱 ${(p.limits?.scans ?? p.scan_limit ?? 0) < 0 ? '∞' : (p.limits?.scans ?? p.scan_limit ?? 0).toLocaleString()} scans &nbsp;|&nbsp; 🔌 ${(p.limits?.api_calls ?? p.api_limit ?? 0) < 0 ? '∞' : (p.limits?.api_calls ?? p.api_limit ?? 0).toLocaleString()} API &nbsp;|&nbsp; 💾 ${(p.limits?.storage_mb ?? p.storage_mb ?? 0) < 0 ? '∞' : (p.limits?.storage_mb ?? p.storage_mb ?? 0).toLocaleString()} MB
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
                <td style="font-family:'JetBrains Mono'">\$${inv.amount}</td>
                <td>
                  ${inv.status === 'pending'
                    ? `<span class="badge" style="background:var(--rose);color:white;margin-right:8px">PENDING</span>
                       <button onclick="payInvoice('${inv.id}')" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.7rem;font-weight:800;text-transform:uppercase">Pay \$${inv.amount}</button>`
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

/**
 * Unified plan switch handler — handles both upgrade and downgrade.
 * Upgrade → fetches proration preview → shows proration modal → calls API → redirects to Stripe Checkout
 * Downgrade → shows scheduled downgrade modal → calls API → shows scheduled confirmation
 */
async function switchPlan(targetSlug) {
  const currentSlug = State.billingData?.plan?.slug || 'core';
  const currentMRR = State.billingData?.plan?.price_monthly ?? 0;
  const label = TIER_LABELS[targetSlug] || targetSlug;
  const isTierLower = TIER_RANK[targetSlug] < TIER_RANK[currentSlug];

  // Fetch initial proration preview (no kept addons = base price only)
  let preview;
  try {
    preview = await API.get(`/billing/proration-preview?target_plan=${targetSlug}`);
  } catch (e) {
    showToast('Failed to calculate billing preview', 'error');
    return;
  }

  if (isTierLower) {
    // ═══ DOWNGRADE — same as before ═══
    let msg = `⬇ Downgrade to ${label}\n\n`;
    msg += `⚡ Takes effect immediately.\n\n`;
    msg += `Pricing change:\n`;
    msg += `• Current: $${currentMRR}/mo\n`;
    msg += `• New (${label}): $${preview.new_mrr}/mo\n`;
    msg += `• Monthly savings: $${Math.abs(currentMRR - preview.new_mrr)}/mo\n`;
    if (preview.proration?.credit_cents > 0) {
      msg += `\n💰 Credit for unused days: $${preview.proration.credit_dollars.toFixed(2)}\n`;
      msg += `(${preview.proration.days_remaining} days × $${(preview.proration.daily_old - preview.proration.daily_new).toFixed(2)}/day)\n`;
      msg += `This credit will be applied to future charges.\n`;
    }
    if (preview.stripped_features?.length > 0) {
      msg += `\n⚠️ Features that will be removed now:\n`;
      preview.stripped_features.forEach(f => {
        msg += `  ✖ ${f.icon || ''} ${f.label} (requires ${TIER_LABELS[f.minTier]})\n`;
      });
    }
    if (!(await billingConfirm(msg, '⬇ Downgrade Now'))) return;
    try {
      const res = await API.post('/billing/upgrade', { targetPlanName: targetSlug });
      const creditMsg = res.credit_dollars > 0 ? ` Credit: $${res.credit_dollars.toFixed(2)}` : '';
      showToast(`Downgraded to ${label} — MRR: $${res.new_mrr}/mo.${creditMsg}`, 'success');
      State.billingData = null; State._caSettingsPrefetched = false; navigate('ca-settings', true);
    } catch (e) { showToast(e.message || 'Downgrade failed', 'error'); }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // UPGRADE — Interactive modal with addon comparison & toggles
  // ═══════════════════════════════════════════════════════════════
  const analysis = preview.addon_analysis || { absorbed: [], extra: [], dropped: [] };
  const hasAddonChoices = analysis.extra.length > 0 || analysis.absorbed.length > 0;

  // Show interactive modal
  const result = await showUpgradeModal(targetSlug, label, currentMRR, preview, analysis);
  if (!result) return; // cancelled

  // result = { keepAddonIds: [...] }
  try {
    const res = await API.post('/billing/upgrade', {
      targetPlanName: targetSlug,
      keepAddonIds: result.keepAddonIds,
    });
    if (res.action === 'checkout_required' && res.checkout_url) {
      showToast('Redirecting to Stripe Checkout...', 'info');
      window.location.href = res.checkout_url;
      return;
    }
    showToast(`Upgraded to ${label} — MRR: $${res.new_mrr}/mo`, 'success');
    State.billingData = null; State._caSettingsPrefetched = false; navigate('ca-settings', true);
  } catch (e) { showToast(e.message || 'Plan change failed', 'error'); }
}

/**
 * Interactive upgrade modal with addon comparison and toggles
 * Returns { keepAddonIds: string[] } or null if cancelled
 */
function showUpgradeModal(targetSlug, label, currentMRR, initialPreview, analysis) {
  return new Promise((resolve) => {
    const existing = document.getElementById('billing-confirm-overlay');
    if (existing) existing.remove();

    // Track which extra addons the user wants to keep
    const keptExtras = new Set();

    const overlay = document.createElement('div');
    overlay.id = 'billing-confirm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.15s ease';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--card-bg, #fff);border-radius:16px;padding:28px 32px;max-width:560px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:1px solid var(--border, #e5e7eb);font-family:inherit;animation:slideUp 0.2s ease;max-height:85vh;overflow-y:auto';

    const cleanup = (result) => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    };

    overlay.onclick = (e) => { if (e.target === overlay) cleanup(null); };

    function renderModal(preview) {
      const p = preview.proration;
      const creditBal = preview.credit_balance_cents || 0;
      const netCharge = Math.max(0, (p?.charge_cents || 0) - creditBal);
      const creditUsed = Math.min(creditBal, p?.charge_cents || 0);

      let confirmLabel = '💳 Pay & Upgrade';
      if (netCharge <= 0 && p?.charge_cents >= 0) confirmLabel = '✅ Upgrade Now';

      modal.innerHTML = `
        <div style="font-size:1rem;font-weight:700;color:var(--text, #1e293b);margin-bottom:16px;display:flex;align-items:center;gap:8px">
          💳 Upgrade to ${label}
        </div>

        <!-- Plan Comparison -->
        <div style="background:var(--bg-subtle, #f8fafc);border-radius:10px;border:1px solid var(--border, #e5e7eb);padding:14px;margin-bottom:14px">
          <div style="font-size:0.78rem;font-weight:700;color:var(--text, #1e293b);margin-bottom:8px">📊 Pricing Breakdown</div>
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
            <span style="color:var(--text-muted)">Current Plan</span>
            <span style="font-weight:600">$${currentMRR}/mo</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
            <span style="color:var(--text-muted)">${label} Base Plan</span>
            <span style="font-weight:600;color:#2563eb">$${preview.new_base_price}/mo</span>
          </div>
          ${preview.new_addon_cost > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">
            <span style="color:var(--text-muted)">+ Kept Add-ons</span>
            <span style="font-weight:600;color:#f59e0b">+$${preview.new_addon_cost}/mo</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-top:8px;padding-top:8px;border-top:1px dashed var(--border, #e5e7eb)">
            <span style="font-weight:700">New Total MRR</span>
            <span style="font-weight:800;color:#2563eb;font-size:0.95rem">$${preview.new_mrr}/mo</span>
          </div>
        </div>

        <!-- Addon Analysis -->
        ${analysis.absorbed.length > 0 ? `
        <div style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;padding:12px;margin-bottom:10px">
          <div style="font-size:0.75rem;font-weight:700;color:#166534;margin-bottom:6px">✅ Now Included FREE in ${label}</div>
          <div style="font-size:0.78rem;color:#166534">
            ${analysis.absorbed.map(a => `<div style="display:flex;justify-content:space-between;padding:3px 0">
              <span>${a.icon} ${a.label}</span>
              <span style="text-decoration:line-through;opacity:0.6">$${a.price}/mo</span>
            </div>`).join('')}
          </div>
        </div>` : ''}

        ${analysis.extra.length > 0 ? `
        <div style="background:#fefce8;border-radius:10px;border:1px solid #fde68a;padding:12px;margin-bottom:10px">
          <div style="font-size:0.75rem;font-weight:700;color:#854d0e;margin-bottom:6px">🔄 Extra Add-ons — Keep or Drop?</div>
          <div style="font-size:0.75rem;color:#92400e;margin-bottom:8px">These are not included in ${label} by default. Toggle to keep:</div>
          <div id="addon-toggle-list">
            ${analysis.extra.map(a => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fde68a">
              <div>
                <span style="font-size:0.82rem">${a.icon} ${a.label}</span>
                <span style="font-size:0.72rem;color:#92400e;margin-left:6px">+$${a.price}/mo</span>
              </div>
              <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer">
                <input type="checkbox" data-addon-id="${a.id}" data-addon-price="${a.price}" 
                  ${keptExtras.has(a.id) ? 'checked' : ''} 
                  style="opacity:0;width:0;height:0" 
                  onchange="window._addonToggle(this)">
                <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${keptExtras.has(a.id) ? '#22c55e' : '#d1d5db'};border-radius:22px;transition:0.3s"></span>
                <span style="position:absolute;height:16px;width:16px;left:${keptExtras.has(a.id) ? '20px' : '3px'};bottom:3px;background:white;border-radius:50%;transition:0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span>
              </label>
            </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Proration -->
        ${p?.charge_cents > 0 ? `
        <div style="background:var(--bg-subtle, #f8fafc);border-radius:10px;border:1px solid var(--border, #e5e7eb);padding:12px;margin-bottom:10px">
          <div style="font-size:0.75rem;font-weight:700;color:var(--text, #1e293b);margin-bottom:6px">💳 Proration (${p.days_remaining} days remaining)</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">
            <div>Daily: $${p.daily_old.toFixed(2)} → $${p.daily_new.toFixed(2)}/day</div>
            <div>Delta × ${p.days_remaining} days = <b>$${p.charge_dollars.toFixed(2)}</b></div>
          </div>
          ${creditBal > 0 ? `<div style="margin-top:6px;font-size:0.78rem">💰 Credits: <span style="color:#16a34a">-$${(creditUsed / 100).toFixed(2)}</span></div>` : ''}
          <div style="margin-top:6px;font-size:0.85rem;font-weight:700;color:${netCharge > 0 ? '#dc2626' : '#16a34a'}">
            ${netCharge > 0 ? `💳 Net Charge: $${(netCharge / 100).toFixed(2)}` : '✅ Covered by credits — no payment needed'}
          </div>
        </div>` : ''}

        <!-- Actions -->
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
          <button id="upgrade-cancel-btn" style="padding:10px 24px;border-radius:10px;border:1px solid var(--border, #e5e7eb);background:var(--card-bg, #fff);color:var(--text-muted, #64748b);cursor:pointer;font-size:0.85rem;font-weight:600">Cancel</button>
          <button id="upgrade-confirm-btn" style="padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg, #3b82f6, #2563eb);color:#fff;cursor:pointer;font-size:0.85rem;font-weight:700;box-shadow:0 2px 8px rgba(59,130,246,0.3)">${confirmLabel}</button>
        </div>
      `;

      // Bind button events
      modal.querySelector('#upgrade-cancel-btn').onclick = () => cleanup(null);
      modal.querySelector('#upgrade-confirm-btn').onclick = () => cleanup({ keepAddonIds: [...keptExtras] });
    }

    // Global toggle handler — recalculates preview when user toggles an addon
    window._addonToggle = async function(checkbox) {
      const addonId = checkbox.dataset.addonId;
      if (checkbox.checked) {
        keptExtras.add(addonId);
      } else {
        keptExtras.delete(addonId);
      }

      // Re-fetch preview with updated keep_addons
      try {
        const keepParam = [...keptExtras].join(',');
        const newPreview = await API.get(`/billing/proration-preview?target_plan=${targetSlug}&keep_addons=${keepParam}`);
        renderModal(newPreview);
      } catch (e) {
        console.error('Failed to recalculate:', e);
      }
    };

    renderModal(initialPreview);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

async function payInvoice(id) {
  if (!(await billingConfirm('Simulate paying this invoice via Stripe?'))) return;
  try {
    await API.post(`/billing/pay/${id}`);
    showToast('Payment successful, unrestricted access restored.', 'success');
    State.billingData = null;
    State._caSettingsPrefetched = false;
    navigate('ca-settings', true);
  } catch(e) { showToast(e.message || 'Payment failed', 'error'); }
}

async function cancelDowngrade() {
  if (!(await billingConfirm('Cancel the scheduled downgrade? You will remain on your current plan.'))) return;
  try {
    const res = await API.post('/billing/cancel-downgrade');
    showToast(res.message || 'Downgrade cancelled successfully', 'success');
    State.billingData = null;
    State._caSettingsPrefetched = false;
    navigate('ca-settings', true);
  } catch(e) { showToast(e.message || 'Failed to cancel downgrade', 'error'); }
}

async function toggleAddon(id, currentlyActive, label, price) {
  const currentSlug = State.billingData?.plan?.slug || 'core';
  const feature = FEATURE_LIST.find(f => f.id === id);

  if (!currentlyActive) {
    // ADDING — fetch proration preview
    let preview;
    try {
      preview = await API.get(`/billing/proration-preview?feature_id=${id}`);
    } catch (e) {
      showToast('Failed to calculate billing preview', 'error');
      return;
    }

    let msg = '';
    let confirmLabel = 'Confirm';

    if (feature && TIER_RANK[feature.minTier] > TIER_RANK[currentSlug]) {
      msg = `Adding "${label}" requires upgrading to ${TIER_LABELS[preview.target_plan]} plan.\n\n`;
      msg += `New pricing: $${preview.new_mrr}/mo\n`;
    } else {
      msg = `Add ${label} (+$${price}/mo)\n\n`;
      msg += `New MRR: $${preview.new_mrr}/mo\n`;
    }

    if (preview.proration?.charge_cents > 0) {
      msg += `\n💳 Proration for ${preview.proration.days_remaining} remaining days:\n`;
      msg += `• Charge: $${preview.proration.charge_dollars.toFixed(2)}\n`;

      if (preview.credit_balance_cents > 0) {
        const netCharge = Math.max(0, preview.proration.charge_cents - preview.credit_balance_cents);
        msg += `• Credits applied: -$${preview.credit_balance_dollars.toFixed(2)}\n`;
        msg += `• Net charge: $${(netCharge / 100).toFixed(2)}\n`;

        if (netCharge > 0) {
          msg += `\nYou will be redirected to Stripe Checkout to complete payment.\n`;
          confirmLabel = '💳 Pay & Add';
        } else {
          msg += `\n✅ Your credit balance fully covers this change. No payment needed.\n`;
          confirmLabel = '✅ Add Now';
        }
      } else {
        msg += `\nYou will be redirected to Stripe Checkout to complete payment.\n`;
        confirmLabel = '💳 Pay & Add';
      }
    }

    if (!(await billingConfirm(msg, confirmLabel))) return;
  } else {
    // REMOVING — show credit info
    if (!(await billingConfirm(`Remove ${label} (-$${price}/mo)?\n\nCredit for unused days will be added to your balance.`, '🗑 Remove'))) return;
  }

  try {
    const res = await API.post('/billing/addon/toggle', { feature_id: id });

    if (res.action === 'checkout_required' && res.checkout_url) {
      showToast('Redirecting to Stripe Checkout...', 'info');
      window.location.href = res.checkout_url;
      return;
    }

    const planChanged = res.plan_upgraded;
    if (planChanged) {
      showToast(`Plan upgraded to ${TIER_LABELS[res.new_plan] || res.new_plan} + ${label} added — MRR: $${res.new_mrr}/mo`, 'success');
    } else if (currentlyActive) {
      const creditMsg = res.proration_credit_cents > 0 ? ` Credit: $${(res.proration_credit_cents / 100).toFixed(2)}` : '';
      showToast(`${label} removed — MRR: $${res.new_mrr}/mo.${creditMsg}`, 'success');
    } else {
      showToast(`${label} added — MRR: $${res.new_mrr}/mo`, 'success');
    }
    State.billingData = null;
    State._caSettingsPrefetched = false;
    navigate('ca-settings', true);
  } catch(e) { showToast(e.message || 'Error updating add-on', 'error'); }
}

// Window exports for onclick handlers
window.switchPlan = switchPlan;
window.payInvoice = payInvoice;
window.toggleAddon = toggleAddon;
window.cancelDowngrade = cancelDowngrade;
