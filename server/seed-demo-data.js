/**
 * TrustChecker v9.4 — Demo Data Seed (PostgreSQL-aware)
 * Respects FK constraints. Proper insertion order.
 * Run: DATABASE_URL="..." node server/seed-demo-data.js
 */
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const id = () => uuidv4();
const days = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function run(db, sql, ...params) {
    try {
        await db.prepare(sql).run(...params);
        return true;
    } catch (e) {
        if (!e.message?.includes('unique') && !e.message?.includes('duplicate')) {
            console.error(`    ⚠️ ${e.message?.substring(0, 120)}`);
        }
        return false;
    }
}

async function seed() {
    const db = require('./db');
    if (db.init) await db.init();
    await new Promise(r => setTimeout(r, 2500));
    console.log('🌱 Starting demo data seed (PostgreSQL mode)...\n');

    // Get admin user
    const adminUser = await db.prepare("SELECT id FROM users WHERE email = ?").get('admin@trustchecker.io');
    const adminId = adminUser?.id;
    if (!adminId) { console.error('❌ admin@trustchecker.io not found!'); process.exit(1); }
    console.log(`  📌 Admin ID: ${adminId}\n`);

    // ═══ 1. PRODUCTS ═══════════════════════════════════════════
    const productsData = [
        { name: 'Organic Vietnamese Coffee – Dalat Reserve', sku: 'VN-COF-DLR-001', category: 'F&B Premium', manufacturer: 'Dalat Highland Estate', origin: 'VN', trust: 96 },
        { name: 'Silk Bedding Set – Heritage Gold', sku: 'VN-SLK-HGD-002', category: 'Luxury Textiles', manufacturer: 'Silk Heritage Vietnam', origin: 'VN', trust: 92 },
        { name: 'Swiss Chronograph – TrustMaster Pro', sku: 'CH-WTC-TMP-003', category: 'Luxury Watches', manufacturer: 'Swiss Horological Group', origin: 'CH', trust: 98 },
        { name: 'Nuoc Mam Premium – Phu Quoc Gold', sku: 'VN-NMP-PQG-004', category: 'F&B Heritage', manufacturer: 'Phu Quoc Artisan Co.', origin: 'VN', trust: 94 },
        { name: 'Carbon Fiber Drone – SkyGuard X7', sku: 'US-DRN-SGX-005', category: 'Aerospace Tech', manufacturer: 'SkyGuard Dynamics', origin: 'US', trust: 91 },
        { name: 'Titanium Medical Implant – OrthoFlex', sku: 'DE-MED-OFX-006', category: 'Medical Devices', manufacturer: 'MedTech Europa GmbH', origin: 'DE', trust: 99 },
        { name: 'EV Battery Module – GreenVolt 480', sku: 'KR-BAT-GV4-007', category: 'EV Components', manufacturer: 'GreenVolt Energy', origin: 'KR', trust: 88 },
        { name: 'Artisan Chocolate – Mekong Collection', sku: 'VN-CHO-MKC-008', category: 'F&B Artisan', manufacturer: 'Mekong Cacao House', origin: 'VN', trust: 95 },
        { name: 'AI Security Camera – TrustEye 360', sku: 'SG-CAM-TE3-009', category: 'Smart Security', manufacturer: 'TrustTech Asia Pte Ltd', origin: 'SG', trust: 87 },
        { name: 'Pharmaceutical API – BioShield', sku: 'IN-PHA-BSC-010', category: 'Pharmaceuticals', manufacturer: 'BioShield Pharma Ltd', origin: 'IN', trust: 93 },
        { name: 'Ceramic Superconductor – CryoCell MX', sku: 'JP-SPC-CCM-011', category: 'Advanced Materials', manufacturer: 'NanoTech Nippon', origin: 'JP', trust: 97 },
        { name: 'Heritage Rice – Mekong Jasmine Gold', sku: 'VN-RIC-MJG-012', category: 'F&B Organic', manufacturer: 'Mekong Agri Corp', origin: 'VN', trust: 90 },
    ];

    const productIds = [];
    let ok = 0;
    for (const p of productsData) {
        const pid = id();
        // registered_by is nullable FK → set to adminId (verified above)
        const success = await run(db,
            `INSERT INTO products (id, name, sku, category, manufacturer, origin_country, registered_by, trust_score, status, batch_number, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            pid, p.name, p.sku, p.category, p.manufacturer, p.origin, adminId, p.trust, 'active', `BATCH-${rand(1000, 9999)}`, `Premium ${p.category} product — verified by TrustChecker`);
        if (success) { productIds.push(pid); ok++; }
    }
    console.log(`  ✅ Products: ${ok} created`);
    if (productIds.length === 0) { console.error('❌ No products created — cannot continue'); process.exit(1); }

    // ═══ 2. BATCHES (FK: product_id → products) ══════════════════
    const batchIds = [];
    const facilities = ['Factory A – HCMC', 'Factory B – Dalat', 'Warehouse C – Singapore', 'Plant D – Seoul', 'Lab E – Munich'];
    for (let i = 0; i < productIds.length; i++) {
        for (let b = 0; b < 3; b++) {
            const bid = id();
            const batchNum = `B-2026-${String(i * 3 + b + 1).padStart(4, '0')}`;
            const success = await run(db,
                `INSERT INTO batches (id, batch_number, product_id, quantity, manufactured_date, expiry_date, origin_facility, status) VALUES (?,?,?,?,?,?,?,?)`,
                bid, batchNum, productIds[i], rand(500, 10000), days(rand(30, 180)), daysFromNow(rand(180, 730)), pick(facilities), pick(['created', 'manufactured', 'shipped', 'delivered']));
            if (success) batchIds.push({ id: bid, productId: productIds[i] });
        }
    }
    console.log(`  ✅ Batches: ${batchIds.length} created`);

    // ═══ 3. QR CODES (FK: product_id → products) ════════════════
    const qrIds = [];
    for (const pid of productIds) {
        for (let q = 0; q < 3; q++) {
            const qid = id();
            const qrData = `TC-${sha256(qid).substring(0, 16).toUpperCase()}`;
            const success = await run(db,
                `INSERT INTO qr_codes (id, product_id, qr_data, status, generated_by) VALUES (?,?,?,?,?)`,
                qid, pid, qrData, 'active', adminId);
            if (success) qrIds.push({ id: qid, productId: pid });
        }
    }
    console.log(`  ✅ QR Codes: ${qrIds.length} created`);

    // ═══ 4. PARTNERS ═══════════════════════════════════════════
    const partnersData = [
        { name: 'Saigon Distribution Co.', type: 'distributor', country: 'VN', region: 'Southeast Asia', trust: 92, kyc: 'verified' },
        { name: 'Singapore Logistics Hub', type: 'logistics', country: 'SG', region: 'Southeast Asia', trust: 95, kyc: 'verified' },
        { name: 'Rhine Valley Pharma GmbH', type: 'manufacturer', country: 'DE', region: 'Europe', trust: 97, kyc: 'verified' },
        { name: 'Tokyo Electronics Import', type: 'distributor', country: 'JP', region: 'Asia Pacific', trust: 94, kyc: 'verified' },
        { name: 'Mekong River Trading', type: 'supplier', country: 'VN', region: 'Southeast Asia', trust: 78, kyc: 'pending' },
        { name: 'Dubai Free Zone Warehouse', type: 'warehouse', country: 'AE', region: 'Middle East', trust: 86, kyc: 'verified' },
        { name: 'Lagos West Africa Hub', type: 'distributor', country: 'NG', region: 'Africa', trust: 65, kyc: 'pending' },
        { name: 'San Francisco Tech Imports', type: 'distributor', country: 'US', region: 'North America', trust: 91, kyc: 'verified' },
    ];
    const partnerIds = [];
    for (const pt of partnersData) {
        const pid = id();
        const apiKey = `tc_${sha256(pid).substring(0, 24)}`;
        const success = await run(db,
            `INSERT INTO partners (id, name, type, country, region, contact_email, kyc_status, trust_score, risk_level, api_key, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            pid, pt.name, pt.type, pt.country, pt.region,
            `contact@${pt.name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 15)}.com`,
            pt.kyc, pt.trust, pt.trust >= 90 ? 'low' : pt.trust >= 70 ? 'medium' : 'high', apiKey, 'active');
        if (success) partnerIds.push(pid);
    }
    console.log(`  ✅ Partners: ${partnerIds.length} created`);

    // ═══ 5. SCAN EVENTS (FK: product_id → products, qr_code_id → qr_codes) ═══
    const cities = [
        { city: 'Ho Chi Minh City', country: 'VN', lat: 10.762, lng: 106.660 },
        { city: 'Ha Noi', country: 'VN', lat: 21.028, lng: 105.854 },
        { city: 'Singapore', country: 'SG', lat: 1.352, lng: 103.820 },
        { city: 'Tokyo', country: 'JP', lat: 35.682, lng: 139.691 },
        { city: 'Munich', country: 'DE', lat: 48.135, lng: 11.582 },
        { city: 'Seoul', country: 'KR', lat: 37.567, lng: 126.978 },
        { city: 'San Francisco', country: 'US', lat: 37.775, lng: -122.419 },
        { city: 'Dubai', country: 'AE', lat: 25.205, lng: 55.271 },
        { city: 'Mumbai', country: 'IN', lat: 19.076, lng: 72.878 },
        { city: 'Da Nang', country: 'VN', lat: 16.047, lng: 108.206 },
        { city: 'Bangkok', country: 'TH', lat: 13.756, lng: 100.502 },
        { city: 'London', country: 'GB', lat: 51.507, lng: -0.128 },
    ];
    const results = ['valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'suspicious', 'counterfeit'];
    const devices = ['iPhone-15-Pro', 'Samsung-S24-Ultra', 'Pixel-8-Pro', 'iPad-Air-5', 'Xiaomi-14'];
    const scanIds = [];

    for (let i = 0; i < 200; i++) {
        const sid = id();
        const qr = pick(qrIds);
        const geo = pick(cities);
        const result = pick(results);
        const fraudScore = result === 'counterfeit' ? rand(70, 95) / 100 : result === 'suspicious' ? rand(30, 65) / 100 : rand(0, 15) / 100;
        const success = await run(db,
            `INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, geo_city, geo_country, user_agent, result, fraud_score, trust_score, response_time_ms, scanned_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            sid, qr.id, qr.productId, pick(['validation', 'verification', 'consumer_check']),
            sha256(`${pick(devices)}-${rand(1, 500)}`).substring(0, 16),
            `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`,
            geo.lat + (Math.random() - 0.5) * 0.1, geo.lng + (Math.random() - 0.5) * 0.1,
            geo.city, geo.country, `Mozilla/5.0 (${pick(['iPhone', 'Linux; Android 14', 'Windows NT 10.0'])})`,
            result, fraudScore, Math.max(0, 100 - fraudScore * 100), rand(45, 350), days(rand(0, 90)));
        if (success) scanIds.push(sid);
    }
    console.log(`  ✅ Scan Events: ${scanIds.length} created`);

    // ═══ 6. FRAUD ALERTS (FK: scan_event_id → scan_events, product_id → products) ═══
    const alertTypes = ['duplicate_scan', 'geo_anomaly', 'velocity_anomaly', 'device_mismatch', 'counterfeit_detected', 'unauthorized_region', 'time_travel'];
    let alertCount = 0;
    for (let i = 0; i < 25; i++) {
        const alertType = pick(alertTypes);
        const severity = alertType === 'counterfeit_detected' ? 'critical' : alertType === 'time_travel' ? 'high' : pick(['low', 'medium', 'high', 'critical']);
        const success = await run(db,
            `INSERT INTO fraud_alerts (id, scan_event_id, product_id, alert_type, severity, description, details, status) VALUES (?,?,?,?,?,?,?,?)`,
            id(), pick(scanIds), pick(productIds), alertType, severity,
            `${alertType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} detected`,
            JSON.stringify({ confidence: rand(65, 99) / 100, flagged_by: 'AI Engine v3.2' }),
            pick(['open', 'open', 'investigating', 'resolved', 'dismissed']));
        if (success) alertCount++;
    }
    console.log(`  ✅ Fraud Alerts: ${alertCount} created`);

    // ═══ 7. TRUST SCORES (FK: product_id → products) ══════════════
    let tsCount = 0;
    for (let i = 0; i < productIds.length; i++) {
        for (let t = 0; t < 10; t++) {
            const score = Math.min(100, Math.max(0, productsData[i].trust + rand(-5, 3)));
            const success = await run(db,
                `INSERT INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, explanation, calculated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
                id(), productIds[i], score, rand(80, 100) / 100, rand(75, 100) / 100, rand(85, 100) / 100, rand(80, 100) / 100,
                JSON.stringify({ summary: `Trust score ${score >= 90 ? 'excellent' : score >= 70 ? 'good' : 'needs improvement'}` }),
                days(t * 7));
            if (success) tsCount++;
        }
    }
    console.log(`  ✅ Trust Scores: ${tsCount} records`);

    // ═══ 8. SHIPMENTS (FK: batch_id → batches, from/to_partner_id → partners) ═══
    const carriers = ['DHL Express', 'FedEx International', 'Maersk Sealink', 'Singapore Airlines Cargo', 'Vietnam Express Logistics'];
    const shipmentIds = [];
    for (let i = 0; i < 20; i++) {
        const sid = id();
        const batch = pick(batchIds);
        const fromP = partnerIds[i % partnerIds.length];
        const toP = partnerIds[(i + 1) % partnerIds.length];
        const status = pick(['pending', 'in_transit', 'in_transit', 'delivered', 'delivered']);
        const geo = pick(cities);
        const success = await run(db,
            `INSERT INTO shipments (id, batch_id, from_partner_id, to_partner_id, carrier, tracking_number, status, estimated_delivery, actual_delivery, current_lat, current_lng, gps_trail) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            sid, batch.id, fromP, toP, pick(carriers),
            `${pick(['DHL', 'FDX', 'MSK', 'SIA'])}-${rand(100000000, 999999999)}`,
            status, daysFromNow(rand(1, 14)), status === 'delivered' ? days(rand(0, 5)) : null,
            geo.lat, geo.lng,
            JSON.stringify(Array.from({ length: rand(3, 6) }, () => { const c = pick(cities); return { lat: c.lat, lng: c.lng, city: c.city }; })));
        if (success) shipmentIds.push(sid);
    }
    console.log(`  ✅ Shipments: ${shipmentIds.length} created`);

    // ═══ 9. IOT READINGS (FK: shipment_id → shipments) ═══════════
    let iotCount = 0;
    for (let i = 0; i < 60; i++) {
        const sensor = pick([
            { type: 'temperature', unit: '°C', min: -5, max: 35, threshMin: 2, threshMax: 25 },
            { type: 'humidity', unit: '%', min: 20, max: 95, threshMin: 30, threshMax: 80 },
            { type: 'vibration', unit: 'g', min: 0, max: 5, threshMin: 0, threshMax: 3 },
        ]);
        const value = rand(sensor.min * 10, sensor.max * 10) / 10;
        const success = await run(db,
            `INSERT INTO iot_readings (id, shipment_id, sensor_type, value, unit, threshold_min, threshold_max, alert_triggered, recorded_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            id(), pick(shipmentIds), sensor.type, value, sensor.unit, sensor.threshMin, sensor.threshMax,
            (value < sensor.threshMin || value > sensor.threshMax) ? 1 : 0, days(rand(0, 30)));
        if (success) iotCount++;
    }
    console.log(`  ✅ IoT Readings: ${iotCount} created`);

    // ═══ 10. SUPPLY CHAIN EVENTS (FK: product_id, batch_id, partner_id) ═══
    const eventTypes = ['manufactured', 'quality_check', 'packed', 'shipped', 'customs_clearance', 'received', 'stored', 'distributed', 'sold'];
    let sceCount = 0;
    for (let i = 0; i < 50; i++) {
        const batch = pick(batchIds);
        const success = await run(db,
            `INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, uid, location, actor, partner_id, details) VALUES (?,?,?,?,?,?,?,?,?)`,
            id(), pick(eventTypes), batch.productId, batch.id, `EVT-${rand(10000, 99999)}`,
            pick(['Factory HCMC', 'QC Lab Dalat', 'Warehouse SG', 'Port Hai Phong', 'Customs Tokyo', 'Hub Munich']),
            pick(['Operator A', 'QC Team', 'Logistics', 'Customs Officer']), pick(partnerIds),
            JSON.stringify({ notes: pick(['Standard process', 'Expedited', 'Priority', 'Routine inspection']), temperature_ok: true }));
        if (success) sceCount++;
    }
    console.log(`  ✅ Supply Chain Events: ${sceCount} created`);

    // ═══ 11. INVENTORY (FK: product_id, batch_id, partner_id) ══════
    let invCount = 0;
    const invLocs = ['Warehouse HCMC', 'Warehouse Singapore', 'Distribution Tokyo', 'Hub Munich', 'Store Seoul'];
    for (let i = 0; i < productIds.length; i++) {
        const matchingBatch = batchIds.find(b => b.productId === productIds[i]);
        if (!matchingBatch) continue;
        for (let l = 0; l < 2; l++) {
            const success = await run(db,
                `INSERT INTO inventory (id, product_id, batch_id, partner_id, location, quantity, min_stock, max_stock) VALUES (?,?,?,?,?,?,?,?)`,
                id(), productIds[i], matchingBatch.id, pick(partnerIds), pick(invLocs), rand(50, 5000), rand(10, 100), rand(5000, 10000));
            if (success) invCount++;
        }
    }
    console.log(`  ✅ Inventory: ${invCount} records`);

    // ═══ 12. LEAK ALERTS (FK: product_id → products) ════════════
    let leakCount = 0;
    for (let i = 0; i < 8; i++) {
        const authPrice = rand(50, 500);
        const success = await run(db,
            `INSERT INTO leak_alerts (id, product_id, platform, url, listing_title, listing_price, authorized_price, region_detected, authorized_regions, leak_type, risk_score, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            id(), pick(productIds), pick(['Alibaba', 'Amazon', 'Lazada', 'Shopee', 'eBay']),
            `https://${pick(['alibaba', 'amazon', 'lazada'])}.com/listing/${rand(100000, 999999)}`,
            `${pick(productsData).name} – SALE`, authPrice * rand(20, 60) / 100, authPrice,
            pick(['NG', 'PK', 'BD', 'MM']), JSON.stringify(['VN', 'SG', 'JP', 'US', 'DE']),
            pick(['unauthorized_region', 'price_violation', 'grey_market']),
            rand(40, 90) / 100, pick(['open', 'investigating', 'resolved']));
        if (success) leakCount++;
    }
    console.log(`  ✅ Leak Alerts: ${leakCount} created`);

    // ═══ 13. SLA DEFINITIONS & VIOLATIONS ═══════════════════════
    const slaIds = [];
    for (const pid of partnerIds.slice(0, 5)) {
        const slaId = id();
        const success = await run(db,
            `INSERT INTO sla_definitions (id, partner_id, sla_type, metric, threshold_value, threshold_unit, penalty_amount, penalty_currency, status) VALUES (?,?,?,?,?,?,?,?,?)`,
            slaId, pid, pick(['delivery', 'quality', 'response_time']),
            pick(['on_time_delivery_pct', 'defect_rate', 'response_hours']),
            pick([95, 99, 24, 48]), pick(['percent', 'hours']), rand(500, 5000), 'USD', 'active');
        if (success) slaIds.push({ id: slaId, partnerId: pid });
    }
    for (const sla of slaIds) {
        if (Math.random() > 0.4) {
            await run(db,
                `INSERT INTO sla_violations (id, sla_id, partner_id, shipment_id, violation_type, actual_value, threshold_value, penalty_amount, status) VALUES (?,?,?,?,?,?,?,?,?)`,
                id(), sla.id, sla.partnerId, pick(shipmentIds),
                pick(['late_delivery', 'quality_breach', 'sla_miss']),
                rand(60, 90), 95, rand(500, 2000), pick(['open', 'resolved']));
        }
    }
    console.log(`  ✅ SLA Definitions: ${slaIds.length}, Violations: seeded`);

    // ═══ 14. BLOCKCHAIN SEALS (no FK) ═══════════════════════════
    let prevHash = '0';
    for (let i = 0; i < 30; i++) {
        const dataHash = sha256(JSON.stringify({ event: pick(eventTypes), ts: days(rand(0, 60)) }));
        await run(db,
            `INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index, nonce) VALUES (?,?,?,?,?,?,?,?)`,
            id(), pick(eventTypes), pick(scanIds), dataHash, prevHash, sha256(prevHash + dataHash), i + 1, rand(0, 99999));
        prevHash = dataHash;
    }
    console.log(`  ✅ Blockchain Seals: 30 created`);

    // ═══ 15. AUDIT LOG (30 entries) ═══════════════════════════════
    const auditActions = ['USER_LOGIN', 'PRODUCT_CREATED', 'QR_GENERATED', 'SCAN_VERIFIED', 'FRAUD_ALERT_CREATED', 'PARTNER_ONBOARDED', 'SHIPMENT_UPDATED', 'TRUST_SCORE_UPDATED'];
    for (let i = 0; i < 30; i++) {
        await run(db,
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp) VALUES (?,?,?,?,?,?,?,?)`,
            id(), adminId, pick(auditActions), pick(['user', 'product', 'scan', 'partner']),
            pick([...productIds.slice(0, 3), ...partnerIds.slice(0, 3)]),
            JSON.stringify({ source: 'system' }), `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`, days(rand(0, 30)));
    }
    console.log(`  ✅ Audit Log: 30 entries`);

    // ═══ 16. BILLING ═══════════════════════════════════════════
    await run(db,
        `INSERT INTO billing_plans (id, user_id, plan_name, scan_limit, api_limit, storage_mb, price_monthly, status) VALUES (?,?,?,?,?,?,?,?)`,
        id(), adminId, 'enterprise', 100000, 50000, 10000, 999.00, 'active');
    const metricTypes = ['scans', 'api_calls', 'storage_mb', 'users', 'qr_generated'];
    for (let m = 0; m < 6; m++) {
        for (const mt of metricTypes) {
            await run(db, `INSERT INTO usage_metrics (id, user_id, metric_type, value, period) VALUES (?,?,?,?,?)`,
                id(), adminId, mt, rand(100, mt === 'scans' ? 5000 : mt === 'api_calls' ? 15000 : 500), `2026-${String(m + 1).padStart(2, '0')}`);
        }
    }
    console.log(`  ✅ Billing & Usage: seeded`);

    // ═══ 17. ANOMALY DETECTIONS (no strict FK) ══════════════════
    for (let i = 0; i < 15; i++) {
        await run(db,
            `INSERT INTO anomaly_detections (id, source_type, source_id, anomaly_type, severity, score, description, details, status, detected_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            id(), pick(['scan_event', 'product', 'partner']), pick([...scanIds.slice(0, 5), ...productIds.slice(0, 3)]),
            pick(['velocity_spike', 'geo_mismatch', 'volume_anomaly', 'pattern_deviation']),
            pick(['low', 'medium', 'high', 'critical']), rand(30, 95) / 100,
            'Automated anomaly detection triggered', JSON.stringify({ model_version: 'v3.2.1', confidence: rand(65, 98) / 100 }),
            pick(['open', 'investigating', 'resolved']), days(rand(0, 45)));
    }
    console.log(`  ✅ Anomaly Detections: 15 created`);

    // ═══ DONE ════════════════════════════════════════════════════
    console.log('\n🎯 Demo data seeding complete!');
    process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
