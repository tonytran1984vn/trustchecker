/**
 * TC-21 Deep Dive: QR Code Reuse Attack
 * 
 * Scenario: Factory creates 1 QR code → prints on 100 products → 
 *           100 customers scan the same code
 * 
 * Run: node engines/tc21-reuse.js
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../server/db');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:4000';
const RUN = Date.now().toString(36);
let TOKEN = '', ORG_ID = '';

async function login() {
    const r = await fetch(BASE + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'owner@tonyisking.com', password: '123qaz12' })
    });
    const j = await r.json();
    TOKEN = j.token;
}

async function scanQR(qrData, ip, device, ua) {
    const opts = {
        method: 'POST',
        headers: { 
            'Authorization': 'Bearer ' + TOKEN, 
            'Content-Type': 'application/json',
            'x-idempotency-key': uuidv4()  // unique per request to bypass idempotency
        },
        body: JSON.stringify({ 
            qr_data: qrData, 
            ip_address: ip, 
            device_fingerprint: device,
            user_agent: ua || 'Mozilla/5.0'
        })
    };
    try {
        const r = await fetch(BASE + '/api/qr/scan', opts);
        return { status: r.status, body: await r.json().catch(() => null) };
    } catch(e) { return { status: 0, error: e.message }; }
}

// Use authenticated mobile-scan (public-facing endpoint with bulk+replay defense)
async function verifyQR(qrData, ip, device) {
    const opts = {
        method: 'POST',
        headers: { 
            'Authorization': 'Bearer ' + TOKEN,
            'Content-Type': 'application/json',
            'x-idempotency-key': uuidv4()
        },
        body: JSON.stringify({ qr_data: qrData, ip_address: ip, device_fingerprint: device })
    };
    try {
        const r = await fetch(BASE + '/api/qr/mobile-scan', opts);
        return { status: r.status, body: await r.json().catch(() => null) };
    } catch(e) {
        try {
            const r2 = await fetch(BASE + '/api/qr/scan', opts);
            return { status: r2.status, body: await r2.json().catch(() => null) };
        } catch(e2) { return { status: 0, error: e2.message }; }
    }
}

(async () => {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  TC-21 DEEP DIVE: QR Code Reuse Attack              ║');
    console.log('║  1 code → 100 products → 100 customer scans          ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    await login();
    const org = await db.get('SELECT id FROM organizations LIMIT 1');
    ORG_ID = org.id;
    console.log('Auth ✅  Org: ' + ORG_ID.substring(0, 8) + '\n');

    // ─── STEP 1: Factory creates 1 product + 1 QR code ──────
    console.log('━━━ STEP 1: Factory creates 1 product + 1 QR code ━━━');
    const productId = uuidv4();
    const sku = RUN + '-REUSE-21';
    await db.run("INSERT INTO products (id, name, sku, category, manufacturer, origin_country, status, org_id, created_at) VALUES ($1,$2,$3,'Anti-Counterfeit','TC21','VN','active',$4,NOW())",
        [productId, 'Reuse Attack Product', sku, ORG_ID]);
    
    const qrId = uuidv4();
    const qrData = sku + '-QR-' + crypto.randomBytes(8).toString('hex');
    await db.run("INSERT INTO qr_codes (id, product_id, qr_data, org_id, status, generated_by, generated_at) VALUES ($1,$2,$3,$4,'active','tc21',NOW())",
        [qrId, productId, qrData, ORG_ID]);

    console.log('  Product: ' + productId.substring(0, 8) + '...');
    console.log('  QR Code: ' + qrData.substring(0, 20) + '...');
    console.log('  ⚠️  This SINGLE code is now "printed on 100 products"\n');

    // ─── STEP 2: Setup supply chain (full flow) ──────────────
    console.log('━━━ STEP 2: Full supply chain flow ━━━');
    const factory = await db.get("SELECT id, name FROM partners WHERE type = 'factory' AND org_id = $1 AND status = 'active' LIMIT 1", [ORG_ID]);
    const warehouse = await db.get("SELECT id, name FROM partners WHERE type = 'warehouse' AND org_id = $1 AND status = 'active' LIMIT 1", [ORG_ID]);
    const distributor = await db.get("SELECT id, name FROM partners WHERE type = 'distributor' AND org_id = $1 AND status = 'active' LIMIT 1", [ORG_ID]);
    const retailer = await db.get("SELECT id, name FROM partners WHERE type = 'retailer' AND org_id = $1 AND status = 'active' LIMIT 1", [ORG_ID]);

    const t = (d) => { const t = new Date(); t.setDate(t.getDate() - d); return t.toISOString(); };
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'commission',$2,$3,'Factory','tc21',$4,$5)", [uuidv4(), productId, factory.id, ORG_ID, t(30)]);
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'pack',$2,$3,'Factory','tc21',$4,$5)", [uuidv4(), productId, factory.id, ORG_ID, t(28)]);
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'ship',$2,$3,'To Warehouse','tc21',$4,$5)", [uuidv4(), productId, factory.id, ORG_ID, t(25)]);
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'receive',$2,$3,'Warehouse','tc21',$4,$5)", [uuidv4(), productId, warehouse.id, ORG_ID, t(22)]);
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'ship',$2,$3,'To Distributor','tc21',$4,$5)", [uuidv4(), productId, warehouse.id, ORG_ID, t(20)]);
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'receive',$2,$3,'Distributor','tc21',$4,$5)", [uuidv4(), productId, distributor.id, ORG_ID, t(18)]);
    await db.run("INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,'sell',$2,$3,'Retail','tc21',$4,$5)", [uuidv4(), productId, retailer.id, ORG_ID, t(10)]);
    
    console.log('  commission → pack → ship → receive → ship → receive → sell');
    console.log('  Full flow ✅\n');

    // ─── STEP 3: 100 customers scan the SAME code ───────────
    console.log('━━━ STEP 3: 100 customers scan the SAME code ━━━');
    console.log('  Simulating 100 unique customers from different IPs/devices...\n');

    const cities = ['HCM', 'HaNoi', 'DaNang', 'CanTho', 'HaiPhong', 'NhaTrang', 'Hue', 'QuangNinh', 'BinhDuong', 'DongNai'];
    const scanResults = [];

    for (let i = 1; i <= 100; i++) {
        const ip = `${Math.floor(i/25)+100}.${(i*7)%255}.${(i*3)%255}.${(i%254)+1}`;
        const device = `customer-${cities[i%10]}-${crypto.randomBytes(4).toString('hex')}`;
        
        const r = await verifyQR(qrData, ip, device);
        scanResults.push({
            scan: i,
            ip,
            device: device.substring(0, 20),
            status: r.status,
            result: r.body?.result || r.body?.verification_result || 'N/A',
            fraudScore: r.body?.fraud_score ?? r.body?.fraudScore ?? 'N/A',
            scanCount: r.body?.scan_count ?? r.body?.scanCount ?? 'N/A',
            warning: r.body?.supply_chain_warning || r.body?.warning || null,
            blocked: r.body?.blocked || r.body?.result === 'blocked' || false,
            bulkDetected: r.body?.bulk_scan_detected || false,
        });

        // Progress
        if (i % 10 === 0) {
            const last = scanResults[scanResults.length - 1];
            console.log(`  Scan ${String(i).padStart(3)}/100 | Status: ${last.status} | Result: ${last.result} | Fraud: ${last.fraudScore} | Scans: ${last.scanCount}`);
        }
    }

    // ─── STEP 4: Analyze responses ──────────────────────────
    console.log('\n━━━ STEP 4: ANALYSIS ━━━\n');

    const byResult = {};
    const byStatus = {};
    let blockedCount = 0;
    let warningCount = 0;
    let bulkDetected = 0;
    let authenticCount = 0;

    for (const s of scanResults) {
        byResult[s.result] = (byResult[s.result] || 0) + 1;
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        if (s.blocked) blockedCount++;
        if (s.warning) warningCount++;
        if (s.bulkDetected) bulkDetected++;
        if (s.result === 'authentic' || s.result === 'valid') authenticCount++;
    }

    console.log('📊 Results Distribution:');
    for (const [k, v] of Object.entries(byResult)) {
        const bar = '█'.repeat(Math.max(1, Math.round(v / 2)));
        console.log(`  ${k.padEnd(15)} ${String(v).padStart(3)} ${bar}`);
    }

    console.log('\n📊 HTTP Status Distribution:');
    for (const [k, v] of Object.entries(byStatus)) {
        console.log(`  HTTP ${k}: ${v}`);
    }

    console.log('\n🚨 Detection Stats:');
    console.log(`  Blocked:              ${blockedCount}/100`);
    console.log(`  Warnings:             ${warningCount}/100`);
    console.log(`  Bulk Scan Detected:   ${bulkDetected}/100`);
    console.log(`  Still "Authentic":    ${authenticCount}/100`);

    // ─── STEP 5: Check DB state ─────────────────────────────
    console.log('\n━━━ STEP 5: DATABASE STATE ━━━');
    const scanEvents = await db.get("SELECT COUNT(*) as c FROM scan_events WHERE qr_code_id = $1", [qrId]);
    const qrStatus = await db.get("SELECT status FROM qr_codes WHERE id = $1", [qrId]);
    const uniqueIPs = await db.get("SELECT COUNT(DISTINCT ip_address) as c FROM scan_events WHERE qr_code_id = $1", [qrId]);
    
    console.log(`  Scan events recorded:  ${scanEvents?.c || 0}`);
    console.log(`  QR code status:        ${qrStatus?.status || 'N/A'}`);
    console.log(`  Unique IPs scanned:    ${uniqueIPs?.c || 0}`);
    console.log(`  Scan events in DB:     ${scanEvents?.c || 0}/${100} (expected 100)`);
    // Check if QR was blocked by our threshold (5 scans from 4+ IPs)
    const blocked = qrStatus?.status === 'blocked' || qrStatus?.status === 'suspended';
    console.log(`  QR auto-blocked:       ${blocked ? '✅ YES' : '❌ NO'}`);
    

    // Check velocity alerts
    const velocityAlerts = await db.all("SELECT COUNT(*) as c FROM audit_log WHERE action LIKE '%velocity%' OR action LIKE '%anomaly%' OR details LIKE '%" + qrId.substring(0,8) + "%'");
    console.log(`  Velocity alerts:       ${velocityAlerts?.[0]?.c || 0}`);

    // ─── STEP 6: Verdict ────────────────────────────────────
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              TC-21 VERDICT                            ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const detected = blockedCount > 0 || warningCount > 20 || authenticCount < 50;
    
    console.log('┌─────────────────────────┬────────────────────────────────────┐');
    console.log('│ Metric                  │ Value                              │');
    console.log('├─────────────────────────┼────────────────────────────────────┤');
    console.log(`│ Expected                │ Block after 5+ scans from 4+ IPs  │`);
    console.log(`│ Actual - Blocked        │ ${String(blockedCount).padEnd(35)}│`);
    console.log(`│ Actual - Warnings       │ ${String(warningCount).padEnd(35)}│`);
    console.log(`│ Actual - Still Valid     │ ${String(authenticCount).padEnd(35)}│`);
    console.log(`│ Anomaly Detected?       │ ${(detected ? '✅ YES' : '❌ NO — VULNERABILITY').padEnd(35)}│`);
    console.log(`│ Risk Level              │ ${(detected ? '🟡 MEDIUM (detectable)' : '🔴 CRITICAL').padEnd(35)}│`);
    console.log('└─────────────────────────┴────────────────────────────────────┘');

    if (!detected) {
        console.log('\n🔴 VULNERABILITY CONFIRMED: QR REUSE NOT DETECTED\n');
        console.log('Root Cause:');
        console.log('  The system treats each scan as independent verification.');
        console.log('  No cross-IP/cross-device correlation to detect reuse pattern.');
        console.log('  Scan count threshold exists (5 scans / 4 IPs) but may not');
        console.log('  trigger if scans are spread over time or across endpoints.\n');
    } else {
        console.log('\n✅ REUSE PATTERN DETECTED\n');
        console.log('  The system successfully identified anomalous multi-scan pattern.');
    }

    console.log('┌──────────────────────────────────────────────────────┐');
    console.log('│ FIX RECOMMENDATIONS                                  │');
    console.log('├──────────────────────────────────────────────────────┤');
    console.log('│                                                      │');
    console.log('│ 1. LOGIC FIX                                         │');
    console.log('│    ─ After Nth unique-IP scan (N=5), mark code       │');
    console.log('│      as "suspicious" and warn all subsequent scans   │');
    console.log('│    ─ After 2N scans, auto-block QR + alert admin     │');
    console.log('│    ─ Track unique device fingerprints per QR code    │');
    console.log('│                                                      │');
    console.log('│ 2. DB CONSTRAINT                                     │');
    console.log('│    ─ Add table: qr_scan_fingerprints                 │');
    console.log('│      (qr_id, device_hash, ip_hash, first_seen)       │');
    console.log('│    ─ Index on (qr_id, device_hash) for fast lookup   │');
    console.log('│    ─ Trigger: auto-flag when COUNT(DISTINCT ip) > 4  │');
    console.log('│                                                      │');
    console.log('│ 3. API GUARD                                         │');
    console.log('│    ─ Return "previously_verified: true" to customer  │');
    console.log('│    ─ Show first_scan_date + location to detect reuse │');
    console.log('│    ─ Implement "ownership claim" — only 1st scanner  │');
    console.log('│      can claim ownership (like warranty registration)│');
    console.log('│                                                      │');
    console.log('│ 4. SIGNATURE-BASED DEFENSE                           │');
    console.log('│    ─ Dynamic QR: encode product serial in QR data    │');
    console.log('│    ─ 1 product = 1 unique QR (not reusable)          │');
    console.log('│    ─ QR contains HMAC signature that ties to serial  │');
    console.log('│                                                      │');
    console.log('└──────────────────────────────────────────────────────┘');

    // Print first and last 5 scan details
    console.log('\n── Sample Scan Details (first 5 + last 5) ──\n');
    for (const s of [...scanResults.slice(0, 5), ...scanResults.slice(-5)]) {
        console.log(`  #${String(s.scan).padStart(3)} | ${s.ip.padEnd(16)} | ${String(s.status).padEnd(4)} | ${String(s.result).padEnd(12)} | fraud:${String(s.fraudScore).padEnd(5)} | scans:${s.scanCount}`);
    }

    process.exit(0);
})();
