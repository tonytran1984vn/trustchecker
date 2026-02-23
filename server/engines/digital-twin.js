const { safeParse } = require('../utils/safe-json');
/**
 * TrustChecker Digital Twin Engine
 * Virtual supply chain model with real-time state, KPI computation,
 * anomaly detection, and scenario simulation
 */

class DigitalTwin {
    /**
     * Build the current twin state from live data
     */
    buildModel(data = {}) {
        const { partners = [], products = [], batches = [], shipments = [], inventory = [], events = [], seals = [] } = data;

        // Node layer — all supply chain actors
        const nodes = partners.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type || 'partner',
            country: p.country,
            trust_score: p.trust_score || 50,
            status: p.status || 'active',
            inventory_level: inventory.filter(i => i.partner_id === p.id).reduce((s, i) => s + i.quantity, 0)
        }));

        // Edge layer — flows between nodes
        const edges = [];
        const flowMap = {};
        shipments.forEach(s => {
            const key = `${s.from_partner_id}→${s.to_partner_id}`;
            if (!flowMap[key]) flowMap[key] = { count: 0, volume: 0, delays: 0 };
            flowMap[key].count++;
            if (s.status === 'delivered' && s.actual_delivery && s.estimated_delivery) {
                if (new Date(s.actual_delivery) > new Date(s.estimated_delivery)) flowMap[key].delays++;
            }
        });
        for (const [key, stats] of Object.entries(flowMap)) {
            const [from, to] = key.split('→');
            edges.push({
                from_node: from,
                to_node: to,
                shipment_count: stats.count,
                delay_rate: stats.count > 0 ? Math.round(stats.delays / stats.count * 100) : 0,
                reliability: stats.count > 0 ? Math.round((1 - stats.delays / stats.count) * 100) : 100
            });
        }

        // State summary
        const inTransit = shipments.filter(s => s.status === 'in_transit');
        const totalInventory = inventory.reduce((s, i) => s + i.quantity, 0);
        const lowStockCount = inventory.filter(i => i.quantity <= (i.min_stock || 10)).length;

        return {
            type: 'DigitalTwin',
            version: '1.0',
            snapshot_time: new Date().toISOString(),
            topology: {
                nodes: nodes.length,
                edges: edges.length,
                node_details: nodes,
                edge_details: edges
            },
            state: {
                products_tracked: products.length,
                batches_active: batches.filter(b => b.status !== 'completed').length,
                batches_total: batches.length,
                shipments_in_transit: inTransit.length,
                total_inventory_units: totalInventory,
                low_stock_alerts: lowStockCount,
                blockchain_seals: seals.length,
                total_events: events.length
            },
            health: {
                overall: lowStockCount === 0 && inTransit.length < 20 ? 'healthy' : lowStockCount > 5 ? 'critical' : 'warning',
                inventory: lowStockCount === 0 ? 'optimal' : lowStockCount <= 3 ? 'stress' : 'critical',
                logistics: inTransit.length < 10 ? 'flowing' : inTransit.length < 30 ? 'congested' : 'blocked',
                integrity: seals.length > 0 ? 'blockchain_verified' : 'unverified'
            }
        };
    }

    /**
     * Compute KPIs (Key Performance Indicators) for the supply chain
     */
    computeKPIs(data = {}) {
        const { shipments = [], inventory = [], events = [], batches = [], orders = [] } = data;

        // 1. Perfect Order Rate (orders delivered on-time, in-full, damage-free)
        const deliveredShipments = shipments.filter(s => s.status === 'delivered');
        const onTime = deliveredShipments.filter(s =>
            s.actual_delivery && s.estimated_delivery &&
            new Date(s.actual_delivery) <= new Date(s.estimated_delivery)
        );
        const perfectOrderRate = deliveredShipments.length > 0
            ? Math.round(onTime.length / deliveredShipments.length * 100)
            : 0;

        // 2. Fill Rate (orders fulfilled from available inventory)
        const totalDemand = inventory.reduce((s, i) => s + (i.max_stock || 100), 0);
        const totalStock = inventory.reduce((s, i) => s + i.quantity, 0);
        const fillRate = totalDemand > 0 ? Math.min(100, Math.round(totalStock / totalDemand * 100)) : 0;

        // 3. Cycle Time (avg time from order to delivery)
        let avgCycleTime = 0;
        if (deliveredShipments.length > 0) {
            const cycleTimes = deliveredShipments
                .filter(s => s.actual_delivery && s.created_at)
                .map(s => (new Date(s.actual_delivery) - new Date(s.created_at)) / (24 * 3600 * 1000));
            avgCycleTime = cycleTimes.length > 0
                ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length * 10) / 10
                : 0;
        }

        // 4. Inventory Turnover (estimated from events)
        const totalEvents = events.filter(e => e.event_type === 'sell' || e.event_type === 'ship').length;
        const avgInventory = totalStock / Math.max(inventory.length, 1);
        const turnover = avgInventory > 0 ? Math.round(totalEvents / avgInventory * 100) / 100 : 0;

        // 5. GMROI (Gross Margin Return on Inventory Investment)
        const estimatedRevenue = totalEvents * 50; // $50 estimated per event
        const inventoryValue = totalStock * 30; // $30 estimated per unit
        const gmroi = inventoryValue > 0 ? Math.round(estimatedRevenue / inventoryValue * 100) / 100 : 0;

        // 6. Supply Chain Velocity
        const eventsLast7Days = events.filter(e => {
            const d = new Date(e.created_at);
            return d > new Date(Date.now() - 7 * 24 * 3600 * 1000);
        }).length;
        const velocity = Math.round(eventsLast7Days / 7 * 10) / 10;

        // 7. Blockchain Integrity Index
        const sealedEvents = events.filter(e => e.blockchain_seal_id).length;
        const integrityIndex = events.length > 0 ? Math.round(sealedEvents / events.length * 100) : 0;

        return {
            kpis: {
                perfect_order_rate: { value: perfectOrderRate, unit: '%', benchmark: 95, status: perfectOrderRate >= 95 ? 'excellent' : perfectOrderRate >= 80 ? 'good' : 'needs_improvement' },
                fill_rate: { value: fillRate, unit: '%', benchmark: 98, status: fillRate >= 98 ? 'excellent' : fillRate >= 85 ? 'good' : 'needs_improvement' },
                avg_cycle_time: { value: avgCycleTime, unit: 'days', benchmark: 3, status: avgCycleTime <= 3 ? 'excellent' : avgCycleTime <= 7 ? 'good' : 'needs_improvement' },
                inventory_turnover: { value: turnover, unit: 'x', benchmark: 6, status: turnover >= 6 ? 'excellent' : turnover >= 3 ? 'good' : 'needs_improvement' },
                gmroi: { value: gmroi, unit: 'ratio', benchmark: 2, status: gmroi >= 2 ? 'excellent' : gmroi >= 1 ? 'good' : 'needs_improvement' },
                sc_velocity: { value: velocity, unit: 'events/day', benchmark: 10, status: velocity >= 10 ? 'high' : velocity >= 3 ? 'normal' : 'low' },
                blockchain_integrity: { value: integrityIndex, unit: '%', benchmark: 90, status: integrityIndex >= 90 ? 'excellent' : integrityIndex >= 50 ? 'partial' : 'low' }
            },
            overall_score: Math.round((perfectOrderRate + fillRate + integrityIndex) / 3),
            data_points: { shipments: shipments.length, inventory_items: inventory.length, events: events.length, batches: batches.length },
            computed_at: new Date().toISOString()
        };
    }

    /**
     * Detect anomalies: discrepancies between twin model and reality
     */
    detectAnomalies(data = {}) {
        const { inventory = [], shipments = [], events = [] } = data;
        const anomalies = [];

        // Anomaly 1: Inventory below minimum stock
        inventory.filter(i => i.quantity <= (i.min_stock || 10)).forEach(i => {
            anomalies.push({
                type: 'inventory_critical',
                severity: i.quantity === 0 ? 'critical' : 'high',
                entity_type: 'inventory',
                entity_id: i.id,
                message: `Stock level (${i.quantity}) at or below minimum (${i.min_stock || 10})`,
                recommended_action: 'Trigger emergency replenishment order'
            });
        });

        // Anomaly 2: Shipments stuck in transit > 14 days
        shipments.filter(s => s.status === 'in_transit').forEach(s => {
            const daysInTransit = (Date.now() - new Date(s.created_at).getTime()) / (24 * 3600 * 1000);
            if (daysInTransit > 14) {
                anomalies.push({
                    type: 'shipment_stuck',
                    severity: daysInTransit > 30 ? 'critical' : 'high',
                    entity_type: 'shipment',
                    entity_id: s.id,
                    message: `Shipment stuck in transit for ${Math.round(daysInTransit)} days`,
                    recommended_action: 'Contact carrier and activate contingency plan'
                });
            }
        });

        // Anomaly 3: No events in last 24h (supply chain stalled)
        const recentEvents = events.filter(e =>
            new Date(e.created_at) > new Date(Date.now() - 24 * 3600 * 1000)
        ).length;
        if (events.length > 0 && recentEvents === 0) {
            anomalies.push({
                type: 'chain_stalled',
                severity: 'medium',
                entity_type: 'system',
                entity_id: 'global',
                message: 'No supply chain events recorded in the last 24 hours',
                recommended_action: 'Verify data ingestion pipeline and partner connectivity'
            });
        }

        // Anomaly 4: Inventory exceeding max stock (overstock)
        inventory.filter(i => i.quantity > (i.max_stock || 1000)).forEach(i => {
            anomalies.push({
                type: 'overstock',
                severity: 'medium',
                entity_type: 'inventory',
                entity_id: i.id,
                message: `Stock level (${i.quantity}) exceeds maximum (${i.max_stock || 1000})`,
                recommended_action: 'Review demand forecast and adjust procurement plan'
            });
        });

        return {
            total_anomalies: anomalies.length,
            by_severity: {
                critical: anomalies.filter(a => a.severity === 'critical').length,
                high: anomalies.filter(a => a.severity === 'high').length,
                medium: anomalies.filter(a => a.severity === 'medium').length
            },
            anomalies: anomalies.sort((a, b) => {
                const ord = { critical: 0, high: 1, medium: 2, low: 3 };
                return (ord[a.severity] || 3) - (ord[b.severity] || 3);
            }),
            checked_at: new Date().toISOString()
        };
    }

    /**
     * Simulate a disruption scenario on the twin
     */
    simulateDisruption(model, scenario) {
        const { type, target_id, duration_days = 7 } = scenario;
        const clone = safeParse(JSON.stringify(model));

        switch (type) {
            case 'node_offline': {
                const node = clone.topology.node_details.find(n => n.id === target_id);
                if (node) {
                    node.status = 'offline';
                    node.trust_score = Math.max(0, node.trust_score - 30);
                    // Calculate downstream impact
                    const affectedEdges = clone.topology.edge_details.filter(e => e.from_node === target_id || e.to_node === target_id);
                    return {
                        disrupted_node: node.name,
                        affected_connections: affectedEdges.length,
                        estimated_impact: {
                            shipments_delayed: affectedEdges.reduce((s, e) => s + e.shipment_count, 0),
                            recovery_days: duration_days,
                            alternative_routes: clone.topology.edge_details.length - affectedEdges.length
                        },
                        modified_model: clone
                    };
                }
                return { error: 'Target node not found' };
            }
            case 'capacity_reduction': {
                clone.state.total_inventory_units = Math.round(clone.state.total_inventory_units * 0.5);
                clone.health.overall = 'stress';
                return {
                    type: 'capacity_reduction',
                    inventory_reduced_to: clone.state.total_inventory_units,
                    days_of_stock: Math.round(clone.state.total_inventory_units / Math.max(clone.state.products_tracked, 1)),
                    modified_model: clone
                };
            }
            default:
                return { error: 'Unknown disruption type', supported: ['node_offline', 'capacity_reduction'] };
        }
    }
}

module.exports = new DigitalTwin();
