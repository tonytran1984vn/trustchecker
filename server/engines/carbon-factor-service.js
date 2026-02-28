/**
 * Carbon Factor Service v1.0
 * Manages emission factors from PostgreSQL with version tracking.
 * 
 * Supports: transport, warehouse, manufacturing factors
 * Each factor has version history, source attribution, and confidence score.
 * 
 * Falls back to hardcoded CarbonEngine constants if DB is unavailable.
 */
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// ─── Table creation (idempotent) ─────────────────────────────────────────────
let _initialized = false;

async function initFactorTable() {
    if (_initialized) return;
    try {
        await db.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS emission_factors (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                factor_key TEXT NOT NULL,
                factor_value REAL NOT NULL,
                unit TEXT DEFAULT 'kgCO2e',
                source TEXT DEFAULT '',
                region TEXT DEFAULT 'GLOBAL',
                methodology TEXT DEFAULT '',
                confidence_score INTEGER DEFAULT 3,
                version INTEGER DEFAULT 1,
                effective_from TIMESTAMP DEFAULT NOW(),
                superseded_at TIMESTAMP,
                updated_by TEXT DEFAULT 'system',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(category, factor_key, version)
            )
        `);
        _initialized = true;
    } catch (e) {
        // Table might already exist, or we're in test mode
        if (e.message?.includes('already exists') || e.code === '42P07') {
            _initialized = true;
        } else {
            console.warn('[FactorService] Init warning:', e.message);
        }
    }
}

// ─── Load factors from DB ────────────────────────────────────────────────────
async function loadFactors(category = null) {
    await initFactorTable();
    try {
        const params = [];
        let q = `SELECT * FROM emission_factors WHERE superseded_at IS NULL`;
        if (category) {
            q += ` AND category = $1`;
            params.push(category);
        }
        q += ` ORDER BY category, factor_key`;
        const rows = await db.prisma.$queryRawUnsafe(q, ...params);
        return rows.map(r => ({
            ...r,
            factor_value: Number(r.factor_value),
            confidence_score: Number(r.confidence_score),
            version: Number(r.version)
        }));
    } catch (e) {
        console.warn('[FactorService] Load error, returning empty:', e.message);
        return [];
    }
}

// ─── Get factor value with fallback ──────────────────────────────────────────
async function getFactor(category, factorKey) {
    await initFactorTable();
    try {
        const row = await db.prisma.$queryRawUnsafe(
            `SELECT * FROM emission_factors 
             WHERE category = $1 AND factor_key = $2 AND superseded_at IS NULL
             ORDER BY version DESC LIMIT 1`,
            category, factorKey
        );
        if (row.length > 0) {
            return {
                value: Number(row[0].factor_value),
                source: row[0].source,
                confidence: Number(row[0].confidence_score),
                version: Number(row[0].version),
                id: row[0].id
            };
        }
    } catch (_) { }
    return null; // Caller should fall back to hardcoded
}

// ─── Update factor with version tracking ─────────────────────────────────────
async function updateFactor(id, updates, userId) {
    await initFactorTable();

    // Get current factor
    const current = await db.prisma.$queryRawUnsafe(
        `SELECT * FROM emission_factors WHERE id = $1`, id
    );
    if (!current || current.length === 0) {
        throw new Error('Factor not found');
    }
    const old = current[0];

    // Supersede old version
    await db.prisma.$executeRawUnsafe(
        `UPDATE emission_factors SET superseded_at = NOW() WHERE id = $1`, id
    );

    // Create new version
    const newId = uuidv4();
    const newVersion = Number(old.version) + 1;
    await db.prisma.$executeRawUnsafe(
        `INSERT INTO emission_factors (id, category, factor_key, factor_value, unit, source, region, methodology, confidence_score, version, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        newId,
        old.category,
        old.factor_key,
        updates.factor_value ?? old.factor_value,
        updates.unit ?? old.unit,
        updates.source ?? old.source,
        updates.region ?? old.region,
        updates.methodology ?? old.methodology,
        updates.confidence_score ?? old.confidence_score,
        newVersion,
        userId || 'system'
    );

    return {
        id: newId,
        previous_id: id,
        version: newVersion,
        factor_key: old.factor_key,
        old_value: Number(old.factor_value),
        new_value: Number(updates.factor_value ?? old.factor_value)
    };
}

// ─── Get version history for a factor ────────────────────────────────────────
async function getFactorHistory(category, factorKey) {
    await initFactorTable();
    try {
        const rows = await db.prisma.$queryRawUnsafe(
            `SELECT * FROM emission_factors 
             WHERE category = $1 AND factor_key = $2
             ORDER BY version DESC`,
            category, factorKey
        );
        return rows.map(r => ({
            ...r,
            factor_value: Number(r.factor_value),
            confidence_score: Number(r.confidence_score),
            version: Number(r.version)
        }));
    } catch (e) {
        return [];
    }
}

// ─── Seed initial factors from hardcoded constants ───────────────────────────
async function seedFactors(transportFactors, warehouseFactors, manufacturingFactors, userId = 'system-seed') {
    await initFactorTable();

    let seeded = 0;
    const seedOne = async (category, key, value, unit, source, confidence) => {
        // Check if already exists
        const existing = await db.prisma.$queryRawUnsafe(
            `SELECT id FROM emission_factors WHERE category = $1 AND factor_key = $2 AND superseded_at IS NULL LIMIT 1`,
            category, key
        );
        if (existing.length > 0) return false;

        await db.prisma.$executeRawUnsafe(
            `INSERT INTO emission_factors (id, category, factor_key, factor_value, unit, source, region, methodology, confidence_score, version, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            uuidv4(), category, key, value, unit, source, 'GLOBAL', 'DEFRA/GHG Protocol 2025', confidence, 1, userId
        );
        seeded++;
        return true;
    };

    // Transport factors
    for (const [key, value] of Object.entries(transportFactors)) {
        await seedOne('transport', key, value, 'kgCO2e/t-km', 'DEFRA Transport 2025', 3);
    }

    // Warehouse factors
    for (const [key, value] of Object.entries(warehouseFactors)) {
        await seedOne('warehouse', key, value, 'kgCO2e/m2/day', 'GHG Protocol 2025', 2);
    }

    // Manufacturing factors
    for (const [key, value] of Object.entries(manufacturingFactors)) {
        await seedOne('manufacturing', key, value, 'kgCO2e/unit', 'DEFRA Manufacturing 2025', 2);
    }

    return seeded;
}

module.exports = {
    initFactorTable,
    loadFactors,
    getFactor,
    updateFactor,
    getFactorHistory,
    seedFactors
};
