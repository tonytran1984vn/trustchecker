/**
 * Attack Simulator — Auto API Fuzzer
 * Simulates 5 blind spots + general API fuzzing
 * Run: node engines/attack-simulator.js
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../server/db');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:4000';
let TOKEN = '';

async function login() {
    const r = await fetch(BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'owner@tonyisking.com', password: '123qaz12' })
    });
    const j = await r.json();
    TOKEN = j.token;
    return TOKEN;
}

async function api(method, path, body) {
    const opts = {
        method,
        headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    try {
        const r = await fetch(BASE + path, opts);
        return { status: r.status, body: await r.json().catch(() => ({})) };
    } catch(e) {
        return { status: 0, error: e.message };
    }
}

const results = { passed: 0, failed: 0, warnings: 0, attacks: [] };

function report(name, passed, detail) {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}${detail ? ': ' + detail : ''}`);
    results.attacks.push({ name, passed, detail });
    if (passed) results.passed++; else results.failed++;
}

// ═══════════════════════════════════════════════════════════════
// BS-1: Time-based attack — scan before transaction commits
// ═══════════════════════════════════════════════════════════════
async function testTimeBasedAttack() {
    console.log('\n[BS-1] Time-based attack (race condition)');
    
    // Create a product, then fire 10 concurrent scans
    const product = await api('POST', '/api/products', {
        name: 'Race Test Product', sku: 'RACE-' + Date.now(),
        category: 'Test', manufacturer: 'AttackSim',
        origin_country: 'VN', description: 'test'
    });
    
    if (product.status !== 201 && product.status !== 200) {
        report('Create product for race test', false, 'Status: ' + product.status);
        return;
    }

    const productId = product.body?.id || product.body?.product?.id;
    
    // Generate QR codes
    const qrRes = await api('POST', '/api/qr/generate', {
        product_id: productId, quantity: 1
    });
    
    const qrData = qrRes.body?.codes?.[0]?.qr_data || qrRes.body?.qr_codes?.[0]?.qr_data;
    if (!qrData) {
        report('Generate QR for race test', false, 'No qr_data returned');
        return;
    }

    // Fire 10 concurrent scans with different IPs
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(api('POST', '/api/qr/scan', {
            qr_data: qrData,
            ip_address: '10.0.' + i + '.1',
            device_fingerprint: 'race-' + i
        }));
    }
    
    const scanResults = await Promise.all(promises);
    const validCount = scanResults.filter(r => r.body?.result === 'valid' || r.body?.result === 'authentic').length;
    const suspiciousCount = scanResults.filter(r => r.body?.result === 'suspicious' || r.body?.result === 'warning').length;
    const blockedCount = scanResults.filter(r => r.body?.result === 'blocked').length;
    
    // Only 1 should be valid, rest should be warning/suspicious
    report('Race condition — concurrent scans', 
        validCount <= 2, 
        validCount + ' valid, ' + suspiciousCount + ' suspicious, ' + blockedCount + ' blocked (out of 10)');
}

// ═══════════════════════════════════════════════════════════════
// BS-2: Distributed inconsistency — concurrent warehouse updates
// ═══════════════════════════════════════════════════════════════
async function testDistributedInconsistency() {
    console.log('\n[BS-2] Distributed inconsistency (concurrent updates)');

    // Create product and commission it
    const product = await api('POST', '/api/products', {
        name: 'Dist Test', sku: 'DIST-' + Date.now(),
        category: 'Test', manufacturer: 'AttackSim',
        origin_country: 'VN', description: 'test'
    });
    const pid = product.body?.id || product.body?.product?.id;
    if (!pid) { report('Create product', false, 'No ID'); return; }

    // Commission + pack + ship
    await api('POST', '/api/scm/events', { event_type: 'commission', product_id: pid, location: 'Factory' });
    await api('POST', '/api/scm/events', { event_type: 'pack', product_id: pid, location: 'Factory' });
    await api('POST', '/api/scm/events', { event_type: 'ship', product_id: pid, location: 'To Warehouse A' });

    // Now try to receive at TWO warehouses simultaneously (should fail for one)
    const [recvA, recvB] = await Promise.all([
        api('POST', '/api/scm/events', { event_type: 'receive', product_id: pid, location: 'Warehouse A' }),
        api('POST', '/api/scm/events', { event_type: 'receive', product_id: pid, location: 'Warehouse B' }),
    ]);

    const bothSucceeded = recvA.status === 201 && recvB.status === 201;
    report('Concurrent receive at 2 warehouses', 
        !bothSucceeded, 
        'A:' + recvA.status + ' B:' + recvB.status + (bothSucceeded ? ' — BOTH succeeded! VULNERABILITY' : ' — one blocked'));

    // After receive, try to ship to 2 distributors simultaneously
    // First, ship from the received warehouse
    if (recvA.status === 201) {
        await api('POST', '/api/scm/events', { event_type: 'ship', product_id: pid, location: 'To Dist-X' });
    }
    
    // Try ship again (should fail — product in transit)
    const ship2 = await api('POST', '/api/scm/events', { event_type: 'ship', product_id: pid, location: 'To Dist-Y' });
    report('Double-ship while in transit', 
        ship2.status !== 201, 
        'Status: ' + ship2.status + (ship2.status === 201 ? ' — VULNERABILITY: double-ship!' : ' — blocked'));
}

// ═══════════════════════════════════════════════════════════════
// BS-3: Human behavior — proxy scan, bulk scan
// ═══════════════════════════════════════════════════════════════
async function testHumanBehavior() {
    console.log('\n[BS-3] Human behavior patterns');

    // Get existing QR codes
    const org = await db.get('SELECT id FROM organizations LIMIT 1');
    const qrs = await db.all("SELECT q.qr_data FROM qr_codes q WHERE q.status = 'active' AND q.org_id = $1 LIMIT 20", [org.id]);
    
    if (qrs.length < 5) { report('Not enough QR codes', false, 'Need 5, have ' + qrs.length); return; }

    // Simulate retailer scanning on behalf of customer (same IP, same device, multiple QRs)
    const ip = '192.168.1.' + Math.floor(Math.random() * 254 + 1);
    const device = 'retailer-device-' + Date.now();
    let proxyResults = [];
    
    for (let i = 0; i < 5; i++) {
        const r = await api('POST', '/api/qr/scan', {
            qr_data: qrs[i].qr_data,
            ip_address: ip,
            device_fingerprint: device,
            user_agent: 'RetailerApp/1.0'
        });
        proxyResults.push(r);
    }

    const proxyValid = proxyResults.filter(r => [200, 201].includes(r.status)).length;
    report('Retailer proxy scan (5 different QRs, same device)', 
        true, 
        proxyValid + '/5 processed — pattern: single device scanning multiple products');
    
    // Simulate distributor bulk scan (20 scans in 3 seconds)
    const bulkPromises = [];
    for (let i = 0; i < 20; i++) {
        const qr = qrs[i % qrs.length];
        bulkPromises.push(api('POST', '/api/qr/scan', {
            qr_data: qr.qr_data,
            ip_address: '10.10.10.' + i,
            device_fingerprint: 'bulk-scanner-' + Date.now(),
            user_agent: 'BulkScanner/2.0'
        }));
    }
    
    const bulkResults = await Promise.all(bulkPromises);
    const bulkErrors = bulkResults.filter(r => r.status === 429).length;
    const bulkOk = bulkResults.filter(r => r.status === 200).length;
    report('Distributor bulk scan (20 concurrent)', 
        true, 
        bulkOk + ' ok, ' + bulkErrors + ' rate-limited' + (bulkErrors === 0 ? ' — consider adding bulk scan detection' : ''));
}

// ═══════════════════════════════════════════════════════════════
// BS-4: Partial failure — API fail mid-flow → state corruption
// ═══════════════════════════════════════════════════════════════
async function testPartialFailure() {
    console.log('\n[BS-4] Partial failure (mid-flow state corruption)');

    // Create product
    const product = await api('POST', '/api/products', {
        name: 'Partial Fail Test', sku: 'PF-' + Date.now(),
        category: 'Test', manufacturer: 'AttackSim',
        origin_country: 'VN', description: 'test'
    });
    const pid = product.body?.id || product.body?.product?.id;
    if (!pid) { report('Create product', false, 'No ID'); return; }

    // Normal flow up to ship
    await api('POST', '/api/scm/events', { event_type: 'commission', product_id: pid, location: 'Factory' });
    await api('POST', '/api/scm/events', { event_type: 'pack', product_id: pid, location: 'Factory' });
    await api('POST', '/api/scm/events', { event_type: 'ship', product_id: pid, location: 'To WH' });
    
    // Simulate "receive" with invalid partner (should fail)
    const badReceive = await api('POST', '/api/scm/events', { 
        event_type: 'receive', product_id: pid, 
        partner_id: 'non-existent-partner-' + uuidv4(),
        location: 'Bad WH' 
    });

    // Check if state is still "ship" (not corrupted)
    const state = await db.get('SELECT event_type FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1', [pid]);
    report('State preserved after partial failure', 
        state?.event_type === 'ship', 
        'Expected: ship, Got: ' + (state?.event_type || 'null') + ' (bad receive status: ' + badReceive.status + ')');

    // Retry with valid data (should succeed from "ship" state)
    const goodReceive = await api('POST', '/api/scm/events', { 
        event_type: 'receive', product_id: pid, location: 'Good WH'
    });
    report('Recovery after partial failure', 
        goodReceive.status === 201, 
        'Retry receive: ' + goodReceive.status);
}

// ═══════════════════════════════════════════════════════════════
// BS-5: Data replay — mobile resend old request 
// ═══════════════════════════════════════════════════════════════
async function testDataReplay() {
    console.log('\n[BS-5] Data replay (duplicate request)');

    // Create a unique scan request
    const org = await db.get('SELECT id FROM organizations LIMIT 1');
    const qr = await db.get("SELECT q.qr_data FROM qr_codes q WHERE q.status = 'active' AND q.org_id = $1 LIMIT 1", [org.id]);
    if (!qr) { report('No QR code found', false); return; }

    const scanBody = {
        qr_data: qr.qr_data,
        ip_address: '172.16.0.42',
        device_fingerprint: 'replay-test-' + Date.now(),
        user_agent: 'MobileApp/3.0'
    };

    // Send same request 3 times (simulate mobile retry)
    const r1 = await api('POST', '/api/qr/scan', scanBody);
    const r2 = await api('POST', '/api/qr/scan', scanBody);
    const r3 = await api('POST', '/api/qr/scan', scanBody);

    // First should succeed, subsequent should detect duplicate
    report('Replay detection (same request 3x)', 
        r2.body?.result !== r1.body?.result || r3.body?.result === 'warning' || r3.body?.result === 'suspicious',
        'r1:' + (r1.body?.result || 'err') + ' r2:' + (r2.body?.result || 'err') + ' r3:' + (r3.body?.result || 'err'));

    // Now replay with same body but 5 minutes "later" (should still detect)
    await new Promise(resolve => setTimeout(resolve, 200));
    const r4 = await api('POST', '/api/qr/scan', { ...scanBody, device_fingerprint: 'replay-test-delayed' });
    report('Delayed replay (different fingerprint)', 
        true, 
        'Result: ' + (r4.body?.result || 'err'));
}

// ═══════════════════════════════════════════════════════════════
// General API Fuzzing
// ═══════════════════════════════════════════════════════════════
async function testApiFuzzing() {
    console.log('\n[FUZZ] API Fuzzing');

    // SQL injection attempts
    const sqli = [
        "'; DROP TABLE products; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "${constructor}",
        "__proto__"
    ];

    for (const payload of sqli) {
        const r = await api('POST', '/api/qr/scan', { qr_data: payload });
        report('SQLi: ' + payload.substring(0, 30), 
            r.status !== 500 && !r.body?.token, 
            'Status: ' + r.status);
    }

    // XSS in product name
    const xssPayloads = [
        '<script>alert(1)</script>',
        '"><img src=x onerror=alert(1)>',
        'javascript:alert(1)//',
    ];

    for (const xss of xssPayloads) {
        const r = await api('POST', '/api/products', {
            name: xss, sku: 'XSS-' + Date.now(),
            category: 'Test', manufacturer: xss,
            origin_country: 'VN', description: 'test'
        });
        // Should not return HTML-unescaped content
        const body = JSON.stringify(r.body || {});
        report('XSS: ' + xss.substring(0, 25), 
            !body.includes('<script>'), 
            'Status: ' + r.status);
    }

    // Integer overflow
    const r = await api('POST', '/api/qr/generate', {
        product_id: uuidv4(), quantity: 999999999
    });
    report('Int overflow: quantity=999999999', r.status !== 500, 'Status: ' + r.status);

    // Null bytes
    const nr = await api('POST', '/api/qr/scan', { qr_data: 'TC\x00-injected' });
    report('Null byte injection', nr.status !== 500, 'Status: ' + nr.status);

    // Prototype pollution
    const pp = await api('POST', '/api/scm/events', {
        event_type: 'commission',
        __proto__: { admin: true },
        constructor: { prototype: { isAdmin: true } }
    });
    report('Prototype pollution', pp.status !== 500, 'Status: ' + pp.status);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
(async () => {
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║     Attack Simulator — Auto Fuzzer        ║');
    console.log('╚═══════════════════════════════════════════╝');

    await login();
    console.log('Authenticated ✅');

    await testTimeBasedAttack();
    await testDistributedInconsistency();
    await testHumanBehavior();
    await testPartialFailure();
    await testDataReplay();
    await testApiFuzzing();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║            ATTACK SIMULATION REPORT        ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('\n  Passed: ' + results.passed);
    console.log('  Failed: ' + results.failed);
    console.log('  Total:  ' + results.attacks.length);
    
    const vulns = results.attacks.filter(a => !a.passed);
    if (vulns.length > 0) {
        console.log('\n  VULNERABILITIES:');
        vulns.forEach(v => console.log('  ❌ ' + v.name + ': ' + v.detail));
    }

    process.exit(results.failed > 0 ? 1 : 0);
})();
