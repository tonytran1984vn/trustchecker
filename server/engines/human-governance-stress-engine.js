/**
 * TrustChecker — Human Governance Stress Engine v1.0
 * COHERENCE: System logic is strong. Humans are the weakest link.
 * 
 * This engine simulates HUMAN governance failures:
 *   - Insider collusion
 *   - GGC capture (governance hijack)
 *   - Board–Management conflict
 *   - Founder power reduction (IPO-critical)
 *   - Compensation governance + conflict-of-interest
 */

// ═══════════════════════════════════════════════════════════════════
// 1. INSIDER COLLUSION SCENARIOS
// ═══════════════════════════════════════════════════════════════════

const INSIDER_COLLUSION = {
    title: 'Insider Collusion Simulation — How Insiders Could Attack & How System Prevents It',

    scenarios: [
        {
            id: 'IC-01',
            scenario: 'Super Admin + Database Admin collusion',
            attack: 'Super admin provides access credentials; DB admin modifies trust scores directly in database',
            prevention: [
                'Super admin has SELECT-only database access (trustchecker_readonly)',
                'DB admin role does not exist in production — migrations via CI/CD only',
                'Hash-chain audit detects any direct DB modification within 60 seconds',
                'PostgreSQL audit logging captures all queries regardless of role',
            ],
            detection_time: '< 60 seconds (hash-chain integrity check)',
            residual_risk: 'LOW — requires compromising both application AND database infrastructure simultaneously',
        },
        {
            id: 'IC-02',
            scenario: 'CTO + Blockchain Operator collusion',
            attack: 'CTO deploys malicious code; Blockchain operator provides anchoring keys to falsify proofs',
            prevention: [
                'Code deployment requires CI/CD pipeline with automated tests',
                'Blockchain anchoring keys in HSM (recommended) — not accessible to individuals',
                'Separation: CTO ≠ Blockchain Operator (SEP-5)',
                'All deployments logged + reviewed in weekly Risk Committee summary',
            ],
            detection_time: '< 24 hours (code review + deployment audit)',
            residual_risk: 'MEDIUM — depends on code review rigor and HSM implementation',
        },
        {
            id: 'IC-03',
            scenario: 'CFO + Treasury Role collusion',
            attack: 'CFO authorizes fraudulent payout; Treasury role executes',
            prevention: [
                'Dual-key enforcement: CFO approval + Compliance sign-off required for payouts',
                'Treasury waterfall is constitution-governed — cannot bypass priority order',
                'All treasury actions in hash-chained audit trail',
                'Capital Reserve Trust has independent trustee — CFO cannot access directly',
            ],
            detection_time: '< 24 hours (daily treasury reconciliation)',
            residual_risk: 'LOW — dual-key prevents single-party execution. Independent trustee prevents reserve access.',
        },
        {
            id: 'IC-04',
            scenario: 'Compliance Officer + External entity collusion',
            attack: 'Compliance officer suppresses regulatory alert; allows sanctioned entity to operate',
            prevention: [
                'OFAC/SDN check is automated — Compliance officer cannot override system block (KS-02)',
                'All compliance alerts logged to separate audit stream',
                'External audit reviews compliance decisions quarterly',
                'Whistleblower channel available for internal reporting',
            ],
            detection_time: '< 48 hours (automated compliance reconciliation)',
            residual_risk: 'LOW — automated blocking removes human override capability',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. GGC CAPTURE SCENARIOS
// ═══════════════════════════════════════════════════════════════════

const GGC_CAPTURE = {
    title: 'GGC Capture Scenarios — What If Governance Is Hijacked?',

    scenarios: [
        {
            id: 'GCC-01',
            scenario: 'Majority capture by single stakeholder group',
            attack: 'One entity gains control of 75%+ GGC seats (enough for supermajority)',
            prevention: [
                'GGC composition safeguard: min 2 independent members, max 40% from any single entity',
                'Validator delegate seats cannot be filled by platform employees',
                'Independent member must have no financial relationship with platform',
                'External observer (regulatory) has hearing rights on all amendments',
            ],
            detection: 'Composition check is automated at each GGC seat change. Alert if thresholds breached.',
            constitutional_defense: 'Amendment to change composition safeguards requires 90% supermajority — capturing entity cannot unilaterally change rules.',
        },
        {
            id: 'GCC-02',
            scenario: 'Gradual capture via proxy voting',
            attack: 'GGC members delegate votes to aligned party, creating de facto majority',
            prevention: [
                'No proxy voting allowed for constitutional amendments',
                'Standard votes allow proxy only with 7-day advance registration',
                'Proxy concentration limit: no single proxy holder >25% of votes',
                'All proxy arrangements disclosed in governance transparency report',
            ],
            detection: 'Proxy registration tracked. Alert if concentration approaching 25%.',
        },
        {
            id: 'GCC-03',
            scenario: 'Hostile amendment to weaken governance',
            attack: 'Captured GGC attempts to remove separation of powers or constitutional floors',
            prevention: [
                'Emergency amendment cannot touch: floors, separation, audit integrity (hardcoded exclusion)',
                'Standard amendment: IVU veto for scoring, validator veto for staking, regulatory hearing mandatory',
                'Even with 100% GGC vote: cannot remove "unamendable" constitutional articles',
            ],
            unamendable_articles: [
                'Separation of powers (6 SEP rules)',
                'Hash-chain audit integrity',
                'Independent member requirement',
                'Kill-switch authority requiring multi-party approval',
                'Capital Reserve Trust independence',
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. BOARD–MANAGEMENT CONFLICT PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const BOARD_MANAGEMENT = {
    title: 'Board–Management Conflict Resolution Protocol',

    conflict_types: [
        {
            type: 'Strategic disagreement',
            example: 'Board wants conservative growth; Management wants aggressive expansion',
            resolution: 'Board strategy committee review → recommendation → full board vote. Management implements board-approved strategy.',
            escalation: 'If management refuses → board can replace management (with proper process).',
            governance_principle: 'Board sets direction. Management executes. Disagreement → board prevails.',
        },
        {
            type: 'Risk appetite mismatch',
            example: 'Risk Committee wants higher CAR target; CEO wants lower to free capital',
            resolution: 'Risk Committee recommendation has priority for risk-related decisions (constitutional). CEO can appeal to full board.',
            escalation: 'If CEO overrides Risk → documented in governance log → quarterly disclosure to external auditor.',
            governance_principle: 'Safety > Growth. Risk Committee has constitutional primacy on risk matters.',
        },
        {
            type: 'Compensation dispute',
            example: 'Management compensation vs board expectations',
            resolution: 'Independent compensation committee sets management compensation. No self-dealing.',
            escalation: 'If dispute escalates → independent external review.',
            governance_principle: 'Management does not set its own compensation. Period.',
        },
        {
            type: 'Information asymmetry',
            example: 'Management withholds negative information from board',
            resolution: 'Board has direct access to: audit logs, risk dashboard, compliance reports (read-only). No management gatekeeping.',
            escalation: 'If withholding detected → board can commission independent investigation.',
            governance_principle: 'Board access to information ≥ Management access. No filters.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. FOUNDER POWER REDUCTION ROADMAP
// ═══════════════════════════════════════════════════════════════════

const FOUNDER_ROADMAP = {
    title: 'Founder Power Reduction Roadmap — IPO Readiness',
    principle: 'Founder-led companies must institutionalize before IPO. Personal power → institutional power.',

    phases: [
        {
            phase: 1,
            name: 'Current State (Pre-Institutional)',
            timing: 'Now',
            founder_roles: ['CEO', 'CTO', 'Super Admin', 'GGC Member'],
            risk: 'CRITICAL — founder is 4 roles simultaneously. Bus factor = 1.',
            actions: ['Document all founder-unique knowledge', 'Begin delegating technical decisions'],
        },
        {
            phase: 2,
            name: 'Role Separation',
            timing: '6-12 months before Series B or IPO prep',
            founder_roles: ['CEO', 'GGC Member'],
            separations: [
                'CTO role: Hire dedicated CTO. Founder steps back from technical decisions.',
                'Super Admin: Transfer to professional DevOps/SRE team. Founder loses super_admin access.',
                'GGC: Founder remains as 1 member (max 1 vote). Independent members ≥ 2.',
            ],
            risk: 'MODERATE — still CEO + GGC, but operational separation begun.',
        },
        {
            phase: 3,
            name: 'Governance Institutionalization',
            timing: '12-24 months before IPO',
            founder_roles: ['CEO (with board oversight)', 'Board member (not chair)'],
            separations: [
                'GGC seat: Founder can remain but must not be GGC Chair. Independent Chair appointed.',
                'Board Chair: Must be independent non-executive. Founder = executive director.',
                'Nomination committee: Independent. Founder cannot nominate own replacements.',
            ],
            risk: 'LOW — institutional checks in place. Founder influence through execution, not authority.',
        },
        {
            phase: 4,
            name: 'IPO-Ready',
            timing: 'IPO filing',
            founder_roles: ['CEO OR Board member (choose one for governance clarity)'],
            requirements: [
                'Independent board majority',
                'Independent audit committee, risk committee, compensation committee',
                'Founder super-voting shares: acceptable for IPO but triggers investor scrutiny',
                'Founder succession plan documented and board-approved',
                'D&O insurance in place',
            ],
            risk: 'MINIMAL — institutional governance complete. Founder is replaceable.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 5. COMPENSATION & CONFLICT-OF-INTEREST GOVERNANCE
// ═══════════════════════════════════════════════════════════════════

const COMPENSATION_COI = {
    title: 'Compensation Governance + Conflict-of-Interest Disclosure',

    compensation: {
        who_sets: {
            management_compensation: 'Independent Compensation Committee (no executives on committee)',
            ggc_compensation: 'Board-approved. GGC members cannot vote on own compensation.',
            validator_rewards: 'Constitutional formula (20% of revenue, floor 15%). Not set by individual.',
            board_compensation: 'Shareholder-approved at AGM',
        },
        principles: [
            'No self-dealing: nobody sets their own compensation',
            'Performance-linked: management compensation tied to platform metrics (not just revenue)',
            'Clawback: bonus clawback if financial restatement within 3 years',
            'Disclosure: total compensation disclosed in annual governance report',
        ],
    },

    conflict_of_interest: {
        disclosure_requirement: {
            who: 'All GGC members, Risk Committee, Board members, management',
            when: 'At appointment + whenever conflict arises + annually re-confirmed',
            what: 'Financial interests, relationships with tenants/validators, external roles',
            to_whom: 'Compliance Officer → logged in governance register → disclosed in transparency report',
        },
        recusal_policy: {
            rule: 'Conflicted member must recuse from voting on related matter',
            enforcement: 'Compliance Officer reviews each GGC/Board agenda item against COI register',
            violation: 'Failure to disclose: removal from role + governance investigation',
        },
        examples: [
            'GGC member is also a tenant → recuse from tenant-related pricing votes',
            'Risk Committee member owns validator stake → recuse from slashing votes',
            'Board member has relationship with competing platform → disclose + board evaluates',
        ],
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class HumanGovernanceStressEngine {
    getInsiderCollusion() { return INSIDER_COLLUSION; }
    getGGCCapture() { return GGC_CAPTURE; }
    getBoardManagement() { return BOARD_MANAGEMENT; }
    getFounderRoadmap() { return FOUNDER_ROADMAP; }
    getCompensationCOI() { return COMPENSATION_COI; }

    assessFounderPhase(current_roles) {
        const roles = current_roles || ['CEO', 'CTO', 'Super Admin', 'GGC Member'];
        const roleCount = roles.length;
        let phase, risk;
        if (roleCount >= 4) { phase = 1; risk = 'CRITICAL'; }
        else if (roleCount >= 3) { phase = 1.5; risk = 'HIGH'; }
        else if (roleCount === 2 && roles.includes('CEO')) { phase = 2; risk = 'MODERATE'; }
        else if (roleCount === 1) { phase = 3; risk = 'LOW'; }
        else { phase = 4; risk = 'MINIMAL'; }
        return { current_roles: roles, role_count: roleCount, assessed_phase: phase, risk_level: risk, next_step: FOUNDER_ROADMAP.phases.find(p => p.phase > phase)?.separations?.[0] || 'IPO-ready' };
    }

    getFullFramework() {
        return {
            title: 'Human Governance Stress — The Weakest Link',
            version: '1.0',
            insider_collusion: INSIDER_COLLUSION,
            ggc_capture: GGC_CAPTURE,
            board_management: BOARD_MANAGEMENT,
            founder_roadmap: FOUNDER_ROADMAP,
            compensation_coi: COMPENSATION_COI,
        };
    }
}

module.exports = new HumanGovernanceStressEngine();
