#!/usr/bin/env node
/**
 * TrustChecker – Demo Data Seed Script
 * Populates the database with realistic sample data for a polished dashboard.
 * Usage: node scripts/seed-demo.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'trustchecker.db');
const uuid = () => crypto.randomUUID();
const hash = () => crypto.randomBytes(32).toString('hex');
const past = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    return d.toISOString().replace('T', ' ').slice(0, 19);
};
const future = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().replace('T', ' ').slice(0, 19);
};

(async () => {
    const SQL = await initSqlJs();
    let db;
    if (fs.existsSync(DB_PATH)) {
        db = new SQL.Database(fs.readFileSync(DB_PATH));
        console.log('📂 Loaded existing database');
    } else {
        console.error('❌ Database not found at', DB_PATH);
        process.exit(1);
    }

    // Get admin user ID
    const adminResult = db.exec("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    const adminId = adminResult[0]?.values?.[0]?.[0];
    if (!adminId) { console.error('❌ Admin user not found'); process.exit(1); }
    console.log('👤 Admin ID:', adminId);

    // ─── 1. Products (12 products) ──────────────────────────────────
    const products = [
        { name: 'Premium Roasted Coffee Beans', sku: 'COFFEE-VN-001', category: 'Food & Beverage', manufacturer: 'Highland Farms Vietnam', origin: 'Vietnam', trust: 96.5 },
        { name: 'Organic Matcha Powder', sku: 'MATCHA-JP-002', category: 'Food & Beverage', manufacturer: 'Uji Tea Gardens', origin: 'Japan', trust: 98.2 },
        { name: 'Swiss Luxury Watch Model X', sku: 'WATCH-CH-003', category: 'Luxury Goods', manufacturer: 'Geneva Timepieces SA', origin: 'Switzerland', trust: 99.1 },
        { name: 'Italian Leather Handbag', sku: 'BAG-IT-004', category: 'Fashion', manufacturer: 'Milano Crafts SpA', origin: 'Italy', trust: 94.8 },
        { name: 'Pharmaceutical Grade Vitamin D3', sku: 'PHARMA-US-005', category: 'Pharmaceuticals', manufacturer: 'BioHealth Labs Inc.', origin: 'United States', trust: 97.3 },
        { name: 'Single-Origin Chocolate Bar', sku: 'CHOCO-EC-006', category: 'Food & Beverage', manufacturer: 'Quito Cacao Collective', origin: 'Ecuador', trust: 92.7 },
        { name: 'Korean Beauty Serum', sku: 'BEAUTY-KR-007', category: 'Cosmetics', manufacturer: 'Seoul Glow Labs', origin: 'South Korea', trust: 95.4 },
        { name: 'Japanese Whisky 18 Year', sku: 'WHISKY-JP-008', category: 'Spirits', manufacturer: 'Yamazaki Distillery', origin: 'Japan', trust: 99.5 },
        { name: 'EV Battery Module Gen3', sku: 'BATT-DE-009', category: 'Electronics', manufacturer: 'Stuttgart Power GmbH', origin: 'Germany', trust: 91.2 },
        { name: 'Organic Baby Formula', sku: 'BABY-NZ-010', category: 'Baby Products', manufacturer: 'Pure NZ Nutrition', origin: 'New Zealand', trust: 98.8 },
        { name: 'Artisan Olive Oil Extra Virgin', sku: 'OIL-GR-011', category: 'Food & Beverage', manufacturer: 'Cretan Gold Estate', origin: 'Greece', trust: 93.6 },
        { name: 'Smart IoT Sensor Module', sku: 'IOT-TW-012', category: 'Electronics', manufacturer: 'Taipei Semi Inc.', origin: 'Taiwan', trust: 90.1 },
    ];

    const productIds = [];
    const qrIds = [];

    for (const p of products) {
        const pid = uuid();
        const qid = uuid();
        productIds.push(pid);
        qrIds.push(qid);
        const createdAt = past(Math.floor(Math.random() * 90) + 10);

        db.run(`INSERT OR IGNORE INTO products (id, name, sku, description, category, manufacturer, batch_number, origin_country, registered_by, trust_score, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pid, p.name, p.sku, `Premium ${p.category.toLowerCase()} product from ${p.origin}`, p.category, p.manufacturer, `BATCH-${Math.floor(Math.random() * 9000) + 1000}`, p.origin, adminId, p.trust, 'active', createdAt]);

        db.run(`INSERT OR IGNORE INTO qr_codes (id, product_id, qr_data, status, generated_at, expires_at) VALUES (?,?,?,?,?,?)`,
            [qid, pid, `TC-${p.sku}-${hash().slice(0, 8)}`, 'active', createdAt, future(365)]);

        // Trust score record
        db.run(`INSERT INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, calculated_at) VALUES (?,?,?,?,?,?,?,?)`,
            [uuid(), pid, p.trust, Math.random() * 5, 85 + Math.random() * 15, 90 + Math.random() * 10, 80 + Math.random() * 20, past(Math.floor(Math.random() * 5))]);
    }
    console.log(`✅ ${products.length} products + QR codes + trust scores`);

    // ─── 2. Scan Events (150 scans across products) ─────────────────
    const cities = ['Ho Chi Minh City', 'Tokyo', 'New York', 'London', 'Singapore', 'Paris', 'Seoul', 'Sydney', 'Berlin', 'Dubai', 'Bangkok', 'San Francisco', 'Mumbai', 'Shanghai', 'Toronto'];
    const countries = ['VN', 'JP', 'US', 'GB', 'SG', 'FR', 'KR', 'AU', 'DE', 'AE', 'TH', 'US', 'IN', 'CN', 'CA'];
    const results = ['authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'suspicious', 'counterfeit', 'authentic'];
    const scanIds = [];

    for (let i = 0; i < 150; i++) {
        const sid = uuid();
        scanIds.push(sid);
        const pidx = Math.floor(Math.random() * productIds.length);
        const cidx = Math.floor(Math.random() * cities.length);
        const result = results[Math.floor(Math.random() * results.length)];
        const fraudScore = result === 'authentic' ? Math.random() * 15 : result === 'suspicious' ? 30 + Math.random() * 40 : 70 + Math.random() * 30;
        const trustScore = 100 - fraudScore + (Math.random() * 10 - 5);

        db.run(`INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, ip_address, latitude, longitude, geo_city, geo_country, user_agent, result, fraud_score, trust_score, response_time_ms, scanned_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [sid, qrIds[pidx], productIds[pidx], 'validation',
                `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                (Math.random() * 140 - 40).toFixed(4), (Math.random() * 360 - 180).toFixed(4),
                cities[cidx], countries[cidx],
                'Mozilla/5.0 TrustChecker-Mobile/3.2',
                result, +fraudScore.toFixed(1), Math.max(0, Math.min(100, +trustScore.toFixed(1))),
                Math.floor(Math.random() * 300) + 50,
                past(Math.floor(Math.random() * 30))]);
    }
    console.log(`✅ 150 scan events`);

    // ─── 3. Fraud Alerts (18 alerts) ────────────────────────────────
    const alertTypes = ['velocity_anomaly', 'geo_mismatch', 'duplicate_scan', 'counterfeit_detected', 'unusual_pattern', 'compromised_qr'];
    const severities = ['low', 'medium', 'medium', 'high', 'critical', 'medium'];
    const alertStatuses = ['open', 'open', 'investigating', 'resolved', 'open'];

    for (let i = 0; i < 18; i++) {
        const pidx = Math.floor(Math.random() * productIds.length);
        const sidx = Math.floor(Math.random() * scanIds.length);
        const atype = Math.floor(Math.random() * alertTypes.length);

        db.run(`INSERT INTO fraud_alerts (id, scan_event_id, product_id, alert_type, severity, description, status, created_at) VALUES (?,?,?,?,?,?,?,?)`,
            [uuid(), scanIds[sidx], productIds[pidx], alertTypes[atype], severities[atype],
            `${alertTypes[atype].replace(/_/g, ' ')} detected for product scan`,
            alertStatuses[Math.floor(Math.random() * alertStatuses.length)],
            past(Math.floor(Math.random() * 14))]);
    }
    console.log(`✅ 18 fraud alerts`);

    // ─── 4. Blockchain Seals (40 seals) ─────────────────────────────
    for (let i = 0; i < 40; i++) {
        const eventTypes = ['product_registration', 'scan_validation', 'fraud_detection', 'supply_chain_update', 'certification_anchor'];
        const etype = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        db.run(`INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index, nonce, sealed_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), etype, scanIds[Math.floor(Math.random() * scanIds.length)] || uuid(),
            hash(), hash(), hash(),
            i + 1, Math.floor(Math.random() * 999999),
            past(Math.floor(Math.random() * 30))]);
    }
    console.log(`✅ 40 blockchain seals`);

    // ─── 5. Partners (8 supply chain partners) ──────────────────────
    const partnerData = [
        { name: 'Global Logistics Corp', type: 'logistics', country: 'Singapore', region: 'APAC', kyc: 'verified', trust: 92, risk: 'low' },
        { name: 'EuroDistri GmbH', type: 'distributor', country: 'Germany', region: 'EMEA', kyc: 'verified', trust: 88, risk: 'low' },
        { name: 'Pacific Trade Hub', type: 'distributor', country: 'Australia', region: 'APAC', kyc: 'verified', trust: 85, risk: 'medium' },
        { name: 'Saigon Supply Co.', type: 'manufacturer', country: 'Vietnam', region: 'APAC', kyc: 'verified', trust: 91, risk: 'low' },
        { name: 'Amazon FBA Warehousing', type: 'warehouse', country: 'United States', region: 'AMER', kyc: 'verified', trust: 95, risk: 'low' },
        { name: 'Dubai Free Zone Trading', type: 'distributor', country: 'UAE', region: 'MEA', kyc: 'pending', trust: 62, risk: 'high' },
        { name: 'Nordic Pharma Distribution', type: 'distributor', country: 'Sweden', region: 'EMEA', kyc: 'verified', trust: 97, risk: 'low' },
        { name: 'Shanghai Import-Export Ltd', type: 'manufacturer', country: 'China', region: 'APAC', kyc: 'under_review', trust: 55, risk: 'high' },
    ];

    const partnerIds = [];
    for (const p of partnerData) {
        const pid = uuid();
        partnerIds.push(pid);
        db.run(`INSERT INTO partners (id, name, type, country, region, contact_email, kyc_status, trust_score, risk_level, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [pid, p.name, p.type, p.country, p.region, `contact@${p.name.toLowerCase().replace(/\s+/g, '')}.com`, p.kyc, p.trust, p.risk, 'active', past(Math.floor(Math.random() * 120) + 30)]);
    }
    console.log(`✅ ${partnerData.length} supply chain partners`);

    // ─── 6. KYC Businesses (6 businesses) ───────────────────────────
    const kycData = [
        { name: 'Highland Farms Vietnam', reg: 'VN-BIZ-2024-0891', country: 'Vietnam', industry: 'Agriculture', status: 'approved', risk: 'low' },
        { name: 'Geneva Timepieces SA', reg: 'CH-HR-2019-4521', country: 'Switzerland', industry: 'Luxury Manufacturing', status: 'approved', risk: 'low' },
        { name: 'Milano Crafts SpA', reg: 'IT-REA-MI-2012345', country: 'Italy', industry: 'Fashion & Leather', status: 'approved', risk: 'medium' },
        { name: 'BioHealth Labs Inc.', reg: 'US-DE-2021-88712', country: 'United States', industry: 'Pharmaceuticals', status: 'approved', risk: 'low' },
        { name: 'Golden Dragon Trading', reg: 'HK-CR-2023-1234', country: 'Hong Kong', industry: 'Import/Export', status: 'pending', risk: 'high' },
        { name: 'Casablanca Textiles SARL', reg: 'MA-RC-2022-5678', country: 'Morocco', industry: 'Textiles', status: 'under_review', risk: 'medium' },
    ];

    for (const b of kycData) {
        const bid = uuid();
        db.run(`INSERT OR IGNORE INTO kyc_businesses (id, name, registration_number, country, industry, contact_email, risk_level, verification_status, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [bid, b.name, b.reg, b.country, b.industry, `compliance@${b.name.toLowerCase().replace(/\s+/g, '')}.com`, b.risk, b.status, past(Math.floor(Math.random() * 60) + 10)]);

        // Add KYC checks
        const checkTypes = ['identity_verification', 'sanctions_screening', 'document_verification'];
        for (const ct of checkTypes) {
            db.run(`INSERT INTO kyc_checks (id, business_id, check_type, provider, status, score, created_at) VALUES (?,?,?,?,?,?,?)`,
                [uuid(), bid, ct, 'TrustChecker AI', b.status === 'approved' ? 'passed' : 'pending', b.status === 'approved' ? 85 + Math.random() * 15 : Math.random() * 50, past(Math.floor(Math.random() * 30))]);
        }
    }
    console.log(`✅ ${kycData.length} KYC businesses + checks`);

    // ─── 7. Supply Chain Events (30 events) ─────────────────────────
    const sceTypes = ['manufactured', 'quality_check', 'shipped', 'in_transit', 'customs_cleared', 'delivered', 'received', 'warehouse_stored'];
    const locations = ['Ho Chi Minh City Factory', 'Singapore Hub', 'Rotterdam Port', 'JFK Air Cargo', 'Dubai Logistics Center', 'Sydney Distribution', 'Tokyo Warehouse', 'London Office'];

    for (let i = 0; i < 30; i++) {
        const etype = sceTypes[Math.floor(Math.random() * sceTypes.length)];
        db.run(`INSERT INTO supply_chain_events (id, event_type, product_id, uid, location, actor, partner_id, details, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), etype, productIds[Math.floor(Math.random() * productIds.length)],
            `UID-${Math.floor(Math.random() * 999999)}`,
            locations[Math.floor(Math.random() * locations.length)],
            ['Warehouse Manager', 'Quality Inspector', 'Logistics Coordinator', 'Customs Agent'][Math.floor(Math.random() * 4)],
            partnerIds[Math.floor(Math.random() * partnerIds.length)],
            JSON.stringify({ temperature: (2 + Math.random() * 6).toFixed(1) + '°C', humidity: (40 + Math.random() * 20).toFixed(0) + '%' }),
            past(Math.floor(Math.random() * 20))]);
    }
    console.log(`✅ 30 supply chain events`);

    // ─── 8. Evidence Items (8 items) ────────────────────────────────
    const evidenceData = [
        { title: 'ISO 9001 Certificate', type: 'certification', desc: 'Quality Management System certification document' },
        { title: 'Lab Test Report - Coffee Purity', type: 'lab_report', desc: 'Chemical analysis confirming 100% arabica beans' },
        { title: 'FDA Compliance Letter', type: 'compliance', desc: 'FDA approval letter for pharmaceutical product' },
        { title: 'Fair Trade Certificate', type: 'certification', desc: 'Fair Trade International certified supply chain' },
        { title: 'Chain of Custody Document', type: 'proof', desc: 'Full chain of custody from origin to retail' },
        { title: 'Product Photography Set', type: 'visual', desc: 'Professional product images for verification' },
        { title: 'Customs Declaration Form', type: 'legal', desc: 'Official customs clearance documentation' },
        { title: 'Sustainability Audit Report', type: 'audit', desc: 'Third-party environmental impact assessment' },
    ];

    for (const e of evidenceData) {
        db.run(`INSERT INTO evidence_items (id, title, description, file_name, file_type, file_size, sha256_hash, entity_type, entity_id, uploaded_by, verification_status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), e.title, e.desc, `${e.title.toLowerCase().replace(/\s+/g, '_')}.pdf`, 'application/pdf',
            Math.floor(Math.random() * 5000000) + 100000, hash(), 'product',
            productIds[Math.floor(Math.random() * productIds.length)], adminId,
            ['anchored', 'verified', 'anchored'][Math.floor(Math.random() * 3)],
            past(Math.floor(Math.random() * 30) + 5)]);
    }
    console.log(`✅ ${evidenceData.length} evidence items`);

    // ─── 9. Anomaly Detections (10 anomalies) ──────────────────────
    const anomalyTypes = ['velocity_spike', 'geo_anomaly', 'scan_pattern_deviation', 'trust_score_drop', 'unusual_access_pattern'];
    for (let i = 0; i < 10; i++) {
        const atype = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
        db.run(`INSERT INTO anomaly_detections (id, source_type, source_id, anomaly_type, severity, score, description, status, detected_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), 'scan_event', scanIds[Math.floor(Math.random() * scanIds.length)], atype,
            ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            +(20 + Math.random() * 70).toFixed(1),
            `${atype.replace(/_/g, ' ')} detected by AI engine`,
            ['open', 'investigating', 'resolved'][Math.floor(Math.random() * 3)],
            past(Math.floor(Math.random() * 14))]);
    }
    console.log(`✅ 10 anomaly detections`);

    // ─── 10. Sustainability Scores (for each product) ──────────────
    for (const pid of productIds) {
        db.run(`INSERT INTO sustainability_scores (id, product_id, carbon_footprint, water_usage, recyclability, ethical_sourcing, packaging_score, transport_score, overall_score, grade, assessed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), pid,
            +(Math.random() * 50).toFixed(1),
            +(Math.random() * 100).toFixed(1),
            +(60 + Math.random() * 40).toFixed(1),
            +(50 + Math.random() * 50).toFixed(1),
            +(40 + Math.random() * 60).toFixed(1),
            +(30 + Math.random() * 70).toFixed(1),
            +(60 + Math.random() * 35).toFixed(1),
            ['A', 'A', 'B', 'B', 'B', 'C'][Math.floor(Math.random() * 6)],
            past(Math.floor(Math.random() * 15))]);
    }
    console.log(`✅ ${productIds.length} sustainability scores`);

    // ─── 11. Audit Log (25 entries) ─────────────────────────────────
    const actions = ['user.login', 'product.create', 'scan.validate', 'alert.investigate', 'partner.verify', 'evidence.upload', 'settings.update', 'kyc.approve', 'seal.create', 'report.export'];
    for (let i = 0; i < 25; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        db.run(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, ip_address, timestamp) VALUES (?,?,?,?,?,?,?)`,
            [uuid(), adminId, action, action.split('.')[0], uuid(),
            `103.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            past(Math.floor(Math.random() * 7))]);
    }
    console.log(`✅ 25 audit log entries`);

    // ─── 12. NFT Certificates (5 certs) ────────────────────────────
    for (let i = 0; i < 5; i++) {
        db.run(`INSERT INTO nft_certificates (id, token_id, product_id, entity_type, entity_id, certificate_type, owner, metadata_hash, status, minted_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), 1000 + i, productIds[i], 'product', productIds[i],
            ['authenticity', 'origin', 'sustainability'][Math.floor(Math.random() * 3)],
                adminId, hash(), 'active', past(Math.floor(Math.random() * 30) + 5)]);
    }
    console.log(`✅ 5 NFT certificates`);

    // ─── 13. Billing & Usage ────────────────────────────────────────
    db.run(`INSERT INTO billing_plans (id, user_id, plan_name, scan_limit, api_limit, storage_mb, price_monthly, status) VALUES (?,?,?,?,?,?,?,?)`,
        [uuid(), adminId, 'enterprise', 50000, 100000, 10240, 299.00, 'active']);

    for (let i = 0; i < 6; i++) {
        db.run(`INSERT INTO usage_metrics (id, user_id, metric_type, value, period, created_at) VALUES (?,?,?,?,?,?)`,
            [uuid(), adminId,
            ['scans', 'api_calls', 'storage_mb'][Math.floor(Math.random() * 3)],
            Math.floor(Math.random() * 5000) + 100,
            `2026-0${i + 1}`,
            past(i * 30)]);
    }
    console.log(`✅ Billing plan + usage metrics`);

    // ─── Save ───────────────────────────────────────────────────────
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    db.close();

    console.log('\n🎉 Demo data seeded successfully!');
    console.log('   Restart PM2 to load: pm2 restart trustchecker');
})();
