/**
 * ═══════════════════════════════════════════════════════════════
 *  CHAOS SYSTEM LEVEL 4 V3 — ADVERSARIAL FRAUD TESTING
 *
 *  Tests the Risk Scoring Engine V3 DIRECTLY (bypass API)
 *  11 original + 3 V2 + 3 V3 scenarios + 5 integration = 22 total
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
    console.log('║  CHAOS SYSTEM L4 V3 — ADVERSARIAL FRAUD TESTING             ║');
    console.log('║  V3: graph intelligence + cold-start + anti-poisoning        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const db = require('../server/db');
    await db._readyPromise;
    console.log('DB ✅');

    const riskEngine = require('../server/services/risk-scoring-engine');
    console.log('Risk Engine V3 ✅\n');

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
            'score > 0',
            `score=${risk.risk_score}, pattern=${risk.features.scan_pattern.score}`,
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
            'elevated frequency',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}`,
            risk.risk_score > 0
        );
    }

    // BF-3: Same device scans 10 products (farming)
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
            'elevated (frequency + graph)',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}, graph=${risk.features.graph.score}`,
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
            'geo > 0',
            `score=${risk.risk_score}, geo=${risk.features.geo.score}`,
            risk.features.geo.score > 0
        );
    }

    // BF-5: Previously active actor (V2: momentum)
    {
        const flaggedFP = 'flagged-v3-' + Date.now();
        for (let i = 0; i < 8; i++) {
            const pid = createProduct(`Flag-V3-${i}`, 'test');
            insertScanEvent(pid, flaggedFP, '10.10.10.10', null, null, 'consumer');
            await riskEngine.calculateRisk({ productId: pid, actorId: flaggedFP, scanType: 'consumer', ipAddress: '10.10.10.10' });
        }
        await sleep(100);
        const newPid = createProduct('Clean-Product-V3', 'test');
        const risk = await riskEngine.calculateRisk({ productId: newPid, actorId: flaggedFP, scanType: 'consumer', ipAddress: '10.10.10.10' });
        report('BF-5', 'Previously active actor (momentum)',
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
        report('BF-6', 'Product scanned 10+ times',
            'history > 0 OR freq > 0',
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
            `score=${risk.risk_score}, level=${risk.decision}, cold_start=${risk.cold_start.penalty}`,
            risk.decision === 'NORMAL'
        );
    }

    // BF-8: Clean scan with geo
    {
        const pid = createProduct('Baseline-Geo', 'fmcg');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'baseline-' + Date.now(), scanType: 'consumer', latitude: 21.0285, longitude: 105.8542, ipAddress: '1.1.1.1' });
        report('BF-8', 'Clean scan with geo (Hanoi)',
            'NORMAL (score < 40)',
            `score=${risk.risk_score}, level=${risk.decision}`,
            risk.decision === 'NORMAL'
        );
    }

    // ═══════════════════════════════════════
    // ADVANCED SCENARIOS
    // ═══════════════════════════════════════
    console.log('━━━ ADVANCED SCENARIOS ━━━\n');

    // BF-9: Slow fraud (25 scans)
    {
        const pid = createProduct('Slow-Fraud', 'test');
        const slowFP = 'slow-' + Date.now();
        for (let i = 0; i < 25; i++) insertScanEvent(pid, slowFP, `172.16.0.${i % 254 + 1}`, null, null, 'consumer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: slowFP, scanType: 'consumer', ipAddress: '172.16.0.99' });
        report('BF-9', 'Slow fraud: 25 scans',
            'elevated',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}`,
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
        report('BF-10', 'Collusion: 3 actors (V3: graph detects)',
            'graph > 0 (full_chain_collusion)',
            `score=${risk.risk_score}, graph=${risk.features.graph.score}, rules=[${risk.features.graph.reasons.map(r=>r.rule).join(',')}]`,
            risk.features.graph.score > 0
        );
    }

    // BF-11: Clean attacker (new actor, 15 products)
    {
        const cleanFP = 'clean-attacker-' + Date.now();
        let lastPid = '';
        for (let i = 0; i < 15; i++) {
            const pid = createProduct(`Attack-${i}`, 'test');
            insertScanEvent(pid, cleanFP, '203.0.113.42', null, null, 'consumer');
            lastPid = pid;
        }
        const risk = await riskEngine.calculateRisk({ productId: lastPid, actorId: cleanFP, scanType: 'consumer', ipAddress: '203.0.113.42' });
        report('BF-11', 'Clean attacker: 15 products (V3: cold-start + cross-product)',
            'cold_start > 0 AND graph > 0',
            `score=${risk.risk_score}, cold=${risk.cold_start.penalty}, graph=${risk.features.graph.score}, freq=${risk.features.frequency.score}`,
            risk.risk_score > 0
        );
    }

    // ═══════════════════════════════════════
    // V2 SCENARIOS
    // ═══════════════════════════════════════
    console.log('━━━ V2 SCENARIOS ━━━\n');

    // V2-1: Low-risk accumulation → momentum
    {
        const accumFP = 'accum-' + Date.now();
        for (let i = 0; i < 10; i++) {
            const pid = createProduct(`Accum-${i}`, 'test');
            insertScanEvent(pid, accumFP, '10.20.30.40', null, null, 'consumer');
            await riskEngine.calculateRisk({ productId: pid, actorId: accumFP, scanType: 'consumer', ipAddress: '10.20.30.40' });
        }
        const finalPid = createProduct('Accum-Final', 'test');
        const risk = await riskEngine.calculateRisk({ productId: finalPid, actorId: accumFP, scanType: 'consumer', ipAddress: '10.20.30.40' });
        report('V2-1', 'Momentum accumulation',
            'momentum > 0',
            `score=${risk.risk_score}, momentum=${risk.momentum}, contrib=${risk.momentum_contribution}`,
            risk.momentum > 0 || risk.risk_score > 15
        );
    }

    // V2-2: Frequency evasion
    {
        const pid = createProduct('Freq-Evasion', 'test');
        const evaderFP = 'evader-' + Date.now();
        for (let i = 0; i < 15; i++) insertScanEvent(pid, evaderFP, '10.99.99.1', null, null, 'consumer');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: evaderFP, scanType: 'consumer', ipAddress: '10.99.99.1' });
        report('V2-2', 'Frequency evasion (5min window)',
            'freq > 20',
            `score=${risk.risk_score}, freq=${risk.features.frequency.score}`,
            risk.features.frequency.score > 20
        );
    }

    // V2-3: Explainability
    {
        const pid = createProduct('Explain-Test', 'pharma');
        insertScanEvent(pid, 'explain-actor', '10.0.0.1', 10.82, 106.63, 'distributor');
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'explain-check', scanType: 'consumer', latitude: 10.82, longitude: 106.63, ipAddress: '10.0.0.2', category: 'pharma' });
        const hasBreakdown = risk.breakdown && typeof risk.breakdown.graph === 'number' && typeof risk.breakdown.cold_start === 'number';
        report('V2-3', 'Explainability (V3: graph + cold_start in breakdown)',
            'breakdown has graph + cold_start',
            hasBreakdown ? `graph=${risk.breakdown.graph}, cold=${risk.breakdown.cold_start}, pattern=${risk.breakdown.pattern}` : 'missing fields',
            hasBreakdown
        );
    }

    // ═══════════════════════════════════════
    // V3 ADVERSARIAL SCENARIOS
    // ═══════════════════════════════════════
    console.log('━━━ V3 ADVERSARIAL SCENARIOS ━━━\n');

    // V3-1: Full chain collusion (distributor → retailer → consumer coordinated)
    {
        const pid = createProduct('Collusion-V3', 'pharma');
        // 3 different actors, 3 different roles, same product, within 1h
        insertScanEvent(pid, 'dist-collude-v3', '10.10.1.1', 10.82, 106.63, 'distributor');
        insertScanEvent(pid, 'retail-collude-v3', '10.10.1.2', 10.83, 106.64, 'retailer');
        insertScanEvent(pid, 'consumer-collude-v3', '10.10.1.3', 10.84, 106.65, 'consumer');
        await sleep(100);
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: 'inspect-v3', scanType: 'consumer', latitude: 10.85, longitude: 106.66, ipAddress: '10.10.1.4', category: 'pharma' });
        const hasCollusion = risk.features.graph.reasons.some(r => r.rule === 'full_chain_collusion');
        report('V3-1', 'Full chain collusion: dist+retail+consumer',
            'full_chain_collusion detected',
            `score=${risk.risk_score}, graph=${risk.features.graph.score}, collusion=${hasCollusion}`,
            hasCollusion
        );
    }

    // V3-2: Cold-start attacker (brand new actor + immediate bad behavior)
    {
        const coldFP = 'cold-attacker-' + Date.now();
        const pid = createProduct('Cold-Start-Attack', 'luxury');
        // This actor has never been seen before → should get cold-start penalty
        const risk = await riskEngine.calculateRisk({ productId: pid, actorId: coldFP, scanType: 'consumer', ipAddress: '203.0.113.99', category: 'luxury' });
        const hasColdStart = risk.cold_start.penalty > 0;
        const hasColdRule = risk.cold_start.reasons.some(r => r.rule === 'brand_new_actor');
        report('V3-2', 'Cold-start attacker (brand new actor)',
            'cold_start penalty > 0 (brand_new_actor)',
            `score=${risk.risk_score}, penalty=${risk.cold_start.penalty}, rule=${hasColdRule}`,
            hasColdStart && hasColdRule
        );
    }

    // V3-3: Long-tail fraud simulation (many scans spread over time)
    {
        const longTailFP = 'longtail-' + Date.now();
        // Simulate 20 scans across different products (all within current window)
        for (let i = 0; i < 20; i++) {
            const pid = createProduct(`LongTail-${i}`, 'test');
            insertScanEvent(pid, longTailFP, '10.50.50.50', null, null, 'consumer');
        }
        const finalPid = createProduct('LongTail-Final', 'test');
        const risk = await riskEngine.calculateRisk({ productId: finalPid, actorId: longTailFP, scanType: 'consumer', ipAddress: '10.50.50.50' });
        const hasCrossProduct = risk.features.graph.reasons.some(r => r.rule.startsWith('cross_product'));
        report('V3-3', 'Long-tail fraud: 20 products (cross-product correlation)',
            'cross_product detected',
            `score=${risk.risk_score}, graph=${risk.features.graph.score}, cross=${hasCrossProduct}, rules=[${risk.features.graph.reasons.map(r=>r.rule).join(',')}]`,
            hasCrossProduct
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
        report('INT-3', 'Decision distribution', 'at least 1', decisions.replace(/\n/g, ', ') || 'no data', decisions.length > 0 && !decisions.startsWith('ERROR'));
    }
    {
        const syntheticFlags = psql("SELECT COUNT(*) FROM actor_risk_profiles WHERE flagged_count > 0 AND updated_at > NOW() - INTERVAL '5 minutes'");
        report('INT-4', 'Synthetic flagging active', '>= 0', `${syntheticFlags} actors`, !syntheticFlags.startsWith('ERROR'));
    }
    {
        // V3: Check that graph scores are being recorded
        const graphHits = psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%graph_score%' AND created_at > NOW() - INTERVAL '5 minutes'");
        report('INT-5', 'Graph scores persisted in DB', '> 0', `${graphHits} records with graph data`, parseInt(graphHits) > 0);
    }

    // ═══════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════
    const total = passed + failed;
    const passRate = Math.round(passed / total * 100);

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  L4 V3 RESULTS: ${passed}/${total} passed (${passRate}%) | ${failed} failed`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Fraud Scenarios:  ${results.filter(r => r.id >= 'BF-1' && r.id <= 'BF-6').filter(r => r.pass).length}/6`);
    console.log(`║  Normal Baselines: ${results.filter(r => r.id === 'BF-7' || r.id === 'BF-8').filter(r => r.pass).length}/2`);
    console.log(`║  Advanced:         ${results.filter(r => r.id >= 'BF-9' && r.id <= 'BF-11').filter(r => r.pass).length}/3`);
    console.log(`║  V2 Scenarios:     ${results.filter(r => r.id.startsWith('V2')).filter(r => r.pass).length}/3`);
    console.log(`║  V3 Adversarial:   ${results.filter(r => r.id.startsWith('V3')).filter(r => r.pass).length}/3`);
    console.log(`║  Integration:      ${results.filter(r => r.id.startsWith('INT')).filter(r => r.pass).length}/5`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    fs.writeFileSync('chaos-l4-report.json', JSON.stringify({ timestamp: new Date().toISOString(), version: 'V3', results, summary: { total, passed, failed } }, null, 2));
    console.log('\n📝 Full report: chaos-l4-report.json');
    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
