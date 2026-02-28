/**
 * Seed: emission_factors table
 * Migrates hardcoded emission factors from carbon-engine.js into PostgreSQL
 * with proper version tracking and source attribution.
 *
 * Run: node server/seed-emission-factors.js
 */
const db = require('./db');
const factorService = require('./engines/carbon-factor-service');

// Import the hardcoded constants (same values as in carbon-engine.js)
const TRANSPORT_EMISSION_FACTORS = {
    air: 0.602, air_short: 1.128, sea: 0.016, sea_container: 0.012,
    road: 0.062, road_electric: 0.025, rail: 0.022, rail_electric: 0.008, multimodal: 0.045
};

const WAREHOUSE_FACTORS = {
    cold_storage: 0.85, ambient: 0.15, automated: 0.35
};

const MANUFACTURING_FACTORS = {
    'F&B': 2.5, 'F&B Artisan': 3.0, 'F&B Heritage': 2.8, 'F&B Organic': 1.5, 'F&B Premium': 3.2,
    'Electronics': 15.0, 'IoT': 12.0, 'Sensor': 10.0, 'Tracking': 8.0,
    'Semiconductor': 35.0, 'Passive Component': 20.0, 'LED': 18.0, 'PCB': 22.0, 'Optics': 25.0, 'Motor': 15.0,
    'Display': 28.0, 'OLED Panel': 28.0,
    'Fashion': 8.0, 'Luxury Textiles': 12.0, 'Art': 6.0,
    'Healthcare': 5.0, 'Pharmaceutical': 8.0, 'Pharmaceuticals': 8.0, 'Supplement': 4.0,
    'Topical': 3.5, 'Vaccine': 15.0, 'Medical Device': 12.0, 'Medical Devices': 12.0,
    'Industrial': 20.0, 'Advanced Materials': 30.0, 'Aerospace Tech': 45.0, 'EV Components': 55.0,
    'Energy': 25.0, 'Smart Security': 12.0,
    'Luxury Watch': 18.0, 'Luxury Watches': 18.0, 'Dress Watch': 14.0, 'Sports Watch': 16.0,
    'Pilot Watch': 16.0, 'Eco Watch': 10.0, 'Vintage Watch': 8.0, 'Jewelry Watch': 20.0,
    'Jewelry': 25.0, 'Precious Metal': 50.0, 'Perfume': 6.0,
    'Coffee': 3.5, 'Coffee Bean': 2.8, 'Specialty Coffee': 4.0, 'Beverage': 2.0,
    'Rice': 1.5, 'Grain': 1.2, 'Nut': 2.0, 'Spice': 1.8, 'Oil': 2.5,
    'Seafood': 4.5, 'Fruit': 1.0, 'Fresh Fruit': 0.8, 'Dried Fruit': 2.5,
    'Snack': 3.0, 'Instant Food': 3.5, 'Condiment': 2.0,
    'Meat': 12.0, 'Dairy': 5.0, 'Bakery': 2.0, 'Pasta': 1.5,
    'Natural': 1.0, 'Confection': 3.5, 'Tea': 2.0, 'Gourmet': 8.0, 'Spirits': 5.0,
    'Gift Set': 3.0, 'Equipment': 8.0,
    'Laptop': 250.0, 'Tablet': 80.0, 'Audio': 15.0, 'Wearable': 20.0,
    'Drone': 45.0, 'VR': 35.0, 'Accessory': 8.0, 'Network': 18.0,
    'Peripheral': 12.0, 'Storage': 20.0, 'Security': 15.0, 'eReader': 25.0,
    'Agriculture': 1.8
};

async function main() {
    console.log('🌱 Seeding emission_factors table...');

    // Wait for DB connection
    await db._readyPromise;
    await new Promise(r => setTimeout(r, 1000));

    const seeded = await factorService.seedFactors(
        TRANSPORT_EMISSION_FACTORS,
        WAREHOUSE_FACTORS,
        MANUFACTURING_FACTORS,
        'system-migration-v3'
    );

    console.log(`✅ Seeded ${seeded} emission factors into PostgreSQL`);

    // Verify
    const factors = await factorService.loadFactors();
    console.log(`📊 Total active factors in DB: ${factors.length}`);
    console.log(`   Transport: ${factors.filter(f => f.category === 'transport').length}`);
    console.log(`   Warehouse: ${factors.filter(f => f.category === 'warehouse').length}`);
    console.log(`   Manufacturing: ${factors.filter(f => f.category === 'manufacturing').length}`);

    process.exit(0);
}

main().catch(e => {
    console.error('❌ Seed error:', e.message);
    process.exit(1);
});
