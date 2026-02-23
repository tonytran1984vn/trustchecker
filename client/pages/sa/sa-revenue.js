/**
 * SA Revenue Dashboard — Platform‑level revenue metrics
 * Premium design with gradient KPI cards, donut chart, and polished tables
 */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';

const PLAN_PRICES = { free: 0, starter: 99, growth: 299, business: 749, enterprise: 5000 };
const PLAN_COLORS = { free: '#94a3b8', starter: '#06b6d4', growth: '#8b5cf6', business: '#f59e0b', enterprise: '#ef4444' };
const PLAN_GRADIENTS = {
    free: 'linear-gradient(135deg, #64748b, #94a3b8)',
    starter: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
    growth: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    business: 'linear-gradient(135deg, #d97706, #f59e0b)',
    enterprise: 'linear-gradient(135deg, #dc2626, #f97316)',
};
const PLAN_LABELS = { free: 'Free Trial', starter: 'Starter', growth: 'Growth', business: 'Business', enterprise: 'Enterprise' };
const PLAN_ICONS = { free: '🆓', starter: '🚀', growth: '⚡', business: '🏢', enterprise: '👑' };

export function renderPage() {
    const tenants = State.platformTenants || [];
    const invoices = State.billingData?.invoices || [];
    const available = State.billingData?.available || {};

    // Sync real prices from API
    Object.entries(available).forEach(([slug, p]) => {
        if (p.price_monthly != null) PLAN_PRICES[slug] = p.price_monthly;
    });

    // ── Compute metrics ──
    const planCounts = {};
    tenants.forEach(t => {
        const p = (t.plan || 'free').toLowerCase();
        planCounts[p] = (planCounts[p] || 0) + 1;
    });

    const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => sum + (PLAN_PRICES[plan] || 0) * count, 0);
    const arr = mrr * 12;
    const paidTenants = tenants.filter(t => (t.plan || 'free') !== 'free').length;
    const arpu = paidTenants > 0 ? Math.round(mrr / paidTenants) : 0;
    const totalInvoiced = invoices.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;

    // Plan distribution
    const planEntries = Object.entries(planCounts).sort((a, b) => (PLAN_PRICES[b[0]] || 0) - (PLAN_PRICES[a[0]] || 0));
    const revenueByPlan = planEntries.map(([plan, count]) => ({
        plan, label: PLAN_LABELS[plan] || plan, count,
        revenue: (PLAN_PRICES[plan] || 0) * count,
        color: PLAN_COLORS[plan] || '#64748b',
        gradient: PLAN_GRADIENTS[plan] || PLAN_GRADIENTS.free,
        icon: PLAN_ICONS[plan] || '📋',
    }));
    const totalPlanRevenue = revenueByPlan.reduce((s, p) => s + p.revenue, 0) || 1;

    // Donut chart segments
    const donutSegments = revenueByPlan.filter(p => p.revenue > 0);
    let donutOffset = 0;
    const donutPaths = donutSegments.map(p => {
        const pct = (p.revenue / totalPlanRevenue) * 100;
        const segment = { ...p, pct, offset: donutOffset };
        donutOffset += pct;
        return segment;
    });

    return `
    <style>
        .rev-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .rev-kpi {
            position: relative; border-radius: 16px; padding: 20px 22px;
            overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;
        }
        .rev-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); }
        .rev-kpi-bg {
            position: absolute; inset: 0; opacity: 0.12; border-radius: 16px;
        }
        .rev-kpi-label {
            font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1.2px; margin-bottom: 8px; opacity: 0.7;
        }
        .rev-kpi-value { font-size: 2rem; font-weight: 800; line-height: 1.1; }
        .rev-kpi-sub { font-size: 0.7rem; margin-top: 8px; opacity: 0.6; }
        .rev-kpi-icon {
            position: absolute; top: 16px; right: 18px; font-size: 1.6rem; opacity: 0.3;
        }
        .rev-kpi.mrr { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08)); border: 1px solid rgba(16,185,129,0.2); }
        .rev-kpi.mrr .rev-kpi-value { color: #10b981; }
        .rev-kpi.arr { background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.08)); border: 1px solid rgba(6,182,212,0.2); }
        .rev-kpi.arr .rev-kpi-value { color: #06b6d4; }
        .rev-kpi.arpu { background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.08)); border: 1px solid rgba(139,92,246,0.2); }
        .rev-kpi.arpu .rev-kpi-value { color: #8b5cf6; }
        .rev-kpi.subs { background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.08)); border: 1px solid rgba(245,158,11,0.2); }
        .rev-kpi.subs .rev-kpi-value { color: #f59e0b; }

        .rev-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .rev-card {
            background: var(--bg-card, rgba(15,23,42,0.6)); border: 1px solid var(--border);
            border-radius: 16px; overflow: hidden;
        }
        .rev-card-head {
            padding: 16px 20px 12px; font-size: 0.78rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary);
            display: flex; align-items: center; gap: 8px;
            border-bottom: 1px solid var(--border);
        }
        .rev-card-body { padding: 16px 20px 20px; }

        .rev-plan-row {
            display: flex; align-items: center; gap: 14px; padding: 10px 0;
            border-bottom: 1px solid rgba(148,163,184,0.08);
            transition: background 0.15s;
        }
        .rev-plan-row:last-child { border-bottom: none; }
        .rev-plan-row:hover { background: rgba(148,163,184,0.04); margin: 0 -8px; padding: 10px 8px; border-radius: 8px; }
        .rev-plan-dot {
            width: 36px; height: 36px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; flex-shrink: 0;
        }
        .rev-plan-info { flex: 1; min-width: 0; }
        .rev-plan-name { font-size: 0.82rem; font-weight: 700; }
        .rev-plan-count { font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; }
        .rev-plan-amount { text-align: right; }
        .rev-plan-revenue { font-size: 0.9rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .rev-plan-pct { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }

        .rev-total-bar {
            margin-top: 16px; padding-top: 14px; border-top: 2px solid var(--border);
            display: flex; justify-content: space-between; align-items: center;
        }
        .rev-total-label { font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .rev-total-value { font-size: 1.2rem; font-weight: 900; color: #10b981; font-family: 'JetBrains Mono', monospace; }

        .rev-donut-wrap { display: flex; justify-content: center; padding: 8px 0 16px; }

        .rev-bar-stack {
            display: flex; height: 10px; border-radius: 5px; overflow: hidden;
            background: var(--bg-secondary); margin-bottom: 16px;
        }
        .rev-bar-seg { height: 100%; transition: width 0.6s ease; }

        .rev-stat-table { width: 100%; }
        .rev-stat-table tr { border-bottom: 1px solid rgba(148,163,184,0.08); }
        .rev-stat-table tr:last-child { border-bottom: none; }
        .rev-stat-table td { padding: 10px 0; font-size: 0.8rem; }
        .rev-stat-table td:first-child { color: var(--text-secondary); font-weight: 500; }
        .rev-stat-table td:last-child { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

        @media (max-width: 768px) {
            .rev-kpi-grid { grid-template-columns: repeat(2, 1fr); }
            .rev-section { grid-template-columns: 1fr; }
        }
    </style>

    <!-- ═══ KPI Cards ═══ -->
    <div class="rev-kpi-grid">
        <div class="rev-kpi mrr">
            <div class="rev-kpi-icon">💰</div>
            <div class="rev-kpi-label">Monthly Recurring Revenue</div>
            <div class="rev-kpi-value">$${mrr.toLocaleString()}</div>
            <div class="rev-kpi-sub">from ${paidTenants} paid tenant${paidTenants !== 1 ? 's' : ''}</div>
        </div>
        <div class="rev-kpi arr">
            <div class="rev-kpi-icon">📈</div>
            <div class="rev-kpi-label">Annual Run Rate</div>
            <div class="rev-kpi-value">$${arr.toLocaleString()}</div>
            <div class="rev-kpi-sub">projected yearly</div>
        </div>
        <div class="rev-kpi arpu">
            <div class="rev-kpi-icon">👤</div>
            <div class="rev-kpi-label">Avg Revenue / User</div>
            <div class="rev-kpi-value">$${arpu.toLocaleString()}</div>
            <div class="rev-kpi-sub">per paid tenant</div>
        </div>
        <div class="rev-kpi subs">
            <div class="rev-kpi-icon">🏢</div>
            <div class="rev-kpi-label">Total Subscribers</div>
            <div class="rev-kpi-value">${tenants.length}</div>
            <div class="rev-kpi-sub">${paidTenants} paid · ${tenants.length - paidTenants} free</div>
        </div>
    </div>

    <!-- ═══ Revenue Breakdown + Subscriber Mix ═══ -->
    <div class="rev-section">
        <!-- Revenue by Plan -->
        <div class="rev-card">
            <div class="rev-card-head">${icon('barChart', 14)} Revenue by Plan</div>
            <div class="rev-card-body">
                <!-- Stacked bar -->
                <div class="rev-bar-stack">
                    ${donutPaths.map(p => `<div class="rev-bar-seg" style="width:${p.pct}%;background:${p.color}" title="${p.label}: ${Math.round(p.pct)}%"></div>`).join('')}
                </div>

                ${revenueByPlan.filter(p => p.revenue > 0).map(p => {
        const pct = Math.round((p.revenue / totalPlanRevenue) * 100);
        return `
                    <div class="rev-plan-row">
                        <div class="rev-plan-dot" style="background:${p.gradient}">
                            ${p.icon}
                        </div>
                        <div class="rev-plan-info">
                            <div class="rev-plan-name">${p.label}</div>
                            <div class="rev-plan-count">${p.count} tenant${p.count !== 1 ? 's' : ''} × $${(PLAN_PRICES[p.plan] || 0).toLocaleString()}/mo</div>
                        </div>
                        <div class="rev-plan-amount">
                            <div class="rev-plan-revenue" style="color:${p.color}">$${p.revenue.toLocaleString()}</div>
                            <div class="rev-plan-pct">${pct}% of MRR</div>
                        </div>
                    </div>`;
    }).join('')}

                ${revenueByPlan.filter(p => p.revenue === 0).length > 0 ? `
                <div style="margin-top:8px;padding:6px 0">
                    ${revenueByPlan.filter(p => p.revenue === 0).map(p => `
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;color:var(--text-muted);margin-right:12px">
                        <span style="width:6px;height:6px;border-radius:50%;background:${p.color};display:inline-block"></span>
                        ${p.label}: ${p.count}
                    </span>`).join('')}
                </div>` : ''}

                <div class="rev-total-bar">
                    <div class="rev-total-label">Total MRR</div>
                    <div class="rev-total-value">$${mrr.toLocaleString()}<span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
                </div>
            </div>
        </div>

        <!-- Subscriber Distribution -->
        <div class="rev-card">
            <div class="rev-card-head">${icon('users', 14)} Subscriber Mix</div>
            <div class="rev-card-body">
                <!-- Donut Chart (SVG) -->
                <div class="rev-donut-wrap">
                    <svg width="160" height="160" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--bg-secondary)" stroke-width="4" />
                        ${donutPaths.map(p => {
        const circumference = 2 * Math.PI * 15.9;
        const dashLen = (p.pct / 100) * circumference;
        const dashOffset = circumference - (p.offset / 100) * circumference;
        return `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${p.color}" stroke-width="4"
                                stroke-dasharray="${dashLen} ${circumference - dashLen}"
                                stroke-dashoffset="${dashOffset}"
                                transform="rotate(-90 21 21)"
                                style="transition: stroke-dasharray 0.6s ease" />`;
    }).join('')}
                        <text x="21" y="19.5" text-anchor="middle" fill="var(--text-primary)" style="font-size:5.5px;font-weight:800">${tenants.length}</text>
                        <text x="21" y="24" text-anchor="middle" fill="var(--text-muted)" style="font-size:2.8px;font-weight:500">tenants</text>
                    </svg>
                </div>

                <!-- Legend -->
                ${planEntries.map(([plan, count]) => {
        const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
        const color = PLAN_COLORS[plan] || '#64748b';
        const label = PLAN_LABELS[plan] || plan;
        return `
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        <div style="width:10px;height:10px;border-radius:3px;background:${color};flex-shrink:0"></div>
                        <span style="flex:1;font-size:0.78rem;font-weight:600">${label}</span>
                        <span style="font-size:0.78rem;font-weight:700;font-family:'JetBrains Mono',monospace">${count}</span>
                        <span style="font-size:0.68rem;color:var(--text-muted);width:36px;text-align:right">${pct}%</span>
                    </div>`;
    }).join('')}
            </div>
        </div>
    </div>

    <!-- ═══ Financial Summary ═══ -->
    <div class="rev-card">
        <div class="rev-card-head">${icon('file', 14)} Financial Overview</div>
        <div class="rev-card-body">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
                <div style="text-align:center">
                    <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Total Invoiced</div>
                    <div style="font-size:1.4rem;font-weight:800;color:var(--emerald);font-family:'JetBrains Mono',monospace">$${totalInvoiced.toLocaleString()}</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Paid Invoices</div>
                    <div style="font-size:1.4rem;font-weight:800;font-family:'JetBrains Mono',monospace">${paidInvoices}</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Outstanding</div>
                    <div style="font-size:1.4rem;font-weight:800;color:var(--amber);font-family:'JetBrains Mono',monospace">${invoices.length - paidInvoices}</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Active Subs</div>
                    <div style="font-size:1.4rem;font-weight:800;color:var(--cyan);font-family:'JetBrains Mono',monospace">${paidTenants}</div>
                </div>
            </div>
        </div>
    </div>
    `;
}
