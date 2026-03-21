/**
 * TrustChecker — Jurisdiction Logic Engine v1.0
 * LEGITIMACY LAYER: Multi-Law Conflict Resolution + Regulatory Arbitrage Prevention
 * 
 * Beyond data residency (jurisdictional-risk-engine) — this is LEGAL LOGIC:
 *   - When 2 laws conflict, which prevails?
 *   - How to prevent regulatory arbitrage?
 *   - Which entity is liable for what?
 *   - Governing law per contract type
 *   - Cross-border enforcement
 */

// ═══════════════════════════════════════════════════════════════════
// 1. MULTI-LAW CONFLICT RESOLUTION
// ═══════════════════════════════════════════════════════════════════

const CONFLICT_RESOLUTION = {
    title: 'Multi-Law Conflict Resolution — When Jurisdictions Clash',

    conflicts: [
        {
            id: 'LC-01',
            conflict: 'GDPR vs US Subpoena',
            scenario: 'US court orders disclosure of EU user data that GDPR prohibits transferring',
            laws: ['GDPR Art. 48 (prohibition of transfers by foreign court order)', 'US CLOUD Act (requires US company to produce data regardless of location)'],
            resolution: {
                approach: 'Entity separation + data localization',
                mechanism: 'EU data held by Data Compliance Ltd (Ireland entity). Not a US entity. US CLOUD Act does not apply to non-US entities. If US entity exists, use "comity" analysis + SCC framework.',
                fallback: 'If forced: challenge in EU court under GDPR Art. 48. Notify DPC (Ireland) immediately.',
            },
            governing_entity: 'Data Compliance Ltd (Ireland)',
            prevention: 'EU data never stored in US-controlled infrastructure. Irish entity has no US reporting obligation.',
        },
        {
            id: 'LC-02',
            conflict: 'MiCA vs SEC Classification',
            scenario: 'EU classifies carbon settlement token under MiCA CASP. US SEC classifies same token as security (Howey test).',
            laws: ['EU MiCA (crypto-asset service provider)', 'US Securities Act 1933 (Howey test)'],
            resolution: {
                approach: 'Jurisdictional ring-fencing + product differentiation',
                mechanism: 'Settlement GmbH handles EU operations under MiCA. US operations (if any) structured differently to avoid Howey classification. Or: geo-block US users from token-related features.',
                fallback: 'Register with SEC as well if US market is strategically important. Dual registration is expensive but possible.',
            },
            governing_entity: 'Settlement GmbH (EU) / TBD US Entity',
            prevention: 'No single product spans both jurisdictions without separate legal analysis.',
        },
        {
            id: 'LC-03',
            conflict: 'Singapore PDPA vs Vietnam Cybersecurity Law',
            scenario: 'Vietnamese entity needs to process data in Singapore, but Vietnam Cybersecurity Law may require local storage.',
            laws: ['Singapore PDPA (consent-based transfer)', 'Vietnam Cybersecurity Law 2018 (localization for certain data)'],
            resolution: {
                approach: 'Local entity + selective replication',
                mechanism: 'Vietnam Co Ltd stores required data locally. Only aggregated/anonymized data flows to SG for platform processing. PII stays in VN.',
                fallback: 'If VN tightens: full local processing capability for VN operations.',
            },
            governing_entity: 'Vietnam Co Ltd',
            prevention: 'Vietnam entity is operationally independent for VN data. No dependency on SG for VN PII processing.',
        },
        {
            id: 'LC-04',
            conflict: 'Carbon Credit Jurisdiction Mismatch',
            scenario: 'Verra (US-based) credit verified by EU validator, settled in SG, bought by VN entity. Which law governs?',
            laws: ['US law (Verra registry)', 'EU law (validator)', 'SG law (settlement)', 'VN law (buyer)'],
            resolution: {
                approach: 'Contractual governing law + jurisdictional choice',
                mechanism: 'Master agreement specifies governing law per function: Registry = US, Verification = EU, Settlement = SG, Onboarding = local. Disputes: Singapore International Arbitration Centre (SIAC).',
                fallback: 'If local court claims jurisdiction: comply with local requirements while maintaining SIAC as primary dispute resolution.',
            },
            governing_entity: 'Technology Pte Ltd (SG) as platform operator',
            prevention: 'Every cross-border operation has explicit governing law clause in contract.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. REGULATORY ARBITRAGE PREVENTION
// ═══════════════════════════════════════════════════════════════════

const ARBITRAGE_PREVENTION = {
    title: 'Regulatory Arbitrage Prevention — Substance Over Structure',
    principle: 'Multi-entity structure exists for RISK ISOLATION and REGULATORY COMPLIANCE, not for regulatory avoidance.',

    safeguards: [
        {
            safeguard: 'Transfer Pricing Compliance',
            description: 'All inter-entity transactions at arm\'s length per OECD Transfer Pricing Guidelines',
            enforcement: 'Annual transfer pricing documentation + independent review by Big 4 firm',
            test: 'Would an unrelated third party agree to these terms? If no → adjustment required.',
        },
        {
            safeguard: 'Substance Requirement',
            description: 'Each entity must have genuine business substance in its jurisdiction',
            enforcement: 'Board members, employees, office, decision-making in jurisdiction',
            test: 'Settlement GmbH has German directors, German employees, German office, German bank account. Not a shell.',
        },
        {
            safeguard: 'Anti-Treaty Shopping',
            description: 'Entity location driven by business need, not tax treaty optimization',
            enforcement: 'Business rationale documented for each entity location',
            test: 'Ireland entity: genuine GDPR controller function, not just IP holding for low tax.',
        },
        {
            safeguard: 'Profit Allocation Alignment',
            description: 'Profits allocated where value is created, not where tax is lowest',
            enforcement: 'BEPS Pillar 1/2 compliance framework. Global minimum tax readiness.',
            test: 'IP royalty (5-8%) from tech entity to IP entity must reflect genuine IP development in SG.',
        },
        {
            safeguard: 'Regulatory Reporting',
            description: 'Full reporting to ALL relevant regulators, not selective disclosure',
            enforcement: 'Each entity reports to its local regulator. Holding company consolidated reporting.',
            test: 'BaFin gets full Settlement GmbH data. MAS gets full Technology Pte Ltd data. No information asymmetry.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. LIABILITY MAP
// ═══════════════════════════════════════════════════════════════════

const LIABILITY_MAP = {
    title: 'Liability Map — Who Is Responsible for What',

    liabilities: [
        { event: 'Settlement failure', primary_liable: 'Settlement GmbH', secondary: 'Capital Reserve Trust', insurance: 'PI/E&O policy ($10M)', tenant_recourse: 'SLA credit + dispute resolution' },
        { event: 'Trust score inaccuracy', primary_liable: 'Technology Pte Ltd', secondary: 'N/A', insurance: 'PI policy ($10M)', tenant_recourse: 'Dispute forensics + score recalculation' },
        { event: 'Data breach (EU)', primary_liable: 'Data Compliance Ltd', secondary: 'Technology Pte Ltd (processor)', insurance: 'Cyber policy ($5M)', tenant_recourse: 'GDPR Art. 82 compensation' },
        { event: 'Validator misconduct', primary_liable: 'Validator (slashing)', secondary: 'Node Operations Ltd', insurance: 'Covered by slashing escrow', tenant_recourse: 'Alternative verification + SLA credit' },
        { event: 'Regulatory fine (EU)', primary_liable: 'Settlement GmbH or Data Compliance Ltd', secondary: 'Ring-fenced — does not affect other entities', insurance: 'Regulatory defense cost coverage', tenant_recourse: 'N/A (regulatory matter)' },
        { event: 'Platform downtime', primary_liable: 'Technology Pte Ltd', secondary: 'N/A', insurance: 'Business interruption ($25M)', tenant_recourse: 'SLA credit per agreement' },
        { event: 'Carbon credit fraud', primary_liable: 'Settlement GmbH (if CCP novation applied)', secondary: 'Insurance + Reserve', insurance: 'Crime policy + fidelity bond', tenant_recourse: 'Reserve drawdown + dispute resolution' },
    ],

    ring_fencing_principle: 'Liability of Entity A does NOT flow to Entity B. Holding company liable only for its own actions, not subsidiary obligations (corporate veil maintained by substance + governance).',
};

// ═══════════════════════════════════════════════════════════════════
// 4. GOVERNING LAW MATRIX
// ═══════════════════════════════════════════════════════════════════

const GOVERNING_LAW = {
    title: 'Governing Law Matrix — Which Law Applies Where',

    matrix: [
        { contract_type: 'SaaS Subscription', governing_law: 'Singapore', dispute_resolution: 'SIAC Arbitration', rationale: 'Technology Pte Ltd is contracting party' },
        { contract_type: 'Settlement Agreement', governing_law: 'Germany', dispute_resolution: 'German courts / SIAC', rationale: 'Settlement GmbH under BaFin supervision' },
        { contract_type: 'Carbon Certificate', governing_law: 'Registry jurisdiction', dispute_resolution: 'Registry rules + SIAC', rationale: 'Certificate validity = registry rules' },
        { contract_type: 'Validator Agreement', governing_law: 'Singapore', dispute_resolution: 'SIAC Arbitration', rationale: 'Node Operations coordinated from SG' },
        { contract_type: 'Data Processing Agreement', governing_law: 'Ireland (EU)', dispute_resolution: 'Irish courts / DPC', rationale: 'GDPR requires EU governing law for DPA' },
        { contract_type: 'IP License', governing_law: 'Singapore', dispute_resolution: 'SIAC Arbitration', rationale: 'IP Ltd incorporated in SG' },
        { contract_type: 'Employment (VN)', governing_law: 'Vietnam', dispute_resolution: 'Vietnamese labor courts', rationale: 'Vietnamese labor law mandatory' },
        { contract_type: 'Insurance Policy', governing_law: 'Policy issuer jurisdiction', dispute_resolution: 'Per policy terms', rationale: 'Insurance follows issuer' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 5. CROSS-BORDER ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════

const CROSS_BORDER_ENFORCEMENT = {
    title: 'Cross-Border Enforcement — Making Decisions Stick',

    mechanisms: [
        { mechanism: 'SIAC Arbitration Awards', enforceability: 'Enforceable in 170+ countries (New York Convention 1958)', coverage: 'Commercial disputes, SLA, settlement', strength: 'VERY STRONG' },
        { mechanism: 'EU Regulation (Brussels I)', enforceability: 'Automatic recognition across EU member states', coverage: 'EU commercial + data protection judgments', strength: 'STRONG in EU' },
        { mechanism: 'Bilateral Treaties', enforceability: 'Varies by country pair', coverage: 'SG-VN, SG-DE bilateral investment treaties', strength: 'MODERATE' },
        { mechanism: 'Blockchain Evidence', enforceability: 'Increasingly accepted — jurisdiction dependent', coverage: 'Immutable proof of transaction, verification, timestamp', strength: 'GROWING' },
        { mechanism: 'Constitutional Audit Trail', enforceability: 'Admissible as business record in most common law jurisdictions', coverage: 'All platform decisions, access control, governance votes', strength: 'STRONG (if hash-chain integrity maintained)' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class JurisdictionLogicEngine {
    getConflictResolution() { return CONFLICT_RESOLUTION; }
    getArbitragePrevention() { return ARBITRAGE_PREVENTION; }
    getLiabilityMap() { return LIABILITY_MAP; }
    getGoverningLaw() { return GOVERNING_LAW; }
    getCrossBorderEnforcement() { return CROSS_BORDER_ENFORCEMENT; }

    resolveConflict(conflict_id) {
        const conflict = CONFLICT_RESOLUTION.conflicts.find(c => c.id === conflict_id);
        if (!conflict) return { error: `Unknown conflict: ${conflict_id}` };
        return conflict;
    }

    getFullFramework() {
        return {
            title: 'Jurisdiction Logic — Legitimacy Layer',
            version: '1.0',
            conflict_resolution: CONFLICT_RESOLUTION,
            arbitrage_prevention: ARBITRAGE_PREVENTION,
            liability_map: LIABILITY_MAP,
            governing_law: GOVERNING_LAW,
            enforcement: CROSS_BORDER_ENFORCEMENT,
        };
    }
}

module.exports = new JurisdictionLogicEngine();
