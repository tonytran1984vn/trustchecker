/**
 * Risk Seed Part 2 — ops_incidents_v2, leak_alerts, route_breaches, forensic_cases
 */
const { v4: uuidv4 } = require('uuid');
const ORG = '54197b08-bd93-467d-a738-925ba22bdb6c';

async function seed() {
    const db = require('./server/db');
    await db._readyPromise;

    // ── Get ops_incidents_v2 columns ──
    const cols = await db.all("SELECT column_name::text as c FROM information_schema.columns WHERE table_name = 'ops_incidents_v2'");
    const colSet = new Set(cols.map(c => c.c));
    console.log('ops_incidents_v2 columns:', Array.from(colSet).join(', '));

    // ── 1. ops_incidents_v2 — 10 resolved ──
    const incs = [
        { t: 'Counterfeit Product Detected', desc: 'Counterfeit SmartBuds Pro at Dubai retail outlet', sev: 'critical' },
        { t: 'Supply Chain Breach', desc: 'Unauthorized intermediary in VN coffee supply chain', sev: 'high' },
        { t: 'Geo Fence Violation', desc: 'GPS Tracker scanned outside authorized territory (Nigeria)', sev: 'high' },
        { t: 'Mass Duplicate Scan', desc: 'Same QR scanned 45x in 2h from different IPs', sev: 'critical' },
        { t: 'Partner Trust Drop', desc: 'Saigon Coffee partner trust score dropped from 85 to 42', sev: 'medium' },
        { t: 'Expired Product Sale', desc: 'Heritage Rice BC-2025-089 sold 3 months past expiry', sev: 'high' },
        { t: 'Currency Manipulation', desc: 'VitaKing listed 65% below authorized price', sev: 'medium' },
        { t: 'Device Cluster Attack', desc: 'Coordinated scan from 12 devices sharing same IP block', sev: 'critical' },
        { t: 'Documentation Fraud', desc: 'Forged certificate of origin for Turmeric Powder batch', sev: 'medium' },
        { t: 'Route Deviation', desc: 'Shipment GPS trail shows 800km unauthorized detour', sev: 'high' },
    ];

    for (let i = 0; i < incs.length; i++) {
        const inc = incs[i];
        const d = 5 + i * 4;
        const id = uuidv4();
        const createdAt = new Date(Date.now() - d * 86400000).toISOString();
        const resolvedAt = new Date(Date.now() - (d - 2) * 86400000).toISOString();

        // Build INSERT based on available columns
        const insertCols = ['id', 'incident_id', 'title', 'severity', 'status', 'module', 'created_at'];
        const insertVals = [id, `INC-2026-${String(19 + i).padStart(4, '0')}`, inc.t, inc.sev, 'resolved', 'risk', createdAt];
        const placeholders = insertCols.map(() => '?');

        if (colSet.has('description')) {
            insertCols.push('description');
            insertVals.push(inc.desc);
            placeholders.push('?');
        }
        if (colSet.has('resolved_at')) {
            insertCols.push('resolved_at');
            insertVals.push(resolvedAt);
            placeholders.push('?');
        }
        if (colSet.has('category')) {
            insertCols.push('category');
            insertVals.push(inc.t.toLowerCase().replace(/ /g, '_'));
            placeholders.push('?');
        }

        await db.run(
            `INSERT INTO ops_incidents_v2 (${insertCols.join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT (id) DO NOTHING`,
            insertVals
        );
    }
    console.log('✅ 10 resolved ops_incidents_v2');

    // ── 2. leak_alerts — 12 org-specific ──
    const orgProds = await db.all("SELECT id, name FROM products WHERE org_id = ?", [ORG]);
    const platforms = ['Amazon', 'Shopee', 'Lazada', 'AliExpress', 'eBay', 'Temu', 'Tokopedia', 'Mercado Libre'];
    const regions = ['NG', 'PK', 'BD', 'EG', 'KE', 'GH', 'CI', 'CM', 'TZ', 'UG', 'PH', 'ID'];
    const lkStats = ['open', 'open', 'open', 'investigating', 'investigating', 'resolved'];
    const leakTypes = ['unauthorized_region', 'price_violation', 'unauthorized_seller', 'counterfeit_listing'];
    const leakLabels = ['Gray Import', 'Unauthorized Resale', 'Below-Cost Dump', 'Parallel Import'];

    for (let i = 0; i < 12; i++) {
        const p = orgProds[i % orgProds.length];
        const ap = 15 + Math.floor(Math.random() * 200);
        const lp = Math.round(ap * (0.3 + Math.random() * 0.5) * 100) / 100;
        await db.run(
            `INSERT INTO leak_alerts (id, product_id, platform, url, listing_title, listing_price, authorized_price, region_detected, authorized_regions, leak_type, risk_score, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), p.id, platforms[i % platforms.length],
            `https://${platforms[i % platforms.length].toLowerCase()}.com/listing/${Math.random().toString(36).slice(2, 10)}`,
            `${p.name} – ${leakLabels[i % leakLabels.length]}`,
                lp, ap, regions[i % regions.length],
            JSON.stringify(['VN', 'SG', 'TH', 'MY']),
            leakTypes[i % leakTypes.length],
            (0.4 + Math.random() * 0.5).toFixed(2),
            lkStats[i % lkStats.length],
            new Date(Date.now() - (i + 1) * 2 * 86400000).toISOString()
            ]
        );
    }
    console.log('✅ 12 leak_alerts');

    // ── 3. route_breaches — 8 more ──
    const routes = await db.all("SELECT id, name FROM supply_routes LIMIT 15");
    const rules = await db.all("SELECT id, name, severity FROM channel_rules LIMIT 11");
    const brLocs = ['Lagos, Nigeria', 'Karachi, Pakistan', 'Dhaka, Bangladesh', 'Cairo, Egypt', 'Nairobi, Kenya', 'Accra, Ghana', 'Manila, Philippines', 'Jakarta, Indonesia'];
    const brActions = ['alert', 'quarantine', 'block', 'investigate'];

    for (let i = 0; i < 8; i++) {
        const rt = routes[i % routes.length];
        const rl = rules[i % rules.length];
        await db.run(
            `INSERT INTO route_breaches (id, route_id, rule_id, code_data, scanned_in, severity, action, details, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), rt.id, rl.id,
            'TC-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
            brLocs[i % brLocs.length],
            rl.severity || 'high',
            brActions[i % brActions.length],
            JSON.stringify({ route_name: rt.name, rule_name: rl.name, deviation_km: 200 + Math.floor(Math.random() * 1500) }),
            new Date(Date.now() - (i + 1) * 3 * 86400000).toISOString()
            ]
        );
    }
    console.log('✅ 8 route_breaches');

    // ── 4. forensic_cases — 5 more ──
    const geos = ['Ho Chi Minh City, VN', 'Singapore, SG', 'Bangkok, TH', 'Dubai, AE', 'Tokyo, JP', 'Seoul, KR', 'Hanoi, VN', 'Kuala Lumpur, MY'];
    const fcStatuses = ['open', 'investigating', 'frozen', 'closed', 'closed'];
    const fcVerdicts = [null, null, null, 'confirmed_counterfeit', 'false_positive'];
    const fcLabels = ['SUSPICIOUS', 'DUPLICATE', 'BREACH', 'COUNTERFEIT', 'ANOMALY'];
    const fcErs = [92, 76, 65, 95, 45];

    for (let i = 0; i < 5; i++) {
        const prod = orgProds[i % orgProds.length];
        const chain = [];
        for (let s = 0; s < 5 + Math.floor(Math.random() * 5); s++) {
            chain.push({
                seq: s + 1,
                geo: geos[Math.floor(Math.random() * geos.length)],
                device: Math.random().toString(16).slice(2, 14),
                ers: Number((Math.random() * 0.6 + 0.3).toFixed(2)),
                timestamp: new Date(Date.now() - (20 - s) * 86400000).toISOString()
            });
        }
        const d = 3 + i * 5;
        await db.run(
            `INSERT INTO forensic_cases (id, case_number, code_data, product_id, scan_chain, device_compare, factor_breakdown, current_ers, status, assigned_to, frozen_at, closed_at, verdict, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(),
            `FC-2026-${String(4 + i).padStart(3, '0')}`,
            `TC-${fcLabels[i]}-${Math.floor(1000 + Math.random() * 9000)}`,
            prod.id,
            JSON.stringify(chain),
            JSON.stringify([{ field: 'Device Hash', match: false, values: [Math.random().toString(16).slice(2, 8), Math.random().toString(16).slice(2, 8)] }]),
            JSON.stringify([{ factor: 'geo_anomaly', weight: 0.4, score: Number((0.5 + Math.random() * 0.4).toFixed(2)) }, { factor: 'velocity', weight: 0.3, score: Number((0.3 + Math.random() * 0.5).toFixed(2)) }]),
            fcErs[i],
            fcStatuses[i],
                'risk@tonyisking.com',
            fcStatuses[i] === 'frozen' ? new Date(Date.now() - (d - 1) * 86400000).toISOString() : null,
            fcStatuses[i] === 'closed' ? new Date(Date.now() - (d - 2) * 86400000).toISOString() : null,
            fcVerdicts[i],
            new Date(Date.now() - d * 86400000).toISOString(),
            new Date(Date.now() - (d - 1) * 86400000).toISOString()
            ]
        );
    }
    console.log('✅ 5 forensic_cases');

    // ── FINAL COUNTS ──
    console.log('\n=== FINAL COUNTS ===');
    for (const t of ['model_performance', 'training_runs', 'feature_store', 'model_change_requests', 'sla_violations', 'ops_incidents_v2', 'leak_alerts', 'route_breaches', 'forensic_cases', 'fraud_alerts', 'anomaly_detections', 'channel_rules']) {
        try {
            const r = await db.get('SELECT count(*)::int as c FROM ' + t);
            console.log(`${t}: ${r?.c ?? 0}`);
        } catch (e) { console.log(`${t}: ERROR`); }
    }
    console.log('\n✅ DONE!');
    process.exit(0);
}
seed().catch(e => { console.error('SEED ERROR:', e.message); process.exit(1); });
