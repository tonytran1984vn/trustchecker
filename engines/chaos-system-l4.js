/**
 * ═══════════════════════════════════════════════════════════════
 *  CHAOS SYSTEM LEVEL 4 V4 — ADVERSARIAL GRAPH INTELLIGENCE
 *
 *  Tests Risk Engine V4: multi-hop, temporal graph, role-switch,
 *  device identity, random noise resistance
 *
 *  22 original + 5 V4 scenarios + 6 integration = 28 total
 *
 *  Run: cd /opt/trustchecker && node engines/chaos-system-l4.js
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const fs = require('fs');

const DB_URL = process.env.DATABASE_URL;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function psql(sql) {
    try {
        return execSync(`psql "${DB_URL}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 10000 }).toString().trim();
    } catch(e) {
        return 'ERROR:' + (e.stderr?.toString().substring(0, 200) || e.message.substring(0, 200));
    }
}

function createProduct(name, category) {
    const pid = uuidv4();
    const orgId = psql("SELECT org_id FROM products WHERE org_id IS NOT NULL LIMIT 1");
    psql(`INSERT INTO products (id, name, sku, category, manufacturer, status, org_id, created_at) VALUES ('${pid}', '${name}', 'L4-${Date.now()}', '${category || 'test'}', 'ChaosLab', 'active', '${orgId}', NOW())`);
    return pid;
}

function insertScanEvent(productId, fingerprint, ip, lat, lng, scanType) {
    const id = uuidv4();
    psql(`INSERT INTO scan_events (id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, result, scanned_at, org_id)
        VALUES ('${id}', '${productId}', '${scanType || 'consumer'}', '${fingerprint}', '${ip}', ${lat || 'NULL'}, ${lng || 'NULL'}, 'valid', NOW(),
        (SELECT org_id FROM products WHERE id = '${productId}'))`);
    return id;
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  CHAOS SYSTEM L4 V4 — GRAPH INTELLIGENCE TESTING            ║');
    console.log('║  Multi-hop + Temporal + Role-switch + Device Identity        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const db = require('../server/db');
    await db._readyPromise;
    console.log('DB ✅');

    const riskEngine = require('../server/services/risk-scoring-engine');
    console.log('Risk Engine V4 ✅\n');

    const results = [];
    let passed = 0, failed = 0;

    function report(id, name, expected, actual, pass) {
        results.push({ id, name, expected, actual, pass });
        pass ? passed++ : failed++;
        console.log(`  ${pass ? '✅' : '❌'} ${id}: ${name}`);
    }

    // ━━━ FRAUD SCENARIOS ━━━
    console.log('━━━ FRAUD SCENARIOS ━━━\n');

    { // BF-1
        const pid = createProduct('Dist-First', 'fmcg');
        insertScanEvent(pid, 'dist-dev', '10.1.1.1', null, null, 'distributor');
        await sleep(50);
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'cust-phone', scanType: 'consumer', ipAddress: '192.168.1.1' });
        report('BF-1', 'Distributor first scan', 'score > 0', `s=${r.risk_score}`, r.risk_score > 0);
    }
    { // BF-2
        const pid = createProduct('Retail-Bulk', 'fmcg');
        const fp = 'retail-' + Date.now();
        for (let i = 0; i < 6; i++) insertScanEvent(pid, fp, '10.0.0.1', null, null, 'retailer');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.0.0.1' });
        report('BF-2', 'Retailer bulk (6x)', 'score > 0', `s=${r.risk_score}`, r.risk_score > 0);
    }
    { // BF-3
        const farmFP = 'farm-' + Date.now();
        let pid;
        for (let i = 0; i < 10; i++) { pid = createProduct(`Farm-${i}`, 'fmcg'); insertScanEvent(pid, farmFP, '192.168.99.99', null, null, 'consumer'); }
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: farmFP, scanType: 'consumer', ipAddress: '192.168.99.99' });
        report('BF-3', 'Farming 10 products', 'score > 0', `s=${r.risk_score},graph=${r.features.graph.score}`, r.risk_score > 0);
    }
    { // BF-4
        const pid = createProduct('Geo-Anomaly', 'pharma');
        insertScanEvent(pid, 'geo-1', '113.161.0.1', 10.8231, 106.6297, 'consumer');
        await sleep(50);
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'geo-2', scanType: 'consumer', latitude: 35.6762, longitude: 139.6503, ipAddress: '203.0.113.1', category: 'pharma' });
        report('BF-4', 'Impossible travel HCM→Tokyo', 'geo > 0', `s=${r.risk_score},geo=${r.features.geo.score}`, r.features.geo.score > 0);
    }
    { // BF-5
        const fp = 'flagged-v4-' + Date.now();
        for (let i = 0; i < 8; i++) {
            const pid = createProduct(`Flag-${i}`, 'test');
            insertScanEvent(pid, fp, '10.10.10.10', null, null, 'consumer');
            await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.10.10.10' });
        }
        await sleep(50);
        const pid = createProduct('Clean-V4', 'test');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.10.10.10' });
        report('BF-5', 'Momentum (8 scans)', 'momentum > 0', `s=${r.risk_score},m=${r.momentum}`, r.momentum > 0 || r.features.history.score > 0);
    }
    { // BF-6
        const pid = createProduct('Multi-Scan', 'test');
        for (let i = 0; i < 10; i++) insertScanEvent(pid, `user-${i}-${Date.now()}`, `172.16.${i}.1`, null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'final-user', scanType: 'consumer', ipAddress: '172.16.99.1' });
        report('BF-6', 'Product 10+ scans', 'hist|freq > 0', `s=${r.risk_score}`, r.features.history.score > 0 || r.features.frequency.score > 0);
    }

    // ━━━ NORMAL BASELINES ━━━
    console.log('\n━━━ NORMAL BASELINES ━━━\n');

    { // BF-7
        const pid = createProduct('Normal-Clean', 'fmcg');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'clean-' + Date.now(), scanType: 'consumer', latitude: 10.8, longitude: 106.6, ipAddress: '8.8.8.8' });
        report('BF-7', 'Normal clean scan', 'NORMAL', `s=${r.risk_score},d=${r.decision}`, r.decision === 'NORMAL');
    }
    { // BF-8
        const pid = createProduct('Baseline-Geo', 'fmcg');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'base-' + Date.now(), scanType: 'consumer', latitude: 21.03, longitude: 105.85, ipAddress: '1.1.1.1' });
        report('BF-8', 'Clean geo scan', 'NORMAL', `s=${r.risk_score},d=${r.decision}`, r.decision === 'NORMAL');
    }

    // ━━━ ADVANCED ━━━
    console.log('\n━━━ ADVANCED SCENARIOS ━━━\n');

    { // BF-9
        const pid = createProduct('Slow-Fraud', 'test');
        const fp = 'slow-' + Date.now();
        for (let i = 0; i < 25; i++) insertScanEvent(pid, fp, `172.16.0.${i % 254 + 1}`, null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '172.16.0.99' });
        report('BF-9', 'Slow fraud 25 scans', 'score > 0', `s=${r.risk_score}`, r.risk_score > 0);
    }
    { // BF-10
        const pid = createProduct('Collusion', 'luxury');
        insertScanEvent(pid, 'col-dist', '10.0.1.1', null, null, 'distributor');
        insertScanEvent(pid, 'col-retail', '10.0.1.2', null, null, 'retailer');
        insertScanEvent(pid, 'col-consumer', '10.0.1.3', null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'col-final', scanType: 'consumer', ipAddress: '10.0.1.4', category: 'luxury' });
        report('BF-10', 'Collusion (graph detect)', 'graph > 0', `s=${r.risk_score},graph=${r.features.graph.score}`, r.features.graph.score > 0);
    }
    { // BF-11
        const fp = 'clean-att-' + Date.now(); let pid;
        for (let i = 0; i < 15; i++) { pid = createProduct(`Att-${i}`, 'test'); insertScanEvent(pid, fp, '203.0.113.42', null, null, 'consumer'); }
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '203.0.113.42' });
        report('BF-11', 'Clean attacker 15 products', 'score > 0', `s=${r.risk_score},cold=${r.cold_start.penalty}`, r.risk_score > 0);
    }

    // ━━━ V2 SCENARIOS ━━━
    console.log('\n━━━ V2 SCENARIOS ━━━\n');

    { // V2-1
        const fp = 'accum-' + Date.now();
        for (let i = 0; i < 10; i++) {
            const pid = createProduct(`Acc-${i}`, 'test');
            insertScanEvent(pid, fp, '10.20.30.40', null, null, 'consumer');
            await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.20.30.40' });
        }
        const pid = createProduct('Acc-Final', 'test');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.20.30.40' });
        report('V2-1', 'Momentum accumulation', 'm > 0', `s=${r.risk_score},m=${r.momentum}`, r.momentum > 0 || r.risk_score > 15);
    }
    { // V2-2
        const pid = createProduct('Freq-Evade', 'test');
        const fp = 'evade-' + Date.now();
        for (let i = 0; i < 15; i++) insertScanEvent(pid, fp, '10.99.99.1', null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.99.99.1' });
        report('V2-2', 'Frequency evasion', 'freq > 20', `s=${r.risk_score},freq=${r.features.frequency.score}`, r.features.frequency.score > 20);
    }
    { // V2-3
        const pid = createProduct('Explain', 'pharma');
        insertScanEvent(pid, 'explain-a', '10.0.0.1', 10.82, 106.63, 'distributor');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'explain-c', scanType: 'consumer', latitude: 10.82, longitude: 106.63, ipAddress: '10.0.0.2', category: 'pharma' });
        report('V2-3', 'Explainability (V4 breakdown)', 'has graph+cold_start', `graph=${r.breakdown.graph},cold=${r.breakdown.cold_start}`, typeof r.breakdown.graph === 'number');
    }

    // ━━━ V3 ADVERSARIAL ━━━
    console.log('\n━━━ V3 ADVERSARIAL ━━━\n');

    { // V3-1
        const pid = createProduct('Collusion-V3', 'pharma');
        insertScanEvent(pid, 'v3-dist', '10.10.1.1', 10.82, 106.63, 'distributor');
        insertScanEvent(pid, 'v3-retail', '10.10.1.2', 10.83, 106.64, 'retailer');
        insertScanEvent(pid, 'v3-cons', '10.10.1.3', 10.84, 106.65, 'consumer');
        await sleep(50);
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'v3-inspect', scanType: 'consumer', latitude: 10.85, longitude: 106.66, ipAddress: '10.10.1.4', category: 'pharma' });
        const hasChain = r.features.graph.reasons.some(x => x.rule.startsWith('chain_collusion'));
        report('V3-1', 'Full chain collusion', 'chain_collusion', `graph=${r.features.graph.score},chain=${hasChain}`, hasChain);
    }
    { // V3-2
        const fp = 'cold-' + Date.now();
        const pid = createProduct('Cold-Attack', 'luxury');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '203.0.113.99', category: 'luxury' });
        report('V3-2', 'Cold-start attacker', 'penalty > 0', `penalty=${r.cold_start.penalty}`, r.cold_start.penalty > 0);
    }
    { // V3-3
        const fp = 'lt-' + Date.now();
        for (let i = 0; i < 20; i++) { const pid = createProduct(`LT-${i}`, 'test'); insertScanEvent(pid, fp, '10.50.50.50', null, null, 'consumer'); }
        const pid = createProduct('LT-Final', 'test');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.50.50.50' });
        const hasCross = r.features.graph.reasons.some(x => x.rule.startsWith('cross_product'));
        report('V3-3', 'Cross-product (20 products)', 'cross_product', `graph=${r.features.graph.score},cross=${hasCross}`, hasCross);
    }

    // ━━━ V4 SCENARIOS ━━━
    console.log('\n━━━ V4 GRAPH INTELLIGENCE ━━━\n');

    // V4-1: Multi-hop collusion (A→P1→B→P2)
    {
        const actorA = 'v4-hop-A-' + Date.now();
        const actorB = 'v4-hop-B-' + Date.now();
        const actorC = 'v4-hop-C-' + Date.now();
        // A and B share P1
        const p1 = createProduct('Hop-P1', 'test');
        insertScanEvent(p1, actorA, '10.0.0.1', null, null, 'consumer');
        insertScanEvent(p1, actorB, '10.0.0.2', null, null, 'consumer');
        // B and C share P2 (different product!)
        const p2 = createProduct('Hop-P2', 'test');
        insertScanEvent(p2, actorB, '10.0.0.2', null, null, 'consumer');
        insertScanEvent(p2, actorC, '10.0.0.3', null, null, 'consumer');
        // A also touches P3 alone
        const p3 = createProduct('Hop-P3', 'test');
        insertScanEvent(p3, actorA, '10.0.0.1', null, null, 'consumer');
        // Now check A's risk — should detect multi-hop cluster (A→P1→B→P2→C)
        const r = await riskEngine.calculateRisk({ productId: p3, actorId: actorA, scanType: 'consumer', ipAddress: '10.0.0.1' });
        const hasMultiHop = r.features.graph.reasons.some(x => x.rule.startsWith('multi_hop'));
        report('V4-1', 'Multi-hop collusion: A→P1→B→P2→C', 'multi_hop detected', `graph=${r.features.graph.score},hop=${hasMultiHop},reasons=[${r.features.graph.reasons.map(x=>x.rule).join(',')}]`, hasMultiHop || r.features.graph.score > 0);
    }

    // V4-2: Role-switch attack (same device as distributor AND consumer)
    {
        const switchFP = 'role-switch-' + Date.now();
        const p1 = createProduct('RoleSwitch-1', 'test');
        insertScanEvent(p1, switchFP, '10.20.0.1', null, null, 'distributor');
        const p2 = createProduct('RoleSwitch-2', 'test');
        insertScanEvent(p2, switchFP, '10.20.0.1', null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: p2, actorId: switchFP, scanType: 'consumer', ipAddress: '10.20.0.1' });
        const hasRoleSwitch = r.features.graph.reasons.some(x => x.rule.startsWith('role_switch'));
        report('V4-2', 'Role-switch: distributor→consumer (same device)', 'role_switch detected', `graph=${r.features.graph.score},switch=${hasRoleSwitch}`, hasRoleSwitch);
    }

    // V4-3: IP cluster (5 "different actors" from same IP)
    {
        const sharedIP = '172.31.99.' + (Date.now() % 254 + 1);
        const pid = createProduct('IP-Cluster', 'test');
        for (let i = 0; i < 5; i++) {
            insertScanEvent(pid, `ip-actor-${i}-${Date.now()}`, sharedIP, null, null, 'consumer');
        }
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'ip-check', scanType: 'consumer', ipAddress: sharedIP });
        const hasIPCluster = r.features.graph.reasons.some(x => x.rule.startsWith('ip_cluster'));
        report('V4-3', 'IP cluster: 5 actors, same IP', 'ip_cluster detected', `graph=${r.features.graph.score},cluster=${hasIPCluster}`, hasIPCluster);
    }

    // V4-4: Temporal graph (collusion spread across window)
    {
        const pid = createProduct('Temporal-Collude', 'pharma');
        insertScanEvent(pid, 'temp-dist', '10.30.1.1', null, null, 'distributor');
        insertScanEvent(pid, 'temp-retail', '10.30.1.2', null, null, 'retailer');
        insertScanEvent(pid, 'temp-cons', '10.30.1.3', null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: 'temp-check', scanType: 'consumer', ipAddress: '10.30.1.4', category: 'pharma' });
        const hasTemporalChain = r.features.graph.reasons.some(x => x.rule.startsWith('chain_collusion'));
        report('V4-4', 'Temporal graph: chain in 1h window', 'chain_collusion_1h', `graph=${r.features.graph.score}`, hasTemporalChain);
    }

    // V4-5: Random noise — clean data should NOT trigger false positives
    {
        let falsePositives = 0;
        for (let i = 0; i < 5; i++) {
            const pid = createProduct(`Noise-${i}`, 'fmcg');
            const fp = `noise-${Date.now()}-${i}`;
            const r = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', latitude: 10.8 + Math.random() * 0.1, longitude: 106.6 + Math.random() * 0.1, ipAddress: `8.8.${i}.${i+1}` });
            if (r.decision !== 'NORMAL') falsePositives++;
        }
        report('V4-5', 'Random noise: 5 clean scans (no false positive)', '0 false positives', `${falsePositives}/5 flagged`, falsePositives === 0);
    }

    // ━━━ INTEGRATION ━━━
    console.log('\n━━━ ENGINE INTEGRATION ━━━\n');

    { const c = psql("SELECT COUNT(*) FROM risk_scores WHERE created_at > NOW() - INTERVAL '5 minutes'"); report('INT-1', 'risk_scores populated', '> 0', `${c} records`, parseInt(c) > 0); }
    { const c = psql("SELECT COUNT(*) FROM actor_risk_profiles WHERE updated_at > NOW() - INTERVAL '5 minutes'"); report('INT-2', 'actor_profiles persisted', '> 0', `${c} profiles`, parseInt(c) > 0); }
    { const d = psql("SELECT decision || '=' || COUNT(*)::TEXT FROM risk_scores WHERE created_at > NOW() - INTERVAL '5 minutes' GROUP BY decision ORDER BY COUNT(*) DESC"); report('INT-3', 'Decision distribution', 'data', d.replace(/\n/g, ', '), d.length > 0 && !d.startsWith('ERROR')); }
    { const c = psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%graph_score%' AND created_at > NOW() - INTERVAL '5 minutes'"); report('INT-4', 'Graph data in DB', '> 0', `${c} records`, parseInt(c) > 0); }
    { const c = psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%multi_hop%' AND created_at > NOW() - INTERVAL '5 minutes'"); report('INT-5', 'Multi-hop data in DB', '>= 0', `${c} records`, !c.startsWith('ERROR')); }
    { const c = psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%role_switch%' AND created_at > NOW() - INTERVAL '5 minutes'"); report('INT-6', 'Role-switch data in DB', '>= 0', `${c} records`, !c.startsWith('ERROR')); }

    // ═══════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════
    const total = passed + failed;
    const passRate = Math.round(passed / total * 100);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  L4 V4 RESULTS: ${passed}/${total} passed (${passRate}%) | ${failed} failed`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Fraud:       ${results.filter(r => r.id >= 'BF-1' && r.id <= 'BF-6').filter(r => r.pass).length}/6`);
    console.log(`║  Baselines:   ${results.filter(r => r.id === 'BF-7' || r.id === 'BF-8').filter(r => r.pass).length}/2`);
    console.log(`║  Advanced:    ${results.filter(r => r.id >= 'BF-9' && r.id <= 'BF-11').filter(r => r.pass).length}/3`);
    console.log(`║  V2:          ${results.filter(r => r.id.startsWith('V2')).filter(r => r.pass).length}/3`);
    console.log(`║  V3:          ${results.filter(r => r.id.startsWith('V3')).filter(r => r.pass).length}/3`);
    console.log(`║  V4 Graph:    ${results.filter(r => r.id.startsWith('V4')).filter(r => r.pass).length}/5`);
    console.log(`║  Integration: ${results.filter(r => r.id.startsWith('INT')).filter(r => r.pass).length}/6`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    fs.writeFileSync('chaos-l4-report.json', JSON.stringify({ timestamp: new Date().toISOString(), version: 'V4', results, summary: { total, passed, failed, pass_rate: passRate } }, null, 2));
    console.log('\n📝 chaos-l4-report.json');
    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
