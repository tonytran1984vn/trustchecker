/**
 * Risk Workspace — Comprehensive Seed Data
 * Uses Prisma client directly for DDL (bypasses db.js translateSQL filter)
 */
const { v4: uuidv4 } = require('uuid');
const ORG = '54197b08-bd93-467d-a738-925ba22bdb6c';

async function seed() {
    const db = require('./server/db');
    await db._readyPromise;
    const prisma = db.client;

    // ── 1. CREATE MISSING TABLES (via Prisma raw, not db.run) ──
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS model_performance (id TEXT PRIMARY KEY, model_version TEXT NOT NULL, auc_roc REAL DEFAULT 0, precision_score REAL DEFAULT 0, recall REAL DEFAULT 0, f1_score REAL DEFAULT 0, fp_rate TEXT DEFAULT '', tp_rate TEXT DEFAULT '', dataset_size INTEGER DEFAULT 0, dataset_date_range TEXT DEFAULT '', confusion_matrix TEXT DEFAULT '{}', roc_curve TEXT DEFAULT '[]', per_factor TEXT DEFAULT '[]', thresholds TEXT DEFAULT '[]', notes TEXT DEFAULT '', is_latest BOOLEAN DEFAULT false, evaluated_at TIMESTAMPTZ DEFAULT NOW())`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS training_runs (id TEXT PRIMARY KEY, run_id TEXT UNIQUE NOT NULL, model_version TEXT DEFAULT '', status TEXT DEFAULT 'pending', dataset_size INTEGER DEFAULT 0, train_split INTEGER DEFAULT 70, val_split INTEGER DEFAULT 15, test_split INTEGER DEFAULT 15, hyperparams TEXT DEFAULT '{}', metrics TEXT DEFAULT '{}', triggered_by TEXT DEFAULT '', notes TEXT DEFAULT '', started_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS feature_store (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'behavioral', data_type TEXT DEFAULT 'float', source TEXT DEFAULT 'scan_events', extraction_logic TEXT DEFAULT '', config TEXT DEFAULT '{}', stats TEXT DEFAULT '{}', status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
    console.log('✅ Created 3 tables');

    // ── 2. model_performance ──
    const models = await db.all("SELECT id, version, status FROM risk_models ORDER BY created_at ASC");
    for (let i = 0; i < models.length; i++) {
        const m = models[i]; const auc = Math.min(0.82 + i * 0.015, 0.98); const pr = Math.min(0.78 + i * 0.02, 0.97); const rc = Math.min(0.75 + i * 0.018, 0.96); const f1 = 2 * pr * rc / (pr + rc);
        await db.run(`INSERT INTO model_performance (id,model_version,auc_roc,precision_score,recall,f1_score,fp_rate,tp_rate,dataset_size,dataset_date_range,notes,is_latest,evaluated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
            [uuidv4(), m.version, auc, pr, rc, f1, (5 - i * 0.4).toFixed(1) + '%', (90 + i * 0.9).toFixed(1) + '%', 10000 + i * 5000, `2025-${String(12 - models.length + i + 1).padStart(2, '0')}-01 to 2026-${String(Math.min(12, i + 1)).padStart(2, '0')}-28`, m.status === 'production' ? 'Currently deployed' : 'Evaluation', m.status === 'production', new Date(Date.now() - (models.length - i) * 7 * 86400000).toISOString()]);
    }
    console.log(`✅ ${models.length} model_performance`);

    // ── 3. training_runs ──
    const trs = [
        { v: 'v3.2', st: 'completed', ds: 45000, m: { auc: 0.953, f1: 0.94, loss: 0.047 }, n: 'Production retraining on 45K events', d: 3 },
        { v: 'v3.2-exp1', st: 'completed', ds: 45000, m: { auc: 0.948, f1: 0.93, loss: 0.052 }, n: 'Experimental: increased geo_anomaly weight', d: 5 },
        { v: 'v3.3-candidate', st: 'completed', ds: 52000, m: { auc: 0.961, f1: 0.95, loss: 0.039 }, n: 'Candidate — added device clustering feature', d: 1 },
        { v: 'v3.3-candidate', st: 'running', ds: 52000, m: { epoch: 7, current_loss: 0.041 }, n: 'Hyperparameter sweep — LR 0.001', d: 0 },
        { v: 'v3.1-retro', st: 'failed', ds: 38000, m: { error: 'OOM at epoch 12' }, n: 'Retrospective run — batch size too large', d: 10 },
        { v: 'v3.2', st: 'completed', ds: 15000, m: { auc: 0.945, f1: 0.92, loss: 0.055 }, n: 'Weekly incremental retraining', d: 7 },
    ];
    for (const t of trs) {
        await db.run(`INSERT INTO training_runs (id,run_id,model_version,status,dataset_size,train_split,val_split,test_split,hyperparams,metrics,triggered_by,notes,started_at,completed_at) VALUES (?,?,?,?,?,70,15,15,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
            [uuidv4(), 'TR-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), t.v, t.st, t.ds, JSON.stringify({ learning_rate: 0.001, batch_size: t.st === 'failed' ? 512 : 128, epochs: 20 }), JSON.stringify(t.m), 'scheduler', t.n, new Date(Date.now() - t.d * 86400000).toISOString(), t.st === 'completed' ? new Date(Date.now() - (t.d * 86400000 - 7200000)).toISOString() : null]);
    }
    console.log('✅ 6 training_runs');

    // ── 4. feature_store ──
    const feats = [
        { n: 'scan_velocity', c: 'behavioral', s: 'scan_events', l: 'COUNT(scans) per product per 24h' },
        { n: 'geo_distance', c: 'geographic', s: 'scan_events', l: 'Haversine distance between consecutive scans' },
        { n: 'device_diversity', c: 'device', s: 'scan_events', l: 'COUNT(DISTINCT device_fingerprint) per product/7d' },
        { n: 'time_pattern_score', c: 'temporal', s: 'scan_events', l: 'Entropy of scan timestamps' },
        { n: 'partner_trust_decay', c: 'network', s: 'partners', l: 'Trust score delta over 30 days' },
        { n: 'batch_integrity_hash', c: 'supply_chain', s: 'batches', l: 'SHA-256 chain consistency check' },
        { n: 'duplicate_rate', c: 'behavioral', s: 'duplicate_classifications', l: 'Duplicate/total scan ratio per product' },
        { n: 'route_deviation', c: 'geographic', s: 'shipments', l: 'GPS trail vs optimal route distance' },
        { n: 'currency_mismatch', c: 'financial', s: 'leak_alerts', l: 'Listing price vs authorized price ratio' },
        { n: 'network_betweenness', c: 'network', s: 'supply_chain_graph', l: 'Betweenness centrality in supply graph' },
        { n: 'sla_breach_frequency', c: 'operational', s: 'sla_violations', l: 'Violations per partner per 30d' },
        { n: 'serial_reuse_score', c: 'behavioral', s: 'scan_events', l: 'Same QR from different geos within 1h' },
    ];
    for (const f of feats) {
        await db.run(`INSERT INTO feature_store (id,name,category,data_type,source,extraction_logic,config,stats,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
            [uuidv4(), f.n, f.c, 'float', f.s, f.l, JSON.stringify({ window: '7d', refresh: 'hourly', version: 'v2' }), JSON.stringify({ mean: (Math.random() * 0.6 + 0.2).toFixed(3), std: (Math.random() * 0.15 + 0.05).toFixed(3), min: 0, max: 1 }), 'active', new Date(Date.now() - 30 * 86400000).toISOString(), new Date().toISOString()]);
    }
    console.log('✅ 12 feature_store');

    // ── 5. model_change_requests ──
    const mIds = models.map(m => m.id);
    const crs = [
        { f: 'geo_anomaly', c: '0.18', p: '0.22', r: 'Geo-fence breaches increased 40%', i: 'FP +0.5%', s: 'approved', d: 5 },
        { f: 'scan_velocity', c: '0.22', p: '0.25', r: 'Velocity = 35% confirmed fraud', i: 'Higher TP for rapid scans', s: 'approved', d: 12 },
        { f: 'device_fingerprint', c: '0.04', p: '0.08', r: 'Device clustering in VN distribution', i: 'May flag shared-device retail scans', s: 'pending', d: 2 },
        { f: 'partner_trust', c: '0.10', p: '0.15', r: 'New partner onboarding variance', i: 'Reduces exposure for new distributors', s: 'pending', d: 1 },
        { f: 'duplicate_rate', c: '0.15', p: '0.12', r: 'Too many FP from curiosity re-scans', i: 'Estimated 20% FP reduction', s: 'approved', d: 8 },
        { f: 'batch_integrity', c: '0.12', p: '0.14', r: 'Supply chain hash inconsistencies up in Q1', i: 'Better tampered batch detection', s: 'pending', d: 0 },
        { f: 'currency_mismatch', c: '0.005', p: '0.01', r: 'Gray market re-pricing in Dubai', i: 'Captures pricing leak signals', s: 'rejected', d: 15 },
        { f: 'network_risk', c: '0.02', p: '0.05', r: 'Graph analysis reveals hidden intermediaries', i: 'Computational cost +15%', s: 'rejected', d: 20 },
    ];
    for (const cr of crs) {
        await db.run(`INSERT INTO model_change_requests (id,model_id,factor,current_value,proposed_value,reason,impact,requested_by,status,reviewed_by,reviewed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), mIds[Math.floor(Math.random() * mIds.length)], cr.f, cr.c, cr.p, cr.r, cr.i, 'risk@tonyisking.com', cr.s, cr.s !== 'pending' ? 'admin@tonyisking.com' : null, cr.s !== 'pending' ? new Date(Date.now() - (cr.d - 1) * 86400000).toISOString() : null, new Date(Date.now() - cr.d * 86400000).toISOString()]);
    }
    console.log('✅ 8 model_change_requests');

    // ── 6. sla_violations ──
    const partners = await db.all("SELECT id, name FROM partners WHERE org_id = ?", [ORG]);
    // Create SLA defs if needed
    let slaDefs = await db.all("SELECT id, partner_id FROM sla_definitions LIMIT 20");
    if (slaDefs.length < 3) {
        for (const p of partners.slice(0, 8)) {
            for (const st of ['delivery', 'quality']) {
                await db.run(`INSERT INTO sla_definitions (id,partner_id,sla_type,metric,threshold_value,threshold_unit,penalty_amount,penalty_currency,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
                    [uuidv4(), p.id, st, st === 'delivery' ? 'days_to_deliver' : 'defect_pct', st === 'delivery' ? 5 : 2, st === 'delivery' ? 'days' : 'percent', st === 'delivery' ? 500 : 1000, 'USD', 'active', new Date(Date.now() - 60 * 86400000).toISOString()]);
            }
        }
        slaDefs = await db.all("SELECT id, partner_id FROM sla_definitions LIMIT 20");
        console.log(`  Created ${slaDefs.length} SLA defs`);
    }
    const vTypes = ['late_delivery', 'quality_defect', 'documentation_missing', 'temperature_breach', 'damaged_goods'];
    const vStats = ['open', 'open', 'open', 'investigating', 'investigating', 'resolved', 'resolved', 'resolved'];
    for (let i = 0; i < 15; i++) {
        const sla = slaDefs[i % slaDefs.length];
        const st = vStats[i % vStats.length]; const vt = vTypes[i % vTypes.length];
        await db.run(`INSERT INTO sla_violations (id,sla_id,partner_id,violation_type,actual_value,threshold_value,penalty_amount,status,resolved_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), sla.id, sla.partner_id, vt, vt === 'late_delivery' ? (6 + Math.floor(Math.random() * 5)) : (3 + Math.random() * 5).toFixed(1), vt === 'late_delivery' ? 5 : 2, 200 + Math.floor(Math.random() * 2000), st, st === 'resolved' ? new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() : null, new Date(Date.now() - (i + 1) * 3 * 86400000).toISOString()]);
    }
    console.log('✅ 15 sla_violations');

    // ── 7. ops_incidents_v2 — 10 resolved ──
    const incs = [
        { t: 'Counterfeit Product Detected', desc: 'Counterfeit SmartBuds Pro at Dubai retail', sev: 'critical', cat: 'counterfeit_product' },
        { t: 'Supply Chain Breach', desc: 'Unauthorized intermediary in VN coffee chain', sev: 'high', cat: 'supply_chain_breach' },
        { t: 'Geo Fence Violation', desc: 'GPS Tracker scanned outside territory (Nigeria)', sev: 'high', cat: 'geo_fence_violation' },
        { t: 'Mass Duplicate Scan', desc: 'Same QR scanned 45x in 2h from different IPs', sev: 'critical', cat: 'mass_duplicate_scan' },
        { t: 'Partner Trust Drop', desc: 'Saigon Coffee partner trust 85→42', sev: 'medium', cat: 'partner_trust_drop' },
        { t: 'Expired Product Sale', desc: 'Heritage Rice BC-2025-089 sold 3mo past expiry', sev: 'high', cat: 'expired_product_sale' },
        { t: 'Currency Manipulation', desc: 'VitaKing listed 65% below authorized price', sev: 'medium', cat: 'currency_manipulation' },
        { t: 'Device Cluster Attack', desc: 'Coordinated scan from 12 devices same IP block', sev: 'critical', cat: 'device_cluster_attack' },
        { t: 'Documentation Fraud', desc: 'Forged certificate of origin for Turmeric Powder', sev: 'medium', cat: 'documentation_fraud' },
        { t: 'Route Deviation', desc: 'Shipment GPS shows 800km unauthorized detour', sev: 'high', cat: 'route_deviation' },
    ];
    // Check columns first
    const cols = await db.all("SELECT column_name::text as c FROM information_schema.columns WHERE table_name = 'ops_incidents_v2'");
    const colSet = new Set(cols.map(c => c.c));
    for (let i = 0; i < incs.length; i++) {
        const inc = incs[i]; const d = 5 + i * 4;
        if (colSet.has('description')) {
            await db.run(`INSERT INTO ops_incidents_v2 (id,title,description,severity,status,category,resolved_at,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
                [uuidv4(), inc.t, inc.desc, inc.sev, 'resolved', inc.cat, new Date(Date.now() - (d - 2) * 86400000).toISOString(), new Date(Date.now() - d * 86400000).toISOString()]);
        } else {
            await db.run(`INSERT INTO ops_incidents_v2 (id,title,severity,status,category,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
                [uuidv4(), inc.t + ' — ' + inc.desc, inc.sev, 'resolved', inc.cat, new Date(Date.now() - d * 86400000).toISOString()]);
        }
    }
    console.log('✅ 10 resolved ops_incidents_v2');

    // ── 8. leak_alerts — 12 org-specific ──
    const orgProds = await db.all("SELECT id, name FROM products WHERE org_id = ? LIMIT 22", [ORG]);
    const platforms = ['Amazon', 'Shopee', 'Lazada', 'AliExpress', 'eBay', 'Temu', 'Tokopedia', 'Mercado Libre'];
    const regions = ['NG', 'PK', 'BD', 'EG', 'KE', 'GH', 'CI', 'CM', 'TZ', 'UG', 'PH', 'ID'];
    const lkStats = ['open', 'open', 'open', 'investigating', 'investigating', 'resolved'];
    for (let i = 0; i < 12; i++) {
        const p = orgProds[i % orgProds.length]; const ap = 15 + Math.floor(Math.random() * 200); const lp = ap * (0.3 + Math.random() * 0.5);
        await db.run(`INSERT INTO leak_alerts (id,product_id,platform,url,listing_title,listing_price,authorized_price,region_detected,authorized_regions,leak_type,risk_score,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), p.id, platforms[i % platforms.length], 'https://' + platforms[i % platforms.length].toLowerCase() + '.com/listing/' + Math.random().toString(36).slice(2, 10), p.name + ' – ' + ['Gray Import', 'Unauthorized Resale', 'Below-Cost Dump', 'Parallel Import'][i % 4], Math.round(lp * 100) / 100, ap, regions[i % regions.length], JSON.stringify(['VN', 'SG', 'TH', 'MY']), ['unauthorized_region', 'price_violation', 'unauthorized_seller', 'counterfeit_listing'][i % 4], (0.4 + Math.random() * 0.5).toFixed(2), lkStats[i % lkStats.length], new Date(Date.now() - (i + 1) * 2 * 86400000).toISOString()]);
    }
    console.log('✅ 12 leak_alerts');

    // ── 9. route_breaches — 8 more ──
    const routes = await db.all("SELECT id, name FROM supply_routes LIMIT 15");
    const rules = await db.all("SELECT id, name, severity FROM channel_rules LIMIT 11");
    const brLocs = ['Lagos, Nigeria', 'Karachi, Pakistan', 'Dhaka, Bangladesh', 'Cairo, Egypt', 'Nairobi, Kenya', 'Accra, Ghana', 'Manila, Philippines', 'Jakarta, Indonesia'];
    for (let i = 0; i < 8; i++) {
        const rt = routes[i % routes.length]; const rl = rules[i % rules.length];
        await db.run(`INSERT INTO route_breaches (id,route_id,rule_id,code_data,scanned_in,severity,action,details,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), rt.id, rl.id, 'TC-' + Math.random().toString(36).slice(2, 8).toUpperCase(), brLocs[i % brLocs.length], rl.severity || 'high', ['alert', 'quarantine', 'block', 'investigate'][i % 4], JSON.stringify({ route_name: rt.name, rule_name: rl.name, deviation_km: 200 + Math.floor(Math.random() * 1500) }), new Date(Date.now() - (i + 1) * 3 * 86400000).toISOString()]);
    }
    console.log('✅ 8 route_breaches');

    // ── 10. forensic_cases — 5 more ──
    const geos = ['Ho Chi Minh City, VN', 'Singapore, SG', 'Bangkok, TH', 'Dubai, AE', 'Tokyo, JP', 'Seoul, KR', 'Hanoi, VN', 'Kuala Lumpur, MY'];
    const fcStatuses = ['open', 'investigating', 'frozen', 'closed', 'closed'];
    const fcVerdicts = [null, null, null, 'confirmed_counterfeit', 'false_positive'];
    for (let i = 0; i < 5; i++) {
        const prod = orgProds[i % orgProds.length];
        const chain = []; for (let s = 0; s < 5 + Math.floor(Math.random() * 5); s++) chain.push({ seq: s + 1, geo: geos[Math.floor(Math.random() * geos.length)], device: Math.random().toString(16).slice(2, 14), ers: (Math.random() * 0.6 + 0.3).toFixed(2), timestamp: new Date(Date.now() - (20 - s) * 86400000).toISOString() });
        const d = 3 + i * 5;
        await db.run(`INSERT INTO forensic_cases (id,case_number,code_data,product_id,scan_chain,device_compare,factor_breakdown,current_ers,status,assigned_to,frozen_at,closed_at,verdict,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), `FC-2026-${String(4 + i).padStart(3, '0')}`, `TC-${['SUSPICIOUS', 'DUPLICATE', 'BREACH', 'COUNTERFEIT', 'ANOMALY'][i]}-${Math.floor(1000 + Math.random() * 9000)}`, prod.id, JSON.stringify(chain), JSON.stringify([{ field: 'Device Hash', match: false, values: [Math.random().toString(16).slice(2, 8), Math.random().toString(16).slice(2, 8)] }]), JSON.stringify([{ factor: 'geo_anomaly', weight: 0.4, score: (0.5 + Math.random() * 0.4).toFixed(2) }, { factor: 'velocity', weight: 0.3, score: (0.3 + Math.random() * 0.5).toFixed(2) }]), [92, 76, 65, 95, 45][i], fcStatuses[i], 'risk@tonyisking.com', fcStatuses[i] === 'frozen' ? new Date(Date.now() - (d - 1) * 86400000).toISOString() : null, fcStatuses[i] === 'closed' ? new Date(Date.now() - (d - 2) * 86400000).toISOString() : null, fcVerdicts[i], new Date(Date.now() - d * 86400000).toISOString(), new Date(Date.now() - (d - 1) * 86400000).toISOString()]);
    }
    console.log('✅ 5 forensic_cases');

    // ── FINAL COUNTS ──
    console.log('\n=== FINAL COUNTS ===');
    for (const t of ['model_performance', 'training_runs', 'feature_store', 'model_change_requests', 'sla_violations', 'ops_incidents_v2', 'leak_alerts', 'route_breaches', 'forensic_cases', 'fraud_alerts', 'anomaly_detections']) {
        const r = await db.get('SELECT count(*)::int as c FROM ' + t);
        console.log(`${t}: ${r?.c ?? 0}`);
    }
    console.log('\n✅ DONE!');
    process.exit(0);
}
seed().catch(e => { console.error('SEED ERROR:', e.message, e.stack?.split('\n').slice(0, 3).join('\n')); process.exit(1); });
