/**
 * TrustChecker — Platform Architecture Engine v1.0
 * Phase 1: Platform Simplification & Core Isolation
 *
 * Purpose: Transform 516-endpoint sprawl into canonicalized infrastructure
 * by classifying every module, endpoint, and dependency.
 *
 *   1. Core vs Extended vs Tooling classification
 *   2. Module Boundary Map (dependency graph)
 *   3. API Surface Rationalization
 *   4. Critical Path Definition
 *   5. Complexity Scorecard
 */

// ═════════════════════════════════════════════════════════════════════
// MODULE REGISTRY — All 12 modules classified
// ═════════════════════════════════════════════════════════════════════

const MODULE_REGISTRY = [
    // ─── CORE: Mission-critical, cannot be removed ───
    {
        id: 'M01', name: 'Code Governance & Lifecycle', classification: 'core',
        layer: 'L3', description: 'Root of trust — unique code generation, collision prevention, lifecycle tracking',
        route_file: 'scm-code-governance.js', endpoints: 9, pages: ['code-generate', 'code-format-rules', 'code-batch-assign', 'code-lifecycle', 'code-audit-log'],
        critical_functions: ['HMAC-SHA256 generation', 'Bloom filter collision check', 'Shannon entropy validation', '7-state lifecycle FSM'],
        dependencies: ['Risk Engine (scoring input)', 'Evidence (export)'], dependents: ['Risk Engine', 'Case Workflow', 'Forensic', 'Public Verification'],
        infrastructure_weight: 10, removal_impact: 'FATAL — system has no root of trust'
    },
    {
        id: 'M02', name: 'Risk Scoring Engine (4-Tier)', classification: 'core',
        layer: 'L3', description: 'Deterministic, explainable risk scoring with ML-upgrade path',
        route_file: 'scm-risk-model.js', endpoints: 11, pages: ['scoring-engine', 'model-governance'],
        critical_functions: ['ERS calculation (12 factors)', 'BRS aggregation', 'CRS computation', 'BRI enterprise roll-up', 'Risk decay', 'Dynamic recalibration'],
        dependencies: ['Code Governance (scan data)'], dependents: ['Decision Engine', 'Case Workflow', 'Dashboard', 'MRMF'],
        infrastructure_weight: 10, removal_impact: 'FATAL — no risk assessment capability'
    },
    {
        id: 'M03', name: 'Decision Engine & Auto-Response', classification: 'core',
        layer: 'L3', description: 'Sub-300ms auto-decision with SoD-enforced overrides',
        route_file: 'N/A (embedded)', endpoints: 0, pages: ['decision-engine', 'auto-response'],
        critical_functions: ['4-tier threshold routing', 'Auto-lock capability', 'Override audit trail'],
        dependencies: ['Risk Engine (scores)', 'Code Governance (lock actions)'], dependents: ['Case Workflow', 'Dashboard', 'MRMF (auto-decision monitoring)'],
        infrastructure_weight: 9, removal_impact: 'FATAL — no automated response'
    },
    {
        id: 'M04', name: 'Case Workflow', classification: 'core',
        layer: 'L2-L3', description: 'Multi-stage investigation pipeline with SLA enforcement',
        route_file: 'N/A (embedded in scm routes)', endpoints: 8, pages: ['cases-open', 'cases-closed', 'cases-escalated', 'case-workflow'],
        critical_functions: ['5-stage workflow FSM', 'SLA timers (24h/4h/8h/2h)', 'Verdict → FP feedback loop', 'Evidence package assembly'],
        dependencies: ['Risk Engine', 'Evidence Store', 'Notifications'], dependents: ['Dashboard', 'Reports', 'Compliance'],
        infrastructure_weight: 8, removal_impact: 'CRITICAL — no investigation process'
    },
    {
        id: 'M05', name: 'Evidence & Integrity Store', classification: 'core',
        layer: 'L4', description: 'Immutable evidence packages with cryptographic chain',
        route_file: 'evidence.js', endpoints: 15, pages: ['evidence', 'forensic'],
        critical_functions: ['SHA-256 hash chain', 'RSA-2048 signatures', 'RFC 3161 TSA timestamps', 'Blockchain seal', 'Legal hold', 'Evidence freeze'],
        dependencies: ['Blockchain Engine'], dependents: ['Case Workflow', 'Public Verification', 'Compliance', 'Forensic'],
        infrastructure_weight: 10, removal_impact: 'FATAL — no evidence integrity'
    },

    // ─── EXTENDED: Important but modular, governance & compliance ───
    {
        id: 'M06', name: 'MRMF v2.0 (Model Risk)', classification: 'extended',
        layer: 'L2-L4', description: '6-pillar model risk governance framework',
        route_file: 'hardening.js (mrmf section)', endpoints: 18, pages: ['mrmf'],
        critical_functions: ['MDLC 10-step', 'IVU + MVR', 'MHI composite', 'Residual Risk formula', 'Material Change Policy', 'MRC governance'],
        dependencies: ['Risk Engine', 'Observability'], dependents: ['ERCM', 'Institutional Engine', 'Audit Package'],
        infrastructure_weight: 7, removal_impact: 'HIGH — no formal model governance, drops from L4 to L2'
    },
    {
        id: 'M07', name: 'ERCM (Enterprise Risk Map)', classification: 'extended',
        layer: 'L2', description: 'COSO ERM, Three Lines, risk taxonomy, board dashboard',
        route_file: 'hardening.js (ercm section)', endpoints: 11, pages: ['ercm'],
        critical_functions: ['32 risks × 7 domains', 'Risk scoring formula', 'Control classification', 'Risk appetite', 'Board dashboard', 'Control testing'],
        dependencies: ['MRMF', 'Institutional Engine'], dependents: ['Institutional Engine', 'Board Reports'],
        infrastructure_weight: 6, removal_impact: 'HIGH — no enterprise risk taxonomy'
    },
    {
        id: 'M08', name: 'Institutional Engine (4 Pillars)', classification: 'extended',
        layer: 'L2', description: 'Risk Appetite, Board Dashboard, Audit Charter, Risk Capital',
        route_file: 'hardening.js (institutional section)', endpoints: 11, pages: ['institutional'],
        critical_functions: ['16 KPI board dashboard', 'Internal Audit Charter', 'Economic Capital Model', 'Zero-tolerance enforcement', 'Appetite breach detection'],
        dependencies: ['ERCM', 'MRMF'], dependents: ['Board Reporting'],
        infrastructure_weight: 6, removal_impact: 'MEDIUM-HIGH — no institutional governance layer'
    },
    {
        id: 'M09', name: 'Blockchain Governance (EAS)', classification: 'extended',
        layer: 'L4', description: 'Public anchor, TSA, HSM, zero-trust zones, maturity model',
        route_file: 'scm-integrity.js', endpoints: 20, pages: ['blockchain', 'blockchain-explorer'],
        critical_functions: ['Blockchain seal engine', 'Public verification portal', 'Anchor configuration', 'Zero-trust zones', '5-layer enforcement', 'L1-L5 maturity'],
        dependencies: ['Evidence Store'], dependents: ['Evidence', 'Carbon Credit', 'Public Verification'],
        infrastructure_weight: 8, removal_impact: 'CRITICAL — no cryptographic anchor'
    },
    {
        id: 'M10', name: 'Compliance & GDPR', classification: 'extended',
        layer: 'L2-L6', description: 'Privacy, retention, legal hold, regulatory export',
        route_file: 'compliance-gdpr.js', endpoints: 14, pages: ['compliance/*'],
        critical_functions: ['GDPR Art. 15-17-20', 'Data retention engine', 'Privacy request workflow', 'Legal hold', 'Regulatory export'],
        dependencies: ['Evidence Store', 'Access Control'], dependents: ['Audit', 'Board Reports'],
        infrastructure_weight: 7, removal_impact: 'HIGH — regulatory non-compliance'
    },

    // ─── TOOLING: Operational support, replaceable ───
    {
        id: 'M11', name: 'Billing & Monetization', classification: 'tooling',
        layer: 'L5', description: 'Subscription, invoicing, wallet, payment processing',
        route_file: 'billing.js + wallet-payment.js', endpoints: 32, pages: ['billing', 'pricing', 'wallet'],
        critical_functions: ['Multi-tier pricing', 'Invoice generation', 'Wallet ledger', 'Usage metering'],
        dependencies: ['Tenant Admin'], dependents: ['Dashboard', 'Financial Layer'],
        infrastructure_weight: 4, removal_impact: 'MEDIUM — can be replaced by Stripe/Chargebee'
    },
    {
        id: 'M12', name: 'Carbon Credit (CCME)', classification: 'core',
        layer: 'L3-L5', description: 'MRV pipeline, credit minting, registry, settlement, governance',
        route_file: 'scm-carbon-credit.js + scm-carbon.js', endpoints: 25, pages: ['carbon'],
        critical_functions: ['MRV pipeline', 'Credit minting', 'Registry management', 'Settlement/retirement', 'Double-mint prevention', 'Jurisdiction tracking'],
        dependencies: ['Blockchain Governance', 'Evidence Store'], dependents: ['Financial Layer', 'Board Dashboard', 'ERCM (ESG domain)'],
        infrastructure_weight: 9, removal_impact: 'CRITICAL — no carbon infrastructure capability'
    }
];

// ═════════════════════════════════════════════════════════════════════
// API SURFACE RATIONALIZATION
// ═════════════════════════════════════════════════════════════════════

const API_SURFACE = {
    total_endpoints: 516,
    route_files: 56,
    classification: {
        core_infrastructure: { count: 43, description: 'Cannot be removed — system stops functioning', examples: ['Code generation', 'Risk scoring', 'Evidence sealing', 'Decision routing', 'Case workflow'] },
        core_governance: { count: 58, description: 'Formal governance that enables audit-grade operation', examples: ['MRMF endpoints', 'ERCM endpoints', 'Institutional endpoints', 'Model governance'] },
        extended_capability: { count: 145, description: 'Business features built on core — modular', examples: ['Carbon credit', 'KYC', 'QR management', 'SCM tracking', 'Notifications'] },
        operational_tooling: { count: 120, description: 'Admin, billing, reports — replaceable', examples: ['Billing', 'Wallet', 'Tenant admin', 'System health', 'Reports'] },
        platform_support: { count: 95, description: 'Integration, API docs, webhooks — utility', examples: ['Integrations', 'Webhooks', 'API docs', 'Platform status', 'Branding'] },
        observability: { count: 55, description: 'Monitoring, health, SLA — DevOps', examples: ['Observability', 'SLA monitoring', 'Error logs', 'Health checks'] }
    },
    hardening_review: {
        total: 59,
        sections: [
            { name: 'Risk Model Governance', endpoints: 6, classification: 'core_governance', action: 'KEEP — foundational' },
            { name: 'SA Constraints', endpoints: 4, classification: 'core_governance', action: 'KEEP — security-critical' },
            { name: 'Observability', endpoints: 4, classification: 'observability', action: 'KEEP — operational necessity' },
            { name: 'Risk Intelligence', endpoints: 5, classification: 'core_governance', action: 'KEEP — model risk infrastructure' },
            { name: 'MRMF v2.0', endpoints: 18, classification: 'core_governance', action: 'REVIEW — could consolidate MVR+health+MHI' },
            { name: 'ERCM v1.0', endpoints: 11, classification: 'core_governance', action: 'REVIEW — heatmap+board overlap with Institutional' },
            { name: 'Institutional', endpoints: 11, classification: 'core_governance', action: 'REVIEW — board-dashboard overlaps with ERCM board' }
        ],
        consolidation_opportunities: [
            { area: 'Board Dashboard', current: 'ERCM board-dashboard + Institutional board-dashboard', recommendation: 'Single unified board endpoint, ERCM feeds risk data, Institutional feeds KPIs', savings: '1 endpoint' },
            { area: 'Maturity', current: 'MRMF maturity + ERCM maturity + Institutional maturity', recommendation: 'Single /maturity endpoint aggregating all 3 dimensions', savings: '2 endpoints' },
            { area: 'Risk Appetite', current: 'ERCM risk-appetite + Institutional risk-appetite', recommendation: 'Institutional owns risk appetite (board-level), ERCM references it', savings: '1 endpoint' }
        ],
        potential_savings: 4
    }
};

// ═════════════════════════════════════════════════════════════════════
// CRITICAL PATH DEFINITION
// ═════════════════════════════════════════════════════════════════════

const CRITICAL_PATH = {
    description: 'The 28 endpoints that ARE the infrastructure — everything else is built on top',
    endpoints: [
        // Code Governance (Root of Trust)
        { path: '/api/scm/code-gov/generate', method: 'POST', module: 'M01', criticality: 'P0', description: 'Generate anti-counterfeit codes — root operation' },
        { path: '/api/scm/code-gov/validate', method: 'GET', module: 'M01', criticality: 'P0', description: 'Validate code authenticity' },
        { path: '/api/scm/code-gov/collision-check', method: 'POST', module: 'M01', criticality: 'P0', description: 'Bloom filter + HMAC collision prevention' },
        { path: '/api/scm/code-gov/lifecycle', method: 'PUT', module: 'M01', criticality: 'P0', description: 'State transition (7 states FSM)' },
        // Risk Engine (Intelligence Core)
        { path: '/api/scm/model/score', method: 'POST', module: 'M02', criticality: 'P0', description: 'Calculate ERS (12 factors × decay × recal)' },
        { path: '/api/scm/model/active', method: 'GET', module: 'M02', criticality: 'P0', description: 'Get active model version' },
        { path: '/api/scm/model/drift', method: 'GET', module: 'M02', criticality: 'P0', description: 'Drift detection (5 metrics)' },
        { path: '/api/scm/model/deploy', method: 'POST', module: 'M02', criticality: 'P0', description: 'Deploy model version (SoD gated)' },
        // Decision Engine
        { path: 'internal://decision-route', method: 'INTERNAL', module: 'M03', criticality: 'P0', description: 'Auto-decision routing (<300ms P99)' },
        // Evidence (Integrity Layer)
        { path: '/api/evidence/seal', method: 'POST', module: 'M05', criticality: 'P0', description: 'Create sealed evidence package' },
        { path: '/api/evidence/verify', method: 'GET', module: 'M05', criticality: 'P0', description: 'Verify hash chain integrity' },
        { path: '/api/evidence/export', method: 'POST', module: 'M05', criticality: 'P0', description: 'Signed legal-admissible export' },
        // Public Verification
        { path: '/api/public/verify', method: 'GET', module: 'M05', criticality: 'P0', description: 'Public unauthenticated verification' },
        { path: '/api/public/scan', method: 'POST', module: 'M01', criticality: 'P0', description: 'Public product scan entry point' },
        // Blockchain Anchor
        { path: '/api/scm/integrity/seal', method: 'POST', module: 'M09', criticality: 'P0', description: 'Blockchain seal creation' },
        { path: '/api/scm/integrity/verify', method: 'GET', module: 'M09', criticality: 'P0', description: 'Public anchor verification' },
        // Carbon Credit (Settlement Layer)
        { path: '/api/scm/carbon-credit/mint', method: 'POST', module: 'M12', criticality: 'P0', description: 'Credit minting (dual validation)' },
        { path: '/api/scm/carbon-credit/retire', method: 'POST', module: 'M12', criticality: 'P0', description: 'Credit retirement' },
        { path: '/api/scm/carbon-credit/mrv', method: 'POST', module: 'M12', criticality: 'P0', description: 'MRV data submission' },
        { path: '/api/scm/carbon-credit/registry', method: 'GET', module: 'M12', criticality: 'P0', description: 'Credit registry query' },
        // Auth & Access (Security Perimeter)
        { path: '/api/auth/login', method: 'POST', module: 'N/A', criticality: 'P0', description: 'Authentication entry point' },
        { path: '/api/auth/token', method: 'POST', module: 'N/A', criticality: 'P0', description: 'Token refresh' },
        // RBAC
        { path: '/api/admin/permissions', method: 'GET', module: 'N/A', criticality: 'P0', description: 'Permission matrix evaluation' },
        // Governance Gates
        { path: '/api/hardening/risk-model/active', method: 'GET', module: 'M06', criticality: 'P1', description: 'Active governance version' },
        { path: '/api/hardening/sa/check', method: 'POST', module: 'N/A', criticality: 'P1', description: 'SA action validation gate' },
        { path: '/api/hardening/mrmf/health', method: 'GET', module: 'M06', criticality: 'P1', description: 'Model health index' },
        { path: '/api/hardening/institutional/appetite-breach', method: 'GET', module: 'M08', criticality: 'P1', description: 'Risk appetite breach check' },
        { path: '/api/hardening/institutional/board-dashboard', method: 'GET', module: 'M08', criticality: 'P1', description: 'Board-level risk dashboard' }
    ]
};

// ═════════════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH
// ═════════════════════════════════════════════════════════════════════

const DEPENDENCY_GRAPH = {
    nodes: MODULE_REGISTRY.map(m => ({ id: m.id, name: m.name, classification: m.classification, weight: m.infrastructure_weight })),
    edges: [
        { from: 'M01', to: 'M02', label: 'scan data → scoring input' },
        { from: 'M02', to: 'M03', label: 'risk scores → decision routing' },
        { from: 'M03', to: 'M04', label: 'auto-case creation' },
        { from: 'M04', to: 'M05', label: 'evidence package assembly' },
        { from: 'M05', to: 'M09', label: 'blockchain seal request' },
        { from: 'M02', to: 'M06', label: 'model metrics → MRMF monitoring' },
        { from: 'M06', to: 'M07', label: 'model risk → ERCM domain' },
        { from: 'M07', to: 'M08', label: 'risk taxonomy → institutional layer' },
        { from: 'M09', to: 'M12', label: 'anchor service → carbon registry' },
        { from: 'M12', to: 'M08', label: 'carbon exposure → capital allocation' },
        { from: 'M12', to: 'M07', label: 'ESG risk → ERCM domain' },
        { from: 'M05', to: 'M10', label: 'evidence → compliance export' },
        { from: 'M11', to: 'M08', label: 'revenue data → financial KPIs' },
        { from: 'M01', to: 'M05', label: 'code events → evidence trail' }
    ],
    core_chain: 'M01 → M02 → M03 → M04 → M05 → M09',
    governance_chain: 'M06 → M07 → M08',
    carbon_chain: 'M09 → M12 → M07/M08'
};

// ═════════════════════════════════════════════════════════════════════
class PlatformArchitectureEngine {

    getModuleRegistry() {
        const core = MODULE_REGISTRY.filter(m => m.classification === 'core');
        const extended = MODULE_REGISTRY.filter(m => m.classification === 'extended');
        const tooling = MODULE_REGISTRY.filter(m => m.classification === 'tooling');
        return {
            title: 'Module Registry — Core / Extended / Tooling',
            total_modules: MODULE_REGISTRY.length,
            core: { count: core.length, modules: core, total_endpoints: core.reduce((s, m) => s + m.endpoints, 0) },
            extended: { count: extended.length, modules: extended, total_endpoints: extended.reduce((s, m) => s + m.endpoints, 0) },
            tooling: { count: tooling.length, modules: tooling, total_endpoints: tooling.reduce((s, m) => s + m.endpoints, 0) }
        };
    }

    getDependencyGraph() {
        return { title: 'Module Dependency Graph', ...DEPENDENCY_GRAPH };
    }

    getAPISurface() {
        return { title: 'API Surface Rationalization', ...API_SURFACE };
    }

    getCriticalPath() {
        const p0 = CRITICAL_PATH.endpoints.filter(e => e.criticality === 'P0');
        const p1 = CRITICAL_PATH.endpoints.filter(e => e.criticality === 'P1');
        return {
            title: 'Critical Path — Infrastructure Endpoints',
            description: CRITICAL_PATH.description,
            p0: { count: p0.length, endpoints: p0 },
            p1: { count: p1.length, endpoints: p1 },
            total_critical: CRITICAL_PATH.endpoints.length,
            pct_of_total: Math.round(CRITICAL_PATH.endpoints.length / API_SURFACE.total_endpoints * 100)
        };
    }

    getComplexityScorecard() {
        const totalEP = API_SURFACE.total_endpoints;
        const criticalEP = CRITICAL_PATH.endpoints.length;
        const coreModules = MODULE_REGISTRY.filter(m => m.classification === 'core').length;
        const totalModules = MODULE_REGISTRY.length;
        const hardeningEP = API_SURFACE.hardening_review.total;
        const consolidation = API_SURFACE.hardening_review.potential_savings;

        return {
            title: 'Complexity Scorecard',
            metrics: [
                { metric: 'Total API Endpoints', value: totalEP, assessment: totalEP > 500 ? 'HIGH — requires rationalization' : 'MODERATE', threshold: 500 },
                { metric: 'Critical Path Endpoints', value: criticalEP, assessment: `${Math.round(criticalEP / totalEP * 100)}% of total — well isolated`, threshold: null },
                { metric: 'Core vs Total Modules', value: `${coreModules}/${totalModules}`, assessment: coreModules / totalModules <= 0.5 ? 'GOOD — core is minority' : 'REVIEW', threshold: '≤50%' },
                { metric: 'Hardening File Size', value: `${hardeningEP} endpoints`, assessment: hardeningEP > 50 ? 'HIGH — consider splitting' : 'OK', threshold: 50 },
                { metric: 'Consolidation Opportunity', value: `${consolidation} endpoints`, assessment: consolidation > 0 ? `${consolidation} overlap endpoints identified` : 'Clean', threshold: 0 },
                { metric: 'Avg Endpoints per Module', value: Math.round(totalEP / totalModules), assessment: Math.round(totalEP / totalModules) > 40 ? 'HIGH — very dense modules' : 'OK', threshold: 40 },
                { metric: 'Infrastructure Weight', value: `${MODULE_REGISTRY.reduce((s, m) => s + m.infrastructure_weight, 0)}/${totalModules * 10}`, assessment: 'Distributed', threshold: null }
            ],
            overall_complexity: totalEP > 500 ? 'HIGH' : totalEP > 300 ? 'MODERATE' : 'LOW',
            recommendation: totalEP > 500 ? 'Consider API versioning + gateway pattern for external consumers' : 'Manageable',
            auditor_answer: {
                question: 'How do you maintain 516 endpoints?',
                answer: `${criticalEP} are infrastructure-critical (P0/P1). ${coreModules} core modules handle the mission-critical path. ${totalModules - coreModules} extended/tooling modules are modular and replaceable. Core chain: Code→Risk→Decision→Case→Evidence→Blockchain.`
            },
            investor_answer: {
                question: 'What is core vs peripheral?',
                answer: `Core = ${coreModules} modules (${MODULE_REGISTRY.filter(m => m.classification === 'core').reduce((s, m) => s + m.endpoints, 0)} endpoints): Code Governance, Risk Engine, Decision Engine, Case Workflow, Evidence Store, Carbon Credit. Extended = governance overlay (MRMF, ERCM, Institutional). Tooling = replaceable (Billing, Reports).`
            }
        };
    }

    getIsolationSpec() {
        return {
            title: 'Core Isolation Specification',
            principle: 'Core modules MUST operate independently of extended/tooling',
            core_boundary: {
                modules: MODULE_REGISTRY.filter(m => m.classification === 'core').map(m => m.id),
                rule: 'Core modules may depend on other core modules ONLY',
                violations: [
                    { module: 'M02 (Risk Engine)', depends_on: 'MRMF for monitoring', severity: 'low', note: 'One-way: MRMF reads from Risk Engine, not vice versa' }
                ]
            },
            extended_boundary: {
                modules: MODULE_REGISTRY.filter(m => m.classification === 'extended').map(m => m.id),
                rule: 'Extended modules may depend on core and other extended',
                isolation: 'Removing any extended module MUST NOT break core operations'
            },
            tooling_boundary: {
                modules: MODULE_REGISTRY.filter(m => m.classification === 'tooling').map(m => m.id),
                rule: 'Tooling modules may depend on any layer but nothing depends on them for critical ops',
                replaceable: true
            }
        };
    }
}

module.exports = new PlatformArchitectureEngine();
