/**
 * Super Admin – Control Tower (Live API)
 * Premium dark-accent dashboard design
 */
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';

let metrics = null;
let loading = false;
let lastLoad = 0;

async function loadMetrics() {
    if (loading) return;
    loading = true;
    try {
        const data = await API.get('/platform/tenants');
        const tenants = Array.isArray(data) ? data : (data.tenants || []);
        const active = tenants.filter(t => (t.status || 'active') === 'active').length;
        const suspended = tenants.filter(t => t.status === 'suspended').length;
        const totalUsers = tenants.reduce((sum, t) => sum + (t.user_count || 0), 0);
        const planCounts = {};
        tenants.forEach(t => { const p = (t.plan || 'free').toLowerCase(); planCounts[p] = (planCounts[p] || 0) + 1; });
        metrics = { totalTenants: tenants.length, activeTenants: active, suspended, totalUsers, tenants, planCounts };
        lastLoad = Date.now();

        // Store tenants in global State for other SA pages
        const { State } = await import('../../core/state.js');
        State.platformTenants = tenants;

        // Background prefetch billing + pricing for sa-financial (non-blocking)
        Promise.allSettled([
            API.get('/billing/plan').catch(() => ({ plan: null, available_plans: [] })),
            API.get('/billing/usage').catch(() => ({ period: null, usage: {} })),
            API.get('/billing/invoices').catch(() => ({ invoices: [] })),
            fetch(API.base + '/billing/pricing').then(r => r.ok ? r.json() : {}).catch(() => ({})),
        ]).then(([planR, usageR, invoiceR, pricingR]) => {
            const p = planR.value || {}, u = usageR.value || {}, i = invoiceR.value || {};
            State.billingData = { plan: p.plan, available: p.available_plans, period: u.period, usage: u.usage, invoices: i.invoices };
            State.pricingAdminData = pricingR.value || {};
            State._saFinancialPrefetched = true;
            console.log('[SA] Financial data prefetched ✓');
        });
    } catch (e) {
        console.error('[SA] Failed to load metrics:', e);
        metrics = { totalTenants: 0, activeTenants: 0, suspended: 0, totalUsers: 0, tenants: [], planCounts: {} };
    }
    loading = false;
    window.render();
}

export function renderPage() {
    // Always reload if stale (>30s) or never loaded
    if (!loading && (Date.now() - lastLoad > 30000)) { loadMetrics(); }
    if (loading && !metrics) {
        return `<div style="display:flex;align-items:center;justify-content:center;padding:80px"><div class="spinner"></div></div>`;
    }

    const m = metrics || {};
    const planColors = { free: '#94a3b8', starter: '#0ea5e9', pro: '#8b5cf6', business: '#f59e0b', enterprise: '#f97316', core: '#0ea5e9' };
    const planLabels = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business', enterprise: 'Enterprise', core: 'Core' };
    const planEntries = Object.entries(m.planCounts || {}).sort((a, b) => b[1] - a[1]);
    const totalPlans = planEntries.reduce((s, e) => s + e[1], 0) || 1;

    return `
    <style>
        .ct2 { font-family: var(--font-primary); }
        .ct2-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
        .ct2-h1 { font-size:1.4rem; font-weight:800; display:flex; align-items:center; gap:10px; }
        .ct2-sub { font-size:0.75rem; color:var(--text-muted); margin-top:4px; }
        .ct2-live {
            display:flex; align-items:center; gap:6px; font-size:0.68rem; font-weight:700;
            padding:6px 14px; border-radius:20px;
            background:#ef4444; color:#fff; box-shadow:0 2px 12px rgba(239,68,68,0.3);
        }
        .ct2-live-dot { width:6px; height:6px; border-radius:50%; background:#fff; animation:ct2p 1.5s infinite; }
        @keyframes ct2p { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── KPI Row ── */
        .ct2-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .ct2-kpi {
            border-radius:16px; padding:22px 24px; color:#fff; position:relative;
            overflow:hidden; min-height:120px;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .ct2-kpi:hover { transform:translateY(-4px); }
        .ct2-kpi::before {
            content:''; position:absolute; top:-30px; right:-30px;
            width:100px; height:100px; border-radius:50%;
            background:rgba(255,255,255,0.08);
        }
        .ct2-kpi::after {
            content:''; position:absolute; bottom:-40px; left:-20px;
            width:120px; height:120px; border-radius:50%;
            background:rgba(255,255,255,0.05);
        }
        .ct2-kpi-label {
            font-size:0.68rem; font-weight:600; text-transform:uppercase;
            letter-spacing:1px; opacity:0.8; margin-bottom:10px;
        }
        .ct2-kpi-val {
            font-size:2.4rem; font-weight:900; line-height:1;
            font-family:'JetBrains Mono',monospace; position:relative; z-index:1;
        }
        .ct2-kpi-footer { font-size:0.68rem; opacity:0.7; margin-top:8px; position:relative; z-index:1; }

        .ct2-kpi.blue { background:linear-gradient(135deg,#3b82f6,#1d4ed8); box-shadow:0 8px 24px rgba(59,130,246,0.25); }
        .ct2-kpi.blue:hover { box-shadow:0 12px 36px rgba(59,130,246,0.35); }
        .ct2-kpi.green { background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 8px 24px rgba(16,185,129,0.25); }
        .ct2-kpi.green:hover { box-shadow:0 12px 36px rgba(16,185,129,0.35); }
        .ct2-kpi.amber { background:linear-gradient(135deg,#f59e0b,#d97706); box-shadow:0 8px 24px rgba(245,158,11,0.25); }
        .ct2-kpi.amber:hover { box-shadow:0 12px 36px rgba(245,158,11,0.35); }
        .ct2-kpi.purple { background:linear-gradient(135deg,#8b5cf6,#6d28d9); box-shadow:0 8px 24px rgba(139,92,246,0.25); }
        .ct2-kpi.purple:hover { box-shadow:0 12px 36px rgba(139,92,246,0.35); }

        /* ── Content Grid ── */
        .ct2-grid { display:grid; grid-template-columns:7fr 3fr; gap:16px; }
        .ct2-card {
            background:var(--bg-card,rgba(15,23,42,0.6)); border:1px solid var(--border);
            border-radius:16px; overflow:hidden;
        }
        .ct2-card-head {
            padding:16px 20px; display:flex; align-items:center; justify-content:space-between;
            border-bottom:1px solid var(--border);
        }
        .ct2-card-title {
            font-size:0.78rem; font-weight:700; text-transform:uppercase;
            letter-spacing:0.6px; display:flex; align-items:center; gap:8px;
        }
        .ct2-card-count {
            font-size:0.65rem; padding:3px 10px; border-radius:12px;
            background:var(--bg-secondary); color:var(--text-muted); font-weight:600;
        }
        .ct2-card-body { padding:6px 0; }

        /* ── Tenant Row ── */
        .ct2-row {
            display:grid; grid-template-columns:36px 1fr 80px 60px 28px;
            align-items:center; gap:12px; padding:10px 20px;
            transition:background 0.15s;
        }
        .ct2-row:hover { background:rgba(148,163,184,0.04); }
        .ct2-avatar {
            width:36px; height:36px; border-radius:10px; display:flex;
            align-items:center; justify-content:center; font-size:0.72rem;
            font-weight:800; color:#fff; flex-shrink:0;
        }
        .ct2-tenant-name { font-size:0.8rem; font-weight:600; }
        .ct2-tenant-meta { font-size:0.65rem; color:var(--text-muted); margin-top:1px; }
        .ct2-plan-badge {
            font-size:0.6rem; font-weight:700; padding:3px 10px; border-radius:8px;
            text-transform:uppercase; letter-spacing:0.3px; text-align:center;
        }
        .ct2-user-count {
            font-size:0.78rem; font-weight:700; text-align:center;
            font-family:'JetBrains Mono',monospace;
        }
        .ct2-status-dot {
            width:8px; height:8px; border-radius:50%; justify-self:center;
        }

        /* ── Sidebar ── */
        .ct2-sidebar { display:flex; flex-direction:column; gap:16px; }

        .ct2-plan-item {
            display:flex; align-items:center; gap:10px; padding:10px 0;
            border-bottom:1px solid rgba(148,163,184,0.06);
        }
        .ct2-plan-item:last-child { border-bottom:none; }
        .ct2-plan-dot { width:12px; height:12px; border-radius:4px; flex-shrink:0; }
        .ct2-plan-bar-wrap { flex:1; }
        .ct2-plan-label { font-size:0.75rem; font-weight:600; display:flex; justify-content:space-between; margin-bottom:4px; }
        .ct2-plan-bar { height:6px; background:var(--bg-secondary); border-radius:3px; overflow:hidden; }
        .ct2-plan-fill { height:100%; border-radius:3px; transition:width 0.6s ease; }

        .ct2-sys-row {
            display:flex; justify-content:space-between; align-items:center;
            padding:8px 0; border-bottom:1px solid rgba(148,163,184,0.06);
            font-size:0.78rem;
        }
        .ct2-sys-row:last-child { border-bottom:none; }
        .ct2-sys-label { color:var(--text-muted); }
        .ct2-sys-val { font-weight:700; display:flex; align-items:center; gap:5px; }

        .ct2-action {
            display:flex; align-items:center; gap:10px; padding:10px 14px;
            border-radius:10px; cursor:pointer; transition:all 0.2s;
            border:1px solid rgba(148,163,184,0.1); margin-bottom:6px;
        }
        .ct2-action:hover { background:rgba(59,130,246,0.06); border-color:rgba(59,130,246,0.2); transform:translateX(4px); }
        .ct2-action-icon {
            width:30px; height:30px; border-radius:8px; display:flex;
            align-items:center; justify-content:center; font-size:0.85rem; flex-shrink:0;
        }

        @media (max-width:900px) { .ct2-kpi-row{grid-template-columns:repeat(2,1fr)} .ct2-grid{grid-template-columns:1fr} }
    </style>

    <div class="ct2">
        <!-- Header -->
        <div class="ct2-head">
            <div>
                <div class="ct2-h1">${icon('dashboard', 24)} Control Tower</div>
                <div class="ct2-sub">Platform overview · Real-time data</div>
            </div>
            <div class="ct2-live"><div class="ct2-live-dot"></div> LIVE</div>
        </div>

        <!-- KPI Cards — Bold solid gradients -->
        <div class="ct2-kpi-row">
            <div class="ct2-kpi blue">
                <div class="ct2-kpi-label">Total Tenants</div>
                <div class="ct2-kpi-val">${m.totalTenants}</div>
                <div class="ct2-kpi-footer">Organizations on platform</div>
            </div>
            <div class="ct2-kpi green">
                <div class="ct2-kpi-label">Active</div>
                <div class="ct2-kpi-val">${m.activeTenants}</div>
                <div class="ct2-kpi-footer">${m.totalTenants ? Math.round(m.activeTenants / m.totalTenants * 100) : 0}% of total</div>
            </div>
            <div class="ct2-kpi amber">
                <div class="ct2-kpi-label">Suspended</div>
                <div class="ct2-kpi-val">${m.suspended}</div>
                <div class="ct2-kpi-footer">${m.suspended === 0 ? 'All in good standing' : 'Requires attention'}</div>
            </div>
            <div class="ct2-kpi purple">
                <div class="ct2-kpi-label">Total Users</div>
                <div class="ct2-kpi-val">${m.totalUsers}</div>
                <div class="ct2-kpi-footer">${m.totalTenants > 0 ? (m.totalUsers / m.totalTenants).toFixed(1) : 0} avg per tenant</div>
            </div>
        </div>

        <!-- Main Content —— Tenant Table + Sidebar -->
        <div class="ct2-grid">
            <!-- Tenant List -->
            <div class="ct2-card">
                <div class="ct2-card-head">
                    <div class="ct2-card-title">${icon('building', 14)} Tenants</div>
                    <span class="ct2-card-count">${(m.tenants || []).length} total</span>
                </div>
                <div class="ct2-card-body">
                    <!-- Header row -->
                    <div class="ct2-row" style="padding:6px 20px;border-bottom:1px solid var(--border)">
                        <span></span>
                        <span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">Organization</span>
                        <span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);text-align:center">Plan</span>
                        <span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);text-align:center">Users</span>
                        <span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);text-align:center">●</span>
                    </div>
                    ${(m.tenants || []).map((t, i) => {
        const plan = (t.plan || 'free').toLowerCase();
        const s = t.status || 'active';
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#e11d48'];
        const bg = colors[i % colors.length];
        const init = (t.name || '??').substring(0, 2).toUpperCase();
        return `
                        <div class="ct2-row" style="cursor:pointer" onclick="navigate('sa-tenant-detail',{tenantId:'${t.id}'})">
                            <div class="ct2-avatar" style="background:${bg}">${init}</div>
                            <div>
                                <div class="ct2-tenant-name">${esc(t.name || '')}</div>
                                <div class="ct2-tenant-meta">${s}</div>
                            </div>
                            <span class="ct2-plan-badge" style="background:${(planColors[plan] || '#94a3b8')}18;color:${planColors[plan] || '#94a3b8'}">${planLabels[plan] || plan}</span>
                            <div class="ct2-user-count">${t.user_count || 0}</div>
                            <div class="ct2-status-dot" style="background:${s === 'active' ? '#10b981' : '#f59e0b'}"></div>
                        </div>`;
    }).join('')}
                </div>
            </div>

            <!-- Sidebar -->
            <div class="ct2-sidebar">
                <!-- Plan Distribution -->
                <div class="ct2-card">
                    <div class="ct2-card-head"><div class="ct2-card-title">${icon('tag', 14)} Plans</div></div>
                    <div style="padding:12px 20px">
                        ${planEntries.map(([plan, count]) => {
        const pct = Math.round((count / totalPlans) * 100);
        const color = planColors[plan] || '#94a3b8';
        return `
                            <div class="ct2-plan-item">
                                <div class="ct2-plan-dot" style="background:${color}"></div>
                                <div class="ct2-plan-bar-wrap">
                                    <div class="ct2-plan-label">
                                        <span>${planLabels[plan] || plan}</span>
                                        <span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem">${count}</span>
                                    </div>
                                    <div class="ct2-plan-bar"><div class="ct2-plan-fill" style="width:${pct}%;background:${color}"></div></div>
                                </div>
                            </div>`;
    }).join('')}
                    </div>
                </div>

                <!-- System Status -->
                <div class="ct2-card">
                    <div class="ct2-card-head"><div class="ct2-card-title">${icon('shield', 14)} System</div></div>
                    <div style="padding:10px 20px">
                        <div class="ct2-sys-row"><span class="ct2-sys-label">API</span><span class="ct2-sys-val"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block"></span> Online</span></div>
                        <div class="ct2-sys-row"><span class="ct2-sys-label">Database</span><span class="ct2-sys-val"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block"></span> Connected</span></div>
                        <div class="ct2-sys-row"><span class="ct2-sys-label">Version</span><span class="ct2-sys-val" style="font-family:'JetBrains Mono',monospace">v9.4.1</span></div>
                        <div class="ct2-sys-row"><span class="ct2-sys-label">Uptime</span><span class="ct2-sys-val" style="color:#10b981">99.97%</span></div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="ct2-card">
                    <div class="ct2-card-head"><div class="ct2-card-title">${icon('zap', 14)} Actions</div></div>
                    <div style="padding:12px 14px">
                        <div class="ct2-action" onclick="navigate('sa-tenants')">
                            <div class="ct2-action-icon" style="background:rgba(59,130,246,0.1)">🏢</div>
                            <div style="font-size:0.75rem;font-weight:600">View All Tenants</div>
                        </div>
                        <div class="ct2-action" onclick="navigate('sa-platform-users')">
                            <div class="ct2-action-icon" style="background:rgba(139,92,246,0.1)">👥</div>
                            <div style="font-size:0.75rem;font-weight:600">Platform Users</div>
                        </div>
                        <div class="ct2-action" onclick="navigate('sa-operations')">
                            <div class="ct2-action-icon" style="background:rgba(16,185,129,0.1)">⚙️</div>
                            <div style="font-size:0.75rem;font-weight:600">Operations</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
