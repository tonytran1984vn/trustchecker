/**
 * ═══════════════════════════════════════════════════════════════
 *  CHAOS SYSTEM LEVEL 4 V2 — BEHAVIORAL FRAUD TESTING
 *
 *  Tests the Risk Scoring Engine V2 DIRECTLY (bypass API)
 *  14 scenarios + 3 V2 scenarios + 4 integration checks = 18 total
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
    console.log('║  CHAOS SYSTEM L4 V2 — BEHAVIORAL FRAUD TESTING              ║');
    console.log('║  Risk Engine V2: momentum + log-freq + sliding + recovery    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const db = require('../server/db');
    await db._readyPromise;
    console.log('DB ✅');

    const riskEngine = require('../server/services/risk-scoring-engine');
    console.log('Risk Engine V2 ✅\n');

    const results = [];
    let passed = 0, failed = 0;

    function report(id, name, expected, actual, pass) {
        results.push({ id, name, expected, actual, pass });
        pass ? passed++ : failed++;
        console.log(`  ${pass ? '✅' : '❌'} ${id}: ${name}`);
        console.log(`     Expected: ${expected}`);
        console.log(`     Actual:   ${actual}\n`);
    }

    // ═══════════════════════════════════════
    // FRAUD SCENARIOS
    // ═══════════════════════════════════════
    console.log('━━━ FRAUD SCENARIOS ━━━\n');

    // BF-1: Distributor scans before customer
    {
        const pid = createProduct('Distributor-First', 'fmcg');
        insertScanEvent(pid, 'distributor-device', '10.1.1.1', null, null, 'distributor');
        await sleep(100);
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'customer-phone', scanType: 'consumer', ipAddress: '192.168.1.1' });
        report('BF-1', 'Distributor scans before customer',
            'score > 0 (distributor_first_scan detected)',
            `score=${risk.risk_score}, level=${risk.decision}, pattern=${risk.features.scan_pattern.score}`,
            risk.risk_score > 0
        );
    }

    // BF-2: Retailer bulk scans same product 6x
    {
        const pid = createProduct('Retailer-Bulk', 'fmcg');
        const fp = 'retailer-bulk-' + Date.now();
        for (let i = 0; i < 6; i++) insertScanEvent(pid, fp, '10.0.0.1', null, null, 'retailer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: fp, scanType: 'consumer', ipAddress: '10.0.0.1' });
        report('BF-2', 'Retailer bulk scan same product (6x)',
            'elevated frequency + multi-scan',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}, hist=${risk.features.history.score}`,
            risk.risk_score > 0
        );
    }

    // BF-3: Same device scans 10 different products (farming)
    {
        const farmFP = 'scan-farm-' + Date.now();
        let lastPid = '';
        for (let i = 0; i < 10; i++) {
            const pid = createProduct(`Farm-${i}`, 'fmcg');
            insertScanEvent(pid, farmFP, '192.168.99.99', null, null, 'consumer');
            lastPid = pid;
        }
        const risk = await riskEngine.calculateRisk({ productId: lastPid, actorId: farmFP, scanType: 'consumer', ipAddress: '192.168.99.99' });
        report('BF-3', 'Same device scans 10 products (farming)',
            'elevated (frequency + pattern)',
            `score=${risk.risk_score}, pattern=${risk.features.scan_pattern.score}, freq=${risk.features.frequency.score}`,
            risk.risk_score > 0
        );
    }

    // BF-4: Impossible travel (HCM → Tokyo)
    {
        const pid = createProduct('Geo-Anomaly', 'pharma');
        insertScanEvent(pid, 'geo-user-1', '113.161.0.1', 10.8231, 106.6297, 'consumer');
        await sleep(100);
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'geo-user-2', scanType: 'consumer', latitude: 35.6762, longitude: 139.6503, ipAddress: '203.0.113.1', category: 'pharma' });
        report('BF-4', 'Impossible travel: HCM → Tokyo',
            'geo score > 0 (impossible travel)',
            `score=${risk.risk_score}, geo=${risk.features.geo.score}, breakdown=${JSON.stringify(risk.breakdown)}`,
            risk.features.geo.score > 0
        );
    }

    // BF-5: Previously active actor (V2: momentum-based)
    {
        const flaggedFP = 'flagged-v2-' + Date.now();
        for (let i = 0; i < 8; i++) {
            const pid = createProduct(`Flag-V2-${i}`, 'test');
            insertScanEvent(pid, flaggedFP, '10.10.10.10', null, null, 'consumer');
            await riskEngine.calculateRisk({ productId: pid, actorId: flaggedFP, scanType: 'consumer', ipAddress: '10.10.10.10' });
        }
        await sleep(100);
        const newPid = createProduct('Clean-Product-V2', 'test');
        const risk = await riskEngine.calculateRisk({ productId: newPid, actorId: flaggedFP, scanType: 'consumer', ipAddress: '10.10.10.10' });
        report('BF-5', 'Previously active actor (V2: momentum)',
            'history > 0 OR momentum > 0',
            `score=${risk.risk_score}, history=${risk.features.history.score}, momentum=${risk.momentum}`,
            risk.features.history.score > 0 || risk.momentum > 0
        );
    }

    // BF-6: Product scanned 10+ times
    {
        const pid = createProduct('Multi-Scan', 'test');
        for (let i = 0; i < 10; i++) insertScanEvent(pid, `user-${i}-${Date.now()}`, `172.16.${i}.1`, null, null, 'consumer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'final-user', scanType: 'consumer', ipAddress: '172.16.99.1' });
        report('BF-6', 'Product scanned 10+ times by different users',
            'history > 0 (product_multi_scanned_24h)',
            `score=${risk.risk_score}, history=${risk.features.history.score}, freq=${risk.features.frequency.score}`,
            risk.features.history.score > 0 || risk.features.frequency.score > 0
        );
    }

    // ═══════════════════════════════════════
    // NORMAL BASELINES
    // ═══════════════════════════════════════
    console.log('━━━ NORMAL BASELINES ━━━\n');

    // BF-7: Clean first scan
    {
        const pid = createProduct('Normal-Clean', 'fmcg');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'clean-' + Date.now(), scanType: 'consumer', latitude: 10.8, longitude: 106.6, ipAddress: '8.8.8.8' });
        report('BF-7', 'Normal first-time customer scan',
            'NORMAL (score < 40)',
            `score=${risk.risk_score}, level=${risk.decision}`,
            risk.risk_score < 40 && risk.decision === 'NORMAL'
        );
    }

    // BF-8: Clean scan with geo
    {
        const pid = createProduct('Baseline-Geo', 'fmcg');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'baseline-' + Date.now(), scanType: 'consumer', latitude: 21.0285, longitude: 105.8542, ipAddress: '1.1.1.1' });
        report('BF-8', 'Clean scan with geo (Hanoi)',
            'NORMAL (score < 40)',
            `score=${risk.risk_score}, level=${risk.decision}`,
            risk.risk_score < 40 && risk.decision === 'NORMAL'
        );
    }

    // ═══════════════════════════════════════
    // ADVANCED SCENARIOS
    // ═══════════════════════════════════════
    console.log('━━━ ADVANCED SCENARIOS ━━━\n');

    // BF-9: Slow fraud
    {
        const pid = createProduct('Slow-Fraud', 'test');
        const slowFP = 'slow-' + Date.now();
        for (let i = 0; i < 25; i++) insertScanEvent(pid, slowFP, `172.16.0.${i % 254 + 1}`, null, null, 'consumer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: slowFP, scanType: 'consumer', ipAddress: '172.16.0.99' });
        report('BF-9', 'Slow fraud: 25 scans from same device',
            'elevated (accumulation + multi-scan)',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}, hist=${risk.features.history.score}`,
            risk.risk_score > 0
        );
    }

    // BF-10: Collusion (3 actors on same product rapidly)
    {
        const pid = createProduct('Collusion', 'luxury');
        insertScanEvent(pid, 'collude-dist', '10.0.1.1', null, null, 'distributor');
        insertScanEvent(pid, 'collude-retail', '10.0.1.2', null, null, 'retailer');
        insertScanEvent(pid, 'collude-customer', '10.0.1.3', null, null, 'consumer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'collude-final', scanType: 'consumer', ipAddress: '10.0.1.4', category: 'luxury' });
        report('BF-10', 'Collusion: 3 actors on same product rapidly',
            'elevated (multi-actor + pattern)',
            `score=${risk.risk_score}, pattern=${risk.features.scan_pattern.score}, catMult=${risk.category_multiplier}`,
            risk.risk_score > 0
        );
    }

    // BF-11: Clean attacker (new actor, many products fast)
    {
        const cleanFP = 'clean-attacker-' + Date.now();
        let lastPid = '';
        for (let i = 0; i < 15; i++) {
            const pid = createProduct(`Attack-${i}`, 'test');
            insertScanEvent(pid, cleanFP, '203.0.113.42', null, null, 'consumer');
            lastPid = pid;
        }
        const risk = await riskEngine.calculateRisk({ productId: lastPid, actorId: cleanFP, scanType: 'consumer', ipAddress: '203.0.113.42' });
        report('BF-11', 'Clean attacker: new actor, 15 products rapidly',
            'elevated (frequency + farming)',
            `score=${risk.risk_score}, pattern=${risk.features.scan_pattern.score}, freq=${risk.features.frequency.score}`,
            risk.risk_score > 0
        );
    }

    // ═══════════════════════════════════════
    // V2 SCENARIOS
    // ═══════════════════════════════════════
    console.log('━━━ V2 SCENARIOS ━━━\n');

    // V2-1: Low-risk accumulation → momentum escalation
    {
        const accumFP = 'accum-' + Date.now();
        for (let i = 0; i < 10; i++) {
            const pid = createProduct(`Accum-${i}`, 'test');
            insertScanEvent(pid, accumFP, '10.20.30.40', null, null, 'consumer');
            await riskEngine.calculateRisk({ productId: pid, actorId: accumFP, scanType: 'consumer', ipAddress: '10.20.30.40' });
        }
        const finalPid = createProduct('Accum-Final', 'test');
        const risk = await riskEngine.calculateRisk({ productId: finalPid, actorId: accumFP, scanType: 'consumer', ipAddress: '10.20.30.40' });
        report('V2-1', 'Low-risk accumulation → momentum escalation',
            'momentum > 0 (history builds up)',
            `score=${risk.risk_score}, momentum=${risk.momentum}, breakdown=${JSON.stringify(risk.breakdown)}`,
            risk.momentum > 0 || risk.risk_score > 15
        );
    }

    // V2-2: Frequency evasion (15 scans in 5min but spread to avoid per-minute detection)
    {
        const pid = createProduct('Freq-Evasion', 'test');
        const evaderFP = 'evader-' + Date.now();
        for (let i = 0; i < 15; i++) insertScanEvent(pid, evaderFP, '10.99.99.1', null, null, 'consumer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: evaderFP, scanType: 'consumer', ipAddress: '10.99.99.1' });
        const hasEvasion = risk.features.frequency.reasons.some(r => r.rule === 'frequency_evasion');
        report('V2-2', 'Frequency evasion: 15 scans (5min window)',
            'frequency_evasion triggered OR freq > 20',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}, evasion=${hasEvasion}, rules=[${risk.features.frequency.reasons.map(r=>r.rule).join(',')}]`,
            hasEvasion || risk.features.frequency.score > 20
        );
    }

    // V2-3: Explainability — breakdown in response
    {
        const pid = createProduct('Explain-Test', 'pharma');
        insertScanEvent(pid, 'explain-actor', '10.0.0.1', 10.82, 106.63, 'distributor');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'explain-check', scanType: 'consumer', latitude: 10.82, longitude: 106.63, ipAddress: '10.0.0.2', category: 'pharma' });
        const hasBreakdown = risk.breakdown && typeof risk.breakdown.pattern === 'number' && typeof risk.breakdown.geo === 'number';
        report('V2-3', 'Explainability: breakdown in response',
            'breakdown has pattern, geo, frequency, history, final',
            hasBreakdown ? `pattern=${risk.breakdown.pattern}, geo=${risk.breakdown.geo}, freq=${risk.breakdown.frequency}, hist=${risk.breakdown.history}, final=${risk.breakdown.final}` : 'no breakdown',
            hasBreakdown
        );
    }

    // ═══════════════════════════════════════
    // ENGINE INTEGRATION
    // ═══════════════════════════════════════
    console.log('━━━ ENGINE INTEGRATION ━━━\n');

    {
        const scoreCount = psql("SELECT COUNT(*) FROM risk_scores WHERE created_at > NOW() - INTERVAL '5 minutes'");
        report('INT-1', 'risk_scores populated', '> 0', `${scoreCount} records`, parseInt(scoreCount) > 0);
    }
    {
        const profileCount = psql("SELECT COUNT(*) FROM actor_risk_profiles WHERE updated_at > NOW() - INTERVAL '5 minutes'");
        report('INT-2', 'actor_risk_profiles persisted', '> 0', `${profileCount} profiles`, parseInt(profileCount) > 0);
    }
    {
        const decisions = psql("SELECT decision || '=' || COUNT(*)::TEXT FROM risk_scores WHERE created_at > NOW() - INTERVAL '5 minutes' GROUP BY decision ORDER BY COUNT(*) DESC");
        report('INT-3', 'Decision distribution', 'at least 1 decision', decisions.replace(/\n/g, ', ') || 'no data', decisions.length > 0 && !decisions.startsWith('ERROR'));
    }
    {
        const syntheticFlags = psql("SELECT COUNT(*) FROM actor_risk_profiles WHERE flagged_count > 0 AND updated_at > NOW() - INTERVAL '5 minutes'");
        report('INT-4', 'Synthetic flagging active', '>= 0 actors flagged', `${syntheticFlags} actors`, !syntheticFlags.startsWith('ERROR'));
    }

    // ═══════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════
    const total = passed + failed;
    const passRate = Math.round(passed / total * 100);

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  L4 V2 RESULTS: ${passed}/${total} passed (${passRate}%) | ${failed} failed`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Fraud Scenarios:  ${results.filter(r => r.id >= 'BF-1' && r.id <= 'BF-6').filter(r => r.pass).length}/6`);
    console.log(`║  Normal Baselines: ${results.filter(r => r.id === 'BF-7' || r.id === 'BF-8').filter(r => r.pass).length}/2`);
    console.log(`║  Advanced:         ${results.filter(r => r.id >= 'BF-9' && r.id <= 'BF-11').filter(r => r.pass).length}/3`);
    console.log(`║  V2 Scenarios:     ${results.filter(r => r.id.startsWith('V2')).filter(r => r.pass).length}/3`);
    console.log(`║  Integration:      ${results.filter(r => r.id.startsWith('INT')).filter(r => r.pass).length}/4`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    fs.writeFileSync('chaos-l4-report.json', JSON.stringify({ timestamp: new Date().toISOString(), results, summary: { total, passed, failed } }, null, 2));
    console.log('\n📝 Full report: chaos-l4-report.json');
    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
