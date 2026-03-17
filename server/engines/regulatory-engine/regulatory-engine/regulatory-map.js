/**
 * TrustChecker — Regulatory Licensing Map + Cross-Border Compliance Router v1.0
 * 
 * Maps every jurisdiction's required licenses for:
 *   1. Carbon credit trading/verification
 *   2. Digital asset / NFT issuance
 *   3. Payment processing / e-money
 *   4. Data processing / cloud services
 *   5. Supply chain verification / certification
 * 
 * Cross-border routing: determines what licenses are needed
 * when a tenant in country A does business with country B.
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// LICENSE TYPES
// ═══════════════════════════════════════════════════════════════════

const LICENSE_TYPES = {
    carbon_verification: {
        name: 'Carbon Credit Verification License',
        category: 'environmental',
        jurisdictions: {
            'EU': { required: true, body: 'European Commission', framework: 'EU ETS Directive', est_cost: 50000, timeline_months: 12 },
            'US': { required: true, body: 'EPA / California ARB', framework: 'Clean Air Act / AB-32', est_cost: 35000, timeline_months: 9 },
            'SG': { required: true, body: 'NEA Singapore', framework: 'Carbon Pricing Act', est_cost: 20000, timeline_months: 6 },
            'VN': { required: false, body: 'MONRE', framework: 'Law on Environmental Protection 2020', est_cost: 10000, timeline_months: 6 },
            'JP': { required: true, body: 'MOE Japan', framework: 'J-Credit Scheme', est_cost: 40000, timeline_months: 10 },
        },
    },
    digital_asset: {
        name: 'Digital Asset / NFT Issuance License',
        category: 'fintech',
        jurisdictions: {
            'EU': { required: true, body: 'National Financial Authority (MiCA)', framework: 'MiCA Regulation', est_cost: 100000, timeline_months: 18 },
            'US': { required: true, body: 'SEC / FinCEN', framework: 'Securities Act + FinCEN MSB', est_cost: 150000, timeline_months: 12 },
            'SG': { required: true, body: 'MAS', framework: 'Payment Services Act (PSA)', est_cost: 80000, timeline_months: 9 },
            'HK': { required: true, body: 'SFC', framework: 'Virtual Asset Service Provider Regime', est_cost: 120000, timeline_months: 12 },
            'JP': { required: true, body: 'FSA Japan', framework: 'FIEA / PSA', est_cost: 90000, timeline_months: 12 },
            'AE': { required: true, body: 'VARA (Dubai)', framework: 'Virtual Asset Regulation', est_cost: 60000, timeline_months: 6 },
        },
    },
    payment_processing: {
        name: 'Payment Processing / E-Money License',
        category: 'financial',
        jurisdictions: {
            'EU': { required: true, body: 'National Central Bank (EMI License)', framework: 'PSD2 / EMD2', est_cost: 200000, timeline_months: 18 },
            'US': { required: true, body: 'State MTLs + FinCEN', framework: 'Money Transmitter Laws', est_cost: 500000, timeline_months: 24, note: 'Per-state licensing required' },
            'SG': { required: true, body: 'MAS', framework: 'PSA Major Payment License', est_cost: 100000, timeline_months: 12 },
            'UK': { required: true, body: 'FCA', framework: 'EMI / PI Authorization', est_cost: 150000, timeline_months: 12 },
        },
    },
    data_processing: {
        name: 'Data Processing / Cloud Services Registration',
        category: 'technology',
        jurisdictions: {
            'EU': { required: true, body: 'National DPA', framework: 'GDPR Article 27/37', est_cost: 15000, timeline_months: 3 },
            'CN': { required: true, body: 'CAC', framework: 'CSL + PIPL + DSL', est_cost: 50000, timeline_months: 12, note: 'ICP license for China operations' },
            'VN': { required: true, body: 'MIC', framework: 'Decree 13/2023', est_cost: 8000, timeline_months: 6 },
            'IN': { required: true, body: 'MeitY', framework: 'DPDPA 2023', est_cost: 10000, timeline_months: 6 },
        },
    },
    supply_chain_certification: {
        name: 'Supply Chain Verification / Certification Body',
        category: 'trade',
        jurisdictions: {
            'GLOBAL': { required: false, body: 'ISO/IEC', framework: 'ISO 17065 (Certification Bodies)', est_cost: 30000, timeline_months: 12 },
            'EU': { required: true, body: 'European Accreditation', framework: 'EU Regulation 765/2008', est_cost: 40000, timeline_months: 12 },
            'US': { required: false, body: 'ANAB / A2LA', framework: 'ISO/IEC 17065', est_cost: 25000, timeline_months: 9 },
        },
    },
};

// ═══════════════════════════════════════════════════════════════════
// CROSS-BORDER ROUTING RULES
// ═══════════════════════════════════════════════════════════════════

const CROSS_BORDER_RULES = {
    'EU→US': { mechanism: 'EU-US DPF', additional_licenses: ['data_processing'], sanctions_check: false },
    'EU→CN': { mechanism: 'SCC + TIA', additional_licenses: ['data_processing'], sanctions_check: true, note: 'Transfer Impact Assessment mandatory' },
    'US→CN': { mechanism: 'Contract + Assessment', additional_licenses: ['data_processing'], sanctions_check: true, note: 'OFAC sanctions screening required' },
    'US→RU': { mechanism: 'BLOCKED', additional_licenses: [], sanctions_check: true, blocked: true, note: 'Comprehensive sanctions — no service' },
    'EU→RU': { mechanism: 'BLOCKED', additional_licenses: [], sanctions_check: true, blocked: true },
    '*→KP': { mechanism: 'BLOCKED', additional_licenses: [], sanctions_check: true, blocked: true },
    '*→IR': { mechanism: 'RESTRICTED', additional_licenses: [], sanctions_check: true, blocked: true },
    'SG→VN': { mechanism: 'RCEP + Contract', additional_licenses: [], sanctions_check: false },
    'JP→VN': { mechanism: 'RCEP + Contract', additional_licenses: [], sanctions_check: false },
};

// ═══════════════════════════════════════════════════════════════════
// SANCTIONS LISTS
// ═══════════════════════════════════════════════════════════════════

const SANCTIONED_JURISDICTIONS = ['RU', 'BY', 'KP', 'IR', 'SY', 'CU', 'VE'];

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class RegulatoryMapEngine {

    // ─── Get all required licenses for a jurisdiction ─────────────

    getLicenseRequirements(jurisdiction) {
        const jur = (jurisdiction || '').toUpperCase();
        const required = [];
        let totalCost = 0;
        let maxTimeline = 0;

        for (const [licId, lic] of Object.entries(LICENSE_TYPES)) {
            const jurData = lic.jurisdictions[jur] || lic.jurisdictions['GLOBAL'];
            if (jurData && jurData.required) {
                const entry = { license_id: licId, name: lic.name, category: lic.category, ...jurData };
                required.push(entry);
                totalCost += jurData.est_cost;
                maxTimeline = Math.max(maxTimeline, jurData.timeline_months);
            }
        }

        return {
            jurisdiction: jur,
            required_licenses: required,
            total_estimated_cost: totalCost,
            longest_timeline_months: maxTimeline,
            sanctioned: SANCTIONED_JURISDICTIONS.includes(jur),
            operational_ready: required.length === 0 || undefined,
        };
    }

    // ─── Cross-border compliance route ────────────────────────────

    routeCrossBorder(fromJurisdiction, toJurisdiction) {
        const from = (fromJurisdiction || '').toUpperCase();
        const to = (toJurisdiction || '').toUpperCase();

        if (SANCTIONED_JURISDICTIONS.includes(to)) {
            return { allowed: false, from, to, reason: `${to} is on sanctions list`, sanctions_list: SANCTIONED_JURISDICTIONS };
        }

        const key = `${from}→${to}`;
        const wildcardKey = `*→${to}`;
        const rule = CROSS_BORDER_RULES[key] || CROSS_BORDER_RULES[wildcardKey];

        if (rule?.blocked) {
            return { allowed: false, from, to, mechanism: rule.mechanism, note: rule.note };
        }

        // Get licenses needed in both jurisdictions
        const fromLicenses = this.getLicenseRequirements(from);
        const toLicenses = this.getLicenseRequirements(to);

        return {
            allowed: true,
            from, to,
            mechanism: rule?.mechanism || 'Standard Contract',
            sanctions_check: rule?.sanctions_check || false,
            additional_licenses: rule?.additional_licenses || [],
            from_requirements: fromLicenses,
            to_requirements: toLicenses,
            combined_cost: fromLicenses.total_estimated_cost + toLicenses.total_estimated_cost,
            combined_timeline: Math.max(fromLicenses.longest_timeline_months, toLicenses.longest_timeline_months),
            note: rule?.note || null,
        };
    }

    // ─── Full licensing matrix ────────────────────────────────────

    getLicensingMatrix() {
        const matrix = {};
        const jurisdictions = new Set();

        for (const [licId, lic] of Object.entries(LICENSE_TYPES)) {
            matrix[licId] = { name: lic.name, category: lic.category, jurisdictions: {} };
            for (const [jur, data] of Object.entries(lic.jurisdictions)) {
                jurisdictions.add(jur);
                matrix[licId].jurisdictions[jur] = {
                    required: data.required,
                    body: data.body,
                    cost: data.est_cost,
                    timeline: data.timeline_months,
                };
            }
        }

        return { license_types: Object.keys(matrix).length, jurisdictions: Array.from(jurisdictions).sort(), matrix };
    }

    // ─── Sanctions check ──────────────────────────────────────────

    checkSanctions(countryCode) {
        const cc = (countryCode || '').toUpperCase();
        return {
            country: cc,
            sanctioned: SANCTIONED_JURISDICTIONS.includes(cc),
            sanctions_list: SANCTIONED_JURISDICTIONS,
            action: SANCTIONED_JURISDICTIONS.includes(cc) ? 'BLOCK — service prohibited' : 'ALLOW',
        };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getLicenseTypes() { return LICENSE_TYPES; }
    getCrossBorderRules() { return CROSS_BORDER_RULES; }
    getSanctionedJurisdictions() { return SANCTIONED_JURISDICTIONS; }
}

module.exports = new RegulatoryMapEngine();
