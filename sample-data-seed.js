/**
 * TrustChecker — Sample Data Seeder v2
 * Matches actual VPS table schemas exactly.
 * Run: node sample-data-seed.js
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'trustchecker.db');

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const pastDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString(); };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const ORG_ID = 'trustchecker-demo';
const COUNTRIES = ['Vietnam', 'Singapore', 'Japan', 'Germany', 'USA', 'Australia', 'Thailand'];
const CITIES = ['Ho Chi Minh City', 'Hanoi', 'Singapore', 'Tokyo', 'Berlin', 'New York', 'Sydney'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

(async () => {
    console.log('🌱 TrustChecker Sample Data Seeder v2');
    console.log('─'.repeat(50));

    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    // Get user IDs
    const users = db.exec("SELECT id, email, role FROM users");
    const userMap = {};
    if (users[0]) users[0].values.forEach(([id, email, role]) => { userMap[role] = { id, email }; });
    const adminId = userMap.super_admin?.id || uuidv4();

    // ─── 1. PRODUCTS (id,name,sku,description,category,manufacturer,batch_number,origin_country,registered_by,trust_score,status,created_at,updated_at,org_id) ───
    console.log('📦 Seeding products...');
    const productIds = [];
    const products = [
        ['Robusta Premium Grade A', 'SKU-COF-001', 'Premium Vietnamese robusta beans, wet-hulled process', 'Coffee', 'VietCoffee Co', 'B-2026-001', 'Vietnam'],
        ['Arabica Single Origin DaLat', 'SKU-COF-002', 'High-altitude arabica from DaLat highlands', 'Coffee', 'DaLat Farms', 'B-2026-002', 'Vietnam'],
        ['Black Pepper Whole Grain', 'SKU-PEP-001', 'PhuQuoc island black pepper, sun-dried', 'Spices', 'PhuQuoc Pepper', 'B-2026-003', 'Vietnam'],
        ['White Pepper Ground', 'SKU-PEP-002', 'Premium white pepper, stone-ground', 'Spices', 'PhuQuoc Pepper', 'B-2026-004', 'Vietnam'],
        ['IoT Smart Sensor v3', 'SKU-IOT-001', 'Temperature & humidity smart sensor for supply chain', 'Electronics', 'SaigonTech', 'B-2026-005', 'Vietnam'],
        ['Blockchain Gateway Node', 'SKU-IOT-002', 'Dedicated blockchain anchoring hardware', 'Electronics', 'SaigonTech', 'B-2026-006', 'Vietnam'],
        ['Organic Cashew Premium', 'SKU-ORG-001', 'Certified organic cashews from Binh Phuoc', 'Organic', 'DaLat Farms', 'B-2026-007', 'Vietnam'],
        ['Dragon Fruit Export Grade', 'SKU-ORG-002', 'Red-flesh dragon fruit, export quality', 'Organic', 'DaLat Farms', 'B-2026-008', 'Vietnam'],
        ['Tiger Shrimp Frozen 1kg', 'SKU-SEA-001', 'Wild-caught tiger shrimp, IQF processed', 'Seafood', 'MekongSeafood', 'B-2026-009', 'Vietnam'],
        ['Silk Fabric Hoi An', 'SKU-TEX-001', 'Traditional Hoi An silk, hand-woven', 'Textiles', 'HoiAn Craft', 'B-2026-010', 'Vietnam'],
        ['Matcha Green Tea Grade A', 'SKU-TEA-001', 'Stone-ground matcha from high-altitude farms', 'Tea', 'DaLat Farms', 'B-2026-011', 'Vietnam'],
        ['Coconut Oil Virgin', 'SKU-COC-001', 'Cold-pressed virgin coconut oil, organic', 'Organic', 'BenTre Coco', 'B-2026-012', 'Vietnam'],
    ];
    for (const [name, sku, desc, cat, mfr, batch, country] of products) {
        const id = uuidv4();
        productIds.push(id);
        db.run(`INSERT OR IGNORE INTO products (id, name, sku, description, category, manufacturer, batch_number, origin_country, registered_by, trust_score, status, created_at, updated_at, org_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
            [id, name, sku, desc, cat, mfr, batch, country, adminId, randInt(65, 98), pastDate(randInt(30, 180)), pastDate(randInt(0, 7)), ORG_ID]);
    }
    console.log(`  ✓ ${products.length} products`);

    // ─── 2. QR CODES (id,product_id,qr_data,qr_image_base64,status,generated_at,expires_at,org_id,generated_by) ───
    console.log('📱 Seeding QR codes...');
    const qrIds = [];
    for (let i = 0; i < 50; i++) {
        const id = uuidv4();
        qrIds.push(id);
        db.run(`INSERT OR IGNORE INTO qr_codes (id, product_id, qr_data, status, generated_at, org_id, generated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, rand(productIds), `https://trustchecker.io/verify/${sha(id).slice(0, 12)}`,
                rand(['active', 'active', 'active', 'expired', 'revoked']),
                pastDate(randInt(1, 120)), ORG_ID, adminId]);
    }
    console.log(`  ✓ 50 QR codes`);

    // ─── 3. SCAN EVENTS (id,qr_code_id,product_id,scan_type,device_fingerprint,ip_address,latitude,longitude,geo_city,geo_country,user_agent,result,fraud_score,trust_score,response_time_ms,scanned_at) ───
    console.log('📡 Seeding scan events...');
    const scanIds = [];
    for (let i = 0; i < 200; i++) {
        const id = uuidv4();
        scanIds.push(id);
        db.run(`INSERT OR IGNORE INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, geo_city, geo_country, user_agent, result, fraud_score, trust_score, response_time_ms, scanned_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, rand(qrIds), rand(productIds),
                rand(['consumer', 'consumer', 'consumer', 'business', 'checkpoint']),
                sha(uuidv4()).slice(0, 16),
                `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
                randFloat(10, 35), randFloat(100, 140),
                rand(CITIES), rand(COUNTRIES),
                rand(['Mozilla/5.0 iPhone', 'Mozilla/5.0 Android', 'Mozilla/5.0 Chrome', 'TrustScanner/3.0']),
                rand(['authentic', 'authentic', 'authentic', 'authentic', 'suspect', 'counterfeit', 'warning']),
                randFloat(0, 0.9), randInt(50, 100), randInt(50, 500),
                pastDate(randInt(0, 90))]);
    }
    console.log(`  ✓ 200 scan events`);

    // ─── 4. FRAUD ALERTS (id,scan_event_id,product_id,alert_type,severity,description,details,status,resolved_by,resolved_at,created_at) ───
    console.log('🚨 Seeding fraud alerts...');
    const fraudTypes = ['duplicate_scan', 'geo_anomaly', 'velocity_spike', 'counterfeit_suspect', 'tampered_qr', 'unauthorized_distribution'];
    for (let i = 0; i < 30; i++) {
        const resolved = Math.random() > 0.6;
        db.run(`INSERT OR IGNORE INTO fraud_alerts (id, scan_event_id, product_id, alert_type, severity, description, details, status, resolved_by, resolved_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(scanIds), rand(productIds),
            rand(fraudTypes), rand(SEVERITIES),
            `Alert: ${rand(fraudTypes).replace(/_/g, ' ')} detected in ${rand(CITIES)}`,
            JSON.stringify({ confidence: randFloat(0.6, 0.99), model: 'fraud-v3.2', scans_analyzed: randInt(10, 100) }),
            resolved ? 'resolved' : rand(['open', 'open', 'investigating']),
            resolved ? (userMap.risk_officer?.email || 'risk@demo.trustchecker.io') : null,
            resolved ? pastDate(randInt(0, 5)) : null,
            pastDate(randInt(0, 45))]);
    }
    console.log(`  ✓ 30 fraud alerts`);

    // ─── 5. BLOCKCHAIN SEALS (id,event_type,event_id,data_hash,prev_hash,merkle_root,block_index,nonce,sealed_at) ───
    console.log('⛓ Seeding blockchain seals...');
    let prevHash = sha('genesis');
    for (let i = 0; i < 25; i++) {
        const dataHash = sha(uuidv4());
        db.run(`INSERT OR IGNORE INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index, nonce, sealed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(['product_registered', 'scan_verified', 'evidence_sealed', 'carbon_anchored']),
            rand(productIds), dataHash, prevHash, sha(dataHash + prevHash),
            i + 1, randInt(1000, 99999), pastDate(randInt(1, 60))]);
        prevHash = dataHash;
    }
    console.log(`  ✓ 25 blockchain seals`);

    // ─── 6. PARTNERS (id,name,type,country,region,contact_email,kyc_status,kyc_verified_at,trust_score,risk_level,status,created_at) ───
    console.log('🤝 Seeding partners...');
    const partnerData = [
        ['VinaCoffee Processing', 'processor', 'Vietnam', 'Southeast Asia'],
        ['GlobalTrade Logistics', 'logistics', 'Singapore', 'Southeast Asia'],
        ['EuroImport GmbH', 'distributor', 'Germany', 'Europe'],
        ['Pacific Shipping Co', 'carrier', 'Japan', 'East Asia'],
        ['FarmConnect VN', 'supplier', 'Vietnam', 'Southeast Asia'],
        ['QualityFirst Labs', 'testing_lab', 'Singapore', 'Southeast Asia'],
        ['GreenCert International', 'certifier', 'USA', 'North America'],
        ['AsiaWarehouse Ltd', 'warehouse', 'Thailand', 'Southeast Asia'],
        ['Tokyo Distribution Hub', 'distributor', 'Japan', 'East Asia'],
        ['Mekong River Farms', 'supplier', 'Vietnam', 'Southeast Asia'],
    ];
    const partnerIds = [];
    for (const [name, type, country, region] of partnerData) {
        const id = uuidv4();
        partnerIds.push(id);
        db.run(`INSERT OR IGNORE INTO partners (id, name, type, country, region, contact_email, kyc_status, kyc_verified_at, trust_score, risk_level, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [id, name, type, country, region, `contact@${name.toLowerCase().replace(/\s/g, '')}.com`,
                rand(['verified', 'verified', 'verified', 'pending']),
                pastDate(randInt(1, 30)), randInt(70, 98), rand(['low', 'low', 'medium', 'high']),
                pastDate(randInt(60, 365))]);
    }
    console.log(`  ✓ ${partnerData.length} partners`);

    // ─── 7. SHIPMENTS (id,batch_id,from_partner_id,to_partner_id,carrier,tracking_number,status,estimated_delivery,actual_delivery,current_lat,current_lng,gps_trail,created_at,updated_at) ───
    console.log('🚚 Seeding shipments...');
    for (let i = 0; i < 40; i++) {
        const status = rand(['in_transit', 'in_transit', 'delivered', 'pending', 'delayed', 'customs']);
        db.run(`INSERT OR IGNORE INTO shipments (id, batch_id, from_partner_id, to_partner_id, carrier, tracking_number, status, estimated_delivery, current_lat, current_lng, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), `B-2026-${String(randInt(1, 50)).padStart(3, '0')}`,
            rand(partnerIds), rand(partnerIds),
            rand(['Pacific Shipping', 'DHL Express', 'Maersk', 'FedEx', 'Vietnam Airlines Cargo']),
            `TRK-${sha(uuidv4()).slice(0, 12).toUpperCase()}`,
                status, pastDate(-randInt(1, 14)),
            randFloat(10, 35), randFloat(100, 140),
            pastDate(randInt(1, 30)), pastDate(randInt(0, 3))]);
    }
    console.log(`  ✓ 40 shipments`);

    // ─── 8. INVENTORY (id,product_id,batch_id,partner_id,location,quantity,min_stock,max_stock,last_sync,updated_at) ───
    console.log('📋 Seeding inventory...');
    for (const pid of productIds) {
        db.run(`INSERT OR IGNORE INTO inventory (id, product_id, batch_id, partner_id, location, quantity, min_stock, max_stock, last_sync, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), pid, `B-2026-${String(randInt(1, 12)).padStart(3, '0')}`, rand(partnerIds),
            rand(['WH-HCM-01', 'WH-HN-02', 'WH-SG-01', 'WH-TK-01']),
            randInt(50, 5000), randInt(20, 100), randInt(5000, 10000),
            pastDate(0), pastDate(0)]);
    }
    console.log(`  ✓ ${productIds.length} inventory records`);

    // ─── 9. SUPPLY CHAIN EVENTS (id,event_type,product_id,batch_id,uid,location,actor,partner_id,details,created_at) ───
    console.log('📊 Seeding supply chain events...');
    const scmTypes = ['harvest', 'processing', 'packaging', 'shipping', 'customs_clearance', 'warehouse_receipt', 'quality_check', 'distribution'];
    for (let i = 0; i < 100; i++) {
        db.run(`INSERT OR IGNORE INTO supply_chain_events (id, event_type, product_id, batch_id, uid, location, actor, partner_id, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(scmTypes), rand(productIds),
            `B-2026-${String(randInt(1, 12)).padStart(3, '0')}`,
            `EVT-${sha(uuidv4()).slice(0, 10)}`,
            `${rand(CITIES)}, ${rand(COUNTRIES)}`,
            rand(['FarmConnect', 'VinaCoffee', 'GlobalTrade', 'QualityFirst']),
            rand(partnerIds),
            JSON.stringify({ temp: randFloat(18, 28), humidity: randFloat(40, 80) }),
            pastDate(randInt(0, 60))]);
    }
    console.log(`  ✓ 100 supply chain events`);

    // ─── 10. COMPLIANCE RECORDS (id,entity_type,entity_id,framework,requirement,status,evidence,checked_by,next_review,created_at) ───
    console.log('📜 Seeding compliance records...');
    const frameworks = ['GDPR', 'ISO27001', 'FDA', 'EUDR', 'SOC2', 'HACCP'];
    for (let i = 0; i < 20; i++) {
        db.run(`INSERT OR IGNORE INTO compliance_records (id, entity_type, entity_id, framework, requirement, status, evidence, checked_by, next_review, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(['product', 'partner', 'process']), rand(productIds),
            rand(frameworks), `${rand(frameworks)} Article ${randInt(1, 50)} compliance check`,
            rand(['compliant', 'compliant', 'compliant', 'non_compliant', 'pending']),
            JSON.stringify({ score: randInt(70, 100), auditor: 'QualityFirst Labs' }),
            userMap.compliance_officer?.email || 'compliance@demo.trustchecker.io',
            pastDate(-randInt(30, 90)),
            pastDate(randInt(0, 60))]);
    }
    console.log(`  ✓ 20 compliance records`);

    // ─── 11. AUDIT LOG ───
    console.log('📝 Seeding audit log...');
    const auditActions = ['user.login', 'user.logout', 'product.create', 'product.update', 'qr.generate', 'qr.scan',
        'fraud.alert_created', 'fraud.resolved', 'role.assigned', 'permission.granted',
        'export.requested', 'compliance.reviewed', 'shipment.created', 'partner.verified',
        'blockchain.anchored', 'settings.updated', 'password.changed', 'mfa.enabled'];
    for (let i = 0; i < 100; i++) {
        const role = rand(Object.keys(userMap));
        const u = userMap[role];
        db.run(`INSERT OR IGNORE INTO audit_log (id, actor_id, actor_email, actor_role, action, entity_type, entity_id, resource, details, ip_address, severity, tenant_id, timestamp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), u?.id || adminId, u?.email || 'system', role,
            rand(auditActions), rand(['product', 'user', 'qr_code', 'shipment', 'partner']),
            uuidv4(), rand(['product', 'user', 'qr_code', 'settings']),
            JSON.stringify({ source: 'system' }),
            `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
            rand(['info', 'info', 'info', 'warning', 'critical']),
                ORG_ID, pastDate(randInt(0, 30)), pastDate(randInt(0, 30))]);
    }
    console.log(`  ✓ 100 audit log entries`);

    // ─── 12. ANOMALY DETECTIONS (id,source_type,source_id,anomaly_type,severity,score,description,details,status,detected_at,resolved_at) ───
    console.log('⚡ Seeding anomaly detections...');
    const anomalyTypes = ['scan_velocity_spike', 'geo_impossible', 'batch_deviation', 'temperature_breach', 'duplicate_pattern', 'supply_gap'];
    for (let i = 0; i < 15; i++) {
        db.run(`INSERT OR IGNORE INTO anomaly_detections (id, source_type, source_id, anomaly_type, severity, score, description, details, status, detected_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(['scan_event', 'shipment', 'product']), rand(scanIds.length ? scanIds : productIds),
            rand(anomalyTypes), rand(SEVERITIES), randFloat(0.5, 1.0),
            `Anomaly: ${rand(anomalyTypes).replace(/_/g, ' ')} detected in ${rand(CITIES)}`,
            JSON.stringify({ model: 'anomaly-v2.1', confidence: randFloat(0.7, 0.99) }),
            rand(['open', 'open', 'investigating', 'resolved']),
            pastDate(randInt(0, 30))]);
    }
    console.log(`  ✓ 15 anomaly detections`);

    // ─── 13. SUSTAINABILITY SCORES (id,product_id,carbon_footprint,water_usage,recyclability,ethical_sourcing,packaging_score,transport_score,overall_score,grade,certifications,assessed_by,assessed_at) ───
    console.log('🌿 Seeding sustainability scores...');
    for (const pid of productIds) {
        db.run(`INSERT OR IGNORE INTO sustainability_scores (id, product_id, carbon_footprint, water_usage, recyclability, ethical_sourcing, packaging_score, transport_score, overall_score, grade, certifications, assessed_by, assessed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), pid, randFloat(0.5, 15.0), randFloat(100, 5000),
            randInt(50, 100), randInt(60, 100), randInt(50, 100), randInt(40, 100),
            randFloat(55, 98), rand(['A', 'A', 'B', 'B', 'C']),
            JSON.stringify(rand([['Organic', 'FairTrade'], ['Rainforest Alliance'], ['UTZ', 'GlobalG.A.P.'], []])),
            userMap.carbon_officer?.email || 'carbon@demo.trustchecker.io',
            pastDate(randInt(0, 30))]);
    }
    console.log(`  ✓ ${productIds.length} sustainability scores`);

    // ─── 14. CARBON CREDITS ───
    console.log('🌱 Seeding carbon credits...');
    for (let i = 0; i < 10; i++) {
        db.run(`INSERT OR IGNORE INTO carbon_credits (id, credit_id, serial_number, status, quantity_tCO2e, quantity_kgCO2e, vintage_year, project_name, project_type, origin_region, mrv_confidence, tenant_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), `CC-${randInt(10000, 99999)}`, `VN-${randInt(100000, 999999)}`,
            rand(['pending', 'verified', 'minted', 'retired']),
            randFloat(10, 500), randFloat(10000, 500000),
            randInt(2023, 2026),
            rand(['Vietnam Coffee Carbon Project', 'Mekong Reforestation', 'Solar Farm BinhDuong', 'Mangrove Restoration']),
            rand(['avoidance', 'removal', 'reduction']),
            rand(['Vietnam', 'Southeast Asia', 'Mekong Delta']),
            randFloat(0.8, 0.99), ORG_ID, pastDate(randInt(0, 90))]);
    }
    console.log(`  ✓ 10 carbon credits`);

    // ─── 15. EVIDENCE ITEMS ───
    console.log('🔒 Seeding evidence items...');
    for (let i = 0; i < 15; i++) {
        db.run(`INSERT OR IGNORE INTO evidence_items (id, title, description, file_name, file_type, sha256_hash, entity_type, entity_id, uploaded_by, verification_status, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(),
            rand(['Fraud Investigation Report', 'Compliance Audit Certificate', 'Product Lab Results', 'Shipping Temperature Log', 'Quality Inspection Photo']),
                'Evidence item for compliance and governance audit trail',
            `evidence_${randInt(1000, 9999)}.${rand(['pdf', 'jpg', 'csv', 'docx'])}`,
            rand(['application/pdf', 'image/jpeg', 'text/csv']),
            sha(uuidv4()),
            rand(['fraud_alert', 'compliance_record', 'product']), rand(productIds),
            userMap.compliance_officer?.id || adminId,
            rand(['pending', 'verified', 'verified']),
            rand(['active', 'sealed']),
            pastDate(randInt(0, 60))]);
    }
    console.log(`  ✓ 15 evidence items`);

    // ─── 16. KYC BUSINESSES ───
    console.log('🏢 Seeding KYC businesses...');
    const kycNames = ['VinGroup Trading', 'Mekong Export Co', 'Saigon Spices Ltd', 'HanoiTech Solutions', 'Pacific Ocean Foods', 'Green Valley Organics'];
    for (const name of kycNames) {
        db.run(`INSERT OR IGNORE INTO kyc_businesses (id, name, registration_number, country, industry, contact_email, risk_level, verification_status, verified_at, created_at, org_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), name, `REG-${randInt(100000, 999999)}`,
            rand(COUNTRIES), rand(['Agriculture', 'Manufacturing', 'Logistics', 'Technology']),
            `contact@${name.toLowerCase().replace(/\s/g, '')}.com`,
            rand(['low', 'medium', 'high']),
            rand(['verified', 'verified', 'pending', 'flagged']),
            pastDate(randInt(1, 30)), pastDate(randInt(30, 180)), ORG_ID]);
    }
    console.log(`  ✓ ${kycNames.length} KYC businesses`);

    // ─── 17. TRUST SCORES (id,product_id,score,fraud_factor,consistency_factor,compliance_factor,history_factor,explanation,calculated_at) ───
    console.log('⭐ Seeding trust scores...');
    for (const pid of productIds) {
        db.run(`INSERT OR IGNORE INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, explanation, calculated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), pid, randInt(60, 99),
            randFloat(0.7, 1.0), randFloat(0.6, 1.0), randFloat(0.7, 1.0), randFloat(0.5, 1.0),
            JSON.stringify({ provenance: 'verified', blockchain: 'anchored', compliance: 'passed' }),
            pastDate(randInt(0, 7))]);
    }
    console.log(`  ✓ ${productIds.length} trust scores`);

    // ─── 18. NFT CERTIFICATES ───
    console.log('🎨 Seeding NFT certificates...');
    for (let i = 0; i < 8; i++) {
        db.run(`INSERT OR IGNORE INTO nft_certificates (id, token_id, product_id, entity_type, entity_id, certificate_type, issuer, owner, metadata_hash, status, minted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), randInt(1, 9999), rand(productIds),
                'product', rand(productIds),
            rand(['authenticity', 'origin', 'organic', 'sustainability']),
                'TrustChecker Platform', ORG_ID, sha(uuidv4()),
            rand(['minted', 'minted', 'pending']),
            pastDate(randInt(1, 60))]);
    }
    console.log(`  ✓ 8 NFT certificates`);

    // ─── 19. LEAK ALERTS ───
    console.log('🔍 Seeding leak alerts...');
    for (let i = 0; i < 8; i++) {
        db.run(`INSERT OR IGNORE INTO leak_alerts (id, product_id, platform, url, listing_title, listing_price, authorized_price, region_detected, leak_type, risk_score, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(productIds),
            rand(['Shopee', 'Lazada', 'Amazon', 'Alibaba', 'Facebook Market']),
            `https://${rand(['shopee.vn', 'lazada.vn', 'amazon.com'])}/listing/${randInt(10000, 99999)}`,
            `${rand(['Cheap', 'Discount', 'Wholesale'])} ${rand(['Coffee', 'Pepper', 'Tea'])} - Best Price`,
            randFloat(5, 30), randFloat(30, 90),
            rand(COUNTRIES), rand(['unauthorized_seller', 'price_violation', 'grey_market', 'counterfeit_listing']),
            randFloat(0.5, 1.0),
            rand(['open', 'investigating', 'resolved']),
            pastDate(randInt(0, 30))]);
    }
    console.log(`  ✓ 8 leak alerts`);

    // ─── 20. SUPPORT TICKETS ───
    console.log('💬 Seeding support tickets...');
    for (let i = 0; i < 10; i++) {
        db.run(`INSERT OR IGNORE INTO support_tickets (id, user_id, subject, description, category, priority, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), rand(Object.values(userMap)).id,
            rand(['Login issue', 'QR not scanning', 'Report export failed', 'Permission denied error', 'Billing question', 'Feature request: bulk QR', 'API rate limit hit']),
                'Sample support ticket for demo purposes. Customer needs assistance.',
            rand(['technical', 'billing', 'feature', 'security']),
            rand(SEVERITIES),
            rand(['open', 'open', 'in_progress', 'resolved', 'closed']),
            pastDate(randInt(0, 30))]);
    }
    console.log(`  ✓ 10 support tickets`);

    // ─── 21. USAGE METRICS ───
    console.log('📈 Seeding usage metrics...');
    for (let d = 0; d < 30; d++) {
        const date = pastDate(d);
        db.run(`INSERT OR IGNORE INTO usage_metrics (id, user_id, metric_type, value, period, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), adminId, 'api_calls', randInt(500, 5000), 'daily', date]);
        db.run(`INSERT OR IGNORE INTO usage_metrics (id, user_id, metric_type, value, period, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), adminId, 'scans', randInt(50, 500), 'daily', date]);
        db.run(`INSERT OR IGNORE INTO usage_metrics (id, user_id, metric_type, value, period, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), adminId, 'storage_mb', randInt(200, 800), 'daily', date]);
    }
    console.log(`  ✓ 90 usage metrics (30 days × 3 types)`);

    // ─── SAVE ─────────────────────────────────────────────────────
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ SAMPLE DATA SEED COMPLETE');
    console.log(`  DB size: ${(buffer.length / 1024).toFixed(0)} KB`);
    console.log('  Products: 12  |  QR Codes: 50  |  Scans: 200');
    console.log('  Fraud: 30  |  Partners: 10  |  Shipments: 40');
    console.log('  SCM Events: 100  |  Compliance: 20  |  Audit: 100');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
})();
