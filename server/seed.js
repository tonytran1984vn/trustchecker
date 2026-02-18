/**
 * TrustChecker Database Seeder
 * Creates demo data for demonstrations and testing
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const blockchainEngine = require('./engines/blockchain');

async function seed() {
    console.log('🌱 Seeding TrustChecker database...\n');

    // ─── Users ───────────────────────────────────────────────────────────
    const adminId = uuidv4();
    const managerId = uuidv4();
    const operatorId = uuidv4();
    const viewerId = uuidv4();
    const adminHash = await bcrypt.hash('admin123', 12);
    const mgrHash = await bcrypt.hash('manager123', 12);
    const opHash = await bcrypt.hash('operator123', 12);
    const viewHash = await bcrypt.hash('viewer123', 12);

    db.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash, role, company)
    VALUES (?, ?, ?, ?, ?, ?)`).run(adminId, 'admin', 'admin@trustchecker.io', adminHash, 'admin', 'TrustChecker Corp');
    db.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash, role, company)
    VALUES (?, ?, ?, ?, ?, ?)`).run(managerId, 'manager', 'manager@trustchecker.io', mgrHash, 'manager', 'TrustChecker Corp');
    db.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash, role, company)
    VALUES (?, ?, ?, ?, ?, ?)`).run(operatorId, 'operator', 'operator@trustchecker.io', opHash, 'operator', 'TrustChecker Corp');
    db.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash, role, company)
    VALUES (?, ?, ?, ?, ?, ?)`).run(viewerId, 'viewer', 'viewer@trustchecker.io', viewHash, 'viewer', 'TrustChecker Corp');

    console.log('✅ Users created: admin / admin123  |  manager / manager123  |  operator / operator123  |  viewer / viewer123');

    // ─── Products ────────────────────────────────────────────────────────
    const products = [
        { name: 'Premium Organic Coffee – Đà Lạt Reserve', sku: 'COFFEE-DL-001', category: 'F&B', manufacturer: 'Highland Coffee Co.', batch: 'BATCH-2026-001', origin: 'Vietnam' },
        { name: 'Artisan Chocolate – Single Origin 72%', sku: 'CHOCO-SO-002', category: 'F&B', manufacturer: 'Marou Chocolate', batch: 'BATCH-2026-002', origin: 'Vietnam' },
        { name: 'Smart Watch – TrustWear Pro X1', sku: 'WATCH-TW-003', category: 'Electronics', manufacturer: 'TrustTech Industries', batch: 'BATCH-2026-003', origin: 'Japan' },
        { name: 'Luxury Handbag – Heritage Collection', sku: 'BAG-HC-004', category: 'Fashion', manufacturer: 'Maison Luxe', batch: 'BATCH-2026-004', origin: 'France' },
        { name: 'Pharmaceutical – VitaShield Immune Boost', sku: 'PHARMA-VS-005', category: 'Healthcare', manufacturer: 'BioPharm Labs', batch: 'BATCH-2026-005', origin: 'Switzerland' },
        { name: 'Industrial Bearing – Grade A Titanium', sku: 'IND-BRG-006', category: 'Industrial', manufacturer: 'PrecisionMax Engineering', batch: 'BATCH-2026-006', origin: 'Germany' },
        { name: 'Organic Rice – Mekong Delta Premium', sku: 'RICE-MK-007', category: 'Agriculture', manufacturer: 'Mekong Harvest Co.', batch: 'BATCH-2026-007', origin: 'Vietnam' },
        { name: 'EV Battery Module – LFP 280Ah', sku: 'BAT-EV-008', category: 'Energy', manufacturer: 'VoltEdge Power', batch: 'BATCH-2026-008', origin: 'South Korea' },
    ];

    const createdProducts = [];

    for (const p of products) {
        const productId = uuidv4();
        const qrCodeId = uuidv4();
        const qrData = `TC:${productId}:${p.sku}:${Date.now()}`;

        const qrImageBase64 = await QRCode.toDataURL(qrData, {
            width: 300, margin: 2,
            color: { dark: '#0ff', light: '#0a0a1a' }
        });

        db.prepare(`INSERT INTO products (id, name, sku, description, category, manufacturer, batch_number, origin_country, registered_by, trust_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            productId, p.name, p.sku, `Authentic ${p.name} – verified by TrustChecker`, p.category, p.manufacturer, p.batch, p.origin, adminId, 85 + Math.floor(Math.random() * 15)
        );

        db.prepare(`INSERT INTO qr_codes (id, product_id, qr_data, qr_image_base64)
      VALUES (?, ?, ?, ?)`).run(qrCodeId, productId, qrData, qrImageBase64);

        createdProducts.push({ id: productId, qr_code_id: qrCodeId, qr_data: qrData, name: p.name });
        console.log(`  📦 ${p.name} (${p.sku})`);
    }

    console.log(`✅ ${products.length} products created with QR codes\n`);

    // ─── Simulate Scan Events ─────────────────────────────────────────────
    const cities = [
        { city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297 },
        { city: 'Ha Noi', country: 'Vietnam', lat: 21.0278, lng: 105.8342 },
        { city: 'Da Nang', country: 'Vietnam', lat: 16.0544, lng: 108.2022 },
        { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
        { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
        { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
    ];

    let scanCount = 0;
    for (const product of createdProducts) {
        const numScans = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < numScans; i++) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            const scanId = uuidv4();
            const result = Math.random() > 0.15 ? 'valid' : (Math.random() > 0.5 ? 'warning' : 'suspicious');
            const fraudScore = result === 'valid' ? Math.random() * 0.2 : 0.3 + Math.random() * 0.5;
            const trustScore = Math.max(0, 100 - fraudScore * 80);

            // Simulate timestamps across last 7 days
            const daysAgo = Math.floor(Math.random() * 7);
            const hoursAgo = Math.floor(Math.random() * 24);

            db.prepare(`
        INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, geo_city, geo_country, result, fraud_score, trust_score, response_time_ms, scanned_at)
        VALUES (?, ?, ?, 'validation', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${daysAgo} days', '-${hoursAgo} hours'))
      `).run(
                scanId, product.qr_code_id, product.id,
                `device-${Math.random().toString(36).substring(7)}`,
                `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                city.lat + (Math.random() - 0.5) * 0.1,
                city.lng + (Math.random() - 0.5) * 0.1,
                city.city, city.country,
                result, fraudScore, trustScore,
                15 + Math.floor(Math.random() * 40)
            );
            scanCount++;

            // Create fraud alerts for suspicious scans
            if (result !== 'valid') {
                db.prepare(`
          INSERT INTO fraud_alerts (id, scan_event_id, product_id, alert_type, severity, description, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'open', datetime('now', '-${daysAgo} days', '-${hoursAgo} hours'))
        `).run(
                    uuidv4(), scanId, product.id,
                    result === 'suspicious' ? 'STATISTICAL_ANOMALY' : 'HIGH_FREQUENCY_SCAN',
                    result === 'suspicious' ? 'high' : 'medium',
                    `${result === 'suspicious' ? 'Anomaly detected' : 'Elevated scan frequency'} for ${product.name}`
                );
            }
        }
    }
    console.log(`✅ ${scanCount} scan events simulated\n`);

    // ─── Blockchain Seals ──────────────────────────────────────────────────
    for (let i = 0; i < 15; i++) {
        const product = createdProducts[i % createdProducts.length];
        await blockchainEngine.seal('QRValidated', uuidv4(), {
            product_id: product.id,
            result: 'valid',
            demo: true
        });
    }
    console.log('✅ 15 blockchain seals created\n');

    // ─── Audit Log ─────────────────────────────────────────────────────────
    db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, details) VALUES (?, ?, ?, ?, ?)`)
        .run(uuidv4(), adminId, 'SYSTEM_SEEDED', 'system', JSON.stringify({ products: products.length, scans: scanCount }));

    // ─── SCM: Partners ────────────────────────────────────────────────────
    const partnerData = [
        { name: 'Saigon Distribution Co.', type: 'distributor', country: 'VN', region: 'South', email: 'ops@saigondist.vn', kyc: 'verified' },
        { name: 'Singapore Logistics Hub', type: '3pl', country: 'SG', region: 'SEA', email: 'hub@sglog.sg', kyc: 'verified' },
        { name: 'Tokyo Retail Corp', type: 'retailer', country: 'JP', region: 'Asia', email: 'retail@tokyorc.jp', kyc: 'verified' },
        { name: 'Hanoi Manufacturing', type: 'oem', country: 'VN', region: 'North', email: 'factory@hanoim.vn', kyc: 'pending' },
        { name: 'Paris Luxury Imports', type: 'distributor', country: 'FR', region: 'Europe', email: 'import@parislux.fr', kyc: 'verified' },
        { name: 'Shenzhen Components Ltd', type: 'oem', country: 'CN', region: 'Asia', email: 'parts@szcomp.cn', kyc: 'failed' },
    ];
    const createdPartners = [];
    for (const p of partnerData) {
        const id = uuidv4();
        const trustScore = p.kyc === 'verified' ? 70 + Math.floor(Math.random() * 25) : 30 + Math.floor(Math.random() * 30);
        db.prepare(`INSERT INTO partners (id, name, type, country, region, contact_email, kyc_status, kyc_verified_at, trust_score, risk_level, api_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, p.name, p.type, p.country, p.region, p.email, p.kyc,
            p.kyc === 'verified' ? new Date().toISOString() : null,
            trustScore, trustScore >= 70 ? 'low' : trustScore >= 50 ? 'medium' : 'high',
            `tc_${uuidv4().replace(/-/g, '').substring(0, 24)}`
        );
        createdPartners.push({ id, name: p.name, type: p.type });
    }
    console.log(`✅ ${partnerData.length} partners onboarded\n`);

    // ─── SCM: Batches ─────────────────────────────────────────────────────
    const createdBatches = [];
    for (let i = 0; i < createdProducts.length; i++) {
        const batchId = uuidv4();
        const qty = 100 + Math.floor(Math.random() * 900);
        db.prepare(`INSERT INTO batches (id, batch_number, product_id, quantity, manufactured_date, expiry_date, origin_facility, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            batchId, `BATCH-2026-${String(i + 1).padStart(3, '0')}`, createdProducts[i].id, qty,
            '2026-01-15', '2027-01-15', ['Da Lat Factory', 'HCMC Plant', 'Hanoi Works', 'Tokyo Lab'][i % 4],
            'active'
        );
        createdBatches.push({ id: batchId, product_id: createdProducts[i].id });
    }
    console.log(`✅ ${createdBatches.length} batches created\n`);

    // ─── SCM: Supply Chain Events ──────────────────────────────────────────
    const eventTypes = ['commission', 'pack', 'ship', 'receive', 'sell'];
    let scmEventCount = 0;
    for (const batch of createdBatches) {
        for (const et of eventTypes) {
            const partnerId = createdPartners[Math.floor(Math.random() * createdPartners.length)].id;
            const seal = await blockchainEngine.seal('SCMEvent', uuidv4(), { event_type: et, batch_id: batch.id });
            await db.prepare(`INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, location, actor, partner_id, details, blockchain_seal_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${Math.floor(Math.random() * 14)} days'))`).run(
                uuidv4(), et, batch.product_id, batch.id,
                ['HCMC Warehouse', 'SGP Hub', 'Tokyo DC', 'Hanoi Factory', 'Paris Store'][Math.floor(Math.random() * 5)],
                'system', partnerId, JSON.stringify({ auto_seeded: true }), seal.seal_id
            );
            scmEventCount++;
        }
    }
    console.log(`✅ ${scmEventCount} supply chain events recorded\n`);

    // ─── SCM: Inventory ────────────────────────────────────────────────────
    for (const batch of createdBatches) {
        const partnerId = createdPartners[Math.floor(Math.random() * createdPartners.length)].id;
        db.prepare(`INSERT INTO inventory (id, product_id, batch_id, partner_id, location, quantity, min_stock, max_stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), batch.product_id, batch.id, partnerId,
            ['HCMC Warehouse', 'SGP Hub', 'Tokyo DC'][Math.floor(Math.random() * 3)],
            50 + Math.floor(Math.random() * 200), 20, 500
        );
    }
    console.log(`✅ Inventory records seeded\n`);

    // ─── SCM: Shipments + IoT ──────────────────────────────────────────────
    for (let i = 0; i < Math.min(6, createdBatches.length); i++) {
        const shipId = uuidv4();
        const fromP = createdPartners[i % createdPartners.length];
        const toP = createdPartners[(i + 1) % createdPartners.length];
        const statuses = ['delivered', 'in_transit', 'pending', 'delivered', 'delivered', 'in_transit'];
        const daysAgo = Math.floor(Math.random() * 10);
        db.prepare(`INSERT INTO shipments (id, batch_id, from_partner_id, to_partner_id, carrier, tracking_number, status, estimated_delivery, actual_delivery, current_lat, current_lng, gps_trail, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${daysAgo} days'))`).run(
            shipId, createdBatches[i].id, fromP.id, toP.id,
            ['DHL Express', 'FedEx', 'Vietnam Post', 'Kerry Logistics'][i % 4],
            `TRK-${Date.now()}-${i}`, statuses[i],
            new Date(Date.now() + 86400000 * 3).toISOString(),
            statuses[i] === 'delivered' ? new Date(Date.now() - 86400000 * (daysAgo - 1)).toISOString() : null,
            10.8 + Math.random() * 25, 100 + Math.random() * 40,
            JSON.stringify([
                { lat: 10.8, lng: 106.6, timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
                { lat: 1.35, lng: 103.8, timestamp: new Date(Date.now() - 86400000 * 2).toISOString() }
            ])
        );

        // IoT readings for each shipment
        for (let r = 0; r < 5; r++) {
            const temp = 2 + Math.random() * 25; // -5 to 30
            const humidity = 30 + Math.random() * 50;
            db.prepare(`INSERT INTO iot_readings (id, shipment_id, sensor_type, value, unit, threshold_min, threshold_max, alert_triggered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
                uuidv4(), shipId, 'temperature', Math.round(temp * 10) / 10, 'C', -5, 25, temp > 25 ? 1 : 0
            );
            db.prepare(`INSERT INTO iot_readings (id, shipment_id, sensor_type, value, unit, threshold_min, threshold_max, alert_triggered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
                uuidv4(), shipId, 'humidity', Math.round(humidity * 10) / 10, '%', 20, 80, humidity > 80 ? 1 : 0
            );
        }
    }
    console.log('✅ Shipments + IoT readings seeded\n');

    // ─── SCM: SLA Definitions + Violations ────────────────────────────────
    for (const p of createdPartners) {
        const slaId = uuidv4();
        db.prepare(`INSERT INTO sla_definitions (id, partner_id, sla_type, metric, threshold_value, threshold_unit, penalty_amount, penalty_currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(slaId, p.id, 'delivery', 'delivery_time', 48, 'hours', 500, 'USD');

        // ~30% chance of SLA violation
        if (Math.random() < 0.3) {
            db.prepare(`INSERT INTO sla_violations (id, sla_id, partner_id, violation_type, actual_value, threshold_value, penalty_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
                uuidv4(), slaId, p.id, 'late_delivery', 60 + Math.floor(Math.random() * 40), 48, 500, 'open'
            );
        }
    }
    console.log('✅ SLA definitions + violations seeded\n');

    // ─── SCM: Leak Alerts ─────────────────────────────────────────────────
    const platforms = ['Shopee', 'Lazada', 'Amazon', 'eBay', 'Alibaba'];
    const leakTypes = ['unauthorized_region', 'price_dumping', 'gray_market', 'parallel_import'];
    for (let i = 0; i < 8; i++) {
        const product = createdProducts[i % createdProducts.length];
        const platform = platforms[i % platforms.length];
        const leakType = leakTypes[i % leakTypes.length];
        const basePrice = 50 + Math.random() * 150;
        db.prepare(`INSERT INTO leak_alerts (id, product_id, platform, url, listing_title, listing_price, authorized_price, region_detected, authorized_regions, leak_type, risk_score, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), product.id, platform,
            `https://${platform.toLowerCase()}.com/item/${Math.floor(Math.random() * 9999999)}`,
            `${product.name} – ${leakType === 'price_dumping' ? 'FLASH SALE' : 'Imported'}`,
            Math.round((leakType === 'price_dumping' ? basePrice * 0.4 : basePrice * 0.8) * 100) / 100,
            Math.round(basePrice * 100) / 100,
            ['CN', 'TH', 'KR', 'RU', 'IN'][i % 5],
            JSON.stringify(['VN', 'SG', 'US', 'JP']),
            leakType, 0.5 + Math.random() * 0.45, 'open'
        );
    }
    console.log('✅ 8 leak alerts seeded\n');

    // ─── SCM: Supply Chain Graph ──────────────────────────────────────────
    // Create edges between partners
    for (let i = 0; i < createdPartners.length - 1; i++) {
        db.prepare(`INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), createdPartners[i].id, createdPartners[i].type,
            createdPartners[i + 1].id, createdPartners[i + 1].type,
            ['supplies', 'distributes', 'manufactures', 'retails'][i % 4],
            1 + Math.random() * 3, Math.random() * 0.5
        );
    }
    // Add some cross-edges
    db.prepare(`INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        uuidv4(), createdPartners[createdPartners.length - 1].id, 'oem',
        createdPartners[0].id, 'distributor', 'supplies', 2.0, 0.3
    );
    db.prepare(`INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        uuidv4(), createdPartners[2].id, 'retailer',
        createdPartners[4].id, 'distributor', 'distributes', 1.5, 0.1
    );
    console.log('✅ Supply chain graph edges seeded\n');

    // ─── KYC Businesses ──────────────────────────────────────────────────
    const kycBusinesses = [
        { name: 'Highland Coffee Co.', reg: 'VN-0401-2019', country: 'Vietnam', industry: 'F&B', risk: 'low', status: 'verified' },
        { name: 'Marou Chocolate SARL', reg: 'FR-7512-2015', country: 'France', industry: 'F&B', risk: 'low', status: 'verified' },
        { name: 'TrustTech Industries KK', reg: 'JP-1301-2020', country: 'Japan', industry: 'Electronics', risk: 'medium', status: 'verified' },
        { name: 'BioPharm Labs AG', reg: 'CH-BE01-2018', country: 'Switzerland', industry: 'Healthcare', risk: 'low', status: 'verified' },
        { name: 'Shenzhen Trade Corp', reg: 'CN-4403-2021', country: 'China', industry: 'Manufacturing', risk: 'high', status: 'pending' },
        { name: 'Oceanic Import-Export', reg: 'SG-2022-5581', country: 'Singapore', industry: 'Logistics', risk: 'medium', status: 'pending' },
    ];
    const createdKycIds = [];
    for (const b of kycBusinesses) {
        const id = uuidv4();
        createdKycIds.push(id);
        db.prepare(`INSERT INTO kyc_businesses (id, name, registration_number, country, industry, risk_level, verification_status, verified_at, verified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, b.name, b.reg, b.country, b.industry, b.risk, b.status,
            b.status === 'verified' ? new Date().toISOString() : null,
            b.status === 'verified' ? adminId : null
        );
        // Add registry check
        db.prepare(`INSERT INTO kyc_checks (id, business_id, check_type, provider, status, score, checked_by)
      VALUES (?, ?, 'registry', 'gov_registry_api', 'completed', ?, ?)`).run(
            uuidv4(), id, 70 + Math.random() * 30, adminId
        );
    }
    // Add sanction hit on the high-risk business
    db.prepare(`INSERT INTO sanction_hits (id, business_id, list_name, match_score, matched_entity, status)
    VALUES (?, ?, 'OFAC SDN', 72.5, 'Shenzhen Trade Corp (partial match)', 'pending_review')`).run(uuidv4(), createdKycIds[4]);
    console.log(`✅ ${kycBusinesses.length} KYC businesses + checks seeded\n`);

    // ─── Evidence Vault Items ────────────────────────────────────────────
    const crypto = require('crypto');
    const evidenceItems = [
        { title: 'Certificate of Origin – Đà Lạt Coffee', desc: 'Official CoO from Vietnam Ministry of Industry', type: 'application/pdf', size: 245000 },
        { title: 'Lab Test Report – Chocolate 72%', desc: 'Heavy metals & pesticide clearance', type: 'application/pdf', size: 189000 },
        { title: 'Factory Audit Photo – TrustTech JP', desc: 'ISO 9001 on-site verification', type: 'image/jpeg', size: 3200000 },
        { title: 'Shipping Manifest – BATCH-2026-001', desc: 'Bill of lading for Mekong Delta shipment', type: 'application/pdf', size: 156000 },
        { title: 'Quality Test – VitaShield Batch 005', desc: 'GMP compliance lab results', type: 'application/pdf', size: 312000 },
        { title: 'Customs Declaration – DE Import', desc: 'German customs clearance certificate', type: 'application/pdf', size: 198000 },
        { title: 'Chain of Custody Log – EV Battery', desc: 'Full supply chain trace from mine to assembly', type: 'application/json', size: 89000 },
        { title: 'Anti-Counterfeit Seal Verification', desc: 'Cryptographic proof of QR seal integrity', type: 'application/json', size: 12000 },
    ];
    for (const ev of evidenceItems) {
        const hash = crypto.createHash('sha256').update(ev.title + ev.desc + Date.now() + Math.random()).digest('hex');
        const sealId = uuidv4();
        const lastSeal = await db.get('SELECT block_index FROM blockchain_seals ORDER BY block_index DESC LIMIT 1');
        const blockIdx = lastSeal ? lastSeal.block_index + 1 : 0;
        await db.prepare(`INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index)
      VALUES (?, 'evidence_anchor', ?, ?, '0', ?, ?)`).run(sealId, hash, hash, hash.substring(0, 32), blockIdx);

        db.prepare(`INSERT INTO evidence_items (id, title, description, file_name, file_type, file_size, sha256_hash, blockchain_seal_id, uploaded_by, verification_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'anchored')`).run(
            uuidv4(), ev.title, ev.desc, ev.title.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf', ev.type, ev.size, hash, sealId, adminId
        );
    }
    console.log(`✅ ${evidenceItems.length} evidence items + blockchain seals seeded\n`);

    // ─── Ratings & Certifications ────────────────────────────────────────
    const ratingUsers = [adminId, managerId, operatorId, viewerId];
    for (const p of createdProducts) {
        // 2-4 ratings per product
        const numRatings = 2 + Math.floor(Math.random() * 3);
        for (let r = 0; r < Math.min(numRatings, ratingUsers.length); r++) {
            db.prepare(`INSERT INTO ratings (id, entity_type, entity_id, user_id, score, comment) VALUES (?, 'product', ?, ?, ?, ?)`)
                .run(uuidv4(), p.id, ratingUsers[r], 3 + Math.floor(Math.random() * 3),
                    ['Excellent quality', 'Good product', 'Meets standards', 'Very reliable'][r]);
        }
    }
    console.log('✅ Product ratings seeded');

    const certData = [
        { name: 'ISO 9001:2015', body: 'ISO', entity: 0 },
        { name: 'ISO 22000 Food Safety', body: 'ISO', entity: 0 },
        { name: 'Fair Trade Certified', body: 'Fair Trade USA', entity: 1 },
        { name: 'USDA Organic', body: 'USDA', entity: 0 },
        { name: 'CE Marking', body: 'EU', entity: 2 },
        { name: 'GMP Certified', body: 'WHO', entity: 4 },
        { name: 'RoHS Compliant', body: 'EU', entity: 7 },
        { name: 'ISO 14001 Environmental', body: 'ISO', entity: 5 },
        { name: 'Halal Certified', body: 'JAKIM', entity: 6 },
        { name: 'UL Listed', body: 'UL LLC', entity: 2 },
    ];
    for (const c of certData) {
        const certHash = crypto.createHash('sha256').update(c.name + c.body).digest('hex').substring(0, 16);
        db.prepare(`INSERT INTO certifications (id, entity_type, entity_id, cert_name, cert_body, cert_number, issued_date, expiry_date, document_hash, added_by)
      VALUES (?, 'product', ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), createdProducts[c.entity].id, c.name, c.body,
            'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            '2025-01-15', '2027-01-15', certHash, adminId
        );
    }
    console.log(`✅ ${certData.length} certifications seeded`);

    const frameworks = ['GDPR', 'ISO 27001', 'SOC 2', 'FDA 21 CFR', 'EU MDR', 'REACH', 'CCPA', 'PCI DSS'];
    for (let i = 0; i < frameworks.length; i++) {
        db.prepare(`INSERT INTO compliance_records (id, entity_type, entity_id, framework, requirement, status, checked_by, next_review)
      VALUES (?, 'product', ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), createdProducts[i % createdProducts.length].id, frameworks[i],
            `${frameworks[i]} compliance assessment`,
            Math.random() > 0.15 ? 'compliant' : 'non_compliant',
            adminId, '2026-06-15'
        );
    }
    console.log(`✅ ${frameworks.length} compliance records seeded\n`);

    // ─── Trust Scores ─────────────────────────────────────────────────────
    const trustScores = [
        { prod: 0, score: 94.2, fraud: 0.03, consistency: 0.97, compliance: 0.95, history: 0.92 },
        { prod: 1, score: 87.5, fraud: 0.08, consistency: 0.91, compliance: 0.88, history: 0.85 },
        { prod: 2, score: 72.1, fraud: 0.22, consistency: 0.78, compliance: 0.70, history: 0.68 },
        { prod: 3, score: 91.8, fraud: 0.05, consistency: 0.94, compliance: 0.93, history: 0.90 },
        { prod: 4, score: 96.3, fraud: 0.02, consistency: 0.98, compliance: 0.97, history: 0.95 },
        { prod: 5, score: 45.6, fraud: 0.45, consistency: 0.52, compliance: 0.40, history: 0.38 },
        { prod: 6, score: 83.9, fraud: 0.12, consistency: 0.86, compliance: 0.84, history: 0.82 },
        { prod: 7, score: 78.4, fraud: 0.18, consistency: 0.80, compliance: 0.76, history: 0.74 },
    ];
    for (const t of trustScores) {
        db.prepare(`INSERT INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuidv4(), createdProducts[t.prod].id, t.score, t.fraud, t.consistency, t.compliance, t.history,
            JSON.stringify({ fraud: t.fraud, consistency: t.consistency, compliance: t.compliance, history: t.history })
        );
    }
    console.log('✅ Trust scores seeded for all products\n');

    // ─── Billing Plans & Usage ───────────────────────────────────────────
    const plans = [
        { user: adminId, plan: 'enterprise', price: 999 },
        { user: managerId, plan: 'pro', price: 199 },
        { user: operatorId, plan: 'starter', price: 49 },
        { user: viewerId, plan: 'free', price: 0 },
    ];
    const planLimits = { free: [100, 500, 50], starter: [1000, 5000, 500], pro: [10000, 50000, 5000], enterprise: [-1, -1, -1] };
    for (const p of plans) {
        const lim = planLimits[p.plan];
        db.prepare(`INSERT INTO billing_plans (id, user_id, plan_name, scan_limit, api_limit, storage_mb, price_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), p.user, p.plan, lim[0], lim[1], lim[2], p.price);
    }
    // Invoices for paid plans
    for (const p of plans.filter(x => x.price > 0)) {
        for (let m = 0; m < 3; m++) {
            const start = new Date(2026, m, 1);
            const end = new Date(2026, m + 1, 0);
            db.prepare(`INSERT INTO invoices (id, user_id, plan_name, amount, status, period_start, period_end)
        VALUES (?, ?, ?, ?, 'paid', ?, ?)`).run(uuidv4(), p.user, p.plan, p.price, start.toISOString(), end.toISOString());
        }
    }
    console.log('✅ Billing plans + invoices seeded\n');

    console.log('═══════════════════════════════════════════════');
    console.log('🎉 Seed complete!');
    console.log(`   👤 4 users   📦 ${products.length} products   📱 ${scanCount} scans`);
    console.log(`   🤝 ${partnerData.length} partners   📦 ${createdBatches.length} batches   🚚 6 shipments`);
    console.log(`   🔗 ${scmEventCount} SCM events   🚨 8 leak alerts`);
    console.log(`   🏢 ${kycBusinesses.length} KYC businesses   📋 ${evidenceItems.length} evidence items`);
    console.log(`   ⭐ Ratings + ${certData.length} certs + ${frameworks.length} compliance`);
    console.log(`   💳 4 billing plans + 9 invoices`);
    console.log('   🔑 Logins:');
    console.log('      admin/admin123 (admin) | manager/manager123 (manager)');
    console.log('      operator/operator123 (operator) | viewer/viewer123 (viewer)');
    console.log('═══════════════════════════════════════════════\n');
}

seed().catch(console.error);

