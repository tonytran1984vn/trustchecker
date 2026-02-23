/**
 * Seed Multi-Tenant Risk Data — PostgreSQL Version
 * Run on VPS: DATABASE_URL="..." node server/seed-risk-pg.js
 */
const { Client } = require('pg');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

const CONN = process.env.DATABASE_URL || 'postgresql://trustchecker:TrustChk%402026%21@localhost:5432/trustchecker';

// ─── Tenant Risk Data ──────────────────────────────────────────
const TENANTS = [
    {
        slug: 'pharmaguard', profile: 'HIGH_RISK',
        products: [
            { name: 'CardioMax 50mg', sku: 'PG-CM50', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 72 },
            { name: 'NeuroPlex 25mg', sku: 'PG-NP25', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 68 },
            { name: 'ImmunoShield Vaccine', sku: 'PG-ISV1', cat: 'Vaccine', mfr: 'PharmaGuard BioTech', country: 'CH', trust: 85 },
            { name: 'PainRelief Pro', sku: 'PG-PRP', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 45 },
            { name: 'DigestEase 100mg', sku: 'PG-DE100', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 91 },
            { name: 'SleepWell Caps', sku: 'PG-SWC', cat: 'Supplement', mfr: 'PharmaGuard Wellness', country: 'AT', trust: 88 },
            { name: 'VitaBoost IV', sku: 'PG-VBIV', cat: 'Supplement', mfr: 'PharmaGuard Wellness', country: 'AT', trust: 78 },
            { name: 'AntiViral-X', sku: 'PG-AVX', cat: 'Pharmaceutical', mfr: 'PharmaGuard BioTech', country: 'CH', trust: 55 },
            { name: 'BloodPure Tablets', sku: 'PG-BPT', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 82 },
            { name: 'RespiClear Inhaler', sku: 'PG-RCI', cat: 'Medical Device', mfr: 'PharmaGuard MedTech', country: 'DE', trust: 90 },
            { name: 'DermaHeal Cream', sku: 'PG-DHC', cat: 'Topical', mfr: 'PharmaGuard Derm', country: 'FR', trust: 93 },
            { name: 'OsteoFlex Joint', sku: 'PG-OFJ', cat: 'Supplement', mfr: 'PharmaGuard Wellness', country: 'AT', trust: 86 },
            { name: 'HepatoGuard Liver', sku: 'PG-HGL', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 79 },
            { name: 'ThyroBalance', sku: 'PG-TB', cat: 'Pharmaceutical', mfr: 'PharmaGuard Labs', country: 'DE', trust: 65 },
            { name: 'FerroPlus Iron', sku: 'PG-FPI', cat: 'Supplement', mfr: 'PharmaGuard Wellness', country: 'AT', trust: 94 },
        ],
        frauds: [
            { type: 'counterfeit', sev: 'critical', desc: 'Counterfeit PainRelief Pro detected in Myanmar border region' },
            { type: 'counterfeit', sev: 'critical', desc: 'Fake AntiViral-X batch found in Cambodia market' },
            { type: 'parallel_import', sev: 'high', desc: 'Unauthorized import of CardioMax via Thailand grey channel' },
            { type: 'parallel_import', sev: 'high', desc: 'NeuroPlex diverted from DE to VN unauthorized distributor' },
            { type: 'geo_anomaly', sev: 'medium', desc: 'ThyroBalance scanned in 3 countries within 2 hours' },
            { type: 'temporal_anomaly', sev: 'medium', desc: 'Bulk scan of 200 units at 3AM warehouse' },
            { type: 'tampering', sev: 'high', desc: 'QR code overlay detected on HepatoGuard packaging' },
            { type: 'expired_product', sev: 'medium', desc: 'Expired ImmunoShield vaccine batch still in distribution' },
        ],
        scans: { total: 520, valid: 380, sus: 95, fail: 45 }, ships: 22,
    },
    {
        slug: 'luxwatch-sg', profile: 'HIGH_RISK',
        products: [
            { name: 'Royal Chronograph', sku: 'LW-RC01', cat: 'Luxury Watch', mfr: 'LuxWatch Atelier', country: 'CH', trust: 65 },
            { name: 'Diver Pro 300m', sku: 'LW-DP300', cat: 'Sports Watch', mfr: 'LuxWatch Marine', country: 'CH', trust: 58 },
            { name: 'Heritage Moonphase', sku: 'LW-HM01', cat: 'Luxury Watch', mfr: 'LuxWatch Atelier', country: 'CH', trust: 72 },
            { name: 'Titanium GMT', sku: 'LW-TG01', cat: 'Sports Watch', mfr: 'LuxWatch Sport', country: 'JP', trust: 80 },
            { name: 'Diamond Eternal', sku: 'LW-DE01', cat: 'Jewelry Watch', mfr: 'LuxWatch Prestige', country: 'CH', trust: 45 },
            { name: 'Carbon Racer', sku: 'LW-CR01', cat: 'Sports Watch', mfr: 'LuxWatch Sport', country: 'JP', trust: 88 },
            { name: 'Skeleton Tourbillon', sku: 'LW-ST01', cat: 'Luxury Watch', mfr: 'LuxWatch Atelier', country: 'CH', trust: 52 },
            { name: 'Classic Dress', sku: 'LW-CD01', cat: 'Dress Watch', mfr: 'LuxWatch Heritage', country: 'CH', trust: 91 },
            { name: 'Pilot Navigator', sku: 'LW-PN01', cat: 'Pilot Watch', mfr: 'LuxWatch Aviation', country: 'DE', trust: 85 },
            { name: 'Ocean Pearl', sku: 'LW-OP01', cat: 'Jewelry Watch', mfr: 'LuxWatch Prestige', country: 'CH', trust: 40 },
            { name: 'Vintage Reserve', sku: 'LW-VR01', cat: 'Vintage Watch', mfr: 'LuxWatch Heritage', country: 'CH', trust: 78 },
            { name: 'Solar Eco', sku: 'LW-SE01', cat: 'Eco Watch', mfr: 'LuxWatch Green', country: 'JP', trust: 95 },
        ],
        frauds: [
            { type: 'counterfeit', sev: 'critical', desc: 'Super-clone Diamond Eternal intercepted at SG customs' },
            { type: 'counterfeit', sev: 'critical', desc: 'Fake Skeleton Tourbillon sold on Lazada marketplace' },
            { type: 'counterfeit', sev: 'high', desc: 'Ocean Pearl replica with cloned QR code' },
            { type: 'geo_anomaly', sev: 'high', desc: 'Royal Chronograph serial scanned in Russia AND Singapore simultaneously' },
            { type: 'price_anomaly', sev: 'medium', desc: 'Diver Pro 300m listed at 20% of retail — suspected stolen' },
        ],
        scans: { total: 320, valid: 210, sus: 75, fail: 35 }, ships: 12,
    },
    {
        slug: 'cryptomall', profile: 'MEDIUM_RISK',
        products: [
            { name: 'ProMax Laptop 16"', sku: 'CM-PML16', cat: 'Laptop', mfr: 'CryptoTech', country: 'TW', trust: 82 },
            { name: 'UltraTab 12"', sku: 'CM-UT12', cat: 'Tablet', mfr: 'CryptoTech', country: 'CN', trust: 78 },
            { name: 'SmartBuds Pro', sku: 'CM-SBP', cat: 'Audio', mfr: 'CryptoAudio', country: 'KR', trust: 85 },
            { name: 'PowerBank 20K', sku: 'CM-PB20K', cat: 'Accessory', mfr: 'CryptoPower', country: 'CN', trust: 70 },
            { name: 'Security Cam X1', sku: 'CM-SCX1', cat: 'Security', mfr: 'CryptoSafe', country: 'CN', trust: 60 },
            { name: 'USB-C Hub Pro', sku: 'CM-UCHP', cat: 'Accessory', mfr: 'CryptoTech', country: 'TW', trust: 88 },
            { name: 'GamingMouse Z9', sku: 'CM-GMZ9', cat: 'Peripheral', mfr: 'CryptoGaming', country: 'CN', trust: 75 },
            { name: 'MechBoard K1', sku: 'CM-MBK1', cat: 'Peripheral', mfr: 'CryptoGaming', country: 'CN', trust: 80 },
            { name: '4K Monitor Ultra', sku: 'CM-4KMU', cat: 'Display', mfr: 'CryptoDisplay', country: 'KR', trust: 90 },
            { name: 'VR Headset Pro', sku: 'CM-VHP', cat: 'VR', mfr: 'CryptoReality', country: 'US', trust: 86 },
            { name: 'Drone X500', sku: 'CM-DX500', cat: 'Drone', mfr: 'CryptoAir', country: 'CN', trust: 55 },
            { name: 'Smart Lock V2', sku: 'CM-SLV2', cat: 'Security', mfr: 'CryptoSafe', country: 'CN', trust: 62 },
            { name: 'eReader Lite', sku: 'CM-ERL', cat: 'eReader', mfr: 'CryptoRead', country: 'TW', trust: 92 },
            { name: 'Fitness Band S5', sku: 'CM-FBS5', cat: 'Wearable', mfr: 'CryptoFit', country: 'CN', trust: 78 },
            { name: 'Solar Charger 50W', sku: 'CM-SC50', cat: 'Energy', mfr: 'CryptoPower', country: 'CN', trust: 84 },
            { name: 'Mesh Router Pro', sku: 'CM-MRP', cat: 'Network', mfr: 'CryptoNet', country: 'TW', trust: 87 },
            { name: 'NAS Storage 4TB', sku: 'CM-NS4T', cat: 'Storage', mfr: 'CryptoStore', country: 'US', trust: 91 },
            { name: 'Webcam 4K', sku: 'CM-WC4K', cat: 'Peripheral', mfr: 'CryptoTech', country: 'TW', trust: 83 },
            { name: 'Portable SSD 2TB', sku: 'CM-PS2T', cat: 'Storage', mfr: 'CryptoStore', country: 'KR', trust: 89 },
            { name: 'Wireless Charger', sku: 'CM-WC', cat: 'Accessory', mfr: 'CryptoPower', country: 'CN', trust: 76 },
        ],
        frauds: [
            { type: 'counterfeit', sev: 'high', desc: 'Counterfeit Security Cam X1 with backdoor firmware' },
            { type: 'counterfeit', sev: 'high', desc: 'Fake Smart Lock V2 — no encryption chip' },
            { type: 'counterfeit', sev: 'medium', desc: 'Clone Drone X500 with different specs' },
            { type: 'parallel_import', sev: 'medium', desc: 'PowerBank 20K grey import from Shenzhen' },
            { type: 'volume_anomaly', sev: 'medium', desc: '500 GamingMouse scans from single IP in 1 hour' },
            { type: 'geo_anomaly', sev: 'low', desc: 'Webcam 4K scanned in sanctioned region' },
            { type: 'return_fraud', sev: 'medium', desc: 'Serial return pattern — 12 SmartBuds returned swapped' },
            { type: 'price_anomaly', sev: 'medium', desc: 'VR Headset Pro listed at 30% retail on marketplace' },
            { type: 'temporal_anomaly', sev: 'low', desc: 'Bulk order scans at 2AM from warehouse zone' },
            { type: 'warranty_fraud', sev: 'medium', desc: 'Duplicate warranty claims on Laptop — different buyers' },
            { type: 'ip_theft', sev: 'high', desc: 'MechBoard K1 design cloned by competitor' },
            { type: 'regulatory', sev: 'low', desc: 'Fitness Band missing CE mark in EU shipment' },
        ],
        scans: { total: 850, valid: 620, sus: 160, fail: 70 }, ships: 32,
    },
    {
        slug: 'freshmart-eu', profile: 'LOW_RISK',
        products: [
            { name: 'Organic Olive Oil 1L', sku: 'FM-OOL1', cat: 'Oil', mfr: 'FreshMart Farms', country: 'IT', trust: 96 },
            { name: 'Aged Balsamic Vinegar', sku: 'FM-ABV', cat: 'Condiment', mfr: 'FreshMart Italia', country: 'IT', trust: 94 },
            { name: 'Free-Range Eggs 12pk', sku: 'FM-FRE12', cat: 'Dairy', mfr: 'FreshMart Farms', country: 'NL', trust: 97 },
            { name: 'Alpine Cheese Block', sku: 'FM-ACB', cat: 'Dairy', mfr: 'FreshMart Alpine', country: 'CH', trust: 95 },
            { name: 'Sourdough Bread', sku: 'FM-SDB', cat: 'Bakery', mfr: 'FreshMart Bakery', country: 'FR', trust: 93 },
            { name: 'Wild Salmon Fillet', sku: 'FM-WSF', cat: 'Seafood', mfr: 'FreshMart Nordic', country: 'NO', trust: 90 },
            { name: 'Truffle Butter 100g', sku: 'FM-TB100', cat: 'Dairy', mfr: 'FreshMart Italia', country: 'IT', trust: 88 },
            { name: 'Raw Honey 500g', sku: 'FM-RH500', cat: 'Natural', mfr: 'FreshMart Apiary', country: 'NZ', trust: 92 },
            { name: 'Quinoa Organic 1kg', sku: 'FM-QO1K', cat: 'Grain', mfr: 'FreshMart Organic', country: 'PE', trust: 91 },
            { name: 'Wagyu Beef A5', sku: 'FM-WBA5', cat: 'Meat', mfr: 'FreshMart Premium', country: 'JP', trust: 87 },
            { name: 'Saffron Iron Box', sku: 'FM-SIB', cat: 'Spice', mfr: 'FreshMart Spices', country: 'IR', trust: 82 },
            { name: 'Matcha Grade A', sku: 'FM-MGA', cat: 'Tea', mfr: 'FreshMart Tea', country: 'JP', trust: 94 },
            { name: 'Cold Press Juice Set', sku: 'FM-CPJ', cat: 'Beverage', mfr: 'FreshMart Juice', country: 'DE', trust: 96 },
            { name: 'Artisan Pasta Pack', sku: 'FM-APP', cat: 'Pasta', mfr: 'FreshMart Italia', country: 'IT', trust: 95 },
            { name: 'Premium Dark Choc 85%', sku: 'FM-PDC85', cat: 'Confection', mfr: 'FreshMart Swiss', country: 'CH', trust: 97 },
            { name: 'Kombucha Original', sku: 'FM-KBO', cat: 'Beverage', mfr: 'FreshMart Ferment', country: 'DE', trust: 94 },
        ],
        frauds: [
            { type: 'temperature_violation', sev: 'medium', desc: 'Wagyu Beef A5 cold chain break — 18C for 4 hours' },
            { type: 'origin_fraud', sev: 'medium', desc: 'Saffron Iron Box — origin mismatch (labeled IR, tested CN)' },
            { type: 'regulatory', sev: 'low', desc: 'Truffle Butter 100g missing allergen declaration in SE market' },
        ],
        scans: { total: 620, valid: 570, sus: 35, fail: 15 }, ships: 25,
    },
    {
        slug: 'seoul-electronics', profile: 'MEDIUM_RISK',
        products: [
            { name: 'OLED Panel 55"', sku: 'SE-OP55', cat: 'Display', mfr: 'Seoul Display', country: 'KR', trust: 88 },
            { name: 'Memory Chip DDR5', sku: 'SE-MDDR5', cat: 'Semiconductor', mfr: 'Seoul Semi', country: 'KR', trust: 92 },
            { name: 'Battery Cell 4680', sku: 'SE-BC4680', cat: 'Energy', mfr: 'Seoul Energy', country: 'KR', trust: 85 },
            { name: 'Camera Module 108MP', sku: 'SE-CM108', cat: 'Optics', mfr: 'Seoul Optics', country: 'KR', trust: 90 },
            { name: 'MLCC Capacitor Pack', sku: 'SE-MLCC', cat: 'Passive Component', mfr: 'Seoul Parts', country: 'KR', trust: 80 },
            { name: 'Power IC Chip', sku: 'SE-PIC', cat: 'Semiconductor', mfr: 'Seoul Semi', country: 'KR', trust: 75 },
            { name: 'Flexible PCB Roll', sku: 'SE-FPCB', cat: 'PCB', mfr: 'Seoul Circuit', country: 'KR', trust: 87 },
            { name: 'Touch Sensor Module', sku: 'SE-TSM', cat: 'Sensor', mfr: 'Seoul Sensor', country: 'KR', trust: 91 },
            { name: 'LED Package 5050', sku: 'SE-LP5050', cat: 'LED', mfr: 'Seoul LED', country: 'KR', trust: 94 },
            { name: 'Micro Motor 6mm', sku: 'SE-MM6', cat: 'Motor', mfr: 'Seoul Micro', country: 'KR', trust: 89 },
        ],
        frauds: [
            { type: 'ip_theft', sev: 'high', desc: 'MLCC spec sheet leaked — competitor launched identical product' },
            { type: 'counterfeit', sev: 'high', desc: 'Fake Power IC Chip batch from Shenzhen market' },
        ],
        scans: { total: 240, valid: 195, sus: 30, fail: 15 }, ships: 15,
    },
    {
        slug: 'dubai-luxury', profile: 'HIGH_RISK',
        products: [
            { name: 'Gold Bullion 1oz', sku: 'DL-GB1OZ', cat: 'Precious Metal', mfr: 'Dubai Gold Souk', country: 'AE', trust: 70 },
            { name: 'Diamond Necklace', sku: 'DL-DN01', cat: 'Jewelry', mfr: 'Dubai Jewelers', country: 'AE', trust: 55 },
            { name: 'Luxury Handbag X', sku: 'DL-LHX', cat: 'Fashion', mfr: 'Dubai Fashion House', country: 'IT', trust: 48 },
            { name: 'Premium Oud 50ml', sku: 'DL-PO50', cat: 'Perfume', mfr: 'Dubai Scents', country: 'AE', trust: 82 },
            { name: 'Silk Scarf Limited', sku: 'DL-SSL', cat: 'Fashion', mfr: 'Dubai Fashion House', country: 'FR', trust: 60 },
            { name: 'Platinum Ring', sku: 'DL-PR01', cat: 'Jewelry', mfr: 'Dubai Jewelers', country: 'AE', trust: 65 },
            { name: 'Rare Whisky 30Y', sku: 'DL-RW30', cat: 'Spirits', mfr: 'Dubai Imports', country: 'GB', trust: 75 },
            { name: 'Caviar Beluga 100g', sku: 'DL-CB100', cat: 'Gourmet', mfr: 'Dubai Gourmet', country: 'IR', trust: 72 },
        ],
        frauds: [
            { type: 'counterfeit', sev: 'critical', desc: 'Fake Diamond Necklace — synthetic stones, real certificate cloned' },
            { type: 'counterfeit', sev: 'critical', desc: 'Luxury Handbag X — super-fake from Guangzhou' },
            { type: 'sanctions_risk', sev: 'critical', desc: 'Caviar Beluga 100g — OFAC sanction compliance issue' },
            { type: 'money_laundering', sev: 'high', desc: 'Gold Bullion purchased with layered transactions' },
            { type: 'geo_anomaly', sev: 'high', desc: 'Silk Scarf scanned in sanctioned jurisdiction' },
            { type: 'price_anomaly', sev: 'medium', desc: 'Platinum Ring undervalued by 60% at customs' },
        ],
        scans: { total: 180, valid: 100, sus: 55, fail: 25 }, ships: 14,
    },
    {
        slug: 'saigon-coffee', profile: 'LOW_RISK',
        products: [
            { name: 'Robusta Whole Bean 1kg', sku: 'SC-RWB1K', cat: 'Coffee', mfr: 'Saigon Coffee Co', country: 'VN', trust: 94 },
            { name: 'Arabica Premium 500g', sku: 'SC-AP500', cat: 'Coffee', mfr: 'Saigon Coffee Co', country: 'VN', trust: 96 },
            { name: 'Weasel Coffee 200g', sku: 'SC-WC200', cat: 'Specialty Coffee', mfr: 'Saigon Specialty', country: 'VN', trust: 85 },
            { name: 'Cold Brew Concentrate', sku: 'SC-CBC', cat: 'Beverage', mfr: 'Saigon Coffee Co', country: 'VN', trust: 92 },
            { name: 'Drip Filter Set', sku: 'SC-DFS', cat: 'Equipment', mfr: 'Saigon Coffee Co', country: 'VN', trust: 97 },
            { name: 'Coffee Gift Box', sku: 'SC-CGB', cat: 'Gift Set', mfr: 'Saigon Coffee Co', country: 'VN', trust: 95 },
        ],
        frauds: [
            { type: 'origin_fraud', sev: 'medium', desc: 'Weasel Coffee 200g — suspected non-authentic civet process' },
        ],
        scans: { total: 110, valid: 100, sus: 8, fail: 2 }, ships: 8,
    },
    {
        slug: 'mekong-agri', profile: 'MEDIUM_RISK',
        products: [
            { name: 'Jasmine Rice 5kg', sku: 'MA-JR5K', cat: 'Rice', mfr: 'Mekong Farms', country: 'VN', trust: 90 },
            { name: 'Dragon Fruit Export', sku: 'MA-DFE', cat: 'Fruit', mfr: 'Mekong Tropical', country: 'VN', trust: 88 },
            { name: 'Cashew Nut W320', sku: 'MA-CNW', cat: 'Nut', mfr: 'Mekong Nuts', country: 'VN', trust: 85 },
            { name: 'Black Pepper 500g', sku: 'MA-BP500', cat: 'Spice', mfr: 'Mekong Spice', country: 'VN', trust: 82 },
            { name: 'Pangasius Fillet', sku: 'MA-PF', cat: 'Seafood', mfr: 'Mekong Aqua', country: 'VN', trust: 78 },
            { name: 'Coconut Oil Virgin', sku: 'MA-COV', cat: 'Oil', mfr: 'Mekong Coconut', country: 'VN', trust: 91 },
            { name: 'Turmeric Powder', sku: 'MA-TP', cat: 'Spice', mfr: 'Mekong Spice', country: 'VN', trust: 87 },
            { name: 'Dried Mango Slices', sku: 'MA-DMS', cat: 'Dried Fruit', mfr: 'Mekong Tropical', country: 'VN', trust: 93 },
        ],
        frauds: [
            { type: 'pesticide_violation', sev: 'high', desc: 'Pangasius Fillet — Chloramphenicol residue at EU border' },
            { type: 'origin_fraud', sev: 'medium', desc: 'Cashew Nut W320 — mixed origin, labeled single origin' },
        ],
        scans: { total: 145, valid: 120, sus: 18, fail: 7 }, ships: 11,
    },
];

const CITIES = [
    { city: 'Ho Chi Minh City', country: 'VN', lat: 10.82, lng: 106.63 },
    { city: 'Singapore', country: 'SG', lat: 1.35, lng: 103.82 },
    { city: 'Bangkok', country: 'TH', lat: 13.75, lng: 100.52 },
    { city: 'Tokyo', country: 'JP', lat: 35.68, lng: 139.69 },
    { city: 'Seoul', country: 'KR', lat: 37.57, lng: 126.98 },
    { city: 'Dubai', country: 'AE', lat: 25.20, lng: 55.27 },
    { city: 'Berlin', country: 'DE', lat: 52.52, lng: 13.41 },
    { city: 'London', country: 'GB', lat: 51.51, lng: -0.13 },
    { city: 'New York', country: 'US', lat: 40.71, lng: -74.01 },
    { city: 'Shanghai', country: 'CN', lat: 31.23, lng: 121.47 },
    { city: 'Mumbai', country: 'IN', lat: 19.08, lng: 72.88 },
    { city: 'Paris', country: 'FR', lat: 48.86, lng: 2.35 },
    { city: 'Sydney', country: 'AU', lat: -33.87, lng: 151.21 },
    { city: 'Shenzhen', country: 'CN', lat: 22.54, lng: 114.06 },
    { city: 'Mae Sot', country: 'TH', lat: 16.71, lng: 98.57 },
];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rndDate = (d = 90) => { const x = new Date(); x.setDate(x.getDate() - Math.floor(Math.random() * d)); x.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60)); return x.toISOString(); };

async function seed() {
    const client = new Client({ connectionString: CONN });
    await client.connect();
    console.log('🔬 Connected to PostgreSQL — seeding risk data...\n');

    let tP = 0, tS = 0, tF = 0, tH = 0;

    for (const td of TENANTS) {
        const orgRes = await client.query('SELECT id, name FROM organizations WHERE slug = $1', [td.slug]);
        if (!orgRes.rows.length) { console.log(`  ⚠️  ${td.slug} not found`); continue; }
        const org = orgRes.rows[0];
        console.log(`\n  🏢 ${org.name} (${td.profile})`);

        // Find this tenant's admin user
        const userRes = await client.query('SELECT id FROM users WHERE org_id = $1 LIMIT 1', [org.id]);
        const userId = userRes.rows[0]?.id || null;

        // ── Products ──
        const pids = [];
        for (const p of td.products) {
            const id = uuid();
            try {
                await client.query(
                    `INSERT INTO products (id, name, sku, category, manufacturer, origin_country, registered_by, org_id, trust_score, status, batch_number, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                    [id, p.name, p.sku, p.cat, p.mfr, p.country, userId, org.id, p.trust, 'active', 'BATCH-' + p.sku, p.cat + ' by ' + p.mfr]
                );
                pids.push({ id, ...p }); tP++;
            } catch (e) {
                if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
                    const ex = await client.query('SELECT id FROM products WHERE sku = $1', [p.sku]);
                    if (ex.rows.length) pids.push({ id: ex.rows[0].id, ...p });
                } else {
                    console.log(`      ⚠ Product ${p.sku}: ${e.message?.substring(0, 80)}`);
                }
            }
        }
        console.log(`    📦 Products: ${pids.length}`);

        // ── Scan Events ──
        const sp = td.scans;
        let sc = 0;
        for (let i = 0; i < sp.total; i++) {
            const prod = pick(pids); if (!prod) continue;
            const loc = pick(CITIES);
            let result = 'valid';
            if (i < sp.fail) result = 'failed';
            else if (i < sp.fail + sp.sus) result = 'suspicious';
            const fs = result === 'failed' ? 0.7 + Math.random() * 0.3 : result === 'suspicious' ? 0.3 + Math.random() * 0.4 : Math.random() * 0.15;
            try {
                await client.query(
                    `INSERT INTO scan_events (id, product_id, scan_type, latitude, longitude, geo_city, geo_country, result, fraud_score, trust_score, response_time_ms, scanned_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                    [uuid(), prod.id, pick(['validation', 'verification', 'authentication']),
                    loc.lat + (Math.random() - 0.5) * 0.1, loc.lng + (Math.random() - 0.5) * 0.1,
                    loc.city, loc.country, result, Math.round(fs * 100) / 100, Math.round((1 - fs) * 100) / 100,
                    50 + Math.floor(Math.random() * 200), rndDate(90)]
                );
                sc++;
            } catch (e) { /* skip */ }
        }
        tS += sc;
        console.log(`    📊 Scans: ${sc}`);

        // ── Fraud Alerts ──
        let fc = 0;
        for (const f of td.frauds) {
            const prod = pick(pids); if (!prod) continue;
            try {
                await client.query(
                    `INSERT INTO fraud_alerts (id, product_id, alert_type, severity, description, details, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [uuid(), prod.id, f.type, f.sev, f.desc,
                    JSON.stringify({ tenant: org.name, product: prod.name, profile: td.profile }),
                    pick(['open', 'open', 'open', 'investigating', 'resolved']), rndDate(60)]
                );
                fc++;
            } catch (e) { /* skip */ }
        }
        tF += fc;
        console.log(`    🚨 Fraud: ${fc}`);

        // ── Shipments ──
        const carriers = ['DHL Express', 'FedEx', 'Maersk', 'UPS', 'CMA CGM', 'MSC', 'Vietnam Airlines Cargo', 'Emirates SkyCargo'];
        const sts = ['delivered', 'delivered', 'delivered', 'in_transit', 'in_transit', 'pending', 'delayed'];
        let sh = 0;
        for (let i = 0; i < td.ships; i++) {
            const from = pick(CITIES);
            const to = pick(CITIES.filter(c => c.city !== from.city));
            try {
                await client.query(
                    `INSERT INTO shipments (id, batch_id, carrier, tracking_number, status, current_lat, current_lng, gps_trail, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                    [uuid(), pids[i % pids.length]?.id || 'b-' + i, pick(carriers),
                    'TRK-' + td.slug.toUpperCase().replace(/-/g, '') + '-' + String(i + 1).padStart(4, '0'),
                    pick(sts), to.lat, to.lng,
                    JSON.stringify([{ lat: from.lat, lng: from.lng, ts: rndDate(30), loc: from.city }, { lat: to.lat, lng: to.lng, ts: rndDate(5), loc: to.city }]),
                    rndDate(45), rndDate(10)]
                );
                sh++;
            } catch (e) { /* skip */ }
        }
        tH += sh;
        console.log(`    🚚 Ships: ${sh}`);

        // ── Trust Scores ──
        for (const p of pids) {
            try {
                await client.query(
                    `INSERT INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, explanation, calculated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [uuid(), p.id, p.trust, Math.round((100 - p.trust) * 0.4 * 100) / 100,
                    Math.round(Math.random() * 20 * 100) / 100, Math.round(Math.random() * 15 * 100) / 100,
                    Math.round(Math.random() * 10 * 100) / 100,
                    JSON.stringify({ profile: td.profile, mfr: p.mfr, country: p.country }), rndDate(7)]
                );
            } catch (e) { /* skip */ }
        }
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🎯 SEED COMPLETE (PostgreSQL)`);
    console.log(`   📦 Products: ${tP}`);
    console.log(`   📊 Scans: ${tS}`);
    console.log(`   🚨 Fraud: ${tF}`);
    console.log(`   🚚 Ships: ${tH}`);
    console.log(`${'═'.repeat(50)}`);
    await client.end();
    process.exit(0);
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });
