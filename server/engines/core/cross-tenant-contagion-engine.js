/**
 * Cross-Tenant Contagion Engine v2.0
 * Models how risk propagates across tenants in a multi-tenant platform
 * v2.0 adds: DB-backed simulation, async propagation, contagion history, dashboard
 */

const db = require('../../db');
const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════
// CONTAGION MODELS (static config — unchanged from v1)
// ═══════════════════════════════════════════════════════════════

const TRUST_CONTAGION = {
    propagation_model: {
        type: 'weighted_graph_diffusion',
        decay_factor: 0.4,
        max_hops: 3,
        edge_weights: [
            { relationship: 'Direct supplier/buyer', weight: 0.8 },
            { relationship: 'Same verification batch', weight: 0.6 },
            { relationship: 'Shared carbon certificate', weight: 0.5 },
            { relationship: 'Same industry/sector', weight: 0.2 },
            { relationship: 'Same jurisdiction', weight: 0.15 },
        ],
    },
    severity_thresholds: {
        negligible: { trust_drop_pct: 0, action: 'None' },
        low: { trust_drop_pct: 5, action: 'Monitor — add to watchlist' },
        medium: { trust_drop_pct: 10, action: 'Alert — review relationship, reduce limits' },
        high: { trust_drop_pct: 20, action: 'KS-02 Freeze source + limit reduction for affected' },
        critical: { trust_drop_pct: 30, action: 'KS-02 + KS-03 Investigation + L3 Crisis' },
    },
};

const SHARED_ROUTE_RISK = {
    title: 'Shared Supply Route Contagion',
    scenarios: [
        { scenario: 'Single Route Failure', risk: 'If route used by 5+ tenants fails, all affected simultaneously', mitigation: 'Mandate route diversification >2 routes per tenant' },
        { scenario: 'Port Congestion', risk: 'Single port bottleneck affects 30%+ of platform volume', mitigation: 'Real-time port load monitoring + alternative routing activation' },
    ],
    concentration_alerts: {
        single_route_max_pct: 30, single_provider_max_pct: 40, single_hub_max_pct: 25,
    },
};

const CONTAGION_BREAKERS = {
    breakers: [
        { id: 'CCB-01', trigger: 'Trust contagion >20% drop propagated to 5+ tenants', action: 'Source: KS-02 Freeze. Affected: enhanced monitoring + limit reduction.' },
        { id: 'CCB-02', trigger: 'Shared route failure affects >20% of active tenants', action: 'Alternative routing activation. SLA clock paused for force majeure.' },
        { id: 'CCB-03', trigger: 'Blockchain anchor backlog >10,000 pending', action: 'Throttle highest-volume tenant. Prioritize settlement anchors.' },
        { id: 'CCB-04', trigger: 'Settlement netting >$1M cross-tenant counterparty chain', action: 'Netting suspended. Gross settlement mode activated.' },
        { id: 'CCB-05', trigger: 'Carbon certificate from single registry >60% platform volume + dispute', action: 'Affected certificates frozen. Non-affected continues.' },
    ],
};

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

class CrossTenantContagionEngine {

    /**
     * Simulate contagion with provided connections (v1 — unchanged)
     */
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

    // ═══════════════════════════════════════════════════════════════
    // v2.0: DB-BACKED SIMULATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Simulate contagion from a real tenant using DB relationships
     */
    async simulateFromDB(sourceTenantId, trustDrop = 40) {
        // Get real tenant relationships from scm_partners
        const relationships = await db.all(`
            SELECT DISTINCT
                p.org_id as tenant_id,
                o.name as tenant_name,
                p.partner_type as relationship,
                p.trust_score,
                COUNT(*) OVER (PARTITION BY p.org_id) as connection_strength
            FROM scm_partners p
            JOIN organizations o ON o.id = p.org_id
            WHERE p.partner_name IN (
                SELECT o2.name FROM organizations o2 WHERE o2.id = $1
            )
            AND p.org_id != $1
            LIMIT 50
        `, [sourceTenantId]);

        if (relationships.length === 0) {
            return { source: sourceTenantId, trust_drop: trustDrop, affected: [], message: 'No cross-tenant relationships found' };
        }

        const model = TRUST_CONTAGION.propagation_model;
        const affected = relationships.map(rel => {
            const relType = rel.relationship === 'supplier' ? 'Direct supplier/buyer' : 'Same industry/sector';
            const edgeWeight = model.edge_weights.find(e => e.relationship === relType)?.weight || 0.2;
            const impact = trustDrop * edgeWeight;
            const severity = this._getSeverity(impact);

            return {
                tenant_id: rel.tenant_id,
                tenant_name: rel.tenant_name,
                relationship: rel.relationship,
                connection_strength: parseInt(rel.connection_strength),
                trust_impact_pct: Math.round(impact * 10) / 10,
                severity,
                action: TRUST_CONTAGION.severity_thresholds[severity]?.action || 'None',
            };
        });

        // Log contagion event
        const eventId = uuidv4();
        for (const a of affected.filter(a => a.trust_impact_pct > 5)) {
            await db.run(`
                INSERT INTO contagion_events (id, source_tenant, affected_tenant, trust_drop_pct, contagion_impact_pct, severity, action_taken, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                uuidv4(), sourceTenantId, a.tenant_id, trustDrop, a.trust_impact_pct,
                a.severity, a.action,
                JSON.stringify({ simulation_id: eventId, relationship: a.relationship }),
            ]);
        }

        const highSeverity = affected.filter(a => ['high', 'critical'].includes(a.severity));
        const circuitBreaker = highSeverity.length >= 5 ? 'CCB-01' : null;

        return {
            simulation_id: eventId,
            source_tenant: sourceTenantId,
            trust_drop_pct: trustDrop,
            affected: affected.sort((a, b) => b.trust_impact_pct - a.trust_impact_pct),
            total_affected: affected.filter(a => a.trust_impact_pct > 5).length,
            high_severity_count: highSeverity.length,
            circuit_breaker_triggered: circuitBreaker,
            simulated_at: new Date().toISOString(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: CONTAGION HISTORY (AUDIT LOG)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get contagion event history for a tenant (as source or affected)
     */
    async getContagionHistory(tenantId, options = {}) {
        const limit = options.limit || 50;
        const days = options.days || 90;

        const asSource = await db.all(`
            SELECT * FROM contagion_events
            WHERE source_tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'
            ORDER BY created_at DESC LIMIT $2
        `, [tenantId, limit]);

        const asAffected = await db.all(`
            SELECT * FROM contagion_events
            WHERE affected_tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'
            ORDER BY created_at DESC LIMIT $2
        `, [tenantId, limit]);

        return {
            tenant_id: tenantId,
            period_days: days,
            as_source: {
                count: asSource.length,
                events: asSource.map(e => ({
                    id: e.id, affected_tenant: e.affected_tenant,
                    trust_drop: parseFloat(e.trust_drop_pct), impact: parseFloat(e.contagion_impact_pct),
                    severity: e.severity, date: e.created_at,
                })),
            },
            as_affected: {
                count: asAffected.length,
                events: asAffected.map(e => ({
                    id: e.id, source_tenant: e.source_tenant,
                    trust_drop: parseFloat(e.trust_drop_pct), impact: parseFloat(e.contagion_impact_pct),
                    severity: e.severity, date: e.created_at,
                })),
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: PLATFORM-WIDE CONTAGION DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get platform-wide contagion state and risk metrics
     */
    async getContagionDashboard() {
        const stats = await db.get(`
            SELECT
                COUNT(*) as total_events,
                COUNT(DISTINCT source_tenant) as unique_sources,
                COUNT(DISTINCT affected_tenant) as unique_affected,
                COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as high_severity_events,
                AVG(contagion_impact_pct) as avg_impact
            FROM contagion_events
            WHERE created_at > NOW() - INTERVAL '30 days'
        `);

        const topSources = await db.all(`
            SELECT source_tenant, COUNT(*) as event_count,
                   AVG(contagion_impact_pct) as avg_impact,
                   MAX(severity) as max_severity
            FROM contagion_events
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY source_tenant
            ORDER BY event_count DESC
            LIMIT 10
        `);

        const recentCritical = await db.all(`
            SELECT * FROM contagion_events
            WHERE severity IN ('high', 'critical') AND created_at > NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 10
        `);

        return {
            period: '30 days',
            total_events: parseInt(stats?.total_events || 0),
            unique_source_tenants: parseInt(stats?.unique_sources || 0),
            unique_affected_tenants: parseInt(stats?.unique_affected || 0),
            high_severity_events: parseInt(stats?.high_severity_events || 0),
            avg_impact_pct: Math.round(parseFloat(stats?.avg_impact || 0) * 10) / 10,
            risk_level: parseInt(stats?.high_severity_events || 0) > 10 ? 'critical'
                : parseInt(stats?.high_severity_events || 0) > 3 ? 'elevated' : 'normal',
            top_sources: topSources.map(s => ({
                tenant: s.source_tenant, events: parseInt(s.event_count),
                avg_impact: Math.round(parseFloat(s.avg_impact) * 10) / 10,
            })),
            recent_critical: recentCritical.map(e => ({
                id: e.id, source: e.source_tenant, affected: e.affected_tenant,
                impact: parseFloat(e.contagion_impact_pct), severity: e.severity, date: e.created_at,
            })),
            circuit_breakers: CONTAGION_BREAKERS.breakers,
            generated_at: new Date().toISOString(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // STATIC GETTERS (unchanged from v1)
    // ═══════════════════════════════════════════════════════════════

    getTrustContagion() { return TRUST_CONTAGION; }
    getSharedRouteRisk() { return SHARED_ROUTE_RISK; }
    getContagionBreakers() { return CONTAGION_BREAKERS; }

    getFullFramework() {
        return {
            title: 'Cross-Tenant Contagion Modeling — Critical Infrastructure-Grade',
            version: '2.0',
            trust_contagion: TRUST_CONTAGION,
            shared_route_risk: SHARED_ROUTE_RISK,
            contagion_breakers: CONTAGION_BREAKERS,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════

    _getSeverity(impactPct) {
        const thresholds = TRUST_CONTAGION.severity_thresholds;
        let severity = 'negligible';
        for (const [key, val] of Object.entries(thresholds)) {
            if (impactPct >= val.trust_drop_pct) severity = key;
        }
        return severity;
    }
}

module.exports = new CrossTenantContagionEngine();
