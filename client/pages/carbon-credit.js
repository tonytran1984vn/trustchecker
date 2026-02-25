/**
 * TrustChecker – Carbon Integrity Engine v1 (CIE)
 * Enterprise Carbon Intelligence Layer — NOT a Carbon Registry.
 *
 * Phase 1 Modules:
 *   ① Data Ingestion & Normalization
 *   ② Emission Calculation Engine
 *   ③ Industry Benchmark Engine
 *   ④ Carbon Integrity Passport (CIP)
 *
 * Architecture: Risk-governed, audit-defensible, registry-compatible.
 * Positioning: Environmental Risk & Compliance Layer on TrustChecker governance DNA.
 */
import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';

// ─── Data & State ───────────────────────────────────────────────────
let CIE = {
    summary: null,
    passports: null,
    benchmarks: null,
    ingestion: null,
};
let activeTab = 'overview';

async function loadCIE() {
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [summary, passports, benchmarks, ingestion] = await Promise.all([
        fetch('/api/scm/carbon-credit/balance', { headers: h }).then(r => r.json()).catch(() => null),
        fetch('/api/scm/carbon-credit/registry?limit=20', { headers: h }).then(r => r.json()).catch(() => null),
        fetch('/api/scm/carbon-credit/risk-score', { headers: h }).then(r => r.json()).catch(() => null),
        fetch('/api/scm/carbon-credit/market-stats', { headers: h }).then(r => r.json()).catch(() => null),
    ]);
    CIE = { summary, passports, benchmarks, ingestion };
}

// ─── Helper functions ───────────────────────────────────────────────
function scoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
}

function riskBadge(level) {
    const m = {
        low: ['#10b981', '✓ Low Risk'],
        medium: ['#f59e0b', '⚠ Medium'],
        high: ['#f97316', '⚡ High Risk'],
        critical: ['#ef4444', '🔴 Critical'],
    };
    const [c, t] = m[level] || ['#64748b', level || '—'];
    return `<span style="padding:2px 8px;border-radius:4px;background:${c}18;color:${c};font-weight:600;font-size:0.72rem">${t}</span>`;
}

function scopeBadge(scope) {
    const colors = { 1: '#3b82f6', 2: '#8b5cf6', 3: '#f59e0b' };
    return `<span style="padding:1px 6px;border-radius:3px;background:${colors[scope] || '#64748b'}18;color:${colors[scope] || '#64748b'};font-size:0.68rem;font-weight:700">S${scope}</span>`;
}

function tabBtn(id, label, ic) {
    const active = activeTab === id;
    return `<button onclick="window.cieTab('${id}')" style="padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:${active ? '700' : '500'};font-size:0.78rem;transition:all 0.2s;
        background:${active ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#1e293b'};
        color:${active ? '#fff' : '#94a3b8'};
        border:1px solid ${active ? '#3b82f6' : '#334155'}">${ic} ${label}</button>`;
}

// ─── Module 1: Data Ingestion & Normalization ───────────────────────
function renderIngestionModule() {
    const ing = CIE.ingestion;
    // Demo data for ingestion pipeline
    const sources = [
        { name: 'SCM Lineage Data', scope: 3, status: 'active', records: 12847, integrity: 98.2, last: '2 min ago' },
        { name: 'Production Energy Logs', scope: 2, status: 'active', records: 5632, integrity: 99.1, last: '5 min ago' },
        { name: 'Transport Emissions', scope: 3, status: 'active', records: 3419, integrity: 96.8, last: '12 min ago' },
        { name: 'Supplier Declarations', scope: 3, status: 'pending', records: 891, integrity: 87.4, last: '3h ago' },
        { name: 'Direct Emissions (Fuel)', scope: 1, status: 'active', records: 2105, integrity: 99.7, last: '1 min ago' },
        { name: 'Purchased Energy', scope: 2, status: 'active', records: 1560, integrity: 98.9, last: '8 min ago' },
    ];

    const controls = [
        { name: 'Scope Classification', status: 'pass', detail: 'Auto-classified S1/S2/S3' },
        { name: 'Source Integrity Hash', status: 'pass', detail: 'SHA-256 verified' },
        { name: 'Duplicate Detection', status: 'pass', detail: '0 duplicates found' },
        { name: 'Timestamp Verification', status: 'pass', detail: 'All within 24h window' },
        { name: 'Supplier Identity', status: 'warn', detail: '2 suppliers pending KYC' },
        { name: 'Data Completeness', status: 'pass', detail: '97.3% fields populated' },
    ];

    return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Data Sources', v: sources.length, c: '#3b82f6', i: '📡' },
            { l: 'Total Records', v: sources.reduce((a, s) => a + s.records, 0).toLocaleString(), c: '#10b981', i: '📊' },
            { l: 'Avg Integrity', v: (sources.reduce((a, s) => a + s.integrity, 0) / sources.length).toFixed(1) + '%', c: '#8b5cf6', i: '🔒' },
            { l: 'Scope Coverage', v: 'S1+S2+S3', c: '#f59e0b', i: '🎯' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:3fr 2fr;gap:16px">
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('workflow')} Input Sources</h3>
                <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                        <th style="padding:5px;text-align:left">Source</th>
                        <th style="padding:5px;text-align:center">Scope</th>
                        <th style="padding:5px;text-align:center">Records</th>
                        <th style="padding:5px;text-align:center">Integrity</th>
                        <th style="padding:5px;text-align:center">Status</th>
                        <th style="padding:5px;text-align:right">Last Sync</th>
                    </tr></thead>
                    <tbody>${sources.map(s => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:5px;color:#f1f5f9;font-weight:500">${s.name}</td>
                            <td style="padding:5px;text-align:center">${scopeBadge(s.scope)}</td>
                            <td style="padding:5px;text-align:center;color:#94a3b8;font-family:monospace">${s.records.toLocaleString()}</td>
                            <td style="padding:5px;text-align:center"><span style="color:${scoreColor(s.integrity)};font-weight:700">${s.integrity}%</span></td>
                            <td style="padding:5px;text-align:center"><span style="padding:2px 6px;border-radius:3px;background:${s.status === 'active' ? '#10b98118' : '#f59e0b18'};color:${s.status === 'active' ? '#10b981' : '#f59e0b'};font-size:0.68rem;font-weight:600">${s.status}</span></td>
                            <td style="padding:5px;text-align:right;color:#64748b;font-size:0.72rem">${s.last}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>

            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('shield')} Ingestion Controls</h3>
                ${controls.map(c => `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #1e293b">
                        <span style="color:${c.status === 'pass' ? '#10b981' : c.status === 'warn' ? '#f59e0b' : '#ef4444'};font-size:14px">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗'}</span>
                        <div style="flex:1;min-width:0">
                            <div style="color:#f1f5f9;font-size:0.78rem;font-weight:600">${c.name}</div>
                            <div style="color:#64748b;font-size:0.68rem">${c.detail}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

// ─── Module 2: Emission Calculation Engine ───────────────────────────
function renderEmissionModule() {
    const calculations = [
        { batch: 'BATCH-2024-001', product: 'Organic Coffee 1kg', scope1: 0.12, scope2: 0.08, scope3: 0.45, total: 0.65, intensity: 0.65, unit: 'kgCO₂e/unit', method: 'GHG-v4.2', confidence: 94 },
        { batch: 'BATCH-2024-002', product: 'Fair Trade Tea 500g', scope1: 0.05, scope2: 0.04, scope3: 0.28, total: 0.37, intensity: 0.74, unit: 'kgCO₂e/unit', method: 'GHG-v4.2', confidence: 91 },
        { batch: 'BATCH-2024-003', product: 'Cacao Powder 2kg', scope1: 0.22, scope2: 0.15, scope3: 1.18, total: 1.55, intensity: 0.78, unit: 'kgCO₂e/unit', method: 'GHG-v4.2', confidence: 88 },
        { batch: 'BATCH-2024-004', product: 'Raw Cotton Bundle', scope1: 0.35, scope2: 0.18, scope3: 2.47, total: 3.00, intensity: 1.50, unit: 'kgCO₂e/kg', method: 'GHG-v4.2', confidence: 85 },
        { batch: 'BATCH-2024-005', product: 'Bamboo Textile Roll', scope1: 0.08, scope2: 0.06, scope3: 0.31, total: 0.45, intensity: 0.23, unit: 'kgCO₂e/m²', method: 'GHG-v4.2', confidence: 92 },
    ];

    const totalEmission = calculations.reduce((a, c) => a + c.total, 0);
    const avgConfidence = calculations.reduce((a, c) => a + c.confidence, 0) / calculations.length;

    return `
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Total Batches', v: calculations.length, c: '#3b82f6', i: '📦' },
            { l: 'Total Emission', v: totalEmission.toFixed(2) + ' kgCO₂e', c: '#ef4444', i: '🏭' },
            { l: 'Scope 1 (Direct)', v: calculations.reduce((a, c) => a + c.scope1, 0).toFixed(2), c: '#3b82f6', i: '🔥' },
            { l: 'Scope 3 (Supply)', v: calculations.reduce((a, c) => a + c.scope3, 0).toFixed(2), c: '#f59e0b', i: '🚛' },
            { l: 'Avg Confidence', v: avgConfidence.toFixed(0) + '%', c: '#10b981', i: '🎯' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:16px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div class="sa-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <h3 style="margin:0;color:#f1f5f9;font-size:0.88rem">${icon('barChart')} Emission Breakdown by Batch</h3>
                <div style="font-size:0.68rem;color:#94a3b8;background:#0f172a;padding:4px 10px;border-radius:20px">Methodology: GHG Protocol v4.2 · IVU Approved</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:5px;text-align:left">Batch</th>
                    <th style="padding:5px;text-align:left">Product</th>
                    <th style="padding:5px;text-align:center">Scope 1</th>
                    <th style="padding:5px;text-align:center">Scope 2</th>
                    <th style="padding:5px;text-align:center">Scope 3</th>
                    <th style="padding:5px;text-align:center">Total kgCO₂e</th>
                    <th style="padding:5px;text-align:center">Intensity</th>
                    <th style="padding:5px;text-align:center">Confidence</th>
                </tr></thead>
                <tbody>${calculations.map(c => `
                    <tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:5px;color:#3b82f6;font-family:monospace;font-size:0.72rem;font-weight:600">${c.batch}</td>
                        <td style="padding:5px;color:#f1f5f9;font-weight:500">${c.product}</td>
                        <td style="padding:5px;text-align:center">${scopeBadge(1)} <span style="color:#94a3b8">${c.scope1}</span></td>
                        <td style="padding:5px;text-align:center">${scopeBadge(2)} <span style="color:#94a3b8">${c.scope2}</span></td>
                        <td style="padding:5px;text-align:center">${scopeBadge(3)} <span style="color:#94a3b8">${c.scope3}</span></td>
                        <td style="padding:5px;text-align:center;color:#ef4444;font-weight:700">${c.total}</td>
                        <td style="padding:5px;text-align:center;color:#f59e0b;font-size:0.72rem">${c.intensity} ${c.unit}</td>
                        <td style="padding:5px;text-align:center"><span style="padding:2px 6px;border-radius:3px;background:${scoreColor(c.confidence)}18;color:${scoreColor(c.confidence)};font-weight:700;font-size:0.72rem">${c.confidence}%</span></td>
                    </tr>
                `).join('')}</tbody>
            </table>
            <div style="margin-top:10px;padding:8px 12px;background:rgba(59,130,246,0.06);border-radius:8px;border-left:3px solid #3b82f6;font-size:0.72rem;color:#94a3b8">
                <strong style="color:#3b82f6">Governance:</strong> Methodology owned by Risk Committee · Validated by IVU · Version-locked after approval · Formulas cannot be modified by Carbon Officer
            </div>
        </div>`;
}

// ─── Module 3: Industry Benchmark Engine ─────────────────────────────
function renderBenchmarkModule() {
    const benchmarks = [
        { product: 'Organic Coffee', score: 82, percentile: 'P78', delta: -18, industry: 0.79, actual: 0.65, trend: 'improving' },
        { product: 'Fair Trade Tea', score: 71, percentile: 'P65', delta: -12, industry: 0.42, actual: 0.37, trend: 'stable' },
        { product: 'Cacao Powder', score: 45, percentile: 'P38', delta: +22, industry: 1.27, actual: 1.55, trend: 'declining' },
        { product: 'Raw Cotton', score: 38, percentile: 'P28', delta: +41, industry: 2.13, actual: 3.00, trend: 'declining' },
        { product: 'Bamboo Textile', score: 91, percentile: 'P92', delta: -47, industry: 0.43, actual: 0.23, trend: 'improving' },
    ];

    return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Products Benchmarked', v: benchmarks.length, c: '#3b82f6', i: '📈' },
            { l: 'Avg Efficiency Score', v: (benchmarks.reduce((a, b) => a + b.score, 0) / benchmarks.length).toFixed(0) + '/100', c: '#f59e0b', i: '⚡' },
            { l: 'Above Industry Avg', v: benchmarks.filter(b => b.delta < 0).length + '/' + benchmarks.length, c: '#10b981', i: '🏆' },
            { l: 'Anomalies Detected', v: benchmarks.filter(b => b.score < 40).length, c: '#ef4444', i: '⚠️' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div class="sa-card">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('barChart')} Carbon Efficiency Benchmark</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:5px;text-align:left">Product</th>
                    <th style="padding:5px;text-align:center">Efficiency Score</th>
                    <th style="padding:5px;text-align:center">Bar</th>
                    <th style="padding:5px;text-align:center">Percentile</th>
                    <th style="padding:5px;text-align:center">Industry Avg</th>
                    <th style="padding:5px;text-align:center">Your Actual</th>
                    <th style="padding:5px;text-align:center">Delta</th>
                    <th style="padding:5px;text-align:center">Trend</th>
                </tr></thead>
                <tbody>${benchmarks.map(b => `
                    <tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:5px;color:#f1f5f9;font-weight:600">${b.product}</td>
                        <td style="padding:5px;text-align:center"><span style="font-size:15px;font-weight:700;color:${scoreColor(b.score)}">${b.score}</span></td>
                        <td style="padding:5px"><div style="width:100%;height:8px;background:#1e293b;border-radius:4px;overflow:hidden"><div style="width:${b.score}%;height:100%;background:${scoreColor(b.score)};border-radius:4px;transition:width 0.3s"></div></div></td>
                        <td style="padding:5px;text-align:center;color:#94a3b8;font-weight:600">${b.percentile}</td>
                        <td style="padding:5px;text-align:center;color:#64748b;font-family:monospace">${b.industry} kgCO₂e</td>
                        <td style="padding:5px;text-align:center;color:${b.delta <= 0 ? '#10b981' : '#ef4444'};font-weight:700;font-family:monospace">${b.actual} kgCO₂e</td>
                        <td style="padding:5px;text-align:center"><span style="padding:2px 6px;border-radius:3px;background:${b.delta <= 0 ? '#10b98118' : '#ef444418'};color:${b.delta <= 0 ? '#10b981' : '#ef4444'};font-weight:700;font-size:0.72rem">${b.delta > 0 ? '+' : ''}${b.delta}%</span></td>
                        <td style="padding:5px;text-align:center;font-size:0.72rem;color:${b.trend === 'improving' ? '#10b981' : b.trend === 'stable' ? '#f59e0b' : '#ef4444'}">${b.trend === 'improving' ? '📈' : b.trend === 'stable' ? '➡️' : '📉'} ${b.trend}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
            <div style="margin-top:10px;padding:8px 12px;background:rgba(239,68,68,0.06);border-radius:8px;border-left:3px solid #ef4444;font-size:0.72rem;color:#94a3b8">
                <strong style="color:#ef4444">⚠ Overclaim Alert:</strong> Raw Cotton (+41% above industry) and Cacao Powder (+22%) — flagged for IVU deep review. Possible baseline manipulation or supplier data inconsistency.
            </div>
        </div>`;
}

// ─── Module 4: Carbon Integrity Passport (CIP) ──────────────────────
function renderPassportModule() {
    const passports = [
        { id: 'CIP-2024-00142', batch: 'BATCH-2024-001', product: 'Organic Coffee 1kg', emission: 0.65, benchmark: 82, risk: 12, status: 'sealed', method: 'GHG-v4.2', anchor: '0xab3f…e821', approver: 'IVU-validator-01', date: '2024-12-15' },
        { id: 'CIP-2024-00143', batch: 'BATCH-2024-005', product: 'Bamboo Textile Roll', emission: 0.23, benchmark: 91, risk: 8, status: 'sealed', method: 'GHG-v4.2', anchor: '0x7c2d…a103', approver: 'IVU-validator-02', date: '2024-12-14' },
        { id: 'CIP-2024-00144', batch: 'BATCH-2024-002', product: 'Fair Trade Tea 500g', emission: 0.37, benchmark: 71, risk: 18, status: 'sealed', method: 'GHG-v4.2', anchor: '0xf198…b420', approver: 'IVU-validator-01', date: '2024-12-13' },
        { id: 'CIP-2024-00145', batch: 'BATCH-2024-003', product: 'Cacao Powder 2kg', emission: 1.55, benchmark: 45, risk: 62, status: 'pending_review', method: 'GHG-v4.2', anchor: '—', approver: '—', date: '—' },
        { id: 'CIP-2024-00146', batch: 'BATCH-2024-004', product: 'Raw Cotton Bundle', emission: 3.00, benchmark: 38, risk: 78, status: 'blocked', method: 'GHG-v4.2', anchor: '—', approver: '—', date: '—' },
    ];

    const statusBadge = (s) => {
        const m = {
            sealed: ['#10b981', '🔐 Sealed'],
            pending_review: ['#f59e0b', '⏳ IVU Review'],
            blocked: ['#ef4444', '🔒 Blocked'],
            draft: ['#64748b', '📝 Draft'],
            export_ready: ['#3b82f6', '📤 Export Ready'],
        };
        const [c, t] = m[s] || ['#64748b', s];
        return `<span style="padding:2px 8px;border-radius:4px;background:${c}18;color:${c};font-weight:600;font-size:0.72rem">${t}</span>`;
    };

    return `
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Total Passports', v: passports.length, c: '#3b82f6', i: '📜' },
            { l: 'Sealed (Verified)', v: passports.filter(p => p.status === 'sealed').length, c: '#10b981', i: '🔐' },
            { l: 'Pending IVU', v: passports.filter(p => p.status === 'pending_review').length, c: '#f59e0b', i: '⏳' },
            { l: 'Blocked (Risk)', v: passports.filter(p => p.status === 'blocked').length, c: '#ef4444', i: '🔒' },
            { l: 'Export Ready', v: passports.filter(p => p.status === 'sealed').length, c: '#8b5cf6', i: '📤' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div class="sa-card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <h3 style="margin:0;color:#f1f5f9;font-size:0.88rem">${icon('scroll')} Carbon Integrity Passports</h3>
                <div style="display:flex;gap:6px">
                    <button onclick="window.cieIssueCIP()" style="padding:6px 14px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.72rem">${icon('plus', 12)} Issue CIP</button>
                    <button style="padding:6px 14px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:0.72rem">📤 Export to Registry</button>
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:5px;text-align:left">Passport ID</th>
                    <th style="padding:5px;text-align:left">Product</th>
                    <th style="padding:5px;text-align:center">Emission</th>
                    <th style="padding:5px;text-align:center">Benchmark</th>
                    <th style="padding:5px;text-align:center">Risk Score</th>
                    <th style="padding:5px;text-align:center">Status</th>
                    <th style="padding:5px;text-align:center">Anchor</th>
                    <th style="padding:5px;text-align:center">Date</th>
                    <th style="padding:5px;text-align:center">Actions</th>
                </tr></thead>
                <tbody>${passports.map(p => `
                    <tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:5px;color:#3b82f6;font-family:monospace;font-size:0.72rem;font-weight:700">${p.id}</td>
                        <td style="padding:5px;color:#f1f5f9;font-weight:500">${p.product}</td>
                        <td style="padding:5px;text-align:center;color:#ef4444;font-weight:600;font-family:monospace">${p.emission} kgCO₂e</td>
                        <td style="padding:5px;text-align:center"><span style="color:${scoreColor(p.benchmark)};font-weight:700">${p.benchmark}</span><span style="color:#64748b;font-size:0.68rem">/100</span></td>
                        <td style="padding:5px;text-align:center"><span style="padding:2px 6px;border-radius:3px;background:${scoreColor(100 - p.risk)}18;color:${scoreColor(100 - p.risk)};font-weight:700;font-size:0.72rem">${p.risk}</span></td>
                        <td style="padding:5px;text-align:center">${statusBadge(p.status)}</td>
                        <td style="padding:5px;text-align:center;color:${p.anchor !== '—' ? '#8b5cf6' : '#334155'};font-family:monospace;font-size:0.68rem;font-weight:600">${p.anchor}</td>
                        <td style="padding:5px;text-align:center;color:#64748b;font-size:0.72rem">${p.date}</td>
                        <td style="padding:5px;text-align:center">${p.status === 'sealed' ? `<button onclick="window.cieExportPDF('${p.id}')" style="padding:3px 8px;background:#10b98118;color:#10b981;border:1px solid #10b98133;border-radius:4px;cursor:pointer;font-size:0.65rem;font-weight:600">📄 PDF</button>` : '<span style="color:#334155;font-size:0.65rem">—</span>'}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
        </div>

        <!-- CIP Lifecycle Pipeline -->
        <div class="sa-card">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('workflow')} CIP Lifecycle (SoD Enforced)</h3>
            <div style="display:flex;align-items:stretch;gap:4px;overflow-x:auto">
                ${[
            { n: 'Draft', r: 'Carbon Officer', c: '#3b82f6', i: '📝' },
            { n: 'Risk Score', r: 'Auto Engine', c: '#f59e0b', i: '⚡' },
            { n: 'IVU Review', r: 'IVU Validator', c: '#8b5cf6', i: '🔍' },
            { n: 'Compliance', r: 'Compliance Officer', c: '#10b981', i: '✅' },
            { n: 'Integrity Seal', r: 'System', c: '#06b6d4', i: '🔐' },
            { n: 'Anchor', r: 'BC Operator', c: '#ec4899', i: '⛓️' },
            { n: 'Export Ready', r: 'Compliance Approve', c: '#22c55e', i: '📤' },
        ].map((s, i, arr) => `
                    <div style="flex:1;min-width:90px;text-align:center;padding:10px 6px;background:${s.c}09;border:1px solid ${s.c}33;border-radius:10px">
                        <div style="font-size:16px;margin-bottom:2px">${s.i}</div>
                        <div style="color:${s.c};font-weight:700;font-size:0.72rem">${s.n}</div>
                        <div style="color:#64748b;font-size:0.62rem;margin-top:2px">${s.r}</div>
                    </div>
                    ${i < arr.length - 1 ? '<div style="display:flex;align-items:center;color:#475569;font-size:12px">→</div>' : ''}
                `).join('')}
            </div>
            <div style="margin-top:10px;padding:8px 12px;background:rgba(139,92,246,0.06);border-radius:8px;border-left:3px solid #8b5cf6;font-size:0.72rem;color:#94a3b8">
                <strong style="color:#8b5cf6">SoD Enforcement:</strong> Carbon Officer cannot approve · Compliance cannot modify calculation · BC Operator cannot approve · Super Admin has no business authority
            </div>
        </div>`;
}

// ─── Overview Tab ────────────────────────────────────────────────────
function renderOverview() {
    return `
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Product Passports', v: 5, c: '#3b82f6', i: '📜' },
            { l: 'Total Emission', v: '6.02 kgCO₂e', c: '#ef4444', i: '🏭' },
            { l: 'Avg Efficiency', v: '65/100', c: '#f59e0b', i: '⚡' },
            { l: 'Integrity Score', v: '97.8%', c: '#10b981', i: '🔐' },
            { l: 'Anomalies', v: 2, c: '#ef4444', i: '⚠️' },
            { l: 'Blockchain Seals', v: 3, c: '#8b5cf6', i: '⛓️' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:18px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:4px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <!-- Architecture Diagram -->
        <div class="sa-card" style="margin-bottom:16px">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('workflow')} CIE Architecture — 9 Core Modules</h3>
            <div style="display:flex;align-items:stretch;gap:3px;overflow-x:auto">
                ${[
            { n: '① Ingest', d: 'Scope 1,2,3', c: '#3b82f6', i: '📡' },
            { n: '② Emission', d: 'GHG Protocol', c: '#ef4444', i: '🏭' },
            { n: '③ Bench', d: 'vs Industry', c: '#f59e0b', i: '📊' },
            { n: '④ Passport', d: 'CIP Issue', c: '#10b981', i: '📜' },
            { n: '⑤ Overclaim', d: 'Fraud Detect', c: '#f97316', i: '⚠️' },
            { n: '⑥ Lineage', d: 'Replay+Sim', c: '#06b6d4', i: '🔍' },
            { n: '⑦ Govern', d: 'SoD+Audit', c: '#8b5cf6', i: '🛡️' },
            { n: '⑧ Chain', d: 'Hash Anchor', c: '#7c3aed', i: '⛓️' },
            { n: '⑨ Export', d: 'ESG/IFRS/GRI', c: '#22c55e', i: '📤' },
        ].map((m, i, arr) => `
                    <div style="flex:1;padding:14px 8px;text-align:center;background:${m.c}0a;border:1px solid ${m.c}33;border-radius:12px">
                        <div style="font-size:22px;margin-bottom:4px">${m.i}</div>
                        <div style="color:${m.c};font-weight:700;font-size:0.82rem;margin-bottom:2px">${m.n}</div>
                        <div style="color:#64748b;font-size:0.68rem">${m.d}</div>
                    </div>
                    ${i < arr.length - 1 ? '<div style="display:flex;align-items:center;color:#334155;font-size:16px;font-weight:700">→</div>' : ''}
                `).join('')}
            </div>
        </div>

        <!-- Positioning & Integrity Matrix -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('shield')} Integrity Matrix</h3>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
                    ${['Data Integrity Hash', 'Scope Classification', 'Duplicate Prevention', 'Benchmark Validation', 'Overclaim Detection', 'SoD Enforcement', 'IVU Certification', 'Blockchain Anchored', 'Registry Compatible'].map(c => `
                        <div style="text-align:center;padding:8px 4px;background:rgba(16,185,129,0.05);border-radius:6px;border:1px solid rgba(16,185,129,0.12)">
                            <div style="color:#10b981;font-size:0.82rem;margin-bottom:2px">✓</div>
                            <div style="color:#94a3b8;font-size:0.68rem;font-weight:600">${c}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('target')} Strategic Positioning</h3>
                <div style="text-align:center;padding:12px;background:rgba(16,185,129,0.06);border-radius:8px;margin-bottom:8px">
                    <div style="color:#10b981;font-weight:700;font-size:14px">Carbon Integrity & Risk Infrastructure</div>
                    <div style="color:#64748b;font-size:0.72rem;margin-top:2px">Environmental Risk Layer on TrustChecker Governance DNA</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                    ${[
            { t: '✅ We Do', items: ['Footprint Calc', 'Overclaim Detection', 'Audit-grade CIP', 'Registry Export'] },
            { t: '❌ We Don\'t', items: ['Mint Credits', 'Trade/Speculate', 'Self-certify Registry', 'Auto-approve'] },
        ].map(col => `
                        <div style="padding:8px;background:#0f172a;border-radius:6px">
                            <div style="color:#f1f5f9;font-weight:700;font-size:0.78rem;margin-bottom:4px">${col.t}</div>
                            ${col.items.map(i => `<div style="color:#94a3b8;font-size:0.72rem;padding:1px 0">• ${i}</div>`).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
}

// ─── Module 5: Overclaim & Anomaly Detection Engine ─────────────────
function renderOverclaimModule() {
    const signals = [
        { type: 'Sudden Drop Anomaly', product: 'Cacao Powder 2kg', severity: 'high', detail: 'Emission dropped 42% in 30 days without process change', score: 78, action: 'IVU Deep Review' },
        { type: 'Baseline Manipulation', product: 'Raw Cotton Bundle', severity: 'critical', detail: 'Baseline shifted from 2.8 to 3.5 kgCO₂e — inflates reduction claim', score: 92, action: 'Block + Investigate' },
        { type: 'Supplier Mismatch', product: 'Fair Trade Tea 500g', severity: 'medium', detail: 'Supplier XYZ declared 0.12 kgCO₂e but peer average is 0.28', score: 45, action: 'Request Documentation' },
        { type: 'Duplicate Reduction', product: 'Organic Coffee 1kg', severity: 'low', detail: 'Same reduction event claimed in batch 001 and 007', score: 22, action: 'Auto-resolved' },
        { type: 'Time Compression', product: 'Bamboo Textile Roll', severity: 'medium', detail: '6 months of improvement compressed into 2 weeks', score: 55, action: 'Escalate to Risk Committee' },
        { type: 'Missing Scope 3 Data', product: 'Cacao Powder 2kg', severity: 'high', detail: '38% of supply chain data missing for upstream transport', score: 71, action: 'Data Request Issued' },
    ];

    const weights = [
        { name: 'Data Integrity', weight: 25, score: 94, color: '#3b82f6' },
        { name: 'Supplier Trust', weight: 20, score: 72, color: '#8b5cf6' },
        { name: 'Benchmark Dev.', weight: 20, score: 58, color: '#f59e0b' },
        { name: 'Historical Stability', weight: 15, score: 81, color: '#10b981' },
        { name: 'Method Confidence', weight: 10, score: 96, color: '#06b6d4' },
        { name: 'Governance Quality', weight: 10, score: 88, color: '#ec4899' },
    ];
    const compositeScore = Math.round(weights.reduce((a, w) => a + (w.score * w.weight / 100), 0));

    return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Active Signals', v: signals.length, c: '#ef4444', i: '⚠️' },
            { l: 'Critical', v: signals.filter(s => s.severity === 'critical').length, c: '#ef4444', i: '🔴' },
            { l: 'High Risk', v: signals.filter(s => s.severity === 'high').length, c: '#f97316', i: '🟠' },
            { l: 'Composite Risk', v: compositeScore + '/100', c: scoreColor(compositeScore), i: '🎯' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:3fr 2fr;gap:16px;margin-bottom:16px">
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('shield')} Fraud & Anomaly Signals</h3>
                <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                        <th style="padding:5px;text-align:left">Signal Type</th>
                        <th style="padding:5px;text-align:left">Product</th>
                        <th style="padding:5px;text-align:center">Severity</th>
                        <th style="padding:5px;text-align:center">Score</th>
                        <th style="padding:5px;text-align:left">Action</th>
                    </tr></thead>
                    <tbody>${signals.map(s => {
            const sevColor = s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f97316' : s.severity === 'medium' ? '#f59e0b' : '#10b981';
            return `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:5px">
                                <div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${s.type}</div>
                                <div style="color:#64748b;font-size:0.65rem">${s.detail}</div>
                            </td>
                            <td style="padding:5px;color:#94a3b8;font-size:0.72rem">${s.product}</td>
                            <td style="padding:5px;text-align:center"><span style="padding:2px 8px;border-radius:3px;background:${sevColor}18;color:${sevColor};font-weight:700;font-size:0.68rem;text-transform:uppercase">${s.severity}</span></td>
                            <td style="padding:5px;text-align:center;color:${scoreColor(100 - s.score)};font-weight:700">${s.score}</td>
                            <td style="padding:5px;color:#94a3b8;font-size:0.72rem">${s.action}</td>
                        </tr>`;
        }).join('')}</tbody>
                </table>
            </div>

            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('barChart')} Carbon Risk Score Model</h3>
                <div style="text-align:center;margin-bottom:12px">
                    <div style="width:80px;height:80px;border-radius:50%;border:4px solid ${scoreColor(compositeScore)};display:flex;align-items:center;justify-content:center;margin:0 auto">
                        <span style="font-size:24px;font-weight:700;color:${scoreColor(compositeScore)}">${compositeScore}</span>
                    </div>
                    <div style="color:#94a3b8;font-size:0.72rem;margin-top:4px">Composite Risk Score</div>
                </div>
                ${weights.map(w => `
                    <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                        <div style="width:100px;font-size:0.72rem;color:#94a3b8;flex-shrink:0">${w.name} <span style="color:#64748b">(${w.weight}%)</span></div>
                        <div style="flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
                            <div style="width:${w.score}%;height:100%;background:${w.color};border-radius:3px"></div>
                        </div>
                        <div style="width:30px;text-align:right;color:${scoreColor(w.score)};font-weight:700;font-size:0.72rem">${w.score}</div>
                    </div>
                `).join('')}
                <div style="margin-top:8px;padding:6px 8px;background:rgba(239,68,68,0.06);border-radius:6px;font-size:0.68rem;color:#94a3b8">
                    <strong style="color:#ef4444">Threshold:</strong> Score > 70 → Block approval · > 85 → Auto-escalate to Risk Committee
                </div>
            </div>
        </div>`;
}

// ─── Module 6: Lineage Replay & Impact Analysis ─────────────────────
function renderLineageModule() {
    const timeline = [
        { date: '2024-12-15', event: 'CIP-00142 Sealed', product: 'Organic Coffee', emission: 0.65, delta: 0, actor: 'IVU-01', type: 'seal' },
        { date: '2024-12-14', event: 'Methodology updated v4.1→v4.2', product: 'All Products', emission: null, delta: null, actor: 'Risk Committee', type: 'method' },
        { date: '2024-12-13', event: 'CIP-00144 Sealed', product: 'Fair Trade Tea', emission: 0.37, delta: -5, actor: 'IVU-01', type: 'seal' },
        { date: '2024-12-10', event: 'Supplier KYC Updated', product: 'Cacao Powder', emission: null, delta: null, actor: 'Compliance', type: 'governance' },
        { date: '2024-12-08', event: 'Overclaim detected', product: 'Raw Cotton', emission: 3.00, delta: +41, actor: 'Auto Engine', type: 'alert' },
        { date: '2024-12-05', event: 'Baseline recalculated', product: 'All Products', emission: null, delta: null, actor: 'Risk Committee', type: 'method' },
        { date: '2024-12-01', event: 'New supplier onboarded', product: 'Bamboo Textile', emission: 0.23, delta: -47, actor: 'SCM Analyst', type: 'data' },
    ];

    const simulations = [
        { scenario: 'If GHG factor +10%', impactProducts: 5, avgChange: '+8.2%', worstCase: 'Cotton → 3.30 kgCO₂e', riskDelta: '+6 pts' },
        { scenario: 'If Supplier X removed', impactProducts: 2, avgChange: '+15.1%', worstCase: 'Tea → 0.43 kgCO₂e', riskDelta: '+12 pts' },
        { scenario: 'If baseline reset to Q3', impactProducts: 5, avgChange: '-3.4%', worstCase: 'Coffee → 0.63 kgCO₂e', riskDelta: '-2 pts' },
    ];

    const typeIcon = (t) => ({ seal: '🔐', method: '📐', governance: '🛡️', alert: '⚠️', data: '📊' }[t] || '📌');
    const typeColor = (t) => ({ seal: '#10b981', method: '#8b5cf6', governance: '#3b82f6', alert: '#ef4444', data: '#06b6d4' }[t] || '#64748b');

    return `
        <div style="display:grid;grid-template-columns:3fr 2fr;gap:16px;margin-bottom:16px">
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('workflow')} Emission History Timeline</h3>
                ${timeline.map(t => `
                    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #1e293b">
                        <div style="width:36px;height:36px;border-radius:50%;background:${typeColor(t.type)}12;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px">${typeIcon(t.type)}</div>
                        <div style="flex:1;min-width:0">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <span style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${t.event}</span>
                                <span style="color:#64748b;font-size:0.68rem">${t.date}</span>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:2px;font-size:0.72rem">
                                <span style="color:#94a3b8">${t.product}</span>
                                ${t.emission !== null ? `<span style="color:#ef4444;font-family:monospace">${t.emission} kgCO₂e</span>` : ''}
                                ${t.delta !== null ? `<span style="color:${t.delta <= 0 ? '#10b981' : '#ef4444'};font-weight:600">${t.delta > 0 ? '+' : ''}${t.delta}%</span>` : ''}
                                <span style="color:#64748b">by ${t.actor}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('target')} What-If Simulation</h3>
                <div style="font-size:0.68rem;color:#64748b;margin-bottom:8px">Impact analysis if conditions change</div>
                ${simulations.map(s => `
                    <div style="padding:10px;background:#0f172a;border-radius:8px;margin-bottom:8px;border-left:3px solid #f59e0b">
                        <div style="color:#f1f5f9;font-weight:700;font-size:0.78rem;margin-bottom:4px">${s.scenario}</div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;font-size:0.72rem">
                            <div style="color:#94a3b8">Products affected: <span style="color:#f1f5f9;font-weight:600">${s.impactProducts}</span></div>
                            <div style="color:#94a3b8">Avg change: <span style="color:${s.avgChange.startsWith('+') ? '#ef4444' : '#10b981'};font-weight:600">${s.avgChange}</span></div>
                            <div style="color:#94a3b8">Worst case: <span style="color:#f59e0b">${s.worstCase}</span></div>
                            <div style="color:#94a3b8">Risk delta: <span style="color:${s.riskDelta.startsWith('+') ? '#ef4444' : '#10b981'};font-weight:600">${s.riskDelta}</span></div>
                        </div>
                    </div>
                `).join('')}
                <div style="padding:8px;background:rgba(139,92,246,0.06);border-radius:6px;font-size:0.68rem;color:#94a3b8;border-left:3px solid #8b5cf6">
                    <strong style="color:#8b5cf6">Access Control:</strong> Full replay restricted to Risk Committee, IVU, and Compliance only.
                </div>
            </div>
        </div>`;
}

// ─── Module 7: Governance & Approval Workflow ───────────────────────
function renderGovernanceModule() {
    const sodMatrix = [
        { action: 'Submit Passport', role: 'Carbon Officer', sod: '—', eyes: 1 },
        { action: 'Run Risk Scoring', role: 'Auto Engine', sod: 'Cannot override', eyes: 0 },
        { action: 'Validate Methodology', role: 'IVU Validator', sod: 'Cannot submit or approve', eyes: 2 },
        { action: 'Approve Passport', role: 'Compliance Officer', sod: 'Cannot calculate or modify', eyes: 2 },
        { action: 'Anchor on Blockchain', role: 'BC Operator', sod: 'Cannot approve or submit', eyes: 2 },
        { action: 'Approve Export', role: 'Compliance Officer', sod: 'Must approve separately', eyes: 2 },
        { action: 'Modify Methodology', role: 'Risk Committee', sod: 'Propose only, IVU validates', eyes: 4 },
        { action: 'Override Block', role: 'GGC Member', sod: '6-eyes: GGC + IVU + Compliance', eyes: 6 },
    ];

    const pendingActions = [
        { id: 'GA-001', action: 'IVU Review Required', target: 'CIP-2024-00145 (Cacao)', assignee: 'IVU-validator-01', priority: 'high', age: '2 days' },
        { id: 'GA-002', action: 'Compliance Approval', target: 'CIP-2024-00142 Export', assignee: 'compliance-01', priority: 'medium', age: '1 day' },
        { id: 'GA-003', action: 'Risk Committee Review', target: 'Raw Cotton Overclaim', assignee: 'risk-committee', priority: 'critical', age: '3 days' },
        { id: 'GA-004', action: 'Supplier KYC Verification', target: 'Supplier XYZ-Corp', assignee: 'compliance-01', priority: 'medium', age: '5 days' },
    ];

    const auditTrail = [
        { time: '14:32:18', actor: 'IVU-validator-01', action: 'PASSPORT_CERTIFIED', target: 'CIP-00142', hash: '0xab3f…' },
        { time: '14:31:45', actor: 'compliance-01', action: 'PASSPORT_APPROVED', target: 'CIP-00142', hash: '0x7e21…' },
        { time: '14:28:02', actor: 'auto-engine', action: 'RISK_SCORE_COMPUTED', target: 'CIP-00142', hash: '0x3c9a…' },
        { time: '14:25:11', actor: 'carbon-officer-01', action: 'PASSPORT_SUBMITTED', target: 'CIP-00142', hash: '0xf4b2…' },
        { time: '13:58:44', actor: 'auto-engine', action: 'OVERCLAIM_DETECTED', target: 'BATCH-004', hash: '0x81dc…' },
        { time: '13:42:09', actor: 'risk-committee', action: 'METHODOLOGY_UPDATED', target: 'GHG-v4.2', hash: '0x22ef…' },
    ];

    return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Pending Actions', v: pendingActions.length, c: '#f59e0b', i: '📋' },
            { l: 'SoD Rules Active', v: sodMatrix.length, c: '#8b5cf6', i: '🛡️' },
            { l: 'Audit Events Today', v: auditTrail.length, c: '#3b82f6', i: '📝' },
            { l: 'Governance Score', v: '94/100', c: '#10b981', i: '✅' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('shield')} SoD Enforcement Matrix</h3>
                <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                        <th style="padding:4px;text-align:left">Action</th>
                        <th style="padding:4px;text-align:left">Authorized Role</th>
                        <th style="padding:4px;text-align:center">Eyes</th>
                        <th style="padding:4px;text-align:left">SoD Restriction</th>
                    </tr></thead>
                    <tbody>${sodMatrix.map(s => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:4px;color:#f1f5f9;font-weight:500;font-size:0.76rem">${s.action}</td>
                            <td style="padding:4px;color:#3b82f6;font-size:0.72rem">${s.role}</td>
                            <td style="padding:4px;text-align:center"><span style="padding:1px 6px;border-radius:3px;background:${s.eyes >= 6 ? '#ef444418' : s.eyes >= 4 ? '#f59e0b18' : '#10b98118'};color:${s.eyes >= 6 ? '#ef4444' : s.eyes >= 4 ? '#f59e0b' : '#10b981'};font-weight:700;font-size:0.72rem">${s.eyes || 'Auto'}</span></td>
                            <td style="padding:4px;color:#64748b;font-size:0.68rem">${s.sod}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>

            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('workflow')} Pending Governance Actions</h3>
                ${pendingActions.map(p => {
            const pColor = p.priority === 'critical' ? '#ef4444' : p.priority === 'high' ? '#f97316' : '#f59e0b';
            return `
                    <div style="padding:8px;background:#0f172a;border-radius:8px;margin-bottom:6px;border-left:3px solid ${pColor}">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${p.action}</span>
                            <span style="padding:1px 6px;border-radius:3px;background:${pColor}18;color:${pColor};font-size:0.65rem;font-weight:700;text-transform:uppercase">${p.priority}</span>
                        </div>
                        <div style="color:#94a3b8;font-size:0.68rem;margin-top:2px">${p.target} · Assigned: <span style="color:#3b82f6">${p.assignee}</span> · ${p.age}</div>
                    </div>`;
        }).join('')}
            </div>
        </div>

        <div class="sa-card">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('scroll')} Real-time Audit Trail</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:4px;text-align:left">Time</th>
                    <th style="padding:4px;text-align:left">Actor</th>
                    <th style="padding:4px;text-align:left">Action</th>
                    <th style="padding:4px;text-align:left">Target</th>
                    <th style="padding:4px;text-align:right">Hash</th>
                </tr></thead>
                <tbody>${auditTrail.map(a => `
                    <tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:4px;color:#64748b;font-family:monospace;font-size:0.72rem">${a.time}</td>
                        <td style="padding:4px;color:#3b82f6;font-size:0.72rem">${a.actor}</td>
                        <td style="padding:4px;color:#f1f5f9;font-weight:500;font-size:0.76rem">${a.action.replace(/_/g, ' ')}</td>
                        <td style="padding:4px;color:#94a3b8;font-size:0.72rem">${a.target}</td>
                        <td style="padding:4px;text-align:right;color:#8b5cf6;font-family:monospace;font-size:0.68rem">${a.hash}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
            <div style="margin-top:8px;padding:6px 8px;background:rgba(16,185,129,0.06);border-radius:6px;font-size:0.68rem;color:#94a3b8">
                Every action is: <strong style="color:#10b981">Audit logged</strong> · <strong style="color:#3b82f6">Timestamped</strong> · <strong style="color:#8b5cf6">Hash recorded</strong> · <strong style="color:#f59e0b">Court-admissible</strong>
            </div>
        </div>`;
}

// ─── Module 8: Blockchain Proof Layer ───────────────────────────────
function renderBlockchainModule() {
    const anchors = [
        { id: 'ANC-001', type: 'Calculation Hash', target: 'CIP-00142', hash: '0xab3f91e2c4d7…e821', chain: 'Polygon', block: '52,841,293', gas: '0.0012 MATIC', time: '2024-12-15 14:33:01', status: 'confirmed' },
        { id: 'ANC-002', type: 'Governance Approval', target: 'CIP-00142', hash: '0x7c2da103f8b1…a103', chain: 'Polygon', block: '52,841,298', gas: '0.0011 MATIC', time: '2024-12-15 14:33:18', status: 'confirmed' },
        { id: 'ANC-003', type: 'Methodology Version', target: 'GHG-v4.2', hash: '0x22ef4b9c71a3…c912', chain: 'Polygon', block: '52,839,104', gas: '0.0013 MATIC', time: '2024-12-14 09:15:42', status: 'confirmed' },
        { id: 'ANC-004', type: 'Calculation Hash', target: 'CIP-00143', hash: '0xf198b420de56…b420', chain: 'Polygon', block: '52,840,881', gas: '0.0012 MATIC', time: '2024-12-14 16:22:09', status: 'confirmed' },
        { id: 'ANC-005', type: 'Integrity Seal', target: 'CIP-00144', hash: '0x3c9a08d2e1f7…d2e1', chain: 'Polygon', block: '52,838,429', gas: '0.0014 MATIC', time: '2024-12-13 11:08:55', status: 'confirmed' },
    ];

    const policies = [
        { rule: 'No sensitive data on-chain', detail: 'Only SHA-256 hashes — no PII, no emission values, no product names' },
        { rule: 'Hash-only anchoring', detail: 'Calculation hash + Governance approval hash + Methodology version hash' },
        { rule: 'Immutable proof record', detail: 'Once anchored, cannot be modified or deleted — tamper-evident' },
    ];

    const verifications = [
        { passport: 'CIP-00142', calcHash: '✓ Match', govHash: '✓ Match', methodHash: '✓ Match', overall: 'verified' },
        { passport: 'CIP-00143', calcHash: '✓ Match', govHash: '✓ Match', methodHash: '✓ Match', overall: 'verified' },
        { passport: 'CIP-00144', calcHash: '✓ Match', govHash: '✓ Match', methodHash: '✓ Match', overall: 'verified' },
        { passport: 'CIP-00145', calcHash: '— Pending', govHash: '— Pending', methodHash: '— N/A', overall: 'pending' },
        { passport: 'CIP-00146', calcHash: '✗ Blocked', govHash: '— N/A', methodHash: '— N/A', overall: 'blocked' },
    ];

    return `
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Total Anchors', v: anchors.length, c: '#8b5cf6', i: '⛓️' },
            { l: 'Confirmed', v: anchors.filter(a => a.status === 'confirmed').length, c: '#10b981', i: '✅' },
            { l: 'Total Gas', v: '0.0062 MATIC', c: '#f59e0b', i: '⛽' },
            { l: 'Chain', v: 'Polygon', c: '#7c3aed', i: '🔗' },
            { l: 'Verified', v: verifications.filter(v => v.overall === 'verified').length + '/' + verifications.length, c: '#3b82f6', i: '🔐' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:16px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('scroll')} Anchor Registry</h3>
                <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.75rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.65rem;text-transform:uppercase">
                        <th style="padding:4px;text-align:left">Type</th>
                        <th style="padding:4px;text-align:left">Target</th>
                        <th style="padding:4px;text-align:left">Hash</th>
                        <th style="padding:4px;text-align:center">Block</th>
                        <th style="padding:4px;text-align:center">Gas</th>
                        <th style="padding:4px;text-align:right">Time</th>
                    </tr></thead>
                    <tbody>${anchors.map(a => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:4px"><span style="padding:1px 6px;border-radius:3px;background:#8b5cf618;color:#8b5cf6;font-size:0.68rem;font-weight:600">${a.type}</span></td>
                            <td style="padding:4px;color:#3b82f6;font-weight:600;font-size:0.72rem">${a.target}</td>
                            <td style="padding:4px;color:#10b981;font-family:monospace;font-size:0.68rem">${a.hash}</td>
                            <td style="padding:4px;text-align:center;color:#94a3b8;font-family:monospace;font-size:0.68rem">${a.block}</td>
                            <td style="padding:4px;text-align:center;color:#f59e0b;font-size:0.68rem">${a.gas}</td>
                            <td style="padding:4px;text-align:right;color:#64748b;font-size:0.68rem">${a.time}</td>
                        </tr>
                    `).join('')}</tbody>
                </table></div>
            </div>
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('shield')} Anchoring Policy</h3>
                ${policies.map(p => `
                    <div style="padding:8px;background:#0f172a;border-radius:8px;margin-bottom:6px;border-left:3px solid #10b981">
                        <div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">✓ ${p.rule}</div>
                        <div style="color:#64748b;font-size:0.68rem;margin-top:2px">${p.detail}</div>
                    </div>
                `).join('')}
                <div style="margin-top:8px;padding:6px 8px;background:rgba(139,92,246,0.06);border-radius:6px;font-size:0.68rem;color:#94a3b8">
                    <strong style="color:#8b5cf6">SoD:</strong> BC Operator can ONLY anchor — cannot approve, submit, or modify business data.
                </div>
            </div>
        </div>

        <div class="sa-card">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('target')} Proof Verification</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:5px;text-align:left">Passport</th>
                    <th style="padding:5px;text-align:center">Calc Hash</th>
                    <th style="padding:5px;text-align:center">Gov Hash</th>
                    <th style="padding:5px;text-align:center">Method Hash</th>
                    <th style="padding:5px;text-align:center">Overall</th>
                </tr></thead>
                <tbody>${verifications.map(v => {
            const ov = v.overall === 'verified' ? '#10b981' : v.overall === 'pending' ? '#f59e0b' : '#ef4444';
            return `
                    <tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:5px;color:#3b82f6;font-weight:700;font-family:monospace;font-size:0.72rem">${v.passport}</td>
                        <td style="padding:5px;text-align:center;color:${v.calcHash.startsWith('✓') ? '#10b981' : v.calcHash.startsWith('✗') ? '#ef4444' : '#64748b'};font-size:0.72rem">${v.calcHash}</td>
                        <td style="padding:5px;text-align:center;color:${v.govHash.startsWith('✓') ? '#10b981' : v.govHash.startsWith('✗') ? '#ef4444' : '#64748b'};font-size:0.72rem">${v.govHash}</td>
                        <td style="padding:5px;text-align:center;color:${v.methodHash.startsWith('✓') ? '#10b981' : v.methodHash.startsWith('✗') ? '#ef4444' : '#64748b'};font-size:0.72rem">${v.methodHash}</td>
                        <td style="padding:5px;text-align:center"><span style="padding:2px 8px;border-radius:4px;background:${ov}18;color:${ov};font-weight:700;font-size:0.72rem;text-transform:uppercase">${v.overall}</span></td>
                    </tr>`;
        }).join('')}</tbody>
            </table>
        </div>`;
}

// ─── Module 9: Regulatory Export Engine ──────────────────────────────
function renderExportModule() {
    const formats = [
        { name: 'ESG Compliance Report', format: 'PDF', standard: 'GRI 305', status: 'ready', lastExport: '2024-12-15', color: '#10b981' },
        { name: 'IFRS S2 Climate Disclosure', format: 'XLSX + PDF', standard: 'IFRS S2', status: 'ready', lastExport: '2024-12-14', color: '#3b82f6' },
        { name: 'CSRD Sustainability', format: 'XBRL + PDF', standard: 'ESRS E1', status: 'draft', lastExport: '—', color: '#8b5cf6' },
        { name: 'GRI Standards Report', format: 'PDF', standard: 'GRI 302/305', status: 'ready', lastExport: '2024-12-13', color: '#22c55e' },
        { name: 'Supply Chain Disclosure', format: 'PDF', standard: 'Scope 3', status: 'pending', lastExport: '—', color: '#f59e0b' },
        { name: 'Registry Integration API', format: 'JSON', standard: 'REST v2', status: 'active', lastExport: 'Real-time', color: '#06b6d4' },
    ];

    const exportLog = [
        { time: '2024-12-15 14:45', actor: 'compliance-01', action: 'EXPORT_APPROVED', format: 'ESG Report', target: 'ACME Corp', hash: '0xee21…' },
        { time: '2024-12-14 16:30', actor: 'compliance-01', action: 'EXPORT_APPROVED', format: 'IFRS S2', target: 'Deloitte', hash: '0xa3f1…' },
        { time: '2024-12-13 10:12', actor: 'compliance-01', action: 'EXPORT_APPROVED', format: 'GRI Report', target: 'Gold Standard', hash: '0x81bc…' },
        { time: '2024-12-12 09:00', actor: 'auto-engine', action: 'EXPORT_GENERATED', format: 'CSRD Draft', target: 'Internal', hash: '0x44d2…' },
    ];

    const sBadge = (s) => {
        const m = { ready: ['#10b981', '✓ Ready'], draft: ['#64748b', '📝 Draft'], pending: ['#f59e0b', '⏳ Pending'], active: ['#06b6d4', '🔄 Active'] };
        const [c, t] = m[s] || ['#64748b', s];
        return `<span style="padding:2px 6px;border-radius:3px;background:${c}18;color:${c};font-weight:600;font-size:0.65rem">${t}</span>`;
    };

    return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Export Formats', v: formats.length, c: '#3b82f6', i: '📄' },
            { l: 'Ready', v: formats.filter(f => f.status === 'ready').length, c: '#10b981', i: '✅' },
            { l: 'Pending Approval', v: formats.filter(f => f.status === 'pending').length, c: '#f59e0b', i: '⏳' },
            { l: 'API Active', v: formats.filter(f => f.format === 'JSON').length, c: '#06b6d4', i: '🔗' },
        ].map(k => `
                <div class="sa-card" style="text-align:center;padding:12px">
                    <div style="font-size:16px">${k.i}</div>
                    <div style="font-size:18px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div>
                    <div style="color:#94a3b8;font-size:0.68rem">${k.l}</div>
                </div>
            `).join('')}
        </div>

        <div class="sa-card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <h3 style="margin:0;color:#f1f5f9;font-size:0.88rem">${icon('scroll')} Export Formats</h3>
                <div style="font-size:0.68rem;color:#64748b;background:#0f172a;padding:4px 10px;border-radius:20px">Compliance must approve all external exports</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
                ${formats.map(f => `
                    <div style="padding:12px;background:#0f172a;border-radius:10px;border-left:3px solid ${f.color}">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                            <span style="color:#f1f5f9;font-weight:700;font-size:0.78rem">${f.name}</span>
                            ${sBadge(f.status)}
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:0.68rem;color:#94a3b8">
                            <div>Format: <span style="color:#f1f5f9">${f.format}</span></div>
                            <div>Standard: <span style="color:${f.color}">${f.standard}</span></div>
                        </div>
                        ${f.status === 'ready' ? `<button style="margin-top:8px;width:100%;padding:5px;background:${f.color}18;color:${f.color};border:1px solid ${f.color}33;border-radius:6px;cursor:pointer;font-size:0.72rem;font-weight:600">📤 Export</button>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="sa-card">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('workflow')} Export Audit Log</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:4px;text-align:left">Time</th>
                    <th style="padding:4px;text-align:left">Actor</th>
                    <th style="padding:4px;text-align:left">Action</th>
                    <th style="padding:4px;text-align:left">Format</th>
                    <th style="padding:4px;text-align:left">Target</th>
                    <th style="padding:4px;text-align:right">Hash</th>
                </tr></thead>
                <tbody>${exportLog.map(e => `
                    <tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:4px;color:#64748b;font-family:monospace;font-size:0.72rem">${e.time}</td>
                        <td style="padding:4px;color:#3b82f6;font-size:0.72rem">${e.actor}</td>
                        <td style="padding:4px;color:#10b981;font-weight:500;font-size:0.72rem">${e.action.replace(/_/g, ' ')}</td>
                        <td style="padding:4px;color:#f1f5f9;font-size:0.72rem">${e.format}</td>
                        <td style="padding:4px;color:#94a3b8;font-size:0.72rem">${e.target}</td>
                        <td style="padding:4px;text-align:right;color:#8b5cf6;font-family:monospace;font-size:0.68rem">${e.hash}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
            <div style="margin-top:8px;padding:6px 8px;background:rgba(16,185,129,0.06);border-radius:6px;font-size:0.68rem;color:#94a3b8">
                <strong style="color:#10b981">Compliance Gate:</strong> External exports require Compliance approval · Internal auto-generated · Every export hash-recorded
            </div>
        </div>`;
}

// ─── Main Render ─────────────────────────────────────────────────────
// ─── Module 10: Settings & Methodology Config ──────────────────────
function renderSettingsModule() {
    const emissionFactors = [
        { source: 'Grid Electricity', scope: 2, factor: 0.42, unit: 'kgCO₂e/kWh', region: 'Global Avg', lastUpdated: '2024-12-01' },
        { source: 'Diesel Fuel', scope: 1, factor: 2.68, unit: 'kgCO₂e/liter', region: 'Global', lastUpdated: '2024-12-01' },
        { source: 'Natural Gas', scope: 1, factor: 2.02, unit: 'kgCO₂e/m³', region: 'Global', lastUpdated: '2024-12-01' },
        { source: 'Road Transport', scope: 3, factor: 0.12, unit: 'kgCO₂e/t·km', region: 'EU Avg', lastUpdated: '2024-11-15' },
        { source: 'Sea Freight', scope: 3, factor: 0.016, unit: 'kgCO₂e/t·km', region: 'Global', lastUpdated: '2024-11-15' },
        { source: 'Air Freight', scope: 3, factor: 0.60, unit: 'kgCO₂e/t·km', region: 'Global', lastUpdated: '2024-11-15' },
    ];
    const riskThresholds = [
        { name: 'Block Approval', threshold: 70, action: 'Passport blocked from approval', color: '#f59e0b' },
        { name: 'Auto-Escalate', threshold: 85, action: 'Auto-escalate to Risk Committee', color: '#ef4444' },
        { name: 'Emergency Freeze', threshold: 95, action: 'Freeze all CIPs + notify GGC', color: '#dc2626' },
        { name: 'Overclaim Alert', threshold: 20, action: 'Flag if benchmark delta > threshold %', color: '#f97316' },
    ];
    const validators = [
        { id: 'IVU-validator-01', name: 'Dr. Sarah Chen', org: 'TrustChecker IVU', status: 'active', assessments: 142 },
        { id: 'IVU-validator-02', name: "James O'Brien", org: 'TrustChecker IVU', status: 'active', assessments: 98 },
        { id: 'IVU-validator-03', name: 'Maria Gonzalez', org: 'External Partner', status: 'pending', assessments: 0 },
    ];
    return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            ${[
            { l: 'Emission Factors', v: emissionFactors.length, c: '#3b82f6', i: '⚡' },
            { l: 'Risk Thresholds', v: riskThresholds.length, c: '#ef4444', i: '🎯' },
            { l: 'IVU Validators', v: validators.filter(v => v.status === 'active').length, c: '#10b981', i: '🔍' },
            { l: 'Methodology', v: 'GHG v4.2', c: '#8b5cf6', i: '📐' },
        ].map(k => `<div class="sa-card" style="text-align:center;padding:12px"><div style="font-size:16px">${k.i}</div><div style="font-size:16px;font-weight:700;color:${k.c};margin:2px 0">${k.v}</div><div style="color:#94a3b8;font-size:0.68rem">${k.l}</div></div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:3fr 2fr;gap:16px;margin-bottom:16px">
            <div class="sa-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                    <h3 style="margin:0;color:#f1f5f9;font-size:0.88rem">${icon('barChart')} Emission Factors</h3>
                    <div style="font-size:0.62rem;color:#64748b;background:#0f172a;padding:3px 8px;border-radius:12px">Risk Committee owned · Version-locked</div>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.75rem">
                    <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.65rem;text-transform:uppercase">
                        <th style="padding:4px;text-align:left">Source</th><th style="padding:4px;text-align:center">Scope</th>
                        <th style="padding:4px;text-align:center">Factor</th><th style="padding:4px;text-align:center">Unit</th>
                        <th style="padding:4px;text-align:right">Updated</th>
                    </tr></thead>
                    <tbody>${emissionFactors.map(f => `<tr style="border-bottom:1px solid #1e293b">
                        <td style="padding:4px;color:#f1f5f9;font-weight:500">${f.source}</td>
                        <td style="padding:4px;text-align:center">${scopeBadge(f.scope)}</td>
                        <td style="padding:4px;text-align:center;color:#3b82f6;font-weight:700;font-family:monospace">${f.factor}</td>
                        <td style="padding:4px;text-align:center;color:#94a3b8;font-size:0.68rem">${f.unit}</td>
                        <td style="padding:4px;text-align:right;color:#64748b;font-size:0.68rem">${f.lastUpdated}</td>
                    </tr>`).join('')}</tbody>
                </table>
                <div style="margin-top:8px;padding:6px 8px;background:rgba(139,92,246,0.06);border-radius:6px;font-size:0.68rem;color:#94a3b8">
                    <strong style="color:#8b5cf6">SoD:</strong> Risk Committee proposes → IVU validates → Compliance approves → Version-locked
                </div>
            </div>
            <div class="sa-card">
                <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('target')} Risk Thresholds</h3>
                ${riskThresholds.map(t => `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#0f172a;border-radius:8px;margin-bottom:6px;border-left:3px solid ${t.color}">
                    <div style="width:40px;text-align:center;font-size:18px;font-weight:800;color:${t.color}">${t.threshold}</div>
                    <div><div style="color:#f1f5f9;font-weight:600;font-size:0.78rem">${t.name}</div><div style="color:#64748b;font-size:0.68rem">${t.action}</div></div>
                </div>`).join('')}
            </div>
        </div>
        <div class="sa-card">
            <h3 style="margin:0 0 10px;color:#f1f5f9;font-size:0.88rem">${icon('shield')} IVU Validator Registry</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
                <thead><tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.68rem;text-transform:uppercase">
                    <th style="padding:5px;text-align:left">ID</th><th style="padding:5px;text-align:left">Validator</th>
                    <th style="padding:5px;text-align:left">Org</th><th style="padding:5px;text-align:center">Status</th>
                    <th style="padding:5px;text-align:center">Assessments</th>
                </tr></thead>
                <tbody>${validators.map(v => `<tr style="border-bottom:1px solid #1e293b">
                    <td style="padding:5px;color:#3b82f6;font-family:monospace;font-size:0.72rem">${v.id}</td>
                    <td style="padding:5px;color:#f1f5f9;font-weight:600">${v.name}</td>
                    <td style="padding:5px;color:#94a3b8">${v.org}</td>
                    <td style="padding:5px;text-align:center"><span style="padding:2px 6px;border-radius:3px;background:${v.status === 'active' ? '#10b98118' : '#f59e0b18'};color:${v.status === 'active' ? '#10b981' : '#f59e0b'};font-weight:600;font-size:0.68rem">${v.status}</span></td>
                    <td style="padding:5px;text-align:center;color:#f1f5f9;font-weight:700">${v.assessments}</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
}

// ─── Main Render ─────────────────────────────────────────────────────
export function render() {
    loadCIE();
    const tabContent = activeTab === 'ingestion' ? renderIngestionModule()
        : activeTab === 'emission' ? renderEmissionModule()
            : activeTab === 'benchmark' ? renderBenchmarkModule()
                : activeTab === 'passport' ? renderPassportModule()
                    : activeTab === 'overclaim' ? renderOverclaimModule()
                        : activeTab === 'lineage' ? renderLineageModule()
                            : activeTab === 'governance' ? renderGovernanceModule()
                                : activeTab === 'blockchain' ? renderBlockchainModule()
                                    : activeTab === 'export' ? renderExportModule()
                                        : activeTab === 'settings' ? renderSettingsModule()
                                            : renderOverview();
    return `
    <div class="sa-page">
        <div class="sa-page-title">
            <h1>${icon('globe')} Carbon Integrity Engine <span style="font-size:0.6em;color:#64748b;font-weight:400">v1.0</span></h1>
            <p style="color:#94a3b8;margin:4px 0 16px">Risk-governed, audit-defensible carbon verification infrastructure — not a carbon registry.</p>
        </div>
        <div style="display:flex;gap:5px;margin-bottom:16px;flex-wrap:wrap">
            ${tabBtn('overview', 'Overview', '🏠')}
            ${tabBtn('ingestion', 'Ingestion', '📡')}
            ${tabBtn('emission', 'Emission', '🏭')}
            ${tabBtn('benchmark', 'Benchmark', '📊')}
            ${tabBtn('passport', 'Passports', '📜')}
            ${tabBtn('overclaim', 'Overclaim', '⚠️')}
            ${tabBtn('lineage', 'Lineage', '🔍')}
            ${tabBtn('governance', 'Governance', '🛡️')}
            ${tabBtn('blockchain', 'Blockchain', '⛓️')}
            ${tabBtn('export', 'Export', '📤')}
            ${tabBtn('settings', 'Settings', '⚙️')}
        </div>
        ${tabContent}
    </div>`;
}
export function renderPage() { return render(); }

// ─── Global handlers ─────────────────────────────────────────────────
window.cieTab = (tab) => { activeTab = tab; const el = document.getElementById('app') || document.querySelector('.sa-page')?.parentElement; if (el) el.innerHTML = render(); };
window.cieIssueCIP = () => { if (typeof showToast === 'function') showToast('CIP issuance requires Carbon Officer submission → IVU review → Compliance approval', 'info'); else alert('CIP issuance requires Carbon Officer submission → IVU review → Compliance approval'); };
window.cieRefresh = async () => { await loadCIE(); window.cieTab(activeTab); };

// ─── CIP PDF Export ──────────────────────────────────────────────────
window.cieExportPDF = (cipId) => {
    const passports = {
        'CIP-2024-00142': { product: 'Organic Coffee 1kg', batch: 'BATCH-2024-001', emission: 0.65, s1: 0.12, s2: 0.08, s3: 0.45, bench: 82, risk: 12, method: 'GHG Protocol v4.2', anchor: '0xab3f91e2c4d7…e821', validator: 'Dr. Sarah Chen (IVU-01)', date: '2024-12-15', unit: 'kgCO₂e/unit' },
        'CIP-2024-00143': { product: 'Bamboo Textile Roll', batch: 'BATCH-2024-005', emission: 0.23, s1: 0.08, s2: 0.06, s3: 0.09, bench: 91, risk: 8, method: 'GHG Protocol v4.2', anchor: '0x7c2da103f8b1…a103', validator: "James O'Brien (IVU-02)", date: '2024-12-14', unit: 'kgCO₂e/m²' },
        'CIP-2024-00144': { product: 'Fair Trade Tea 500g', batch: 'BATCH-2024-002', emission: 0.37, s1: 0.05, s2: 0.04, s3: 0.28, bench: 71, risk: 18, method: 'GHG Protocol v4.2', anchor: '0xf198b420de56…b420', validator: 'Dr. Sarah Chen (IVU-01)', date: '2024-12-13', unit: 'kgCO₂e/unit' },
    };
    const p = passports[cipId]; if (!p) { alert('CIP not sealed or not found'); return; }
    const sc = (v) => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CIP ${cipId}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:40px}
.cert{max-width:780px;margin:0 auto;background:linear-gradient(145deg,#1e293b,#0f172a);border:2px solid #334155;border-radius:20px;overflow:hidden}
.ch{background:linear-gradient(135deg,#10b981,#059669);padding:28px 36px;text-align:center}.ch h1{font-size:26px;font-weight:800;color:#fff;letter-spacing:1px}.ch h2{font-size:13px;color:rgba(255,255,255,0.8)}
.cb{padding:28px 36px}.cid{text-align:center;margin-bottom:20px}.cid span{font-size:22px;font-weight:800;color:#10b981;font-family:monospace;letter-spacing:2px}
.cg{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}.cf label{display:block;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:3px}.cf .v{font-size:15px;font-weight:700}
.cs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}.sb{text-align:center;padding:10px;background:#0f172a;border-radius:8px;border:1px solid #334155}.sb .sl{font-size:10px;text-transform:uppercase;color:#64748b}.sb .sv{font-size:18px;font-weight:800;margin:3px 0}
.sc{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}.scd{text-align:center;padding:14px;border-radius:10px;border:1px solid #334155}.scd .sn{font-size:28px;font-weight:800}.scd .sl2{font-size:10px;color:#94a3b8;margin-top:3px}
.cp{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:20px}.pr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #1e293b;font-size:12px}.pr:last-child{border:none}.pl{color:#94a3b8}.pv{color:#10b981;font-family:monospace;font-weight:600}
.qr{text-align:center;margin-bottom:16px}.qrp{display:inline-block;width:100px;height:100px;border:2px dashed #334155;border-radius:10px;line-height:100px;color:#64748b;font-size:10px}
.ft{text-align:center;padding:16px 36px;background:#0f172a;border-top:1px solid #1e293b}.ft p{font-size:10px;color:#64748b}.seal{display:inline-block;padding:5px 14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:16px;font-size:11px;font-weight:700;margin-top:6px}
@media print{body{background:#fff;color:#000;padding:16px}.cert{border-color:#ccc;background:#fff}.ch{-webkit-print-color-adjust:exact;print-color-adjust:exact}.cb,.cp,.sb{background:#f8fafc;color:#000}.cf .v,.scd .sn{color:#000}.pv{color:#059669}}</style></head><body>
<div class="cert"><div class="ch"><h1>🔐 CARBON INTEGRITY PASSPORT</h1><h2>TrustChecker CIE v1.0</h2></div>
<div class="cb"><div class="cid"><span>${cipId}</span></div>
<div class="cg"><div class="cf"><label>Product</label><div class="v">${p.product}</div></div><div class="cf"><label>Batch</label><div class="v">${p.batch}</div></div><div class="cf"><label>Date</label><div class="v">${p.date}</div></div><div class="cf"><label>Methodology</label><div class="v">${p.method}</div></div></div>
<div style="text-align:center;margin-bottom:16px"><div style="font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:3px">Total Carbon Footprint</div><div style="font-size:32px;font-weight:800;color:#ef4444">${p.emission} <span style="font-size:14px;color:#94a3b8">${p.unit}</span></div></div>
<div class="cs"><div class="sb"><div class="sl">Scope 1</div><div class="sv" style="color:#3b82f6">${p.s1}</div></div><div class="sb"><div class="sl">Scope 2</div><div class="sv" style="color:#8b5cf6">${p.s2}</div></div><div class="sb"><div class="sl">Scope 3</div><div class="sv" style="color:#f59e0b">${p.s3}</div></div></div>
<div class="sc"><div class="scd"><div class="sn" style="color:${sc(p.bench)}">${p.bench}<span style="font-size:12px;color:#64748b">/100</span></div><div class="sl2">Efficiency</div></div><div class="scd"><div class="sn" style="color:${sc(100 - p.risk)}">${p.risk}<span style="font-size:12px;color:#64748b">/100</span></div><div class="sl2">Risk (lower=better)</div></div></div>
<div class="cp"><div style="font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:6px;font-weight:700">Blockchain Proof</div>
<div class="pr"><span class="pl">Anchor</span><span class="pv">${p.anchor}</span></div>
<div class="pr"><span class="pl">Chain</span><span class="pv">Polygon Mainnet</span></div>
<div class="pr"><span class="pl">Validator</span><span class="pv">${p.validator}</span></div>
<div class="pr"><span class="pl">Integrity</span><span class="pv">✓ Calc · ✓ Gov · ✓ Method</span></div></div>
<div class="qr"><div class="qrp">QR Code</div></div></div>
<div class="ft"><p>Issued by TrustChecker CIE v1.0 · GHG Protocol · Audit-logged · Blockchain-anchored · SoD-enforced</p><div class="seal">🔐 INTEGRITY SEALED</div></div></div>
<script>setTimeout(()=>window.print(),500)</script></body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
};
