/**
 * TrustChecker – Pricing Page
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';

export function renderPage() {
  const d = State.pricingData;
  if (!d) return '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Loading Pricing…</div></div>';

  const isAnnual = State.pricingAnnual || false;
  const plans = d.plans;
  const planOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const planColors = { free: '#6b7280', starter: '#06b6d4', pro: '#8b5cf6', business: '#f59e0b', enterprise: '#ef4444' };
  const planIcons = { free: '🆓', starter: '🚀', pro: '⚡', business: '🏢', enterprise: '👑' };

  const toggleBilling = () => {
    State.pricingAnnual = !State.pricingAnnual;
    render();
  };
  window._toggleBilling = toggleBilling;

  const formatLimit = (v) => v === -1 ? '∞' : (typeof v === 'number' ? v.toLocaleString() : v);
  const currentPlan = State.billingData?.plan?.plan_name || 'free';

  return `
    <div style="max-width:1200px;margin:0 auto">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:40px">
        <h2 style="font-size:2rem;font-weight:800;background:linear-gradient(135deg, var(--cyan), var(--violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">
          Simple, Transparent Pricing
        </h2>
        <p style="color:var(--text-muted);font-size:1rem;max-width:600px;margin:0 auto">
          Start free, scale as you grow. Usage-based add-ons so you only pay for what you use.
        </p>

        <!-- Billing Toggle -->
        <div style="display:inline-flex;align-items:center;gap:12px;margin-top:24px;padding:6px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
          <button onclick="_toggleBilling()" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.85rem;
            background:${!isAnnual ? 'var(--cyan)' : 'transparent'};
            color:${!isAnnual ? '#000' : 'var(--text-muted)'}">
            Monthly
          </button>
          <button onclick="_toggleBilling()" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.85rem;position:relative;
            background:${isAnnual ? 'var(--cyan)' : 'transparent'};
            color:${isAnnual ? '#000' : 'var(--text-muted)'}">
            Annual
            <span style="position:absolute;top:-8px;right:-12px;background:var(--emerald);color:#000;font-size:0.6rem;padding:2px 6px;border-radius:99px;font-weight:700">-20%</span>
          </button>
        </div>
      </div>

      <!-- Plan Cards -->
      <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:16px;margin-bottom:40px">
        ${planOrder.map(slug => {
    const p = plans[slug];
    if (!p) return '';
    const price = p.price_monthly;
    const annualPrice = p.price_annual;
    const isPopular = p.badge === 'POPULAR';
    const isCurrent = slug === currentPlan;
    const isEnterprise = slug === 'enterprise';
    const displayPrice = isEnterprise ? null : (isAnnual ? Math.round((annualPrice || 0) / 12) : price);

    return `
            <div class="card" style="position:relative;border:${isPopular ? '2px solid var(--violet)' : isCurrent ? '2px solid var(--emerald)' : '1px solid var(--border)'};
              ${isPopular ? 'transform:scale(1.03);box-shadow:0 8px 32px rgba(139,92,246,0.2)' : ''};transition:transform 0.2s,box-shadow 0.2s"
              onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='${isPopular ? 'scale(1.03)' : 'scale(1)'}'"
            >
              ${isPopular ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--violet);color:#fff;font-size:0.65rem;padding:4px 14px;border-radius:99px;font-weight:700;letter-spacing:0.5px">MOST POPULAR</div>' : ''}
              ${isCurrent ? '<div style="position:absolute;top:8px;right:8px;background:var(--emerald);color:#000;font-size:0.6rem;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>' : ''}

              <div style="padding:24px;text-align:center">
                <div style="font-size:2.5rem;margin-bottom:8px">${planIcons[slug]}</div>
                <div style="font-size:1.1rem;font-weight:700;color:${planColors[slug]}">${p.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 16px;min-height:32px">${p.tagline}</div>

                <div style="margin:16px 0">
                  ${isEnterprise
        ? '<div style="font-size:1.8rem;font-weight:800">Custom</div><div style="font-size:0.75rem;color:var(--text-muted)">Contact sales</div>'
        : `<div style="font-size:2.2rem;font-weight:800">$${displayPrice}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
                       ${isAnnual && price ? '<div style="font-size:0.7rem;color:var(--emerald)">Save $' + ((price * 12) - annualPrice) + '/year</div>' : ''}`
      }
                </div>

                <!-- Key Limits -->
                <div style="text-align:left;font-size:0.72rem;margin:16px 0;padding:12px;background:var(--bg-secondary);border-radius:8px">
                  <div style="margin-bottom:6px">📱 <strong>${formatLimit(p.limits.scans)}</strong> scans/mo</div>
                  <div style="margin-bottom:6px">🔌 <strong>${formatLimit(p.limits.api_calls)}</strong> API calls</div>
                  <div style="margin-bottom:6px">💾 <strong>${formatLimit(p.limits.storage_mb)}</strong> MB storage</div>
                  <div style="margin-bottom:6px">🎖️ <strong>${formatLimit(p.limits.nft_mints)}</strong> NFT mints</div>
                  <div>🌿 <strong>${formatLimit(p.limits.carbon_calcs)}</strong> carbon calcs</div>
                </div>

                ${isCurrent
        ? '<button disabled style="width:100%;padding:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);border-radius:8px;font-weight:600">Current Plan</button>'
        : isEnterprise
          ? '<button onclick="requestEnterpriseQuote()" style="width:100%;padding:10px;border:none;background:linear-gradient(135deg, #ef4444, #dc2626);color:#fff;border-radius:8px;cursor:pointer;font-weight:600">Contact Sales</button>'
          : `<button onclick="upgradePlan('${slug}')" style="width:100%;padding:10px;border:none;background:${planColors[slug]};color:#000;border-radius:8px;cursor:pointer;font-weight:700">
                        ${planOrder.indexOf(slug) > planOrder.indexOf(currentPlan) ? 'Upgrade' : 'Switch'}
                      </button>`
      }
              </div>
            </div>
          `;
  }).join('')}
      </div>

      <!-- Usage-Based Add-ons Section -->
      <div class="card" style="margin-bottom:24px;padding:24px">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>📊</span> Usage-Based Add-ons
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400">Pay only for what you use beyond your plan</span>
        </h3>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px">
          ${Object.entries(d.usage_pricing).map(([key, up]) => {
    const icon = key === 'scans' ? '📱' : key === 'nft_mints' ? '🎖️' : key === 'carbon_calcs' ? '🌿' : '🔌';
    return `
              <div style="padding:16px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
                <div style="font-size:1.5rem;margin-bottom:8px">${icon}</div>
                <div style="font-weight:700;font-size:0.85rem;margin-bottom:4px">${up.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">Per ${up.unit} overage</div>
                <div style="font-size:0.72rem">
                  ${up.tiers.map(t => `
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                      <span style="color:var(--text-muted)">${t.up_to === Infinity ? 'Volume' : 'First ' + t.up_to.toLocaleString()}</span>
                      <span style="font-weight:700;color:var(--emerald)">$${t.price}/${up.unit}</span>
                    </div>
                  `).join('')}
                  ${up.bundle ? `<div style="margin-top:8px;padding:8px;background:rgba(0,210,255,0.1);border-radius:6px;text-align:center"><strong>Bundle:</strong> ${up.bundle.size} for $${up.bundle.price}</div>` : ''}
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>

      <!-- Feature Comparison Matrix -->
      <div class="card" style="padding:24px">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px">📋 Feature Comparison</h3>
        <div class="table-container">
          <table>
            <tr>
              <th style="text-align:left">Feature</th>
              ${planOrder.map(slug => `<th style="color:${planColors[slug]}">${plans[slug]?.name || slug}</th>`).join('')}
            </tr>
            ${[
      ['SLA Guarantee', ...planOrder.map(s => plans[s]?.sla || '—')],
      ['Support Level', 'Community', 'Email', 'Priority', 'Dedicated', 'Dedicated+Slack'],
      ['Fraud Detection', '—', '✓', '✓', '✓', '✓'],
      ['AI Anomaly Detection', '—', '—', '✓', '✓', '✓'],
      ['Digital Twin', '—', '—', '—', '✓', '✓'],
      ['Carbon Tracking', '—', '—', '✓', '✓', '✓'],
      ['NFT Certificates', '—', '✓', '✓', '✓', '✓'],
      ['Custom Branding', '—', '—', '✓', '✓', '✓'],
      ['SSO / SAML', '—', '—', '—', '✓', '✓'],
      ['On-Premise', '—', '—', '—', '—', '✓'],
      ['GS1 Certified Partner', '—', '✓', '✓', '✓', '✓'],
      ['SOC 2 Type II', '—', '—', '—', '✓', '✓'],
      ['ISO 27001:2022', '—', '—', '—', '✓', '✓'],
      ['GDPR Compliant', '✓', '✓', '✓', '✓', '✓'],
    ].map(row => `
              <tr>
                <td style="font-weight:600;font-size:0.8rem">${row[0]}</td>
                ${row.slice(1).map(v => `<td style="text-align:center;font-size:0.75rem;${v === '✓' ? 'color:var(--emerald)' : v === '—' ? 'color:var(--text-muted)' : ''}">${v}</td>`).join('')}
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <!-- Trust Badges Footer -->
      <div style="margin-top:24px;text-align:center;padding:24px;background:var(--bg-secondary);border-radius:16px;border:1px solid var(--border)">
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;font-weight:600;letter-spacing:1px">TRUSTED BY ENTERPRISE CUSTOMERS WORLDWIDE</div>
        <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(59,130,246,0.1);border-radius:8px;border:1px solid rgba(59,130,246,0.2)">
            <span style="font-size:1.2rem">🛡️</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#3b82f6">SOC 2 Type II</div><div style="font-size:0.6rem;color:var(--text-muted)">Audited by Deloitte</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(16,185,129,0.1);border-radius:8px;border:1px solid rgba(16,185,129,0.2)">
            <span style="font-size:1.2rem">📋</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#10b981">ISO 27001:2022</div><div style="font-size:0.6rem;color:var(--text-muted)">BSI Certified</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(245,158,11,0.1);border-radius:8px;border:1px solid rgba(245,158,11,0.2)">
            <span style="font-size:1.2rem">🏅</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#f59e0b">GS1 Partner</div><div style="font-size:0.6rem;color:var(--text-muted)">EPCIS 2.0 Compliant</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(99,102,241,0.1);border-radius:8px;border:1px solid rgba(99,102,241,0.2)">
            <span style="font-size:1.2rem">🇪🇺</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#6366f1">GDPR</div><div style="font-size:0.6rem;color:var(--text-muted)">Full Compliance</div></div>
          </div>
        </div>
      </div>

    </div>
  `;
}
async function requestEnterpriseQuote() {
  const scans = prompt('Estimated monthly scans?', '500000');
  if (!scans) return;
  try {
    const res = await API.post('/billing/enterprise/request', {
      estimated_scans: parseInt(scans),
      estimated_api_calls: 1000000,
      requirements: { on_premise: confirm('Need on-premise deployment?'), custom_sla: '99.95%' },
    });
    showToast('Enterprise quote submitted! Our team will contact you within 48 hours.', 'success');
  } catch (e) { showToast(e.message || 'Quote request failed', 'error'); }
}

// Window exports for onclick handlers
window.requestEnterpriseQuote = requestEnterpriseQuote;
