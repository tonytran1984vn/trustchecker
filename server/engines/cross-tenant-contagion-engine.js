/**
 * TrustChecker — Cross-Tenant Contagion Modeling Engine v1.0
 * FINAL PILLAR 3: Systemic risk from tenant interconnection
 * 
 * Multi-tenant infrastructure creates hidden connections:
 *   - Shared supply chain routes → one tenant failure → impacts others
 *   - Trust Graph edges → low-trust entity contaminates neighbors
 *   - Blockchain anchoring → shared state, shared risk
 *   - Settlement netting → counterparty exposure chains
 * 
 * Without contagion modeling: platform is a silent propagation vector.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. TRUST CONTAGION MODEL
// ═══════════════════════════════════════════════════════════════════

const TRUST_CONTAGION = {
    title: 'Trust Contagion — How trust failures propagate',
    principle: 'A single low-trust entity can degrade trust of connected entities through verification graph.',

    propagation_model: {
        algorithm: 'Weighted graph diffusion with decay',
        formula: 'trust_impact(B) = trust_drop(A) × edge_weight(A,B) × decay_factor(distance)',
        decay_factor: 0.4,  // 40% propagation per hop
        max_hops: 4,
        directional: true,   // Upstream contamination stronger than downstream

        edge_weights: [
            { relationship: 'Direct supplier/buyer', weight: 0.8, direction: 'Bidirectional' },
            { relationship: 'Same verification batch', weight: 0.3, direction: 'Bidirectional' },
            { relationship: 'Shared carbon certificate', weight: 0.6, direction: 'Bidirectional' },
            { relationship: 'Same industry/sector', weight: 0.1, direction: 'Bidirectional' },
            { relationship: 'Same geographic region', weight: 0.05, direction: 'Bidirectional' },
        ],
    },

    severity_thresholds: {
        negligible: { trust_drop_pct: 5, action: 'Log only' },
        low: { trust_drop_pct: 10, action: 'Alert affected tenants + enhanced monitoring' },
        moderate: { trust_drop_pct: 20, action: 'Settlement limits reduced for affected tenants' },
        high: { trust_drop_pct: 30, action: 'KS-02 Tenant Freeze for source + counter-limit all affected' },
        critical: { trust_drop_pct: 50, action: 'KS-01 Network Freeze evaluation' },
    },
};

// ═══════════════════════════════════════════════════════════════════
// 2. SHARED ROUTE RISK PROPAGATION
// ═══════════════════════════════════════════════════════════════════

const SHARED_ROUTE_RISK = {
    title: 'Shared Route Risk — Supply chain route dependencies between tenants',

    risk_model: {
        route_dependency_types: [
            {
                type: 'Shared Logistics Provider',
                risk: 'Single logistics failure → multiple tenant supply chains disrupted',
                metric: 'Provider concentration index — no single provider > 40% of volume',
                mitigation: 'Mandatory backup routing for tenants with single-provider dependency',
                contagion_strength: 0.5,
            },
            {
                type: 'Shared Port/Hub',
                risk: 'Port closure → all tenants routing through that port affected',
                metric: 'Hub concentration index — no single hub > 25% of routed volume',
                mitigation: 'Alternative routing pre-configured for top 5 hubs',
                contagion_strength: 0.3,
            },
            {
                type: 'Shared Certification Body',
                risk: 'Certifier credibility loss → all certificates from that body questioned',
                metric: 'Certifier diversity — minimum 3 certifiers per product category',
                mitigation: 'Cross-certification recommended for high-value chains',
                contagion_strength: 0.7,
            },
            {
                type: 'Shared Carbon Registry',
                risk: 'Registry dispute → all credits from that registry frozen',
                metric: 'Registry concentration per tenant',
                mitigation: 'Multi-registry integration (Verra + Gold Standard + regional)',
                contagion_strength: 0.6,
            },
        ],
    },

    concentration_alerts: {
        single_route_max_pct: 30,
        single_provider_max_pct: 40,
        single_hub_max_pct: 25,
        alert_mechanism: 'Automated weekly scan → alert if concentration exceeds threshold',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. BLOCKCHAIN ANCHORING CROSS-IMPACT
// ═══════════════════════════════════════════════════════════════════

const ANCHORING_CROSS_IMPACT = {
    title: 'Blockchain Anchoring Cross-Impact — Shared ledger, shared risk',

    risks: [
        {
            risk: 'Chain Congestion from Single Tenant',
            description: 'One tenant generating massive anchor volume → delays for all tenants',
            mitigation: 'Per-tenant anchor rate limiting (max 1000 anchors/hour/tenant)',
            circuit_breaker: 'If single tenant > 30% of anchor volume → throttle to 10% allocation',
        },
        {
            risk: 'Smart Contract Vulnerability',
            description: 'Bug in anchoring contract affects all tenants simultaneously',
            mitigation: 'Multi-contract architecture: each major function = separate contract',
            circuit_breaker: 'KS-04 Anchoring Freeze + off-chain verification mode',
        },
        {
            risk: 'Chain Fork Impact',
            description: 'Blockchain fork → some anchors on orphaned chain → integrity uncertain',
            mitigation: 'Wait for finality (N confirmations). Multi-chain anchoring for critical data.',
            circuit_breaker: 'If finality uncertain > 1 hour → KS-04 + manual reconciliation',
        },
        {
            risk: 'Privacy Leakage via Batch Analysis',
            description: 'Batch anchoring reveals timing/volume patterns between tenants',
            mitigation: 'Batch shuffling + timing randomization + encrypted metadata',
            circuit_breaker: 'If leakage detected → single-tenant batching mode (higher cost)',
        },
    ],

    isolation_measures: [
        'Per-tenant anchor namespacing (separate Merkle trees)',
        'Tenant-level encryption of anchor metadata',
        'No cross-tenant data derivable from on-chain data alone',
        'Anchor gas cost allocated per-tenant (no free-riding)',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. CONTAGION CIRCUIT BREAKERS
// ═══════════════════════════════════════════════════════════════════

const CONTAGION_BREAKERS = {
    breakers: [
        {
            id: 'CCB-01', trigger: 'Trust contagion > 20% drop propagated to 5+ tenants',
            action: 'Source tenant: KS-02 Freeze. Affected tenants: enhanced monitoring + limit reduction.',
            authority: 'Auto-trigger + Risk Committee notification',
            escalation: 'If > 10 tenants affected → L3 Crisis Council',
        },
        {
            id: 'CCB-02', trigger: 'Shared route failure affects > 20% of active tenants',
            action: 'Alternative routing activation. Affected tenants notified. SLA clock paused for force majeure.',
            authority: 'Operations team + Risk Committee',
            escalation: 'If no alternative route available → L2 Management',
        },
        {
            id: 'CCB-03', trigger: 'Blockchain anchor backlog > 10,000 pending',
            action: 'Throttle highest-volume tenant. Prioritize settlement-related anchors.',
            authority: 'Auto-trigger (system level)',
            escalation: 'If backlog not resolved in 4h → KS-04 Anchoring Freeze',
        },
        {
            id: 'CCB-04', trigger: 'Settlement netting exposes > $1M cross-tenant counterparty chain',
            action: 'Netting suspended. Gross settlement mode activated. Counterparty limits reviewed.',
            authority: 'Risk Committee + Settlement engine auto-fallback',
            escalation: 'If default in chain → insurance claim + reserve drawdown',
        },
        {
            id: 'CCB-05', trigger: 'Carbon certificate from single registry > 60% of platform volume + registry dispute',
            action: 'Affected certificates frozen. Non-affected settlement continues.',
            authority: 'Compliance + Risk Committee',
            escalation: 'If > 80% of platform volume → KS-05 Settlement Freeze',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class CrossTenantContagionEngine {

    simulateContagion(source_trust_drop, connections) {
        const drop = source_trust_drop || 40;
        const conns = connections || [
            { entity: 'Supplier-A', relationship: 'Direct supplier/buyer', distance: 1 },
            { entity: 'Warehouse-B', relationship: 'Same verification batch', distance: 1 },
            { entity: 'Buyer-C', relationship: 'Direct supplier/buyer', distance: 2 },
            { entity: 'Certifier-D', relationship: 'Shared carbon certificate', distance: 2 },
            { entity: 'Distributor-E', relationship: 'Same industry/sector', distance: 3 },
        ];

        const model = TRUST_CONTAGION.propagation_model;
        const results = conns.map(conn => {
            const edgeWeight = model.edge_weights.find(e => e.relationship === conn.relationship)?.weight || 0.1;
            const decayedImpact = drop * edgeWeight * Math.pow(model.decay_factor, conn.distance - 1);
            const roundedImpact = parseFloat(decayedImpact.toFixed(1));
            let severity = 'negligible';
            for (const [key, threshold] of Object.entries(TRUST_CONTAGION.severity_thresholds)) {
                if (roundedImpact >= threshold.trust_drop_pct) severity = key;
            }
            return { entity: conn.entity, relationship: conn.relationship, distance: conn.distance, trust_impact_pct: roundedImpact, severity, action: TRUST_CONTAGION.severity_thresholds[severity]?.action || 'None' };
        });

        const totalAffected = results.filter(r => r.trust_impact_pct > 5).length;
        const highSeverity = results.filter(r => ['high', 'critical'].includes(r.severity)).length;

        return {
            source_trust_drop_pct: drop,
            contagion_model: 'Weighted graph diffusion, decay 0.4/hop',
            affected_entities: results,
            total_affected: totalAffected,
            high_severity_count: highSeverity,
            circuit_breaker_triggered: highSeverity > 0,
            recommended_action: highSeverity > 0 ? 'KS-02 source tenant + limit reduction for affected' : 'Monitor only',
        };
    }

    getTrustContagion() { return TRUST_CONTAGION; }
    getSharedRouteRisk() { return SHARED_ROUTE_RISK; }
    getAnchoringCrossImpact() { return ANCHORING_CROSS_IMPACT; }
    getContagionBreakers() { return CONTAGION_BREAKERS; }

    getFullFramework() {
        return {
            title: 'Cross-Tenant Contagion Modeling — Critical Infrastructure-Grade',
            version: '1.0',
            trust_contagion: TRUST_CONTAGION,
            shared_route_risk: SHARED_ROUTE_RISK,
            anchoring_cross_impact: ANCHORING_CROSS_IMPACT,
            contagion_breakers: CONTAGION_BREAKERS,
        };
    }
}

module.exports = new CrossTenantContagionEngine();
