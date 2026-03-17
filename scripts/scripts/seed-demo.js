#!/usr/bin/env node
/**
 * TrustChecker – Demo Data Seed Script (Self-Contained)
 * Creates a fresh DB with schema + admin user + rich demo data.
 * Usage: pm2 stop trustchecker && node scripts/seed-demo.js && pm2 start trustchecker
 */
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'trustchecker.db');
const DATA_DIR = path.join(__dirname, '..', 'data');

const uuid = () => crypto.randomUUID();
const sha256 = () => crypto.randomBytes(32).toString('hex');
const past = (daysAgo, hourSpread = 24) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(Math.floor(Math.random() * hourSpread), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
    return d.toISOString().replace('T', ' ').slice(0, 19);
};
const future = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().replace('T', ' ').slice(0, 19);
};

(async () => {
    console.log('🌱 TrustChecker Demo Data Seeder\n');

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    // Remove old DB
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('🗑️  Removed old database');
    }

    const SQL = await initSqlJs();
    const db = new SQL.Database();

    // ═══════════════════════════════════════════════════════════════
    // SCHEMA (mirrors server/db.js _initSchema)
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 Creating schema...');

    // Users & Auth
    db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'operator', company TEXT DEFAULT '', mfa_secret TEXT, mfa_enabled INTEGER DEFAULT 0, mfa_backup_codes TEXT, failed_attempts INTEGER DEFAULT 0, locked_until TEXT, created_at TEXT DEFAULT (datetime('now')), last_login TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), revoked INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ip_address TEXT, user_agent TEXT, created_at TEXT DEFAULT (datetime('now')), last_active TEXT DEFAULT (datetime('now')), revoked INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS passkey_credentials (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, credential_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, nickname TEXT DEFAULT 'My Passkey', sign_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), last_used TEXT, FOREIGN KEY (user_id) REFERENCES users(id))`);

    // Products & QR
    db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT '', manufacturer TEXT DEFAULT '', batch_number TEXT DEFAULT '', origin_country TEXT DEFAULT '', registered_by TEXT, trust_score REAL DEFAULT 100.0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS qr_codes (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, qr_data TEXT UNIQUE NOT NULL, qr_image_base64 TEXT, status TEXT DEFAULT 'active', generated_at TEXT DEFAULT (datetime('now')), expires_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS scan_events (id TEXT PRIMARY KEY, qr_code_id TEXT, product_id TEXT, scan_type TEXT DEFAULT 'validation', device_fingerprint TEXT DEFAULT '', ip_address TEXT DEFAULT '', latitude REAL, longitude REAL, geo_city TEXT DEFAULT '', geo_country TEXT DEFAULT '', user_agent TEXT DEFAULT '', result TEXT DEFAULT 'pending', fraud_score REAL DEFAULT 0.0, trust_score REAL DEFAULT 0.0, response_time_ms INTEGER DEFAULT 0, scanned_at TEXT DEFAULT (datetime('now')))`);

    // Security
    db.run(`CREATE TABLE IF NOT EXISTS fraud_alerts (id TEXT PRIMARY KEY, scan_event_id TEXT, product_id TEXT, alert_type TEXT NOT NULL, severity TEXT DEFAULT 'medium', description TEXT DEFAULT '', details TEXT DEFAULT '{}', status TEXT DEFAULT 'open', resolved_by TEXT, resolved_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS trust_scores (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, score REAL NOT NULL, fraud_factor REAL DEFAULT 0.0, consistency_factor REAL DEFAULT 0.0, compliance_factor REAL DEFAULT 0.0, history_factor REAL DEFAULT 0.0, explanation TEXT DEFAULT '{}', calculated_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS blockchain_seals (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, event_id TEXT NOT NULL, data_hash TEXT NOT NULL, prev_hash TEXT DEFAULT '0', merkle_root TEXT, block_index INTEGER, nonce INTEGER DEFAULT 0, sealed_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, entity_type TEXT DEFAULT '', entity_id TEXT DEFAULT '', details TEXT DEFAULT '{}', ip_address TEXT DEFAULT '', timestamp TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS anomaly_detections (id TEXT PRIMARY KEY, source_type TEXT NOT NULL, source_id TEXT, anomaly_type TEXT NOT NULL, severity TEXT DEFAULT 'medium', score REAL DEFAULT 0, description TEXT DEFAULT '', details TEXT DEFAULT '{}', status TEXT DEFAULT 'open', detected_at TEXT DEFAULT (datetime('now')), resolved_at TEXT)`);

    // SCM
    db.run(`CREATE TABLE IF NOT EXISTS batches (id TEXT PRIMARY KEY, batch_number TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL, quantity INTEGER DEFAULT 0, manufactured_date TEXT, expiry_date TEXT, origin_facility TEXT DEFAULT '', status TEXT DEFAULT 'created', created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS supply_chain_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, product_id TEXT, batch_id TEXT, uid TEXT DEFAULT '', location TEXT DEFAULT '', actor TEXT DEFAULT '', partner_id TEXT, details TEXT DEFAULT '{}', blockchain_seal_id TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, batch_id TEXT, partner_id TEXT, location TEXT DEFAULT '', quantity INTEGER DEFAULT 0, min_stock INTEGER DEFAULT 10, max_stock INTEGER DEFAULT 1000, last_sync TEXT, updated_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS partners (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'distributor', country TEXT DEFAULT '', region TEXT DEFAULT '', contact_email TEXT DEFAULT '', kyc_status TEXT DEFAULT 'pending', kyc_verified_at TEXT, trust_score REAL DEFAULT 50.0, risk_level TEXT DEFAULT 'medium', api_key TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS shipments (id TEXT PRIMARY KEY, batch_id TEXT, from_partner_id TEXT, to_partner_id TEXT, carrier TEXT DEFAULT '', tracking_number TEXT DEFAULT '', status TEXT DEFAULT 'pending', estimated_delivery TEXT, actual_delivery TEXT, current_lat REAL, current_lng REAL, gps_trail TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS iot_readings (id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, sensor_type TEXT DEFAULT 'temperature', value REAL NOT NULL, unit TEXT DEFAULT 'C', threshold_min REAL, threshold_max REAL, alert_triggered INTEGER DEFAULT 0, recorded_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS sla_definitions (id TEXT PRIMARY KEY, partner_id TEXT NOT NULL, sla_type TEXT DEFAULT 'delivery', metric TEXT DEFAULT '', threshold_value REAL DEFAULT 0, threshold_unit TEXT DEFAULT 'hours', penalty_amount REAL DEFAULT 0, penalty_currency TEXT DEFAULT 'USD', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS sla_violations (id TEXT PRIMARY KEY, sla_id TEXT NOT NULL, partner_id TEXT, shipment_id TEXT, violation_type TEXT DEFAULT '', actual_value REAL DEFAULT 0, threshold_value REAL DEFAULT 0, penalty_amount REAL DEFAULT 0, status TEXT DEFAULT 'open', resolved_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS leak_alerts (id TEXT PRIMARY KEY, product_id TEXT, platform TEXT DEFAULT '', url TEXT DEFAULT '', listing_title TEXT DEFAULT '', listing_price REAL DEFAULT 0, authorized_price REAL DEFAULT 0, region_detected TEXT DEFAULT '', authorized_regions TEXT DEFAULT '[]', leak_type TEXT DEFAULT 'unauthorized_region', risk_score REAL DEFAULT 0.5, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS supply_chain_graph (id TEXT PRIMARY KEY, from_node_id TEXT NOT NULL, from_node_type TEXT DEFAULT 'partner', to_node_id TEXT NOT NULL, to_node_type TEXT DEFAULT 'partner', relationship TEXT DEFAULT 'supplies', weight REAL DEFAULT 1.0, risk_score REAL DEFAULT 0.0, metadata TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')))`);

    // KYC
    db.run(`CREATE TABLE IF NOT EXISTS kyc_businesses (id TEXT PRIMARY KEY, name TEXT NOT NULL, registration_number TEXT UNIQUE, country TEXT DEFAULT '', address TEXT DEFAULT '', industry TEXT DEFAULT '', contact_email TEXT DEFAULT '', contact_phone TEXT DEFAULT '', risk_level TEXT DEFAULT 'medium', verification_status TEXT DEFAULT 'pending', verified_at TEXT, verified_by TEXT, notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS kyc_checks (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, check_type TEXT NOT NULL, provider TEXT DEFAULT 'internal', status TEXT DEFAULT 'pending', result TEXT DEFAULT '{}', score REAL DEFAULT 0.0, checked_by TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS sanction_hits (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, list_name TEXT NOT NULL, match_score REAL DEFAULT 0.0, matched_entity TEXT DEFAULT '', details TEXT DEFAULT '{}', status TEXT DEFAULT 'pending_review', reviewed_by TEXT, reviewed_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Evidence & Stakeholder
    db.run(`CREATE TABLE IF NOT EXISTS evidence_items (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', file_name TEXT DEFAULT '', file_type TEXT DEFAULT '', file_size INTEGER DEFAULT 0, file_data TEXT, sha256_hash TEXT NOT NULL, blockchain_seal_id TEXT, entity_type TEXT DEFAULT '', entity_id TEXT DEFAULT '', uploaded_by TEXT, verification_status TEXT DEFAULT 'anchored', verified_at TEXT, file_path TEXT DEFAULT '', tags TEXT DEFAULT '[]', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS ratings (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, user_id TEXT NOT NULL, score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5), comment TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS certifications (id TEXT PRIMARY KEY, entity_type TEXT DEFAULT 'product', entity_id TEXT NOT NULL, cert_name TEXT NOT NULL, cert_body TEXT DEFAULT '', cert_number TEXT DEFAULT '', issued_date TEXT, expiry_date TEXT, status TEXT DEFAULT 'active', document_hash TEXT DEFAULT '', added_by TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS compliance_records (id TEXT PRIMARY KEY, entity_type TEXT DEFAULT 'product', entity_id TEXT NOT NULL, framework TEXT NOT NULL, requirement TEXT DEFAULT '', status TEXT DEFAULT 'compliant', evidence TEXT DEFAULT '', checked_by TEXT, next_review TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Billing
    db.run(`CREATE TABLE IF NOT EXISTS billing_plans (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_name TEXT DEFAULT 'free', scan_limit INTEGER DEFAULT 100, api_limit INTEGER DEFAULT 500, storage_mb INTEGER DEFAULT 50, price_monthly REAL DEFAULT 0.0, status TEXT DEFAULT 'active', started_at TEXT DEFAULT (datetime('now')), expires_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS usage_metrics (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, metric_type TEXT NOT NULL, value INTEGER DEFAULT 0, period TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_name TEXT DEFAULT '', amount REAL DEFAULT 0.0, currency TEXT DEFAULT 'USD', status TEXT DEFAULT 'paid', period_start TEXT, period_end TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // System
    db.run(`CREATE TABLE IF NOT EXISTS system_settings (id TEXT PRIMARY KEY, category TEXT NOT NULL, setting_key TEXT NOT NULL, setting_value TEXT DEFAULT '', is_secret INTEGER DEFAULT 0, description TEXT DEFAULT '', updated_by TEXT, updated_at TEXT DEFAULT (datetime('now')), UNIQUE(category, setting_key))`);
    db.run(`CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, source TEXT DEFAULT 'stripe', payload TEXT DEFAULT '{}', status TEXT DEFAULT 'received', processed_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Support
    db.run(`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT 'general', priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'open', assigned_to TEXT, resolution TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), resolved_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS ticket_messages (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_role TEXT DEFAULT 'user', message TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);

    // NFT & Sustainability
    db.run(`CREATE TABLE IF NOT EXISTS nft_certificates (id TEXT PRIMARY KEY, token_id INTEGER, product_id TEXT, entity_type TEXT DEFAULT 'product', entity_id TEXT, certificate_type TEXT DEFAULT 'authenticity', issuer TEXT DEFAULT 'TrustChecker', owner TEXT NOT NULL, metadata_hash TEXT NOT NULL, blockchain_seal_id TEXT, status TEXT DEFAULT 'active', transfer_history TEXT DEFAULT '[]', minted_at TEXT DEFAULT (datetime('now')), expires_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS sustainability_scores (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, carbon_footprint REAL DEFAULT 0, water_usage REAL DEFAULT 0, recyclability REAL DEFAULT 0, ethical_sourcing REAL DEFAULT 0, packaging_score REAL DEFAULT 0, transport_score REAL DEFAULT 0, overall_score REAL DEFAULT 0, grade TEXT DEFAULT 'C', certifications TEXT DEFAULT '[]', assessed_by TEXT, assessed_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS data_retention_policies (id TEXT PRIMARY KEY, table_name TEXT NOT NULL, retention_days INTEGER DEFAULT 365, action TEXT DEFAULT 'archive', is_active INTEGER DEFAULT 1, last_run TEXT, records_affected INTEGER DEFAULT 0, created_by TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Indexes
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_scan_product ON scan_events(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_scan_date ON scan_events(scanned_at)',
        'CREATE INDEX IF NOT EXISTS idx_qr_product ON qr_codes(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_fraud_product ON fraud_alerts(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_trust_product ON trust_scores(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id)',
        'CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status)',
        'CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_sce_product ON supply_chain_events(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_shipments_batch ON shipments(batch_id)',
        'CREATE INDEX IF NOT EXISTS idx_kyc_checks_business ON kyc_checks(business_id)',
        'CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_items(entity_type, entity_id)',
        'CREATE INDEX IF NOT EXISTS idx_nft_product ON nft_certificates(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_sustainability_product ON sustainability_scores(product_id)',
    ];
    indexes.forEach(idx => db.run(idx));
    console.log('  ✅ Schema created with indexes\n');

    // ═══════════════════════════════════════════════════════════════
    // SEED DATA
    // ═══════════════════════════════════════════════════════════════

    // ─── Admin User ────────────────────────────────────────────────
    const adminId = uuid();
    const adminHash = bcrypt.hashSync('Admin@123456!', 12);
    db.run(`INSERT INTO users (id,username,email,password_hash,role,company,created_at) VALUES (?,?,?,?,?,?,?)`,
        [adminId, 'admin', 'admin@trustchecker.io', adminHash, 'admin', 'TrustChecker Corp', past(90)]);

    // Additional demo users
    const operatorId = uuid();
    db.run(`INSERT INTO users (id,username,email,password_hash,role,company,created_at,last_login) VALUES (?,?,?,?,?,?,?,?)`,
        [operatorId, 'sarah.chen', 'sarah@trustchecker.io', bcrypt.hashSync('Operator@12345!', 12), 'operator', 'TrustChecker Corp', past(60), past(0)]);
    const viewerId = uuid();
    db.run(`INSERT INTO users (id,username,email,password_hash,role,company,created_at,last_login) VALUES (?,?,?,?,?,?,?,?)`,
        [viewerId, 'james.wilson', 'james@trustchecker.io', bcrypt.hashSync('Viewer@123456!', 12), 'viewer', 'TrustChecker Corp', past(30), past(1)]);
    console.log('👤 3 users created (admin, operator, viewer)');

    // ─── 1. Products (12 products) ─────────────────────────────────
    const products = [
        { name: 'Premium Vietnamese Coffee', sku: 'COFFEE-VN-001', cat: 'Food & Beverage', mfg: 'Highland Farms Vietnam', origin: 'Vietnam', trust: 96.5, desc: 'Single-origin Đà Lạt arabica, hand-picked, sun-dried processing' },
        { name: 'Organic Matcha Powder', sku: 'MATCHA-JP-002', cat: 'Food & Beverage', mfg: 'Uji Tea Gardens Co.', origin: 'Japan', trust: 98.2, desc: 'Ceremonial-grade stone-milled matcha from Uji, Kyoto' },
        { name: 'Swiss Luxury Chronograph', sku: 'WATCH-CH-003', cat: 'Luxury Goods', mfg: 'Geneva Timepieces SA', origin: 'Switzerland', trust: 99.1, desc: '18K rose gold automatic chronograph, limited edition #247/500' },
        { name: 'Italian Leather Tote Bag', sku: 'BAG-IT-004', cat: 'Fashion', mfg: 'Milano Crafts SpA', origin: 'Italy', trust: 94.8, desc: 'Full-grain Tuscan leather, hand-stitched, vegetable-tanned' },
        { name: 'Pharma-Grade Vitamin D3', sku: 'PHARMA-US-005', cat: 'Pharmaceuticals', mfg: 'BioHealth Labs Inc.', origin: 'United States', trust: 97.3, desc: 'FDA-approved 5000 IU softgels, third-party tested' },
        { name: 'Bean-to-Bar Dark Chocolate', sku: 'CHOCO-EC-006', cat: 'Food & Beverage', mfg: 'Quito Cacao Collective', origin: 'Ecuador', trust: 92.7, desc: '85% cacao Arriba Nacional, certified organic & fair trade' },
        { name: 'K-Beauty Hydrating Serum', sku: 'BEAUTY-KR-007', cat: 'Cosmetics', mfg: 'Seoul Glow Labs', origin: 'South Korea', trust: 95.4, desc: 'Hyaluronic acid + niacinamide concentrate, dermatologically tested' },
        { name: 'Japanese Whisky 18 Year', sku: 'WHISKY-JP-008', cat: 'Spirits', mfg: 'Yamazaki Distillery', origin: 'Japan', trust: 99.5, desc: 'Single malt, 18-year aged in Japanese Mizunara oak casks' },
        { name: 'EV Battery Module Gen4', sku: 'BATT-DE-009', cat: 'Electronics', mfg: 'Stuttgart Power GmbH', origin: 'Germany', trust: 91.2, desc: '72kWh lithium iron phosphate, 800V architecture, 500k cycle life' },
        { name: 'Organic Infant Formula', sku: 'BABY-NZ-010', cat: 'Baby Products', mfg: 'Pure NZ Nutrition Ltd', origin: 'New Zealand', trust: 98.8, desc: 'A2 grass-fed milk, DHA/ARA enriched, EU-organic certified' },
        { name: 'Extra Virgin Olive Oil', sku: 'OIL-GR-011', cat: 'Food & Beverage', mfg: 'Cretan Gold Estate', origin: 'Greece', trust: 93.6, desc: 'First cold-pressed Koroneiki olives, PDO Sitia designation' },
        { name: 'Industrial IoT Gateway', sku: 'IOT-TW-012', cat: 'Electronics', mfg: 'Taipei Semi Inc.', origin: 'Taiwan', trust: 90.1, desc: 'Edge computing gateway, LoRaWAN + 5G, industrial IP67 rated' },
    ];

    const productIds = [];
    const qrIds = [];
    const batchIds = [];

    for (const p of products) {
        const pid = uuid();
        const qid = uuid();
        const bid = uuid();
        const batchNum = `BATCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
        productIds.push(pid);
        qrIds.push(qid);
        batchIds.push(bid);
        const createdAt = past(Math.floor(Math.random() * 60) + 15);

        db.run(`INSERT INTO products (id,name,sku,description,category,manufacturer,batch_number,origin_country,registered_by,trust_score,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pid, p.name, p.sku, p.desc, p.cat, p.mfg, batchNum, p.origin, adminId, p.trust, 'active', createdAt]);

        db.run(`INSERT INTO qr_codes (id,product_id,qr_data,status,generated_at,expires_at) VALUES (?,?,?,?,?,?)`,
            [qid, pid, `TC-${p.sku}-${sha256().slice(0, 8).toUpperCase()}`, 'active', createdAt, future(365)]);

        db.run(`INSERT INTO batches (id,batch_number,product_id,quantity,manufactured_date,expiry_date,origin_facility,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [bid, batchNum, pid, Math.floor(Math.random() * 5000) + 500, past(Math.floor(Math.random() * 30) + 30), future(Math.floor(Math.random() * 365) + 180), p.mfg, 'active', createdAt]);

        // Trust score record
        db.run(`INSERT INTO trust_scores (id,product_id,score,fraud_factor,consistency_factor,compliance_factor,history_factor,calculated_at) VALUES (?,?,?,?,?,?,?,?)`,
            [uuid(), pid, p.trust, +(Math.random() * 8).toFixed(1), +(85 + Math.random() * 15).toFixed(1), +(88 + Math.random() * 12).toFixed(1), +(80 + Math.random() * 20).toFixed(1), past(Math.floor(Math.random() * 3))]);
    }
    console.log(`📦 ${products.length} products + QR codes + batches + trust scores`);

    // ─── 2. Scan Events (180 scans) ────────────────────────────────
    const geoData = [
        { city: 'Ho Chi Minh City', country: 'VN', lat: 10.7769, lng: 106.7009 },
        { city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
        { city: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 },
        { city: 'London', country: 'GB', lat: 51.5074, lng: -0.1278 },
        { city: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
        { city: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
        { city: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.9780 },
        { city: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
        { city: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050 },
        { city: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
        { city: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
        { city: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194 },
        { city: 'Mumbai', country: 'IN', lat: 19.0760, lng: 72.8777 },
        { city: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
        { city: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
        { city: 'Hanoi', country: 'VN', lat: 21.0278, lng: 105.8342 },
        { city: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
        { city: 'Zurich', country: 'CH', lat: 47.3769, lng: 8.5417 },
    ];
    const scanResults = ['authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'authentic', 'suspicious', 'counterfeit'];
    const scanIds = [];
    const todayScans = [];

    for (let i = 0; i < 180; i++) {
        const sid = uuid();
        scanIds.push(sid);
        const pidx = Math.floor(Math.random() * productIds.length);
        const geo = geoData[Math.floor(Math.random() * geoData.length)];
        const result = scanResults[Math.floor(Math.random() * scanResults.length)];
        const fraudScore = result === 'authentic' ? +(Math.random() * 12).toFixed(1) : result === 'suspicious' ? +(30 + Math.random() * 35).toFixed(1) : +(72 + Math.random() * 28).toFixed(1);
        const trustScore = +(Math.max(0, Math.min(100, 100 - fraudScore + Math.random() * 8 - 4))).toFixed(1);
        const daysAgo = Math.floor(Math.random() * 30);
        if (daysAgo === 0) todayScans.push(sid);

        db.run(`INSERT INTO scan_events (id,qr_code_id,product_id,scan_type,ip_address,latitude,longitude,geo_city,geo_country,user_agent,result,fraud_score,trust_score,response_time_ms,scanned_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [sid, qrIds[pidx], productIds[pidx], 'validation',
                `${100 + Math.floor(Math.random() * 155)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
                geo.lat + (Math.random() * 0.1 - 0.05), geo.lng + (Math.random() * 0.1 - 0.05),
                geo.city, geo.country,
                ['Mozilla/5.0 TrustChecker-Mobile/3.2', 'TrustChecker-SDK/2.1 (Android)', 'TrustChecker-SDK/2.1 (iOS)', 'Mozilla/5.0 TrustChecker-Web/1.0'][Math.floor(Math.random() * 4)],
                result, fraudScore, trustScore,
                Math.floor(Math.random() * 250) + 45,
                past(daysAgo)]);
    }
    console.log(`📱 180 scan events (${todayScans.length} today)`);

    // ─── 3. Fraud Alerts (22 alerts) ───────────────────────────────
    const alertDefs = [
        { type: 'velocity_anomaly', sev: 'high', desc: 'Unusual scan velocity: 47 scans in 2 minutes from same IP' },
        { type: 'geo_mismatch', sev: 'critical', desc: 'Product scanned in unauthorized region (detected: Lagos, expected: EU only)' },
        { type: 'duplicate_scan', sev: 'medium', desc: 'QR code scanned from 3 different countries within 1 hour' },
        { type: 'counterfeit_detected', sev: 'critical', desc: 'AI confidence 94.7%: product visual doesn\'t match registered reference images' },
        { type: 'unusual_pattern', sev: 'medium', desc: 'Scan pattern deviates >3σ from historical baseline' },
        { type: 'compromised_qr', sev: 'high', desc: 'QR code data integrity check failed — possible tampering' },
        { type: 'supply_chain_break', sev: 'high', desc: 'Product appeared in market without passing through authorized distributor' },
        { type: 'price_anomaly', sev: 'medium', desc: 'Product listed at 40% below MSRP on unauthorized marketplace' },
        { type: 'velocity_anomaly', sev: 'low', desc: 'Mild scan velocity increase detected, within 2σ tolerance' },
        { type: 'geo_mismatch', sev: 'medium', desc: 'Scan origin country differs from shipping destination' },
    ];

    for (let i = 0; i < 22; i++) {
        const alertDef = alertDefs[i % alertDefs.length];
        const pidx = Math.floor(Math.random() * productIds.length);
        const stat = ['open', 'open', 'open', 'investigating', 'investigating', 'resolved', 'escalated'][Math.floor(Math.random() * 7)];

        db.run(`INSERT INTO fraud_alerts (id,scan_event_id,product_id,alert_type,severity,description,status,resolved_by,resolved_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), scanIds[Math.floor(Math.random() * scanIds.length)], productIds[pidx],
            alertDef.type, alertDef.sev, alertDef.desc, stat,
            stat === 'resolved' ? adminId : null,
            stat === 'resolved' ? past(Math.floor(Math.random() * 3)) : null,
            past(Math.floor(Math.random() * 14))]);
    }
    console.log(`🚨 22 fraud alerts`);

    // ─── 4. Blockchain Seals (50 seals) ────────────────────────────
    let prevHash = '0'.repeat(64);
    const sealEventTypes = ['product_registration', 'scan_validation', 'fraud_detection', 'supply_chain_update', 'certification_anchor', 'batch_verification'];
    for (let i = 0; i < 50; i++) {
        const dataHash = sha256();
        const merkle = sha256();
        db.run(`INSERT INTO blockchain_seals (id,event_type,event_id,data_hash,prev_hash,merkle_root,block_index,nonce,sealed_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), sealEventTypes[i % sealEventTypes.length],
            scanIds[Math.floor(Math.random() * scanIds.length)],
                dataHash, prevHash, merkle, i + 1, Math.floor(Math.random() * 999999), past(Math.floor(Math.random() * 30))]);
        prevHash = dataHash;
    }
    console.log(`⛓️  50 blockchain seals (chained)`);

    // ─── 5. Partners (10 partners) ─────────────────────────────────
    const partnerDefs = [
        { name: 'Global Logistics Corp', type: 'logistics', country: 'Singapore', region: 'APAC', kyc: 'verified', trust: 92.3, risk: 'low' },
        { name: 'EuroDistri GmbH', type: 'distributor', country: 'Germany', region: 'EMEA', kyc: 'verified', trust: 88.1, risk: 'low' },
        { name: 'Pacific Trade Hub', type: 'distributor', country: 'Australia', region: 'APAC', kyc: 'verified', trust: 85.7, risk: 'medium' },
        { name: 'Saigon Supply Co.', type: 'manufacturer', country: 'Vietnam', region: 'APAC', kyc: 'verified', trust: 91.4, risk: 'low' },
        { name: 'Amazon FBA Warehouse', type: 'warehouse', country: 'United States', region: 'AMER', kyc: 'verified', trust: 95.2, risk: 'low' },
        { name: 'Dubai Free Zone Trading', type: 'distributor', country: 'UAE', region: 'MEA', kyc: 'pending', trust: 58.3, risk: 'high' },
        { name: 'Nordic Pharma Dist.', type: 'distributor', country: 'Sweden', region: 'EMEA', kyc: 'verified', trust: 97.1, risk: 'low' },
        { name: 'Shanghai Import Ltd', type: 'manufacturer', country: 'China', region: 'APAC', kyc: 'under_review', trust: 52.8, risk: 'high' },
        { name: 'Tokyo Express Logistics', type: 'logistics', country: 'Japan', region: 'APAC', kyc: 'verified', trust: 94.6, risk: 'low' },
        { name: 'Brasil Agro Trading', type: 'manufacturer', country: 'Brazil', region: 'LATAM', kyc: 'pending', trust: 67.4, risk: 'medium' },
    ];

    const partnerIds = [];
    for (const p of partnerDefs) {
        const pid = uuid();
        partnerIds.push(pid);
        db.run(`INSERT INTO partners (id,name,type,country,region,contact_email,kyc_status,kyc_verified_at,trust_score,risk_level,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pid, p.name, p.type, p.country, p.region,
                `contact@${p.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
                p.kyc, p.kyc === 'verified' ? past(Math.floor(Math.random() * 90) + 30) : null,
                p.trust, p.risk, 'active', past(Math.floor(Math.random() * 120) + 30)]);
    }
    console.log(`🤝 10 supply chain partners`);

    // ─── 6. KYC Businesses (8) ─────────────────────────────────────
    const kycDefs = [
        { name: 'Highland Farms Vietnam LLC', reg: 'VN-BIZ-2024-0891', country: 'Vietnam', industry: 'Agriculture & Coffee', status: 'approved', risk: 'low' },
        { name: 'Geneva Timepieces SA', reg: 'CH-HR-2019-4521', country: 'Switzerland', industry: 'Luxury Watchmaking', status: 'approved', risk: 'low' },
        { name: 'Milano Crafts SpA', reg: 'IT-REA-MI-201234', country: 'Italy', industry: 'Fashion & Leather Goods', status: 'approved', risk: 'medium' },
        { name: 'BioHealth Labs Inc.', reg: 'US-DE-2021-88712', country: 'United States', industry: 'Pharmaceuticals', status: 'approved', risk: 'low' },
        { name: 'Golden Dragon Trading Co.', reg: 'HK-CR-2023-1234', country: 'Hong Kong', industry: 'Import/Export', status: 'pending', risk: 'high' },
        { name: 'Casablanca Textiles SARL', reg: 'MA-RC-2022-5678', country: 'Morocco', industry: 'Textiles', status: 'under_review', risk: 'medium' },
        { name: 'Quito Cacao Collective', reg: 'EC-SRI-2020-9012', country: 'Ecuador', industry: 'Agriculture & Cacao', status: 'approved', risk: 'low' },
        { name: 'Seoul Glow Labs Co.', reg: 'KR-BIZ-2022-3456', country: 'South Korea', industry: 'Cosmetics & Beauty', status: 'approved', risk: 'low' },
    ];

    for (const b of kycDefs) {
        const bid = uuid();
        db.run(`INSERT INTO kyc_businesses (id,name,registration_number,country,industry,contact_email,risk_level,verification_status,verified_at,verified_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [bid, b.name, b.reg, b.country, b.industry,
                `compliance@${b.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
                b.risk, b.status,
                b.status === 'approved' ? past(Math.floor(Math.random() * 60) + 15) : null,
                b.status === 'approved' ? adminId : null,
                past(Math.floor(Math.random() * 90) + 20)]);

        for (const ct of ['identity_verification', 'sanctions_screening', 'document_verification', 'pep_check']) {
            db.run(`INSERT INTO kyc_checks (id,business_id,check_type,provider,status,score,created_at) VALUES (?,?,?,?,?,?,?)`,
                [uuid(), bid, ct, 'TrustChecker AI',
                b.status === 'approved' ? 'passed' : b.status === 'pending' ? 'pending' : 'in_review',
                b.status === 'approved' ? +(82 + Math.random() * 18).toFixed(1) : +(20 + Math.random() * 40).toFixed(1),
                past(Math.floor(Math.random() * 30))]);
        }
    }
    console.log(`🏢 8 KYC businesses + 32 checks`);

    // ─── 7. Supply Chain Events (40) ───────────────────────────────
    const sceTypes = ['manufactured', 'quality_check', 'shipped', 'in_transit', 'customs_cleared', 'delivered', 'received', 'warehouse_stored', 'label_printed', 'dispatched'];
    const sceLocs = ['Đà Lạt Factory, Vietnam', 'Singapore Hub', 'Rotterdam Port, NL', 'JFK Air Cargo, NY', 'Dubai Free Zone', 'Sydney Distribution Center', 'Tokyo Bonded Warehouse', 'London Fulfilment', 'Berlin Quality Lab', 'Zurich Customs Office'];

    for (let i = 0; i < 40; i++) {
        db.run(`INSERT INTO supply_chain_events (id,event_type,product_id,batch_id,uid,location,actor,partner_id,details,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), sceTypes[Math.floor(Math.random() * sceTypes.length)],
            productIds[Math.floor(Math.random() * productIds.length)],
            batchIds[Math.floor(Math.random() * batchIds.length)],
            `UID-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999)}`,
            sceLocs[Math.floor(Math.random() * sceLocs.length)],
            ['Warehouse Mgr', 'QA Inspector', 'Logistics Lead', 'Customs Agent', 'Shipping Coordinator'][Math.floor(Math.random() * 5)],
            partnerIds[Math.floor(Math.random() * partnerIds.length)],
            JSON.stringify({ temperature: `${(2 + Math.random() * 6).toFixed(1)}°C`, humidity: `${(40 + Math.random() * 20).toFixed(0)}%`, notes: 'Within SLA parameters' }),
            past(Math.floor(Math.random() * 25))]);
    }
    console.log(`🔗 40 supply chain events`);

    // ─── 8. Shipments (15) ─────────────────────────────────────────
    const carriers = ['DHL Express', 'FedEx International', 'Maersk Line', 'CMA CGM', 'Singapore Airlines Cargo', 'Nippon Express', 'Kuehne+Nagel'];
    const shipmentIds = [];
    for (let i = 0; i < 15; i++) {
        const sid = uuid();
        shipmentIds.push(sid);
        const stat = ['delivered', 'in_transit', 'in_transit', 'pending', 'delivered', 'customs', 'delivered'][Math.floor(Math.random() * 7)];
        const fromP = Math.floor(Math.random() * partnerIds.length);
        let toP = Math.floor(Math.random() * partnerIds.length);
        if (toP === fromP) toP = (toP + 1) % partnerIds.length;

        db.run(`INSERT INTO shipments (id,batch_id,from_partner_id,to_partner_id,carrier,tracking_number,status,estimated_delivery,current_lat,current_lng,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [sid, batchIds[Math.floor(Math.random() * batchIds.length)],
                partnerIds[fromP], partnerIds[toP],
                carriers[Math.floor(Math.random() * carriers.length)],
                `TRK-${Math.floor(Math.random() * 9000000) + 1000000}`,
                stat, future(Math.floor(Math.random() * 14) + 1),
                geoData[Math.floor(Math.random() * geoData.length)].lat,
                geoData[Math.floor(Math.random() * geoData.length)].lng,
                past(Math.floor(Math.random() * 10))]);
    }
    console.log(`🚚 15 shipments`);

    // ─── 9. IoT Readings (60) ─────────────────────────────────────
    for (let i = 0; i < 60; i++) {
        const stype = ['temperature', 'humidity', 'vibration', 'light'][Math.floor(Math.random() * 4)];
        const units = { temperature: 'C', humidity: '%', vibration: 'g', light: 'lux' };
        const ranges = { temperature: [2, 8], humidity: [40, 60], vibration: [0, 2], light: [0, 500] };
        const [min, max] = ranges[stype];
        const value = +(min + Math.random() * (max - min)).toFixed(2);
        const alert = (stype === 'temperature' && (value < 2 || value > 8)) ? 1 : 0;

        db.run(`INSERT INTO iot_readings (id,shipment_id,sensor_type,value,unit,threshold_min,threshold_max,alert_triggered,recorded_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), shipmentIds[Math.floor(Math.random() * shipmentIds.length)],
                stype, value, units[stype], min, max, alert, past(Math.floor(Math.random() * 7))]);
    }
    console.log(`📡 60 IoT sensor readings`);

    // ─── 10. Evidence Items (10) ───────────────────────────────────
    const evidenceDefs = [
        { title: 'ISO 9001:2015 Certificate', desc: 'Quality management system certification from TÜV Rheinland', ftype: 'certification' },
        { title: 'Lab Analysis Report — Coffee', desc: 'Chemical purity analysis confirming 100% Arabica, no adulterants', ftype: 'lab_report' },
        { title: 'FDA Compliance Letter', desc: 'FDA 483 compliance clearance for pharmaceutical manufacturing', ftype: 'compliance' },
        { title: 'Fair Trade Certificate', desc: 'Fairtrade International certified supply chain documentation', ftype: 'certification' },
        { title: 'Chain of Custody Document', desc: 'Full provenance chain from origin farm to retail shelf', ftype: 'proof' },
        { title: 'Product Photography Set', desc: '360° professional product photography for visual verification', ftype: 'visual' },
        { title: 'Customs Declaration — JP', desc: 'Japanese customs clearance documentation for whisky export', ftype: 'legal' },
        { title: 'Sustainability Audit 2026', desc: 'Independent ESG impact assessment by Deloitte', ftype: 'audit' },
        { title: 'Swiss COSC Certificate', desc: 'Contrôle Officiel Suisse des Chronomètres certificate', ftype: 'certification' },
        { title: 'EU MDR Compliance Report', desc: 'European Medical Device Regulation compliance documentation', ftype: 'compliance' },
    ];

    for (const e of evidenceDefs) {
        db.run(`INSERT INTO evidence_items (id,title,description,file_name,file_type,file_size,sha256_hash,entity_type,entity_id,uploaded_by,verification_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), e.title, e.desc,
            `${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`,
                'application/pdf', Math.floor(Math.random() * 8000000) + 200000,
            sha256(), 'product', productIds[Math.floor(Math.random() * productIds.length)],
                adminId, ['anchored', 'verified', 'verified'][Math.floor(Math.random() * 3)],
            past(Math.floor(Math.random() * 45) + 5)]);
    }
    console.log(`📎 10 evidence items`);

    // ─── 11. Anomaly Detections (12) ──────────────────────────────
    const anomalyDefs = [
        { type: 'velocity_spike', sev: 'high', desc: 'Scan rate jumped 340% above 7-day rolling average' },
        { type: 'geo_anomaly', sev: 'critical', desc: 'Product physically impossible location jump (Tokyo→Lagos in 15min)' },
        { type: 'scan_pattern_deviation', sev: 'medium', desc: 'Scan time distribution shifted from business hours to late night' },
        { type: 'trust_score_drop', sev: 'high', desc: 'Product trust score dropped 12 points in 24 hours' },
        { type: 'unusual_access_pattern', sev: 'low', desc: 'API access from previously unseen IP range' },
        { type: 'batch_anomaly', sev: 'medium', desc: 'Batch scan volume 2x expected for market size' },
    ];

    for (let i = 0; i < 12; i++) {
        const a = anomalyDefs[i % anomalyDefs.length];
        db.run(`INSERT INTO anomaly_detections (id,source_type,source_id,anomaly_type,severity,score,description,status,detected_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), 'scan_event', scanIds[Math.floor(Math.random() * scanIds.length)],
            a.type, a.sev, +(25 + Math.random() * 65).toFixed(1), a.desc,
            ['open', 'investigating', 'resolved'][Math.floor(Math.random() * 3)],
            past(Math.floor(Math.random() * 10))]);
    }
    console.log(`🔍 12 anomaly detections`);

    // ─── 12. Sustainability Scores ─────────────────────────────────
    for (const pid of productIds) {
        const scores = {
            carbon: +(5 + Math.random() * 40).toFixed(1),
            water: +(10 + Math.random() * 80).toFixed(1),
            recyclability: +(55 + Math.random() * 45).toFixed(1),
            ethical: +(60 + Math.random() * 40).toFixed(1),
            packaging: +(40 + Math.random() * 60).toFixed(1),
            transport: +(30 + Math.random() * 65).toFixed(1),
        };
        const overall = +((scores.recyclability + scores.ethical + scores.packaging + scores.transport) / 4).toFixed(1);
        const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B+' : overall >= 60 ? 'B' : overall >= 50 ? 'C' : 'D';
        db.run(`INSERT INTO sustainability_scores (id,product_id,carbon_footprint,water_usage,recyclability,ethical_sourcing,packaging_score,transport_score,overall_score,grade,assessed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), pid, scores.carbon, scores.water, scores.recyclability, scores.ethical, scores.packaging, scores.transport, overall, grade, past(Math.floor(Math.random() * 10))]);
    }
    console.log(`🌿 ${productIds.length} sustainability scores`);

    // ─── 13. NFT Certificates (6) ─────────────────────────────────
    for (let i = 0; i < 6; i++) {
        db.run(`INSERT INTO nft_certificates (id,token_id,product_id,entity_type,entity_id,certificate_type,owner,metadata_hash,status,minted_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), 10001 + i, productIds[i], 'product', productIds[i],
            ['authenticity', 'origin', 'sustainability', 'quality'][Math.floor(Math.random() * 4)],
                adminId, sha256(), 'active', past(Math.floor(Math.random() * 20) + 5)]);
    }
    console.log(`🎫 6 NFT certificates`);

    // ─── 14. Certifications (8) ────────────────────────────────────
    const certDefs = ['ISO 9001:2015', 'ISO 14001:2018', 'HACCP', 'GMP', 'Fair Trade', 'Organic EU', 'FDA Approved', 'CE Marking'];
    for (let i = 0; i < 8; i++) {
        db.run(`INSERT INTO certifications (id,entity_type,entity_id,cert_name,cert_body,cert_number,issued_date,expiry_date,status,document_hash,added_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), 'product', productIds[i % productIds.length],
            certDefs[i], ['TÜV Rheinland', 'SGS', 'Bureau Veritas', 'DNV GL'][Math.floor(Math.random() * 4)],
            `CERT-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999)}`,
            past(Math.floor(Math.random() * 365) + 30), future(Math.floor(Math.random() * 730) + 180),
                'active', sha256(), adminId, past(Math.floor(Math.random() * 30))]);
    }
    console.log(`📜 8 certifications`);

    // ─── 15. Billing & Usage ───────────────────────────────────────
    db.run(`INSERT INTO billing_plans (id,user_id,plan_name,scan_limit,api_limit,storage_mb,price_monthly,status,expires_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        [uuid(), adminId, 'enterprise', 50000, 100000, 10240, 299.00, 'active', future(365)]);

    const months = ['2025-11', '2025-12', '2026-01', '2026-02'];
    for (const m of months) {
        db.run(`INSERT INTO usage_metrics (id,user_id,metric_type,value,period,created_at) VALUES (?,?,?,?,?,?)`, [uuid(), adminId, 'scans', Math.floor(Math.random() * 3000) + 800, m, `${m}-28 23:59:59`]);
        db.run(`INSERT INTO usage_metrics (id,user_id,metric_type,value,period,created_at) VALUES (?,?,?,?,?,?)`, [uuid(), adminId, 'api_calls', Math.floor(Math.random() * 15000) + 5000, m, `${m}-28 23:59:59`]);
        db.run(`INSERT INTO usage_metrics (id,user_id,metric_type,value,period,created_at) VALUES (?,?,?,?,?,?)`, [uuid(), adminId, 'storage_mb', Math.floor(Math.random() * 2000) + 500, m, `${m}-28 23:59:59`]);
    }

    for (let i = 0; i < 3; i++) {
        db.run(`INSERT INTO invoices (id,user_id,plan_name,amount,currency,status,period_start,period_end,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), adminId, 'enterprise', 299.00, 'USD', 'paid', `2025-${11 + i}-01`, `2025-${11 + i}-30`, `2025-${11 + i}-01 00:00:00`]);
    }
    console.log(`💳 Billing plan + 12 usage metrics + 3 invoices`);

    // ─── 16. Audit Log (35 entries) ────────────────────────────────
    const auditActions = [
        'user.login', 'user.login', 'product.create', 'product.update', 'scan.validate', 'scan.validate', 'scan.validate',
        'alert.investigate', 'alert.resolve', 'partner.verify', 'partner.onboard', 'evidence.upload', 'evidence.verify',
        'settings.update', 'kyc.approve', 'kyc.review', 'seal.create', 'report.export', 'nft.mint', 'cert.add',
    ];
    for (let i = 0; i < 35; i++) {
        const action = auditActions[Math.floor(Math.random() * auditActions.length)];
        const actor = [adminId, operatorId, viewerId][Math.floor(Math.random() * 3)];
        db.run(`INSERT INTO audit_log (id,actor_id,action,entity_type,entity_id,ip_address,timestamp) VALUES (?,?,?,?,?,?,?)`,
            [uuid(), actor, action, action.split('.')[0], uuid(),
            `103.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            past(Math.floor(Math.random() * 14))]);
    }
    console.log(`📝 35 audit log entries`);

    // ─── 17. Leak Alerts (5) ───────────────────────────────────────
    const platforms = ['Alibaba', 'DHgate', 'Wish', 'Temu', 'AliExpress'];
    for (let i = 0; i < 5; i++) {
        const msrp = +(50 + Math.random() * 500).toFixed(2);
        db.run(`INSERT INTO leak_alerts (id,product_id,platform,url,listing_title,listing_price,authorized_price,region_detected,leak_type,risk_score,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), productIds[Math.floor(Math.random() * productIds.length)],
            platforms[i], `https://${platforms[i].toLowerCase()}.com/item/${Math.floor(Math.random() * 999999999)}`,
            `${products[Math.floor(Math.random() * products.length)].name} - Wholesale`,
            +(msrp * 0.4).toFixed(2), msrp,
            ['China', 'Nigeria', 'Turkey', 'Thailand', 'Indonesia'][Math.floor(Math.random() * 5)],
            ['unauthorized_seller', 'price_violation', 'unauthorized_region'][Math.floor(Math.random() * 3)],
            +(0.5 + Math.random() * 0.5).toFixed(2),
            ['open', 'open', 'investigating'][Math.floor(Math.random() * 3)],
            past(Math.floor(Math.random() * 10))]);
    }
    console.log(`🔓 5 market leak alerts`);

    // ═══════════════════════════════════════════════════════════════
    // SAVE TO DISK
    // ═══════════════════════════════════════════════════════════════
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    db.close();

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🎉 Demo data seeded successfully!`);
    console.log(`   📁 Database: ${DB_PATH} (${(buffer.length / 1024).toFixed(0)} KB)`);
    console.log(`   👤 Login: admin / Admin@123456!`);
    console.log(`\n   Next: pm2 start trustchecker`);
    console.log(`${'═'.repeat(50)}`);
})();
