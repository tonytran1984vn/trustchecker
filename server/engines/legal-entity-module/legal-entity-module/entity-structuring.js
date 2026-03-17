/**
 * TrustChecker — Entity Structuring Engine v1.0
 * INFRASTRUCTURE LAYER: Nasdaq/ICE/Moody's-Grade Legal Separation
 * 
 * Infrastructure ≠ one company.
 * Nasdaq = Nasdaq Inc (holding) + exchange + clearing + data services.
 * ICE = ICE Inc + NYSE + ICE Clear + ICE Data Services.
 * TrustChecker must separate: data operator, market operator, settlement operator, validation arm.
 * 
 * Also: external trust validation layer (independence from founder)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. ENTITY ARCHITECTURE — INFRASTRUCTURE-GRADE SEPARATION
// ═══════════════════════════════════════════════════════════════════

const ENTITY_ARCHITECTURE = {
    title: 'Entity Structure — Comparable to Nasdaq/ICE/Moody\'s',

    comparables: {
        nasdaq: { holding: 'Nasdaq Inc', exchange: 'Nasdaq Stock Market LLC', clearing: 'Nasdaq Clearing AB', data: 'Nasdaq Global Data Services', technology: 'Nasdaq Market Technology' },
        ice: { holding: 'Intercontinental Exchange Inc', exchange: 'NYSE', clearing: 'ICE Clear US/Europe', data: 'ICE Data Services', carbon: 'ICE Futures (carbon contracts)' },
        moodys: { holding: 'Moody\'s Corp', ratings: 'Moody\'s Investors Service', analytics: 'Moody\'s Analytics' },
    },

    trustchecker_entities: [
        {
            entity: 'TrustChecker Holdings Ltd',
            type: 'Holding Company',
            jurisdiction: 'Singapore',
            function: 'Group holding, IP ownership, strategic decisions, capital allocation',
            comparable: 'Nasdaq Inc / ICE Inc / Moody\'s Corp',
            assets: ['IP portfolio', 'Brand', 'Group capital', 'Board governance'],
            revenue: 'IP licensing (5-8% royalty from operating entities) + dividends from subsidiaries',
            regulated: false,
            board: 'Independent Chair + CEO + 3 Non-Executive Directors minimum',
        },
        {
            entity: 'TrustChecker Technology Pte Ltd',
            type: 'Operating Company (Platform)',
            jurisdiction: 'Singapore',
            function: 'Platform development, SaaS operations, API services, AI/ML models',
            comparable: 'Nasdaq Market Technology / Moody\'s Analytics',
            assets: ['Technology platform', 'Engineering team', 'Customer relationships'],
            revenue: 'SaaS subscriptions + API access fees + data licensing',
            regulated: true,
            regulator: 'MAS (if applicable — depending on service classification)',
            separation: 'Does NOT handle settlement or carbon credit issuance. Technology provider only.',
        },
        {
            entity: 'TrustChecker Settlement GmbH',
            type: 'Settlement Operator (CCP)',
            jurisdiction: 'Germany (Frankfurt)',
            function: 'Central counterparty clearing, settlement finality, margin management, default handling',
            comparable: 'ICE Clear Europe / Nasdaq Clearing AB',
            assets: ['Settlement infrastructure', 'Default fund', 'Margin accounts', 'Banking relationships'],
            revenue: 'Transaction fees (0.1-0.5% of settled value) + margin interest',
            regulated: true,
            regulator: 'BaFin + Bundesbank (EMIR framework)',
            separation: 'Ring-fenced capital. Liability does NOT flow to Holdings. Independent Risk Committee.',
            capital_requirements: 'EMIR CCP capital = €7.5M minimum + risk-based add-on',
        },
        {
            entity: 'TrustChecker Validation AG',
            type: 'Rating / Validation Arm',
            jurisdiction: 'Switzerland (Zürich)',
            function: 'Trust score methodology, validation framework, IVU coordination, model governance',
            comparable: 'Moody\'s Investors Service / S&P Global Ratings',
            assets: ['Scoring methodology IP', 'Validator network', 'Historical score database'],
            revenue: 'Validation fees (per verification) + methodology licensing',
            regulated: true,
            regulator: 'FINMA (third-party assessment — advisory capacity)',
            separation: 'Methodological independence from Technology Pte Ltd. Scoring cannot be influenced by commercial pressure.',
            independence: [
                'Chief Methodology Officer reports to independent board committee, NOT CEO',
                'Revenue from validation fees ≠ influenced by specific score outcomes',
                'No Technology Pte Ltd employee can modify scoring weights',
            ],
        },
        {
            entity: 'TrustChecker Node Operations Ltd',
            type: 'Blockchain Infrastructure',
            jurisdiction: 'Singapore',
            function: 'Blockchain node operation, anchoring infrastructure, validator network coordination',
            comparable: 'ICE Data Services (infrastructure arm)',
            assets: ['Blockchain nodes', 'HSM infrastructure', 'Anchoring keys', 'Validator SLA contracts'],
            revenue: 'Anchoring fees + validator coordination fees',
            regulated: false,
            separation: 'Cannot modify trust scores. Cannot access settlement funds. Infrastructure-only role.',
        },
        {
            entity: 'TrustChecker Data Compliance Ltd',
            type: 'Data Controller',
            jurisdiction: 'Ireland (Dublin)',
            function: 'GDPR data controller, privacy management, data subject requests, cross-border transfer oversight',
            comparable: 'Separate data entity (common in US tech with EU operations)',
            assets: ['EU personal data', 'Privacy infrastructure', 'DPO function'],
            revenue: 'Inter-entity data processing fees (arm\'s length)',
            regulated: true,
            regulator: 'DPC Ireland (GDPR Lead Supervisory Authority)',
            separation: 'EU personal data NEVER leaves this entity\'s control. Other entities get anonymized/aggregated data only.',
        },
        {
            entity: 'Capital Reserve Trust',
            type: 'Bankruptcy-Remote Trust',
            jurisdiction: 'Singapore',
            function: 'Hold capital reserves independent of operating entities. Loss absorption. Survive entity failure.',
            comparable: 'Clearing house guarantee fund structures',
            assets: ['Cash + government bonds', 'Insurance policies'],
            revenue: 'Investment returns on reserve assets (conservative: government bonds only)',
            regulated: false,
            trustee: 'Independent professional trustee (Big 4 affiliated)',
            separation: 'ABSOLUTE — no operating entity can access directly. Drawdown requires GGC + Risk Committee + Trustee triple approval.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. INTER-ENTITY CONTRACTUAL FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const INTER_ENTITY = {
    title: 'Inter-Entity Contracts — How Entities Interact Legally',

    contracts: [
        {
            between: 'Holdings → Technology Pte Ltd',
            type: 'IP License Agreement',
            terms: 'IP royalty 5-8% of Technology revenue. Exclusive license for platform operation.',
            governing_law: 'Singapore',
            transfer_pricing: 'Arm\'s length (OECD). Benchmarked against comparable tech licenses.',
        },
        {
            between: 'Technology Pte Ltd → Settlement GmbH',
            type: 'Technology Services Agreement',
            terms: 'Technology provides platform infrastructure. Settlement GmbH pays SLA-based service fee.',
            governing_law: 'Dual: Technology law (SG) + Settlement law (DE). Disputes: SIAC.',
            ring_fencing: 'Settlement GmbH liability does NOT transfer to Technology. Separate balance sheets.',
        },
        {
            between: 'Technology Pte Ltd → Validation AG',
            type: 'Methodology License + Data Agreement',
            terms: 'Technology provides data infrastructure. Validation AG provides scoring methodology. Cross-license for mutual dependency.',
            governing_law: 'Switzerland',
            independence: 'Methodology independence clause: Technology cannot influence scoring decisions.',
        },
        {
            between: 'Technology Pte Ltd → Node Operations Ltd',
            type: 'Infrastructure Services Agreement',
            terms: 'Node Ops provides blockchain anchoring infrastructure. Technology pays per-anchor fee.',
            governing_law: 'Singapore',
        },
        {
            between: 'All entities → Data Compliance Ltd',
            type: 'Data Processing Agreement (GDPR Art. 28)',
            terms: 'Data Compliance is controller for EU personal data. Other entities are processors.',
            governing_law: 'Ireland (GDPR mandatory)',
        },
        {
            between: 'All entities → Capital Reserve Trust',
            type: 'Trust Deed',
            terms: 'Contributions per constitutional formula (10% of revenue). Drawdown requires triple approval.',
            governing_law: 'Singapore (trust law)',
            independence: 'Trustee is independent. Cannot be removed by operating entities.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. EXTERNAL TRUST VALIDATION LAYER
// ═══════════════════════════════════════════════════════════════════

const EXTERNAL_TRUST = {
    title: 'External Trust Validation — Trustable Even If Founder Disappears',
    principle: 'Infrastructure must be trusted by third parties independent of internal governance.',

    validation_layers: [
        {
            layer: 'Independent Assurance Partner',
            description: 'Big 4 audit firm providing annual financial + operational audit',
            scope: ['Financial statements (IFRS)', 'Capital adequacy (CAR/LCR verification)', 'Governance compliance (charter adherence)', 'Technology controls (SOC 2 Type II)'],
            frequency: 'Annual (financial), Continuous (SOC 2 monitoring)',
            cost_estimate: '$200K-$500K/year',
            public_output: 'Audit opinion published in annual report',
        },
        {
            layer: 'Third-Party Validator Network',
            description: 'Validators independent of platform — no employment, no equity, no management relationship',
            requirements: ['Minimum 60% of validators must be third-party entities', 'No single validator > 10% of network capacity', 'Geographic distribution across ≥ 3 jurisdictions', 'Independent SLA monitoring'],
            governance: 'Validator admission committee (3 members: 1 platform, 1 existing validator, 1 independent)',
        },
        {
            layer: 'API Transparency Portal',
            description: 'Public API providing real-time system health + governance data',
            public_endpoints: [
                '/public/health — System operational status',
                '/public/governance — GGC composition, recent votes, amendment history',
                '/public/capital — Aggregated CAR, LCR (no entity-specific data)',
                '/public/network — Validator count, geographic distribution, uptime metrics',
                '/public/audit — Latest audit opinion, SOC 2 report summary',
                '/public/incidents — Incident history, response times, resolution status',
            ],
            access: 'No authentication required. Rate-limited: 100 requests/minute.',
            principle: 'Any person in the world should be able to verify: is this infrastructure healthy?',
        },
        {
            layer: 'Rating Layer',
            description: 'External credit/operational rating from independent agency',
            target_ratings: [
                'S&P/Moody\'s credit rating for Settlement GmbH (target: BBB- at IPO)',
                'SOC 2 Type II certification for Technology Pte Ltd',
                'ISAE 3402 for Capital Reserve Trust (controls over financial reporting)',
                'ISO 27001 for all entities handling data',
            ],
            timeline: 'Begin process 18 months before IPO. Ratings published annually.',
        },
        {
            layer: 'Regulatory Observer Program',
            description: 'Proactive invitation to regulators for system observations',
            program: [
                'Quarterly briefings to BaFin (Settlement GmbH)',
                'Annual technology review invitation to MAS',
                'Standing invitation to DPC Ireland for data compliance review',
                'Voluntary participation in regulatory sandbox programs',
            ],
            principle: 'Regulators as allies, not adversaries. Transparency = defensibility.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class EntityStructuringEngine {
    getEntityArchitecture() { return ENTITY_ARCHITECTURE; }
    getInterEntity() { return INTER_ENTITY; }
    getExternalTrust() { return EXTERNAL_TRUST; }

    getEntity(name) {
        return ENTITY_ARCHITECTURE.trustchecker_entities.find(e => e.entity.toLowerCase().includes(name.toLowerCase())) || null;
    }

    getFullFramework() {
        return {
            title: 'Entity Structuring — Infrastructure-Grade Legal Architecture',
            version: '1.0',
            entity_architecture: ENTITY_ARCHITECTURE,
            inter_entity: INTER_ENTITY,
            external_trust: EXTERNAL_TRUST,
        };
    }
}

module.exports = new EntityStructuringEngine();
