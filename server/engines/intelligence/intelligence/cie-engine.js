/**
 * Carbon Integrity Engine (CIE) v2.0
 * Core engine for passport management, emission calculation, snapshot capsules,
 * methodology governance, and blockchain anchoring
 */

const crypto = require('crypto');

// ─── Emission Factor Library (MGB-controlled, version-locked) ────────────────
const FACTOR_VERSIONS = {
    'EF-2024.12.01': {
        frozen_by: 'MGB-2024-004', frozen_at: '2024-12-01T09:00:00Z',
        hash: null, // computed at load
        factors: [
            { source: 'Grid Electricity', scope: 2, factor: 0.42, unit: 'kgCO2e/kWh', region: 'Global Avg', citation: 'IEA 2023' },
            { source: 'Diesel Fuel', scope: 1, factor: 2.68, unit: 'kgCO2e/liter', region: 'Global', citation: 'IPCC AR6' },
            { source: 'Natural Gas', scope: 1, factor: 2.02, unit: 'kgCO2e/m3', region: 'Global', citation: 'IPCC AR6' },
            { source: 'Road Transport', scope: 3, factor: 0.12, unit: 'kgCO2e/t-km', region: 'EU Avg', citation: 'DEFRA 2024' },
            { source: 'Sea Freight', scope: 3, factor: 0.016, unit: 'kgCO2e/t-km', region: 'Global', citation: 'IMO GHG' },
            { source: 'Air Freight', scope: 3, factor: 0.60, unit: 'kgCO2e/t-km', region: 'Global', citation: 'DEFRA 2024' },
        ],
    },
};

// Compute hashes for all factor versions
Object.entries(FACTOR_VERSIONS).forEach(([ver, data]) => {
    data.hash = crypto.createHash('sha256')
        .update(JSON.stringify(data.factors))
        .digest('hex').slice(0, 16);
});

const ACTIVE_FACTOR_VERSION = 'EF-2024.12.01';

// ─── Methodology Registry ────────────────────────────────────────────────────
const METHODOLOGY = {
    id: 'GHG-v4.2-r3',
    name: 'GHG Protocol Corporate Standard v4.2 Revision 3',
    version_hash: null,
    governance: 'MGB-controlled',
    last_updated: '2024-10-01',
    scopes: {
        1: 'Direct emissions from owned/controlled sources',
        2: 'Indirect emissions from purchased energy',
        3: 'All other indirect emissions in value chain',
    },
};
METHODOLOGY.version_hash = crypto.createHash('sha256')
    .update(JSON.stringify(METHODOLOGY))
    .digest('hex').slice(0, 16);

// ─── Risk Thresholds ─────────────────────────────────────────────────────────
const RISK_THRESHOLDS = {
    block_approval: 70,
    auto_escalate: 85,
    emergency_freeze: 95,
    overclaim_alert_pct: 20,
};

// ─── Regulatory Standard Mapping ─────────────────────────────────────────────
const REGULATORY_MAPPINGS = {
    EU: {
        name: 'European Union',
        standards: [
            { field: 'Scope 1 Direct', csrd: 'ESRS E1-6', gri: 'GRI 305-1', ifrs: 'Para 29(a)', ets: 'EU-ETS Phase IV' },
            { field: 'Scope 2 Energy', csrd: 'ESRS E1-6', gri: 'GRI 305-2', ifrs: 'Para 29(a)', ets: 'EU-ETS Indirect' },
            { field: 'Scope 3 Value Chain', csrd: 'ESRS E1-6', gri: 'GRI 305-3', ifrs: 'Para 29(b)', ets: 'Partial' },
            { field: 'Emission Intensity', csrd: 'ESRS E1-4', gri: 'GRI 305-4', ifrs: 'Para 29(c)', ets: 'N/A' },
            { field: 'Reduction Targets', csrd: 'ESRS E1-4', gri: 'GRI 305-5', ifrs: 'Para 33-34', ets: 'Cap Target' },
            { field: 'Methodology', csrd: 'ESRS 1 App B', gri: 'GRI 305 Guide', ifrs: 'Para B25-30', ets: 'MRV' },
            { field: 'Governance', csrd: 'ESRS 2 GOV', gri: 'GRI 2-12', ifrs: 'Para 6-8', ets: 'Limited' },
            { field: 'Financial Impact', csrd: 'ESRS E1-9', gri: 'N/A', ifrs: 'Para 21-22', ets: 'Allowance Cost' },
        ],
        regulation_version: 'CSRD 2024/04',
    },
    US: {
        name: 'United States',
        standards: [
            { field: 'Scope 1 Direct', sec: 'SEC Climate Rule', epa: 'EPA GHG', ifrs: 'Para 29(a)', ets: 'CA Cap-and-Trade' },
            { field: 'Scope 2 Energy', sec: 'SEC Climate Rule', epa: 'EPA Subpart C', ifrs: 'Para 29(a)', ets: 'RGGI' },
            { field: 'Scope 3 Value Chain', sec: 'Safe Harbor', epa: 'Voluntary', ifrs: 'Para 29(b)', ets: 'N/A' },
        ],
        regulation_version: 'SEC Climate Rule 2024',
    },
    VN: {
        name: 'Vietnam',
        standards: [
            { field: 'Scope 1 Direct', monre: 'Decree 06/2022', vneep: 'VNEEP Target', ifrs: 'Para 29(a)', ets: 'Pilot ETS 2025' },
            { field: 'Scope 2 Energy', monre: 'Decree 06/2022', vneep: 'Energy Audit', ifrs: 'Para 29(a)', ets: 'Pilot ETS 2025' },
        ],
        regulation_version: 'Decree 06/2022/ND-CP',
    },
    SG: {
        name: 'Singapore',
        standards: [
            { field: 'Scope 1 Direct', mas: 'MAS Guidelines', nea: 'Carbon Tax Act', ifrs: 'Para 29(a)', ets: 'Carbon Tax $25/t' },
            { field: 'Scope 2 Energy', mas: 'MAS Guidelines', nea: 'EMA Report', ifrs: 'Para 29(a)', ets: 'Carbon Tax $25/t' },
        ],
        regulation_version: 'Carbon Tax Act 2024',
    },
};

// ─── Core CIE Functions ──────────────────────────────────────────────────────

/**
 * Calculate emission for a data input using active factor version
 */
function calculateEmission(input) {
    const factorSet = FACTOR_VERSIONS[ACTIVE_FACTOR_VERSION];
    if (!factorSet) throw new Error('No active factor version');

    const { source, quantity, scope } = input;
    const factor = factorSet.factors.find(f => f.source === source && f.scope === scope);
    if (!factor) throw new Error(`No factor for source=${source}, scope=${scope}`);

    const emission = quantity * factor.factor;
    return {
        source, scope, quantity,
        factor: factor.factor,
        unit: factor.unit,
        citation: factor.citation,
        emission_kgCO2e: Math.round(emission * 1000) / 1000,
        factor_version: ACTIVE_FACTOR_VERSION,
        methodology: METHODOLOGY.id,
    };
}

/**
 * Create a Snapshot Capsule (WORM) at CIP seal time
 */
function createSnapshotCapsule(cipId, passportData) {
    const factorSet = FACTOR_VERSIONS[ACTIVE_FACTOR_VERSION];
    const capsule = {
        cip_id: cipId,
        seal_timestamp: new Date().toISOString(),
        storage_class: 'WORM',
        redundancy: '3-region',
        data_hash: crypto.createHash('sha256')
            .update(JSON.stringify(passportData))
            .digest('hex'),
        method_version: METHODOLOGY.id,
        method_hash: METHODOLOGY.version_hash,
        factor_version: ACTIVE_FACTOR_VERSION,
        factor_hash: factorSet.hash,
        governance_chain: passportData.governance_chain || 'CO→IVU→Compliance→BC',
        benchmark_ref: passportData.benchmark_ref || null,
        scope_snapshot: {
            s1: passportData.scope_1 || 0,
            s2: passportData.scope_2 || 0,
            s3: passportData.scope_3 || 0,
            total: (passportData.scope_1 || 0) + (passportData.scope_2 || 0) + (passportData.scope_3 || 0),
        },
        risk_thresholds_at_seal: { ...RISK_THRESHOLDS },
        integrity: 'verified',
    };
    capsule.capsule_hash = crypto.createHash('sha256')
        .update(JSON.stringify(capsule))
        .digest('hex');
    return capsule;
}

/**
 * Generate blockchain anchor hash for on-chain anchoring
 */
function generateAnchorHash(type, data) {
    const payload = {
        type, // 'calculation', 'governance', 'methodology', 'seal'
        timestamp: new Date().toISOString(),
        data_hash: crypto.createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex'),
    };
    return {
        anchor_hash: crypto.createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex'),
        anchor_type: type,
        chain: 'polygon',
        payload_hash: payload.data_hash,
        created_at: payload.timestamp,
    };
}

/**
 * Assess risk score for a CIP
 */
function assessRisk(passportData) {
    const factors = {
        data_integrity: passportData.data_integrity_pct || 95,
        supplier_trust: passportData.supplier_trust_score || 70,
        benchmark_deviation: passportData.benchmark_deviation_pct || 15,
        historical_stability: passportData.historical_stability || 80,
        method_confidence: passportData.method_confidence || 95,
        governance_quality: passportData.governance_quality || 85,
    };

    const weights = {
        data_integrity: 0.25,
        supplier_trust: 0.20,
        benchmark_deviation: 0.20,
        historical_stability: 0.15,
        method_confidence: 0.10,
        governance_quality: 0.10,
    };

    const compositeRisk = 100 - Math.round(
        Object.entries(weights).reduce((sum, [k, w]) => sum + (factors[k] * w), 0)
    );

    let action = 'approved';
    if (compositeRisk >= RISK_THRESHOLDS.emergency_freeze) action = 'emergency_freeze';
    else if (compositeRisk >= RISK_THRESHOLDS.auto_escalate) action = 'auto_escalate';
    else if (compositeRisk >= RISK_THRESHOLDS.block_approval) action = 'block_approval';

    return { composite_risk: compositeRisk, factors, action, thresholds: RISK_THRESHOLDS };
}

/**
 * Get regulatory mapping for a specific country
 */
function getRegulatoryMapping(country = 'EU') {
    return REGULATORY_MAPPINGS[country] || REGULATORY_MAPPINGS.EU;
}

/**
 * Get compliance gaps for a country
 */
function getComplianceGaps(country = 'EU') {
    const mapping = getRegulatoryMapping(country);
    const gaps = [];
    mapping.standards.forEach(s => {
        Object.entries(s).forEach(([key, val]) => {
            if (typeof val === 'string' && (val === 'N/A' || val === 'Partial' || val === 'Limited' || val === 'Voluntary')) {
                gaps.push({ field: s.field, standard: key, status: val, severity: val === 'N/A' ? 'info' : 'warning' });
            }
        });
    });
    return { country, gaps, total_gaps: gaps.length, regulation_version: mapping.regulation_version };
}

module.exports = {
    calculateEmission,
    createSnapshotCapsule,
    generateAnchorHash,
    assessRisk,
    getRegulatoryMapping,
    getComplianceGaps,
    FACTOR_VERSIONS,
    ACTIVE_FACTOR_VERSION,
    METHODOLOGY,
    RISK_THRESHOLDS,
    REGULATORY_MAPPINGS,
};
