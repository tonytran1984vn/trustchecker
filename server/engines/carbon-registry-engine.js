/**
 * TrustChecker — Carbon Registry Engine v1.0
 * Phase 2: Cross-Jurisdiction Legitimacy & Settlement Layer
 *
 * This engine transforms TrustChecker from "software that tracks carbon"
 * into "compliance rail that carbon MUST flow through".
 *
 *   1. Cross-Jurisdiction Registry (VN, EU, APAC, US)
 *   2. Registry Protocol (Mint → Verify → Anchor → Settle)
 *   3. MRV Settlement Layer (Validation → Issuance → Retirement)
 *   4. Jurisdiction Compliance Matrix
 *   5. Registry Fee Model (subscription → transaction infra)
 *   6. Defensibility Moat Metrics
 */
const crypto = require('crypto');

// ═════════════════════════════════════════════════════════════════════
// 1. JURISDICTION REGISTRY
// ═════════════════════════════════════════════════════════════════════

const JURISDICTIONS = [
    {
        id: 'JUR-VN', code: 'VN', name: 'Vietnam',
        regulatory_body: 'Ministry of Natural Resources and Environment (MONRE)',
        framework: 'National Carbon Credit Exchange (planned 2028)',
        status: 'emerging',
        carbon_market: 'Voluntary + Pilot ETS',
        requirements: ['MONRE MRV registration', 'Local validator accreditation', 'VND settlement reporting'],
        anchor_type: 'private_anchor',
        credit_types: ['Forestry (AFOLU)', 'Renewable Energy', 'Industrial Efficiency'],
        avg_credit_price_usd: 8,
        annual_volume_tco2e: 5000000,
        compliance_score: 65
    },
    {
        id: 'JUR-EU', code: 'EU', name: 'European Union',
        regulatory_body: 'European Commission — DG CLIMA',
        framework: 'EU ETS Phase IV + CBAM',
        status: 'mature',
        carbon_market: 'Compliance ETS + Voluntary',
        requirements: ['MRV per EU MRR', 'Third-party verification (ISO 14064)', 'Registry integration (Union Registry)', 'CBAM reporting'],
        anchor_type: 'public_anchor',
        credit_types: ['EUA Allowances', 'Voluntary (Gold Standard/Verra VCS)'],
        avg_credit_price_usd: 65,
        annual_volume_tco2e: 1500000000,
        compliance_score: 95
    },
    {
        id: 'JUR-APAC', code: 'APAC', name: 'Asia-Pacific (SG/TH/ID/MY)',
        regulatory_body: 'Climate Impact X (Singapore) + National Bodies',
        framework: 'SG Carbon Tax + Article 6.2 bilateral',
        status: 'developing',
        carbon_market: 'Voluntary + Bilateral (ITMOs)',
        requirements: ['Singapore Carbon Tax compliance', 'Article 6.2 corresponding adjustment', 'CORSIA-eligible for aviation'],
        anchor_type: 'hybrid_anchor',
        credit_types: ['Nature-based Solutions', 'Blue Carbon', 'Cookstoves', 'Renewable Energy'],
        avg_credit_price_usd: 12,
        annual_volume_tco2e: 200000000,
        compliance_score: 72
    },
    {
        id: 'JUR-US', code: 'US', name: 'United States',
        regulatory_body: 'EPA + CFTC (voluntary market oversight)',
        framework: 'California Cap-and-Trade + Voluntary',
        status: 'mixed',
        carbon_market: 'State compliance + Large voluntary',
        requirements: ['California ARB protocols (compliance)', 'ACRDOESN/Verra/Gold Standard (voluntary)', 'SEC Climate Disclosure'],
        anchor_type: 'public_anchor',
        credit_types: ['California CCA', 'Voluntary (ACR/Verra)', 'Renewable Energy Certificates'],
        avg_credit_price_usd: 30,
        annual_volume_tco2e: 500000000,
        compliance_score: 80
    }
];

// ═════════════════════════════════════════════════════════════════════
// 2. REGISTRY PROTOCOL (FSM: 8 states)
// ═════════════════════════════════════════════════════════════════════

const PROTOCOL_STATES = [
    { state: 'S0_DATA_SUBMITTED', name: 'MRV Data Submitted', description: 'Raw emission/reduction data received from project', gate: 'Data validation pass', sla: '24h' },
    { state: 'S1_MRV_VALIDATED', name: 'MRV Validated', description: 'Data passes MRV pipeline — schema, range, completeness', gate: 'Validator approval', sla: '48h' },
    { state: 'S2_DUAL_VERIFIED', name: 'Dual Verification', description: 'Two independent validators confirm data integrity', gate: 'Both validators sign', sla: '5 days' },
    { state: 'S3_CREDIT_MINTED', name: 'Credit Minted', description: 'Carbon credit created in registry with unique ID + hash', gate: 'Blockchain anchor success', sla: '1h' },
    { state: 'S4_ANCHOR_SEALED', name: 'Anchored & Sealed', description: 'Credit hash anchored to public blockchain', gate: 'Anchor confirmation (3 blocks)', sla: '30min' },
    { state: 'S5_LISTED', name: 'Listed for Trade', description: 'Credit available for transfer/trade on registry', gate: 'Compliance check pass', sla: 'Immediate' },
    { state: 'S6_TRANSFERRED', name: 'Transferred', description: 'Credit transferred to buyer with chain-of-custody', gate: 'Settlement confirmation', sla: '2h' },
    { state: 'S7_RETIRED', name: 'Retired', description: 'Credit permanently retired — offset claimed', gate: 'Retirement seal + public record', sla: 'Immediate' }
];

// ═════════════════════════════════════════════════════════════════════
// 3. FEE MODEL (Transaction Infrastructure)
// ═════════════════════════════════════════════════════════════════════

const FEE_MODEL = {
    description: 'Registry fee model: transforms subscription SaaS into transaction infrastructure',
    revenue_streams: [
        { id: 'FEE-01', name: 'MRV Validation Fee', type: 'per_transaction', rate: '$0.50/tCO₂e validated', volume_driver: 'MRV submissions', recurring: true },
        { id: 'FEE-02', name: 'Registry Minting Fee', type: 'per_credit', rate: '$1.00/credit minted', volume_driver: 'Credit issuance volume', recurring: true },
        { id: 'FEE-03', name: 'Anchor Seal Fee', type: 'per_transaction', rate: '$0.25/seal', volume_driver: 'Blockchain anchoring', recurring: true },
        { id: 'FEE-04', name: 'Settlement Fee', type: 'per_transfer', rate: '0.5% of credit value', volume_driver: 'Credit transfers', recurring: true },
        { id: 'FEE-05', name: 'Retirement Certificate Fee', type: 'per_retirement', rate: '$2.00/retirement', volume_driver: 'Offset claims', recurring: true },
        { id: 'FEE-06', name: 'Cross-Jurisdiction Transfer', type: 'per_transfer', rate: '$5.00/cross-border', volume_driver: 'Article 6.2 ITMOs', recurring: true },
        { id: 'FEE-07', name: 'Annual Registry Access', type: 'subscription', rate: '$25,000/year enterprise', volume_driver: 'Registry participants', recurring: true },
        { id: 'FEE-08', name: 'Data Intelligence License', type: 'subscription', rate: '$50,000/year', volume_driver: 'Market participants', recurring: true }
    ],
    moat_analysis: {
        switching_cost: 'HIGH — credit history, audit trail, regulatory registration locked in',
        network_effect: 'MEDIUM — more participants = more liquidity = more value',
        regulatory_capture: 'EMERGING — MRV validation becoming mandatory in EU/APAC',
        data_advantage: 'HIGH — cross-jurisdiction credit flow intelligence'
    }
};

// ═════════════════════════════════════════════════════════════════════
// 4. COMPLIANCE MATRIX
// ═════════════════════════════════════════════════════════════════════

const COMPLIANCE_MATRIX = [
    { requirement: 'MRV Data Validation', vn: 'partial', eu: 'full', apac: 'partial', us: 'full' },
    { requirement: 'Third-Party Verification', vn: 'emerging', eu: 'required', apac: 'required', us: 'required' },
    { requirement: 'Registry Integration', vn: 'planned', eu: 'required', apac: 'partial', us: 'required' },
    { requirement: 'Blockchain Anchor', vn: 'optional', eu: 'innovative', apac: 'innovative', us: 'optional' },
    { requirement: 'Double-Count Prevention', vn: 'basic', eu: 'strict', apac: 'article_6', us: 'strict' },
    { requirement: 'Cross-Border Transfer', vn: 'bilateral', eu: 'cbam', apac: 'article_6.2', us: 'voluntary' },
    { requirement: 'Retirement Seal', vn: 'basic', eu: 'required', apac: 'required', us: 'required' },
    { requirement: 'Public Disclosure', vn: 'limited', eu: 'mandatory', apac: 'partial', us: 'sec_rules' }
];

// ═════════════════════════════════════════════════════════════════════
// FIX #1: JSON file persistence
// FIX #2: Input validation
// FIX #3: Double-mint deduplication
// FIX #5: Optimistic locking
// FIX #6: Bounded arrays (10K max)
// FIX #9: Collision-safe credit IDs
// ═════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const MAX_RECORDS = 10000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const PERSIST_FILE = path.join(DATA_DIR, 'carbon-registry-state.json');

// Validation constraints (FIX #2)
const VALID_METHODOLOGIES = ['VCS', 'GS', 'ACR', 'CDM', 'AFOLU', 'ISO14064', 'CORSIA', 'JCM', 'REDD+', 'CUSTOM'];
const TCO2E_MIN = 0.01;
const TCO2E_MAX = 1000000;
const ID_PATTERN = /^[a-zA-Z0-9_-]{2,64}$/;

class CarbonRegistryEngine {
    constructor() {
        this._credits = [];
        this._transfers = [];
        this._retirements = [];
        this._loadState();
    }

    // ─── Persistence (FIX #1) ────────────────────────────────────────
    _loadState() {
        try {
            if (fs.existsSync(PERSIST_FILE)) {
                const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
                const data = JSON.parse(raw);
                this._credits = Array.isArray(data.credits) ? data.credits.slice(-MAX_RECORDS) : [];
                this._transfers = Array.isArray(data.transfers) ? data.transfers.slice(-MAX_RECORDS) : [];
                this._retirements = Array.isArray(data.retirements) ? data.retirements.slice(-MAX_RECORDS) : [];
                console.log(`📋 Carbon Registry: Loaded ${this._credits.length} credits, ${this._transfers.length} transfers, ${this._retirements.length} retirements`);
            }
        } catch (err) {
            console.warn('⚠️  Carbon Registry: Could not load persisted state:', err.message);
        }
    }

    _saveState() {
        try {
            // NODE-BP-3: Use async write to avoid blocking event loop
            const data = JSON.stringify({
                credits: this._credits.slice(-MAX_RECORDS),
                transfers: this._transfers.slice(-MAX_RECORDS),
                retirements: this._retirements.slice(-MAX_RECORDS),
                saved_at: new Date().toISOString()
            }, null, 2);
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.promises.writeFile(PERSIST_FILE, data, 'utf-8').catch(err => {
                console.error('❌ Carbon Registry: Failed to persist state:', err.message);
            });
        } catch (err) {
            console.error('❌ Carbon Registry: Failed to persist state:', err.message);
        }
    }

    // ─── Bounded array helper (FIX #6) ───────────────────────────────
    _boundedPush(arr, item) {
        arr.push(item);
        if (arr.length > MAX_RECORDS) arr.splice(0, arr.length - MAX_RECORDS);
    }

    // ─── Read-only endpoints (unchanged) ─────────────────────────────
    getJurisdictions() {
        return {
            title: 'Carbon Jurisdiction Registry',
            total: JURISDICTIONS.length,
            jurisdictions: JURISDICTIONS,
            coverage: { mature: JURISDICTIONS.filter(j => j.status === 'mature').length, developing: JURISDICTIONS.filter(j => j.status === 'developing' || j.status === 'mixed').length, emerging: JURISDICTIONS.filter(j => j.status === 'emerging').length },
            total_addressable_volume: JURISDICTIONS.reduce((s, j) => s + j.annual_volume_tco2e, 0)
        };
    }

    getProtocol() {
        return {
            title: 'Registry Protocol — 8-State FSM',
            states: PROTOCOL_STATES,
            total_states: PROTOCOL_STATES.length,
            critical_gates: PROTOCOL_STATES.filter(s => s.sla !== 'Immediate').length,
            total_sla: PROTOCOL_STATES.map(s => s.sla).join(', ')
        };
    }

    getComplianceMatrix() {
        const scores = {};
        JURISDICTIONS.forEach(j => {
            const rows = COMPLIANCE_MATRIX.map(r => r[j.code.toLowerCase()]);
            const full = rows.filter(v => v === 'full' || v === 'required' || v === 'strict' || v === 'mandatory').length;
            scores[j.code] = { full, partial: rows.length - full, compliance_pct: Math.round(full / rows.length * 100) };
        });
        return { title: 'Jurisdiction Compliance Matrix', requirements: COMPLIANCE_MATRIX, scores, jurisdictions: JURISDICTIONS.map(j => j.code) };
    }

    getFeeModel() {
        return { title: 'Registry Fee Model — Transaction Infrastructure', ...FEE_MODEL };
    }

    // Revenue Projection — FIX #8: input capping
    projectRevenue(params = {}) {
        const cap = (v, def, max) => Math.min(Math.max(parseInt(v) || def, 0), max);
        const annual_credits_minted = cap(params.annual_credits_minted, 100000, 10000000);
        const avg_credit_price = cap(params.avg_credit_price, 20, 500);
        const annual_transfers = cap(params.annual_transfers, 50000, 5000000);
        const annual_retirements = cap(params.annual_retirements, 30000, 5000000);
        const cross_border_transfers = cap(params.cross_border_transfers, 5000, 1000000);
        const enterprise_clients = cap(params.enterprise_clients, 10, 1000);
        const data_clients = cap(params.data_clients, 3, 100);

        const streams = [
            { name: 'MRV Validation', revenue: annual_credits_minted * 0.50 },
            { name: 'Minting Fee', revenue: annual_credits_minted * 1.00 },
            { name: 'Anchor Seal', revenue: (annual_credits_minted + annual_transfers) * 0.25 },
            { name: 'Settlement Fee', revenue: annual_transfers * avg_credit_price * 0.005 },
            { name: 'Retirement Fee', revenue: annual_retirements * 2.00 },
            { name: 'Cross-Border', revenue: cross_border_transfers * 5.00 },
            { name: 'Registry Access', revenue: enterprise_clients * 25000 },
            { name: 'Data License', revenue: data_clients * 50000 }
        ];

        const total = streams.reduce((s, r) => s + r.revenue, 0);
        const transaction_pct = total > 0 ? Math.round((total - enterprise_clients * 25000 - data_clients * 50000) / total * 100) : 0;

        return {
            title: 'Annual Revenue Projection',
            streams: streams.map(s => ({ ...s, revenue: Math.round(s.revenue), pct: total > 0 ? Math.round(s.revenue / total * 100) : 0 })),
            total_annual: Math.round(total),
            transaction_revenue_pct: transaction_pct,
            subscription_revenue_pct: 100 - transaction_pct,
            infrastructure_ratio: transaction_pct >= 60 ? 'Infrastructure' : transaction_pct >= 40 ? 'Hybrid' : 'SaaS',
            params_used: { annual_credits_minted, avg_credit_price, annual_transfers, annual_retirements, cross_border_transfers, enterprise_clients, data_clients }
        };
    }

    // ─── Mint Credit (FIX #2 validation, #3 dedup, #6 bounded, #9 safe ID) ──
    mintCredit(params = {}) {
        const { project_id, jurisdiction, tco2e, methodology, validator_1, validator_2, mrv_hash } = params;

        // FIX #2: Input validation
        if (!project_id || !jurisdiction || !tco2e) return { error: 'project_id, jurisdiction, tco2e required' };
        if (!validator_1 || !validator_2) return { error: 'Dual validation required (validator_1, validator_2)' };

        if (!ID_PATTERN.test(project_id)) return { error: 'project_id must be 2-64 alphanumeric characters' };
        if (!ID_PATTERN.test(validator_1)) return { error: 'validator_1 must be 2-64 alphanumeric characters' };
        if (!ID_PATTERN.test(validator_2)) return { error: 'validator_2 must be 2-64 alphanumeric characters' };
        if (validator_1 === validator_2) return { error: 'validator_1 and validator_2 must be different entities' };

        const parsedTco2e = parseFloat(tco2e);
        if (isNaN(parsedTco2e) || parsedTco2e < TCO2E_MIN || parsedTco2e > TCO2E_MAX) {
            return { error: `tco2e must be between ${TCO2E_MIN} and ${TCO2E_MAX}` };
        }

        const meth = (methodology || 'VCS').toUpperCase();
        if (!VALID_METHODOLOGIES.includes(meth)) {
            return { error: `Invalid methodology. Valid: ${VALID_METHODOLOGIES.join(', ')}` };
        }

        const jur = JURISDICTIONS.find(j => j.code === jurisdiction);
        if (!jur) return { error: `Unknown jurisdiction: ${jurisdiction}. Valid: ${JURISDICTIONS.map(j => j.code).join(', ')}` };

        // FIX #3: Double-mint deduplication
        const dupKey = `${project_id}:${jurisdiction}:${parsedTco2e}:${meth}`;
        const existingDup = this._credits.find(c =>
            c.project_id === project_id &&
            c.jurisdiction === jurisdiction &&
            c.tco2e === parsedTco2e &&
            c.methodology === meth
        );
        if (existingDup) {
            return { error: `Double-mint prevented: credit already exists (${existingDup.credit_id}) for project ${project_id} in ${jurisdiction} with ${parsedTco2e} tCO₂e`, duplicate_key: dupKey };
        }

        // FIX #9: Collision-safe credit ID
        const creditId = `CC-${jurisdiction}-${crypto.randomBytes(6).toString('hex')}`.toUpperCase();

        const credit = {
            credit_id: creditId,
            project_id, jurisdiction, tco2e: parsedTco2e,
            methodology: meth,
            validator_1, validator_2,
            state: 'S3_CREDIT_MINTED',
            version: 1, // FIX #5: optimistic locking
            credit_hash: crypto.createHash('sha256').update(JSON.stringify({ project_id, jurisdiction, tco2e: parsedTco2e, ts: Date.now(), rand: crypto.randomBytes(8).toString('hex') })).digest('hex'),
            mrv_hash: mrv_hash || 'pending',
            anchor_status: 'pending',
            fee: { minting: 1.00 * parsedTco2e, mrv: 0.50 * parsedTco2e, anchor: 0.25 },
            minted_at: new Date().toISOString()
        };

        // FIX #6: Bounded push
        this._boundedPush(this._credits, credit);
        this._saveState(); // FIX #1: Persist
        return credit;
    }

    // ─── Transfer Credit (FIX #5 optimistic locking) ─────────────────
    transferCredit(params = {}) {
        const { credit_id, to_entity, to_jurisdiction, price_per_tco2e, expected_version } = params;

        if (!credit_id || !to_entity) return { error: 'credit_id and to_entity required' };
        if (to_entity && !ID_PATTERN.test(to_entity)) return { error: 'to_entity must be 2-64 alphanumeric characters' };

        const credit = this._credits.find(c => c.credit_id === credit_id);
        if (!credit) return { error: 'Credit not found' };
        if (credit.state === 'S7_RETIRED') return { error: 'Cannot transfer retired credit' };

        // FIX #5: Optimistic locking — reject if version mismatch
        if (expected_version !== undefined && credit.version !== parseInt(expected_version)) {
            return { error: `Concurrent modification detected. Expected version ${expected_version}, current is ${credit.version}. Re-fetch and retry.` };
        }

        const ppt = Math.min(Math.max(parseFloat(price_per_tco2e) || 20, 0.01), 10000);
        const crossBorder = to_jurisdiction && to_jurisdiction !== credit.jurisdiction;
        const settlement_fee = ppt * credit.tco2e * 0.005;
        const cross_fee = crossBorder ? 5.00 : 0;

        const transfer = {
            transfer_id: `TF-${crypto.randomBytes(6).toString('hex')}`.toUpperCase(),
            credit_id, from_jurisdiction: credit.jurisdiction,
            to_entity, to_jurisdiction: to_jurisdiction || credit.jurisdiction,
            cross_border: crossBorder,
            tco2e: credit.tco2e,
            fees: { settlement: Math.round(settlement_fee * 100) / 100, cross_border: cross_fee, anchor: 0.25 },
            transfer_hash: crypto.createHash('sha256').update(JSON.stringify({ credit_id, to_entity, ts: Date.now(), rand: crypto.randomBytes(8).toString('hex') })).digest('hex'),
            transferred_at: new Date().toISOString()
        };

        credit.state = 'S6_TRANSFERRED';
        credit.version = (credit.version || 1) + 1; // FIX #5: increment version
        this._boundedPush(this._transfers, transfer);
        this._saveState(); // FIX #1: Persist
        return transfer;
    }

    // ─── Retire Credit ───────────────────────────────────────────────
    retireCredit(params = {}) {
        const { credit_id, retirement_reason, beneficiary } = params;

        if (!credit_id) return { error: 'credit_id required' };

        const credit = this._credits.find(c => c.credit_id === credit_id);
        if (!credit) return { error: 'Credit not found' };
        if (credit.state === 'S7_RETIRED') return { error: 'Already retired' };

        const retirement = {
            retirement_id: `RET-${crypto.randomBytes(6).toString('hex')}`.toUpperCase(),
            credit_id, tco2e: credit.tco2e, jurisdiction: credit.jurisdiction,
            reason: retirement_reason || 'Voluntary offset',
            beneficiary: beneficiary || 'Unspecified',
            retirement_hash: crypto.createHash('sha256').update(JSON.stringify({ credit_id, ts: Date.now(), rand: crypto.randomBytes(8).toString('hex') })).digest('hex'),
            fee: 2.00,
            seal: 'permanent',
            public_record: true,
            retired_at: new Date().toISOString()
        };

        credit.state = 'S7_RETIRED';
        credit.version = (credit.version || 1) + 1;
        this._boundedPush(this._retirements, retirement);
        this._saveState(); // FIX #1: Persist
        return retirement;
    }

    // ─── Defensibility Metrics ───────────────────────────────────────
    getDefensibilityMetrics() {
        return {
            title: 'Economic Defensibility Moat',
            why_20_years: 'Why this system exists for 20 years and cannot be replaced',
            moat_pillars: [
                { pillar: 'Regulatory Mandate', score: 3, max: 5, current: 'MRV validation becoming mandatory (EU ETS, CBAM)', future: 'Full registry operator license', status: 'building' },
                { pillar: 'Network Effect', score: 2, max: 5, current: 'Cross-jurisdiction transfer capability', future: 'Settlement hub for APAC carbon', status: 'early' },
                { pillar: 'Capital Moat', score: 2, max: 5, current: 'Risk Capital framework defined', future: 'Credit guarantee capability', status: 'planned' },
                { pillar: 'Settlement Dependency', score: 3, max: 5, current: 'Registry protocol with fees', future: 'Mandatory settlement rail', status: 'building' },
                { pillar: 'Legal Recognition', score: 2, max: 5, current: 'Evidence admissibility + blockchain seal', future: 'Registry of record status', status: 'early' },
                { pillar: 'Data Advantage', score: 4, max: 5, current: 'Cross-jurisdiction flow intelligence', future: 'Price discovery + risk intelligence feed', status: 'active' },
                { pillar: 'Switching Cost', score: 4, max: 5, current: 'Audit trail + regulatory registration locked', future: 'Integration depth + historical data', status: 'active' }
            ],
            overall_moat: null,
            assessment: null
        };
    }

    getRegistryStats() {
        return {
            title: 'Carbon Registry Statistics',
            credits: { total: this._credits.length, minted_tco2e: this._credits.reduce((s, c) => s + c.tco2e, 0), by_jurisdiction: this._creditsByJur() },
            transfers: { total: this._transfers.length, cross_border: this._transfers.filter(t => t.cross_border).length },
            retirements: { total: this._retirements.length, retired_tco2e: this._retirements.reduce((s, r) => s + r.tco2e, 0) },
            protocol_states: PROTOCOL_STATES.map(s => s.state),
            fees_collected: {
                minting: this._credits.reduce((s, c) => s + (c.fee?.minting || 0), 0),
                settlement: this._transfers.reduce((s, t) => s + (t.fees?.settlement || 0), 0),
                retirement: this._retirements.reduce((s, r) => s + (r.fee || 0), 0)
            }
        };
    }

    _creditsByJur() {
        const m = {};
        this._credits.forEach(c => { m[c.jurisdiction] = (m[c.jurisdiction] || 0) + c.tco2e; });
        return m;
    }
}

// Post-construct defensibility scoring
const _engine = new CarbonRegistryEngine();
const _origDef = _engine.getDefensibilityMetrics.bind(_engine);
_engine.getDefensibilityMetrics = function () {
    const result = _origDef();
    const avg = Math.round(result.moat_pillars.reduce((s, p) => s + p.score, 0) / result.moat_pillars.length * 10) / 10;
    result.overall_moat = `${avg}/5`;
    result.assessment = avg >= 4 ? 'Strong Infrastructure Moat' : avg >= 3 ? 'Defensible Platform' : avg >= 2 ? 'Building Defensibility' : 'Vulnerable SaaS';
    result.gap_to_infrastructure = avg >= 4 ? 'Achieved' : `${Math.round((4 - avg) * 10) / 10} points needed`;
    return result;
};

module.exports = _engine;
