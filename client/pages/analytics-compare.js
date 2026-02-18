/**
 * TrustChecker v9.4 — Analytics Compare Page
 * 
 * Period comparison analytics with side-by-side charts,
 * delta calculations, and drill-down capability.
 */

import { State, render } from '../core/state.js';
import { registerLazyChart, destroyAllLazyCharts } from '../components/lazy-chart.js';
import { renderVirtualTable } from '../components/virtual-table.js';
import { api } from '../services/api.js';

let _drillTable = null;

export function renderAnalyticsCompare() {
    return `
    <div class="page-container" style="padding:24px;max-width:1400px;margin:0 auto;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <div>
                <h1 style="font-size:24px;font-weight:700;color:var(--text,#fff);margin:0;">
                    📈 Analytics Compare
                </h1>
                <p style="color:var(--text-muted,#888);font-size:14px;margin:4px 0 0;">
                    Side-by-side period comparison with trend analysis
                </p>
            </div>
        </div>

        <!-- Period Selector -->
        <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:var(--text-muted);font-size:13px;">Current:</span>
                <select id="compare-period-current" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--accent,#6c5ce7);border-radius:8px;color:var(--text);font-size:13px;">
                    <option value="7">Last 7 days</option>
                    <option value="14">Last 14 days</option>
                    <option value="30" selected>Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
            </div>
            <span style="color:var(--text-muted);font-size:16px;">vs</span>
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:var(--text-muted);font-size:13px;">Compare:</span>
                <select id="compare-period-previous" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text);font-size:13px;">
                    <option value="previous" selected>Previous Period</option>
                    <option value="year">Same Period Last Year</option>
                </select>
            </div>
            <button id="compare-refresh" style="padding:8px 20px;background:var(--accent,#6c5ce7);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">
                Compare
            </button>
        </div>

        <!-- Delta Cards -->
        <div id="compare-deltas" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;"></div>

        <!-- Side-by-Side Charts -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
            <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <h3 style="font-size:14px;color:var(--text-muted);margin:0 0 12px;font-weight:600;">📊 Scans — Current Period</h3>
                <div id="chart-scans-current" style="height:250px;"></div>
            </div>
            <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <h3 style="font-size:14px;color:var(--text-muted);margin:0 0 12px;font-weight:600;">📊 Scans — Previous Period</h3>
                <div id="chart-scans-previous" style="height:250px;"></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
            <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <h3 style="font-size:14px;color:var(--text-muted);margin:0 0 12px;font-weight:600;">🛡️ Fraud Alerts — Current</h3>
                <div id="chart-fraud-current" style="height:250px;"></div>
            </div>
            <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <h3 style="font-size:14px;color:var(--text-muted);margin:0 0 12px;font-weight:600;">🛡️ Fraud Alerts — Previous</h3>
                <div id="chart-fraud-previous" style="height:250px;"></div>
            </div>
        </div>

        <!-- Overlay Chart -->
        <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border,rgba(255,255,255,0.08));margin-bottom:24px;">
            <h3 style="font-size:14px;color:var(--text-muted);margin:0 0 12px;font-weight:600;">📉 Trust Score Trend — Overlay</h3>
            <div id="chart-trust-overlay" style="height:300px;"></div>
        </div>

        <!-- Drill-Down Table -->
        <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border,rgba(255,255,255,0.08));">
            <h3 style="font-size:14px;color:var(--text-muted);margin:0 0 12px;font-weight:600;">🔎 Detail Drill-Down</h3>
            <div id="compare-drill-table" style="height:400px;"></div>
        </div>
    </div>`;
}

export function mountAnalyticsCompare() {
    document.getElementById('compare-refresh')?.addEventListener('click', loadComparisonData);
    loadComparisonData();
}

async function loadComparisonData() {
    const days = parseInt(document.getElementById('compare-period-current')?.value || '30', 10);
    const compareMode = document.getElementById('compare-period-previous')?.value || 'previous';

    try {
        const [currentData, previousData] = await Promise.all([
            api(`/api/analytics/period?days=${days}`),
            api(`/api/analytics/period?days=${days}&offset=${compareMode === 'year' ? 365 : days}`),
        ]);

        const current = currentData.data || currentData;
        const previous = previousData.data || previousData;

        renderDeltas(current, previous);
        renderCharts(current, previous, days);
        renderDrillDown(current, previous);
    } catch (err) {
        console.error('[AnalyticsCompare] Failed to load:', err);
        renderMockData(days);
    }
}

function renderDeltas(current, previous) {
    const container = document.getElementById('compare-deltas');
    if (!container) return;

    const metrics = [
        { key: 'scans', label: 'Total Scans', icon: '📱', cur: current.totalScans || 0, prev: previous.totalScans || 0 },
        { key: 'fraud', label: 'Fraud Alerts', icon: '🛡️', cur: current.fraudAlerts || 0, prev: previous.fraudAlerts || 0, invertColor: true },
        { key: 'products', label: 'New Products', icon: '📦', cur: current.newProducts || 0, prev: previous.newProducts || 0 },
        { key: 'trustScore', label: 'Avg Trust Score', icon: '⭐', cur: current.avgTrustScore || 0, prev: previous.avgTrustScore || 0 },
        { key: 'partners', label: 'Active Partners', icon: '🤝', cur: current.activePartners || 0, prev: previous.activePartners || 0 },
    ];

    container.innerHTML = metrics.map(m => {
        const delta = m.prev > 0 ? Math.round(((m.cur - m.prev) / m.prev) * 100) : 0;
        const positive = m.invertColor ? delta <= 0 : delta >= 0;
        const color = positive ? 'var(--success,#00b894)' : 'var(--danger,#e74c3c)';
        const arrow = delta >= 0 ? '↑' : '↓';

        return `
        <div class="compare-delta-card" data-metric="${m.key}" 
            style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border,rgba(255,255,255,0.08));cursor:pointer;transition:border-color 0.2s;"
            onmouseenter="this.style.borderColor='var(--accent,#6c5ce7)'"
            onmouseleave="this.style.borderColor='var(--border,rgba(255,255,255,0.08))'">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">${m.icon} ${m.label}</div>
                    <div style="font-size:28px;font-weight:700;color:var(--text);margin-top:4px;">${m.cur.toLocaleString()}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:16px;font-weight:700;color:${color};">${arrow} ${Math.abs(delta)}%</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">was ${m.prev.toLocaleString()}</div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Drill-down click on delta cards
    container.querySelectorAll('.compare-delta-card').forEach(card => {
        card.addEventListener('click', () => {
            const metric = card.dataset.metric;
            scrollToDrillDown(metric);
        });
    });
}

function renderCharts(current, previous, days) {
    destroyAllLazyCharts();

    const labels = generateDateLabels(days);

    // Scan charts
    registerLazyChart('chart-scans-current', {
        type: 'line',
        data: { labels, datasets: [{ label: 'Scans', data: current.scansByDay || generateMockTimeSeries(days, 50, 200), borderColor: '#6c5ce7', backgroundColor: '#6c5ce722', fill: true, tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } },
    }, { height: '250px' });

    registerLazyChart('chart-scans-previous', {
        type: 'line',
        data: { labels, datasets: [{ label: 'Scans', data: previous.scansByDay || generateMockTimeSeries(days, 40, 180), borderColor: '#888', backgroundColor: '#88888822', fill: true, tension: 0.4, borderDash: [5, 5] }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } },
    }, { height: '250px' });

    // Fraud charts
    registerLazyChart('chart-fraud-current', {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Alerts', data: current.fraudByDay || generateMockTimeSeries(days, 0, 10), backgroundColor: '#e74c3c88', borderColor: '#e74c3c', borderWidth: 1 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } },
    }, { height: '250px' });

    registerLazyChart('chart-fraud-previous', {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Alerts', data: previous.fraudByDay || generateMockTimeSeries(days, 0, 12), backgroundColor: '#88888888', borderColor: '#888', borderWidth: 1, borderDash: [3, 3] }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } },
    }, { height: '250px' });

    // Trust overlay
    registerLazyChart('chart-trust-overlay', {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Current', data: current.trustByDay || generateMockTimeSeries(days, 70, 95), borderColor: '#00b894', backgroundColor: '#00b89422', fill: true, tension: 0.4 },
                { label: 'Previous', data: previous.trustByDay || generateMockTimeSeries(days, 65, 90), borderColor: '#888', backgroundColor: 'transparent', borderDash: [5, 5], tension: 0.4 },
            ],
        },
        options: {
            plugins: { legend: { labels: { color: '#aaa', font: { size: 11 } } } },
            scales: { y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
        },
    }, { height: '300px' });
}

function renderDrillDown(current, previous) {
    const combined = [
        ...(current.details || []).map(d => ({ ...d, period: 'current' })),
        ...(previous.details || []).map(d => ({ ...d, period: 'previous' })),
    ];

    // Use mock data if no real data
    const data = combined.length > 0 ? combined : generateMockDrillData();

    if (_drillTable) _drillTable.destroy();
    _drillTable = renderVirtualTable('compare-drill-table', {
        columns: [
            { key: 'date', label: 'Date', width: '120px' },
            { key: 'metric', label: 'Metric', width: '120px' },
            { key: 'current_value', label: 'Current', width: '100px', render: v => `<span style="color:var(--accent,#6c5ce7);font-weight:600;">${v}</span>` },
            { key: 'previous_value', label: 'Previous', width: '100px' },
            { key: 'delta', label: 'Delta', width: '80px', render: v => renderDelta(v) },
            { key: 'notes', label: 'Notes', render: v => v || '—' },
        ],
        data,
    });
}

function renderDelta(val) {
    if (val == null) return '—';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    const color = num >= 0 ? 'var(--success,#00b894)' : 'var(--danger,#e74c3c)';
    const arrow = num >= 0 ? '↑' : '↓';
    return `<span style="color:${color};font-weight:600;">${arrow}${Math.abs(num)}%</span>`;
}

function scrollToDrillDown(metric) {
    const el = document.getElementById('compare-drill-table');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Helpers ────────────────────────────────────────────────────

function generateDateLabels(days) {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    return labels;
}

function generateMockTimeSeries(days, min, max) {
    return Array.from({ length: days }, () => Math.floor(Math.random() * (max - min) + min));
}

function generateMockDrillData() {
    const metrics = ['scans', 'fraud', 'trust_score', 'products', 'partners'];
    return Array.from({ length: 50 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(i / 5));
        const cur = Math.floor(Math.random() * 200);
        const prev = Math.floor(Math.random() * 200);
        const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
        return {
            date: d.toISOString().split('T')[0],
            metric: metrics[i % 5],
            current_value: cur,
            previous_value: prev,
            delta,
            notes: '',
        };
    });
}

function renderMockData(days) {
    const mockCurrent = { totalScans: 1247, fraudAlerts: 18, newProducts: 45, avgTrustScore: 87, activePartners: 23, scansByDay: generateMockTimeSeries(days, 30, 80), fraudByDay: generateMockTimeSeries(days, 0, 5), trustByDay: generateMockTimeSeries(days, 80, 95) };
    const mockPrevious = { totalScans: 1102, fraudAlerts: 24, newProducts: 38, avgTrustScore: 82, activePartners: 20, scansByDay: generateMockTimeSeries(days, 25, 70), fraudByDay: generateMockTimeSeries(days, 0, 7), trustByDay: generateMockTimeSeries(days, 75, 90) };
    renderDeltas(mockCurrent, mockPrevious);
    renderCharts(mockCurrent, mockPrevious, days);
    renderDrillDown(mockCurrent, mockPrevious);
}
