/**
 * TrustChecker — Risk Intelligence Engine (AI-native)
 * Behavioral Risk Modeling + Fraud Graph + Link Analysis
 */
const crypto = require('crypto');

// Risk behavior patterns
const BEHAVIOR_PATTERNS = {
    route_gaming: { name: 'Route Optimization Gaming', weight: 0.25, description: 'Abnormal route changes timed with credit minting' },
    carbon_gaming: { name: 'Carbon Credit Gaming', weight: 0.20, description: 'Inflated baselines or fake reduction claims' },
    phantom_network: { name: 'Phantom Partner Network', weight: 0.20, description: 'Fake suppliers/carriers in trust graph' },
    velocity_anomaly: { name: 'Transaction Velocity Anomaly', weight: 0.15, description: 'Unusual shipment frequency patterns' },
    device_cluster: { name: 'Device Clustering', weight: 0.10, description: 'Multiple entities from same device/IP' },
    temporal_anomaly: { name: 'Temporal Anomaly', weight: 0.10, description: 'Activities outside business hours or clustered timestamps' }
};

class RiskGraphEngine {

    /**
     * Behavioral risk analysis for a tenant
     */
    analyzeBehavior(params) {
        const { shipments = [], credits = [], partners = [], scans = [], routes = [] } = params;
        const signals = [];
        let riskScore = 0;

        // Pattern 1: Route gaming — route changes spike before credit minting
        const routeChanges = routes.filter(r => r.mode_changed);
        const creditMints = credits.filter(c => c.status === 'minted');
        if (routeChanges.length > 0 && creditMints.length > 0) {
            const ratio = routeChanges.length / Math.max(shipments.length, 1);
            if (ratio > 0.6) {
                signals.push({ pattern: 'route_gaming', severity: 'high', score: 20, detail: `${Math.round(ratio * 100)}% of routes changed — correlated with ${creditMints.length} mints` });
                riskScore += 20;
            }
        }

        // Pattern 2: Carbon gaming — high reduction percentages
        const highReductions = credits.filter(c => c.reduction_pct > 85);
        if (highReductions.length > credits.length * 0.3 && credits.length > 3) {
            signals.push({ pattern: 'carbon_gaming', severity: 'critical', score: 25, detail: `${highReductions.length}/${credits.length} credits with >85% reduction — suspicious` });
            riskScore += 25;
        }

        // Pattern 3: Phantom network — partners with no real shipments
        const activePartners = new Set(shipments.map(s => s.partner_id).filter(Boolean));
        const phantomPartners = partners.filter(p => !activePartners.has(p.id));
        if (phantomPartners.length > partners.length * 0.4 && partners.length > 3) {
            signals.push({ pattern: 'phantom_network', severity: 'high', score: 20, detail: `${phantomPartners.length}/${partners.length} partners have zero shipments` });
            riskScore += 20;
        }

        // Pattern 4: Velocity anomaly — >50 shipments in 1 hour
        const hourBuckets = {};
        shipments.forEach(s => { const h = new Date(s.created_at || s.timestamp).toISOString().slice(0, 13); hourBuckets[h] = (hourBuckets[h] || 0) + 1; });
        const spikes = Object.entries(hourBuckets).filter(([_, c]) => c > 50);
        if (spikes.length > 0) {
            signals.push({ pattern: 'velocity_anomaly', severity: 'medium', score: 15, detail: `${spikes.length} hour(s) with >50 shipments` });
            riskScore += 15;
        }

        // Pattern 5: Device clustering
        const deviceMap = {};
        scans.forEach(s => { const d = s.device_id || s.fingerprint; if (d) deviceMap[d] = (deviceMap[d] || 0) + 1; });
        const hotDevices = Object.entries(deviceMap).filter(([_, c]) => c > 100);
        if (hotDevices.length > 0) {
            signals.push({ pattern: 'device_cluster', severity: 'medium', score: 10, detail: `${hotDevices.length} device(s) with >100 scans — possible automation` });
            riskScore += 10;
        }

        // Pattern 6: Temporal anomaly — >40% activity in off-hours (22:00–06:00)
        const offHours = shipments.filter(s => {
            const h = new Date(s.created_at || s.timestamp).getHours();
            return h >= 22 || h < 6;
        });
        if (offHours.length > shipments.length * 0.4 && shipments.length > 10) {
            signals.push({ pattern: 'temporal_anomaly', severity: 'low', score: 8, detail: `${Math.round(offHours.length / shipments.length * 100)}% off-hours activity` });
            riskScore += 8;
        }

        return {
            title: 'Behavioral Risk Analysis (AI-native)',
            risk_score: Math.min(100, riskScore),
            risk_level: riskScore >= 50 ? 'critical' : riskScore >= 30 ? 'high' : riskScore >= 15 ? 'medium' : 'low',
            signals,
            data_points: { shipments: shipments.length, credits: credits.length, partners: partners.length, scans: scans.length, routes: routes.length },
            recommendation: riskScore >= 50 ? 'BLOCK — Immediate investigation required' : riskScore >= 30 ? 'FLAG — Enhanced monitoring' : 'PASS',
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Fraud graph — link analysis between entities
     */
    buildFraudGraph(entities = [], relationships = []) {
        const nodes = entities.map(e => ({
            id: e.id || e.did,
            type: e.type || e.entity_type,
            label: e.name || e.id,
            risk_score: e.risk_score || 0,
            flags: e.flags || []
        }));

        const edges = relationships.map(r => ({
            source: r.from, target: r.to,
            type: r.type || 'associated',
            weight: r.weight || 1,
            suspicious: r.suspicious || false
        }));

        // Detect clusters (connected components)
        const adjacency = {};
        edges.forEach(e => {
            if (!adjacency[e.source]) adjacency[e.source] = [];
            if (!adjacency[e.target]) adjacency[e.target] = [];
            adjacency[e.source].push(e.target);
            adjacency[e.target].push(e.source);
        });

        const visited = new Set();
        const clusters = [];
        const dfs = (node, cluster) => {
            if (visited.has(node)) return;
            visited.add(node);
            cluster.push(node);
            (adjacency[node] || []).forEach(n => dfs(n, cluster));
        };
        Object.keys(adjacency).forEach(node => {
            if (!visited.has(node)) {
                const cluster = [];
                dfs(node, cluster);
                clusters.push(cluster);
            }
        });

        // Suspicious patterns
        const suspiciousEdges = edges.filter(e => e.suspicious);
        const highRiskNodes = nodes.filter(n => n.risk_score > 50);

        return {
            title: 'Fraud Graph Analysis',
            graph: { nodes: nodes.length, edges: edges.length, clusters: clusters.length },
            clusters: clusters.map((c, i) => ({ cluster_id: i + 1, size: c.length, members: c })),
            suspicious_links: suspiciousEdges.length,
            high_risk_nodes: highRiskNodes.length,
            risk_density: nodes.length > 0 ? Math.round(suspiciousEdges.length / edges.length * 100) || 0 : 0,
            topology: {
                avg_connections: nodes.length > 0 ? Math.round(edges.length * 2 / nodes.length * 10) / 10 : 0,
                max_cluster_size: clusters.length > 0 ? Math.max(...clusters.map(c => c.length)) : 0,
                isolated_nodes: nodes.filter(n => !adjacency[n.id] || adjacency[n.id].length === 0).length
            },
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Link analysis — detect hidden connections
     */
    detectHiddenLinks(entities = [], shipments = [], scans = []) {
        const links = [];

        // Shared device detection
        const deviceEntities = {};
        scans.forEach(s => {
            const device = s.device_id || s.fingerprint;
            if (!device) return;
            if (!deviceEntities[device]) deviceEntities[device] = new Set();
            deviceEntities[device].add(s.entity_id || s.product_id || s.partner_id);
        });

        Object.entries(deviceEntities).forEach(([device, entities]) => {
            if (entities.size > 1) {
                const arr = [...entities];
                for (let i = 0; i < arr.length; i++) {
                    for (let j = i + 1; j < arr.length; j++) {
                        links.push({ type: 'shared_device', entity_a: arr[i], entity_b: arr[j], device, risk: 'medium' });
                    }
                }
            }
        });

        // Shared route detection
        const routeEntities = {};
        shipments.forEach(s => {
            const route = `${s.origin}-${s.destination}`;
            if (!routeEntities[route]) routeEntities[route] = new Set();
            routeEntities[route].add(s.partner_id || s.carrier_id);
        });

        Object.entries(routeEntities).forEach(([route, partners]) => {
            if (partners.size > 3) {
                links.push({ type: 'route_concentration', route, entities: [...partners], count: partners.size, risk: 'low' });
            }
        });

        return {
            title: 'Hidden Link Analysis',
            total_links: links.length,
            by_type: {
                shared_device: links.filter(l => l.type === 'shared_device').length,
                route_concentration: links.filter(l => l.type === 'route_concentration').length
            },
            links: links.slice(0, 50),
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Cross-tenant fraud pattern detection (Super Admin)
     */
    detectCrossTenantPatterns(tenants = []) {
        const patterns = [];

        // Pattern: same device across tenants
        const globalDevices = {};
        tenants.forEach(t => {
            (t.devices || []).forEach(d => {
                if (!globalDevices[d]) globalDevices[d] = [];
                globalDevices[d].push(t.tenant_id);
            });
        });
        const sharedDevices = Object.entries(globalDevices).filter(([_, tenants]) => new Set(tenants).size > 1);
        if (sharedDevices.length > 0) {
            patterns.push({ type: 'cross_tenant_device', severity: 'critical', count: sharedDevices.length, detail: 'Same device used across multiple tenants' });
        }

        // Pattern: circular carbon credits
        const creditFlows = {};
        tenants.forEach(t => {
            (t.transfers || []).forEach(tr => {
                const key = `${tr.from}→${tr.to}`;
                creditFlows[key] = (creditFlows[key] || 0) + 1;
            });
        });
        const circular = Object.entries(creditFlows).filter(([key]) => {
            const [from, to] = key.split('→');
            return creditFlows[`${to}→${from}`] > 0;
        });
        if (circular.length > 0) {
            patterns.push({ type: 'circular_credits', severity: 'critical', count: circular.length, detail: 'Circular credit transfers between tenants' });
        }

        return {
            title: 'Cross-Tenant Fraud Detection',
            tenants_analyzed: tenants.length,
            patterns_found: patterns.length,
            patterns,
            risk_level: patterns.some(p => p.severity === 'critical') ? 'critical' : patterns.length > 0 ? 'medium' : 'low',
            analyzed_at: new Date().toISOString()
        };
    }

    getPatterns() { return BEHAVIOR_PATTERNS; }
}

module.exports = new RiskGraphEngine();
