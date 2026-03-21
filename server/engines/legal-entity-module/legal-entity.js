/**
 * TrustChecker — Legal Entity Architecture Engine v1.0
 * IPO-GRADE: Entity Separation Map + Regulatory Classification
 * 
 * System architecture is strong, but legal architecture must be mapped.
 * Market infrastructure operators ALWAYS separate:
 *   - Governance entity (board, policy)
 *   - Operating entity (technology, ops)
 *   - Risk/Capital entity (reserves, insurance)
 *   - Data entity (GDPR jurisdiction)
 *   - IP entity (patents, trademarks)
 * 
 * Models: ICE/NYSE structure, CME Group, DTCC, Moody's
 */

// ═══════════════════════════════════════════════════════════════════
// 1. LEGAL ENTITY MAP
// ═══════════════════════════════════════════════════════════════════

const ENTITY_MAP = {
    holding_company: {
        name: 'TrustChecker Holdings Ltd',
        jurisdiction: 'Singapore (IP-friendly, Asia hub)',
        type: 'Private Limited Company',
        purpose: 'Ultimate holding entity — owns all subsidiaries',
        assets: ['IP ownership', 'Subsidiary equity', 'Brand and trademarks'],
        regulated: false,
        board: 'Independent board with GGC overlap requirements',
    },

    operating_entities: [
        {
            name: 'TrustChecker Technology Pte Ltd',
            jurisdiction: 'Singapore',
            type: 'Operating Subsidiary',
            purpose: 'Platform development, technology operations, SaaS delivery',
            assets: ['Source code (licensed from IP entity)', 'Employee contracts', 'Cloud infrastructure'],
            regulated: false,
            staff: 'Engineering, product, support',
            liability_ring_fence: 'Technology liability isolated from capital/settlement liability',
        },
        {
            name: 'TrustChecker Settlement GmbH',
            jurisdiction: 'Germany (EU regulatory alignment)',
            type: 'Regulated Financial Services Entity',
            purpose: 'Carbon credit settlement, clearing, counterparty management',
            assets: ['Settlement reserves', 'Insurance policies', 'Regulatory licenses'],
            regulated: true,
            regulator: 'BaFin / ESMA (under MiCA framework)',
            capital_requirements: 'Subject to TC-CAR + EU regulatory capital requirements',
            liability_ring_fence: 'Settlement liability isolated — cannot contaminate other entities',
        },
        {
            name: 'TrustChecker Vietnam Co Ltd',
            jurisdiction: 'Vietnam',
            type: 'Local Operating Entity',
            purpose: 'Vietnam market operations, local compliance, DICA routing',
            assets: ['Local contracts', 'Vietnam regulatory licenses'],
            regulated: true,
            regulator: 'State Bank of Vietnam (SBV) / Ministry of Industry and Trade',
            liability_ring_fence: 'Jurisdictional isolation — Vietnam operations cannot claim against global reserves',
        },
    ],

    specialized_entities: [
        {
            name: 'TrustChecker IP Ltd',
            jurisdiction: 'Singapore',
            type: 'IP Holding Entity',
            purpose: 'Owns and licenses all intellectual property',
            assets: ['Patents', 'Algorithms (Trust Graph, IVU, Carbon Engine)', 'Trademarks', 'Trade secrets'],
            relationship: 'Licenses IP to Operating entities via arms-length license agreements',
            tax_structure: 'IP income taxed in Singapore (favorable IP regime)',
            isolation: 'IP cannot be seized by operating entity creditors',
        },
        {
            name: 'TrustChecker Node Operations Ltd',
            jurisdiction: 'Multiple (per region)',
            type: 'Validator Node Entity',
            purpose: 'Operates validator infrastructure separate from settlement/governance',
            assets: ['Node hardware/VPS', 'Validator keys', 'Staking deposits'],
            isolation: 'Node operations isolated — compromise does not affect settlement funds',
            requirement: 'Independent node operators will have separate legal entities',
        },
        {
            name: 'TrustChecker Data Compliance Ltd',
            jurisdiction: 'Ireland (EU GDPR)',
            type: 'Data Controller Entity',
            purpose: 'GDPR compliance, data sovereignty, privacy management',
            assets: ['Data processing agreements', 'DPO function', 'Data residency certificates'],
            regulated: true,
            regulator: 'Irish Data Protection Commission (DPC)',
            isolation: 'GDPR fines and liabilities ring-fenced to this entity',
        },
        {
            name: 'TrustChecker Capital Reserve Trust',
            jurisdiction: 'Singapore or Cayman Islands',
            type: 'Capital Reserve Vehicle (Trust Structure)',
            purpose: 'Holds settlement reserves, insurance payouts, and capital buffers',
            assets: ['Cash reserves ($500K+ floor)', 'Government bonds', 'Insurance claim proceeds'],
            structure: 'Irrevocable trust — cannot be accessed by operating entity creditors',
            trustee: 'Independent corporate trustee (bank-affiliated)',
            beneficiary: 'Settlement participants (counterparties in default scenario)',
            isolation: 'CRITICAL: reserves are bankruptcy-remote from operating entities',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. INTER-ENTITY RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════════

const RELATIONSHIPS = {
    ownership: [
        { parent: 'TrustChecker Holdings Ltd', child: 'TrustChecker Technology Pte Ltd', ownership_pct: 100 },
        { parent: 'TrustChecker Holdings Ltd', child: 'TrustChecker Settlement GmbH', ownership_pct: 100 },
        { parent: 'TrustChecker Holdings Ltd', child: 'TrustChecker IP Ltd', ownership_pct: 100 },
        { parent: 'TrustChecker Holdings Ltd', child: 'TrustChecker Vietnam Co Ltd', ownership_pct: 100 },
        { parent: 'TrustChecker Holdings Ltd', child: 'TrustChecker Node Operations Ltd', ownership_pct: 100 },
        { parent: 'TrustChecker Holdings Ltd', child: 'TrustChecker Data Compliance Ltd', ownership_pct: 100 },
    ],

    agreements: [
        { from: 'IP Ltd', to: 'Technology Pte Ltd', type: 'IP License Agreement', terms: 'Royalty basis: 5-8% of revenue' },
        { from: 'IP Ltd', to: 'Settlement GmbH', type: 'IP License Agreement', terms: 'Royalty basis: 3-5% of settlement fees' },
        { from: 'Technology Pte Ltd', to: 'Settlement GmbH', type: 'Technology Services Agreement', terms: 'Platform access + SLA' },
        { from: 'Technology Pte Ltd', to: 'Node Operations Ltd', type: 'Node Operation Agreement', terms: 'Infrastructure SLA' },
        { from: 'Settlement GmbH', to: 'Capital Reserve Trust', type: 'Reserve Funding Agreement', terms: 'Mandatory reserve contributions' },
        { from: 'Data Compliance Ltd', to: 'Technology Pte Ltd', type: 'Data Processing Agreement', terms: 'GDPR Article 28 compliant' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. REGULATORY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

const REGULATORY_MAP = {
    entities_requiring_license: [
        { entity: 'Settlement GmbH', license: 'MiCA CASP License', jurisdiction: 'EU', status: 'Required before carbon settlement goes live' },
        { entity: 'Settlement GmbH', license: 'BaFin Crypto Custody License', jurisdiction: 'Germany', status: 'Required' },
        { entity: 'Vietnam Co Ltd', license: 'E-commerce License', jurisdiction: 'Vietnam', status: 'Required' },
        { entity: 'Data Compliance Ltd', license: 'GDPR Registration', jurisdiction: 'EU/Ireland', status: 'Required' },
    ],

    entities_exempt: [
        { entity: 'Holdings Ltd', reason: 'Pure holding — no regulated activity' },
        { entity: 'IP Ltd', reason: 'IP licensing — not regulated financial activity' },
        { entity: 'Technology Pte Ltd', reason: 'Software development — regulated via downstream entities' },
    ],

    ring_fencing_principles: [
        'Each entity is independently capitalized — no cross-entity guarantee unless explicit',
        'Settlement reserves in trust structure — bankruptcy-remote',
        'GDPR liability ring-fenced to Data Compliance entity',
        'IP entity cannot be reached by operating entity creditors',
        'Node Operations entity separated — node compromise ≠ fund compromise',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. IPO READINESS REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════

const IPO_REQUIREMENTS = {
    entity_structure: [
        { requirement: 'Clear holding/subsidiary structure', status: 'DESIGNED', entity: 'Holdings Ltd' },
        { requirement: 'IP isolated in separate entity', status: 'DESIGNED', entity: 'IP Ltd' },
        { requirement: 'Regulated activities in licensed entity', status: 'DESIGNED', entity: 'Settlement GmbH' },
        { requirement: 'Transfer pricing documentation', status: 'NEEDED', note: 'Arms-length pricing for all inter-entity transactions' },
        { requirement: 'Consolidated financial statements (IFRS)', status: 'NEEDED', note: 'Audited by Big 4' },
        { requirement: 'SOX/SOC2 compliance', status: 'NEEDED', note: 'For US listing consideration' },
        { requirement: 'Board independence (majority independent)', status: 'DESIGNED', note: 'GGC 40% independent minimum maps to board' },
        { requirement: 'Risk committee with financial expertise', status: 'DESIGNED', note: 'Mapped to risk_committee role' },
        { requirement: 'External auditor appointed', status: 'DESIGNED', note: 'External oversight engine defines rotation policy' },
    ],

    listing_considerations: [
        { exchange: 'SGX (Singapore)', advantage: 'Asia hub, IP regime, carbon market', requirements: 'SGX Mainboard or Catalist rules' },
        { exchange: 'LSE (London)', advantage: 'Carbon/ESG investor base', requirements: 'FCA listing rules, UK Corporate Governance Code' },
        { exchange: 'NASDAQ', advantage: 'Technology company valuation premium', requirements: 'SEC registration, SOX compliance' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class LegalEntityEngine {

    getEntityMap() { return ENTITY_MAP; }
    getRelationships() { return RELATIONSHIPS; }
    getRegulatoryMap() { return REGULATORY_MAP; }
    getIPORequirements() { return IPO_REQUIREMENTS; }

    getEntityByName(name) {
        const allEntities = [ENTITY_MAP.holding_company, ...ENTITY_MAP.operating_entities, ...ENTITY_MAP.specialized_entities];
        return allEntities.find(e => e.name.toLowerCase().includes(name.toLowerCase())) || null;
    }

    getRingFencingAnalysis() {
        return {
            principles: REGULATORY_MAP.ring_fencing_principles,
            critical_isolation_points: [
                { boundary: 'Settlement ↔ Technology', risk: 'Technology liability reaching settlement reserves', protection: 'Capital Reserve Trust (bankruptcy-remote)' },
                { boundary: 'Operations ↔ IP', risk: 'Operating creditors seizing IP', protection: 'Separate IP entity, license agreements' },
                { boundary: 'Settlement ↔ Node Ops', risk: 'Node compromise affecting settlement funds', protection: 'Separate legal entity, separate infrastructure' },
                { boundary: 'Global ↔ Vietnam', risk: 'Local jurisdiction claims affecting global structure', protection: 'Local entity with limited assets' },
                { boundary: 'Operations ↔ Data/GDPR', risk: 'GDPR fines contaminating operating capital', protection: 'Ring-fenced Data Compliance entity' },
            ],
        };
    }

    getFullArchitecture() {
        return {
            title: 'Legal Entity Architecture — IPO-Grade',
            version: '1.0',
            models: ['ICE/NYSE', 'CME Group', 'DTCC', 'Moody\'s'],
            entity_map: ENTITY_MAP,
            relationships: RELATIONSHIPS,
            regulatory: REGULATORY_MAP,
            ipo: IPO_REQUIREMENTS,
            ring_fencing: this.getRingFencingAnalysis(),
        };
    }
}

module.exports = new LegalEntityEngine();
