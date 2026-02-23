/**
 * Super Admin – Service Status & Performance
 * Premium monitoring dashboard design
 */
import { icon } from '../../core/icons.js';

const SERVICES = [
    { name: 'API Gateway', status: 'healthy', uptime: 99.99, latency: '142ms', rps: '24.1K', icon: '🌐', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
    { name: 'Auth Service', status: 'healthy', uptime: 99.98, latency: '38ms', rps: '2.1K', icon: '🔐', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    { name: 'Fraud Engine', status: 'healthy', uptime: 99.95, latency: '210ms', rps: '1.2K', icon: '🛡️', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { name: 'QR Engine', status: 'healthy', uptime: 99.99, latency: '67ms', rps: '8.4K', icon: '📱', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
    { name: 'Blockchain Node', status: 'healthy', uptime: 99.90, latency: '890ms', rps: '42/min', icon: '⛓️', gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
    { name: 'Cache (Redis)', status: 'healthy', uptime: 99.99, latency: '2ms', rps: '99.8%', icon: '⚡', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
    { name: 'Queue (RabbitMQ)', status: 'warning', uptime: 99.80, latency: '—', rps: '340', icon: '📨', gradient: 'linear-gradient(135deg,#f59e0b,#b45309)' },
    { name: 'Database (Primary)', status: 'healthy', uptime: 99.97, latency: '12ms', rps: '98%', icon: '🗄️', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)' },
];

const PERF = [
    { label: 'P95 Latency', value: '142', unit: 'ms', change: '-8ms', good: true, pct: 14, color: '#10b981' },
    { label: 'Peak RPS', value: '24.1', unit: 'K', change: '+12%', good: true, pct: 48, color: '#3b82f6' },
    { label: 'Error Rate', value: '0.03', unit: '%', change: '-0.01%', good: true, pct: 3, color: '#10b981' },
    { label: 'DB Load', value: '34', unit: '%', change: '±0', good: true, pct: 34, color: '#06b6d4' },
    { label: 'Memory', value: '67', unit: '%', change: '+3%', good: false, pct: 67, color: '#f59e0b' },
    { label: 'Queue', value: '340', unit: '', change: '+180', good: false, pct: 45, color: '#f97316' },
    { label: 'Cache Hit', value: '99.8', unit: '%', change: '±0', good: true, pct: 99, color: '#22c55e' },
    { label: 'Connections', value: '1,847', unit: '', change: '+12%', good: true, pct: 61, color: '#8b5cf6' },
];

export function renderPage() {
    const healthy = SERVICES.filter(s => s.status === 'healthy').length;
    const warning = SERVICES.filter(s => s.status === 'warning').length;

    return `
    <style>
        .sh-hero {
            display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 0;
            border-radius: 16px; overflow: hidden; margin-bottom: 20px;
            background: var(--bg-card, rgba(15,23,42,0.6)); border: 1px solid var(--border);
        }
        .sh-hero-cell {
            padding: 20px 24px; position: relative;
            border-right: 1px solid var(--border);
        }
        .sh-hero-cell:last-child { border-right: none; }
        .sh-hero-label {
            font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1.2px; color: var(--text-muted); margin-bottom: 6px;
        }
        .sh-hero-val {
            font-size: 1.6rem; font-weight: 900;
            font-family: 'JetBrains Mono', monospace; line-height: 1.1;
        }
        .sh-hero-sub { font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; }
        .sh-hero-badge {
            display: flex; align-items: center; justify-content: center;
            padding: 0 24px; gap: 8px;
        }
        .sh-badge-pill {
            display: flex; align-items: center; gap: 6px; font-size: 0.7rem;
            font-weight: 700; padding: 8px 18px; border-radius: 24px;
            white-space: nowrap;
        }
        .sh-pulse {
            width: 8px; height: 8px; border-radius: 50%;
            animation: sh-glow 2s ease-in-out infinite;
        }
        @keyframes sh-glow {
            0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
            50% { opacity: 0.6; box-shadow: 0 0 8px 2px currentColor; }
        }

        .sh-section-head {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 14px;
        }
        .sh-section-title {
            font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1px; color: var(--text-secondary);
            display: flex; align-items: center; gap: 8px;
        }
        .sh-count-badge {
            font-size: 0.65rem; padding: 3px 10px; border-radius: 12px;
            font-weight: 700;
        }

        .sh-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .sh-card {
            border-radius: 16px; overflow: hidden; position: relative;
            background: var(--bg-card, rgba(15,23,42,0.6));
            border: 1px solid var(--border);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sh-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            border-color: rgba(148,163,184,0.2);
        }
        .sh-card-top {
            padding: 16px 18px 14px; display: flex; align-items: center; gap: 12px;
        }
        .sh-card-icon {
            width: 42px; height: 42px; border-radius: 12px; display: flex;
            align-items: center; justify-content: center; font-size: 1.3rem;
            color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .sh-card-info { flex: 1; min-width: 0; }
        .sh-card-name { font-size: 0.85rem; font-weight: 700; }
        .sh-card-pill {
            display: inline-flex; align-items: center; gap: 4px;
            font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.5px; padding: 2px 10px; border-radius: 12px; margin-top: 3px;
        }

        .sh-card-uptime {
            padding: 0 18px; margin-bottom: 10px;
        }
        .sh-uptime-row {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 4px;
        }
        .sh-uptime-label { font-size: 0.62rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
        .sh-uptime-val { font-size: 0.72rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .sh-uptime-bar {
            height: 4px; border-radius: 2px; background: var(--bg-secondary); overflow: hidden;
        }
        .sh-uptime-fill {
            height: 100%; border-radius: 2px;
            transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sh-card-stats {
            display: grid; grid-template-columns: 1fr 1fr;
            border-top: 1px solid var(--border);
        }
        .sh-stat {
            padding: 10px 18px; text-align: center;
        }
        .sh-stat:first-child { border-right: 1px solid var(--border); }
        .sh-stat-val {
            font-size: 0.85rem; font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
        }
        .sh-stat-label {
            font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase;
            letter-spacing: 0.5px; margin-top: 2px;
        }

        .sh-perf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .sh-perf {
            border-radius: 14px; padding: 16px 18px; text-align: center;
            background: var(--bg-card, rgba(15,23,42,0.6));
            border: 1px solid var(--border);
            transition: all 0.25s ease;
            position: relative; overflow: hidden;
        }
        .sh-perf:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .sh-perf-val {
            font-size: 1.5rem; font-weight: 900;
            font-family: 'JetBrains Mono', monospace; line-height: 1;
        }
        .sh-perf-unit { font-size: 0.7rem; font-weight: 400; opacity: 0.5; }
        .sh-perf-label { font-size: 0.68rem; color: var(--text-muted); margin-top: 4px; font-weight: 500; }
        .sh-perf-bar { height: 4px; border-radius: 2px; background: var(--bg-secondary); margin: 10px 0 8px; overflow: hidden; }
        .sh-perf-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }
        .sh-perf-change {
            display: inline-block; font-size: 0.62rem; font-weight: 700;
            padding: 2px 8px; border-radius: 10px;
        }

        @media (max-width: 900px) { .sh-grid, .sh-perf-grid { grid-template-columns: repeat(2, 1fr); } .sh-hero { grid-template-columns: repeat(2, 1fr); } }
    </style>

    <!-- ═══ Hero Stats Bar ═══ -->
    <div class="sh-hero">
        <div class="sh-hero-cell">
            <div class="sh-hero-label">Services Online</div>
            <div class="sh-hero-val" style="color:#10b981">${healthy}<span style="font-size:0.9rem;color:var(--text-muted)">/${SERVICES.length}</span></div>
            <div class="sh-hero-sub">${warning > 0 ? `${warning} warning` : 'All healthy'}</div>
        </div>
        <div class="sh-hero-cell">
            <div class="sh-hero-label">Platform Uptime</div>
            <div class="sh-hero-val" style="color:#06b6d4">99.96<span style="font-size:0.9rem">%</span></div>
            <div class="sh-hero-sub">30-day rolling avg</div>
        </div>
        <div class="sh-hero-cell">
            <div class="sh-hero-label">Avg Latency</div>
            <div class="sh-hero-val" style="color:#8b5cf6">142<span style="font-size:0.9rem">ms</span></div>
            <div class="sh-hero-sub">P95 response time</div>
        </div>
        <div class="sh-hero-cell">
            <div class="sh-hero-label">Error Rate</div>
            <div class="sh-hero-val" style="color:#f59e0b">0.03<span style="font-size:0.9rem">%</span></div>
            <div class="sh-hero-sub">Last 24 hours</div>
        </div>
        <div class="sh-hero-badge">
            <div class="sh-badge-pill" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.2)">
                <span class="sh-pulse" style="background:#10b981;color:#10b981"></span>
                OPERATIONAL
            </div>
        </div>
    </div>

    <!-- ═══ Service Cards ═══ -->
    <div class="sh-section-head">
        <div class="sh-section-title">${icon('server', 14)} Infrastructure Services</div>
        <div style="display:flex;gap:8px">
            <span class="sh-count-badge" style="background:rgba(16,185,129,0.1);color:#10b981">${healthy} Healthy</span>
            ${warning > 0 ? `<span class="sh-count-badge" style="background:rgba(245,158,11,0.1);color:#f59e0b">${warning} Warning</span>` : ''}
        </div>
    </div>
    <div class="sh-grid">
        ${SERVICES.map(s => {
        const isOk = s.status === 'healthy';
        const statusColor = isOk ? '#10b981' : '#f59e0b';
        const uptimePct = Math.min(((s.uptime - 99) / 1) * 100, 100);
        const uptimeColor = s.uptime >= 99.95 ? '#10b981' : s.uptime >= 99.9 ? '#06b6d4' : '#f59e0b';
        return `
            <div class="sh-card">
                <div class="sh-card-top">
                    <div class="sh-card-icon" style="background:${s.gradient}">${s.icon}</div>
                    <div class="sh-card-info">
                        <div class="sh-card-name">${s.name}</div>
                        <div class="sh-card-pill" style="background:${statusColor}18;color:${statusColor}">
                            <span style="width:5px;height:5px;border-radius:50%;background:${statusColor};display:inline-block"></span>
                            ${isOk ? 'Healthy' : 'Warning'}
                        </div>
                    </div>
                </div>
                <div class="sh-card-uptime">
                    <div class="sh-uptime-row">
                        <span class="sh-uptime-label">Uptime</span>
                        <span class="sh-uptime-val" style="color:${uptimeColor}">${s.uptime.toFixed(2)}%</span>
                    </div>
                    <div class="sh-uptime-bar">
                        <div class="sh-uptime-fill" style="width:${uptimePct}%;background:${uptimeColor}"></div>
                    </div>
                </div>
                <div class="sh-card-stats">
                    <div class="sh-stat">
                        <div class="sh-stat-val">${s.latency}</div>
                        <div class="sh-stat-label">Latency</div>
                    </div>
                    <div class="sh-stat">
                        <div class="sh-stat-val">${s.rps}</div>
                        <div class="sh-stat-label">${s.name.includes('Cache') ? 'Hit Rate' : s.name.includes('Queue') ? 'Backlog' : s.name.includes('Database') ? 'Cache Hit' : s.name.includes('Blockchain') ? 'TX Rate' : 'RPS'}</div>
                    </div>
                </div>
            </div>`;
    }).join('')}
    </div>

    <!-- ═══ Performance Metrics ═══ -->
    <div class="sh-section-head">
        <div class="sh-section-title">${icon('barChart', 14)} Performance Metrics</div>
    </div>
    <div class="sh-perf-grid">
        ${PERF.map(m => {
        const changeColor = m.good ? '#10b981' : '#f59e0b';
        const changeBg = m.good ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)';
        return `
            <div class="sh-perf">
                <div class="sh-perf-val" style="color:${m.color}">${m.value}<span class="sh-perf-unit">${m.unit}</span></div>
                <div class="sh-perf-label">${m.label}</div>
                <div class="sh-perf-bar"><div class="sh-perf-fill" style="width:${m.pct}%;background:${m.color}"></div></div>
                <span class="sh-perf-change" style="background:${changeBg};color:${changeColor}">${m.change}</span>
            </div>`;
    }).join('')}
    </div>
    `;
}
