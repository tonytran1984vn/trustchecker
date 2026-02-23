/**
 * TrustChecker — Systemic Risk Simulation Lab v1.0
 * MARKET-GRADE RISK MODELING
 * 
 * Infrastructure that cannot simulate systemic risk
 * cannot position itself as market-grade.
 * 
 * This engine provides:
 *   - Network contagion modeling (trust/risk propagation)
 *   - Supply chain shock simulation
 *   - Carbon fraud cascade simulation
 *   - Multi-node failure stress test
 *   - Monte Carlo risk scenarios
 * 
 * Inspired by: BIS stress testing, EU DORA, Federal Reserve CCAR
 */

const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// 1. NETWORK CONTAGION MODEL
// ═══════════════════════════════════════════════════════════════════

const CONTAGION_MODEL = {
    title: 'Trust/Risk Contagion — How Failure Propagates',

    propagation_rules: {
        direct_exposure: {
            description: 'Entity A fails → Entity B with direct relationship is impacted',
            transmission_rate: 0.60,  // 60% of impact transmitted
            decay_per_hop: 0.40,     // Each subsequent hop reduces impact by 40%
        },
        indirect_exposure: {
            description: 'Entity A fails → shared suppliers/customers affected',
            transmission_rate: 0.25,
            decay_per_hop: 0.50,
        },
        reputational_contagion: {
            description: 'Fraud at one node → trust erosion across similar nodes',
            transmission_rate: 0.15,
            decay_per_hop: 0.60,
            applies_to: 'same_sector_or_region',
        },
    },

    containment_mechanisms: [
        'Circuit breaker: auto-isolate node if trust score drops > 30 points in 24h',
        'Fire wall: sector/region isolation prevents cross-domain contagion',
        'Early warning: contagion simulation runs nightly on top-20 connected entities',
        'Quarantine: affected nodes enter read-only mode until investigation complete',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. SUPPLY CHAIN SHOCK SCENARIOS
// ═══════════════════════════════════════════════════════════════════

const SUPPLY_CHAIN_SHOCKS = {
    scenarios: [
        {
            id: 'SC-01',
            name: 'Critical Supplier Failure',
            description: 'Tier-1 supplier with 15+ downstream dependents goes offline',
            parameters: { supplier_connectivity: 15, offline_days: 14 },
            cascading_effects: ['Product verification halted', 'Carbon certificates delayed', 'Trust scores degraded'],
            estimated_impact: { affected_entities_pct: 25, revenue_loss_pct: 8 },
        },
        {
            id: 'SC-02',
            name: 'Port Blockage / Logistics Freeze',
            description: 'Major port closure disrupts 40% of tracked shipments',
            parameters: { shipments_blocked_pct: 40, duration_days: 21 },
            cascading_effects: ['Scan verification volume drops 40%', 'Carbon offset timing mismatch', 'SLA breach cascade'],
            estimated_impact: { affected_entities_pct: 35, revenue_loss_pct: 15 },
        },
        {
            id: 'SC-03',
            name: 'Pandemic — Regional Lockdown',
            description: 'AP-SE region lockdown: factories idle, inspectors unavailable',
            parameters: { region: 'AP-SE', lockdown_weeks: 8 },
            cascading_effects: ['Verification backlog', 'Carbon reporting gap', 'Validator node concentration shift'],
            estimated_impact: { affected_entities_pct: 20, revenue_loss_pct: 12 },
        },
        {
            id: 'SC-04',
            name: 'Trade War Escalation',
            description: 'US-China trade restrictions expand to carbon credits',
            parameters: { restricted_corridors: ['US-CN', 'CN-EU'], tariff_pct: 25 },
            cascading_effects: ['Cross-border carbon settlement frozen', 'Geographic rebalancing', 'New compliance requirements'],
            estimated_impact: { affected_entities_pct: 30, revenue_loss_pct: 18 },
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. CARBON FRAUD CASCADE MODEL
// ═══════════════════════════════════════════════════════════════════

const CARBON_FRAUD_CASCADE = {
    title: 'Carbon Fraud Cascade — How One Fraudulent Batch Contaminates',

    cascade_stages: [
        {
            stage: 1,
            name: 'Initial Detection',
            trigger: 'Fraudulent carbon credit batch identified (false offset claim)',
            immediate_actions: ['Freeze batch', 'Suspend issuer', 'Alert registry'],
            time_hours: 0,
        },
        {
            stage: 2,
            name: 'First-Order Contamination',
            trigger: 'Buyers of fraudulent batch identified',
            actions: ['Notify all buyers', 'Freeze buyer carbon portfolios for audit', 'Recalculate affected trust scores'],
            affected_entities: 'Direct buyers (typically 5-20)',
            time_hours: 24,
        },
        {
            stage: 3,
            name: 'Second-Order Contamination',
            trigger: 'Companies who claimed offsets using the fraudulent credits',
            actions: ['Regulatory notification (EU ETS)', 'Financial restatement required', 'Insurance claim triggered'],
            affected_entities: 'Offset claimants + their auditors',
            time_hours: 72,
        },
        {
            stage: 4,
            name: 'Market Confidence Impact',
            trigger: 'Public disclosure of fraud',
            actions: ['Market-wide carbon credit price depression', 'Enhanced verification for all pending batches', 'Regulatory hearing'],
            affected_entities: 'Entire carbon credit market on platform',
            time_hours: 168, // 1 week
        },
        {
            stage: 5,
            name: 'Resolution & Recovery',
            trigger: 'Root cause confirmed, compensation distributed',
            actions: ['Insurance payout', 'Reserve pool activated', 'New verification rules implemented', 'Post-mortem published'],
            time_hours: 720, // 30 days
        },
    ],

    financial_impact_model: {
        direct_loss: 'Value of fraudulent batch (covered by settlement bond)',
        indirect_loss: 'Market confidence → 5-15% volume reduction for 3 months',
        regulatory_fine: '$50K-$500K depending on jurisdiction',
        insurance_coverage: 'Carbon Settlement Bond ($2M cap)',
        platform_exposure: 'Net: batch value - insurance - reserve = residual risk',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. MULTI-NODE FAILURE MODEL
// ═══════════════════════════════════════════════════════════════════

const NODE_FAILURE_MODEL = {
    scenarios: [
        {
            id: 'NF-01',
            name: 'Single Node Failure',
            config: { failed_nodes: 1, total_nodes: 7 },
            consensus_impact: 'None — BFT tolerates f=2 failures',
            service_impact: 'Minimal — load redistributed',
            recovery: 'Auto peer takeover < 5 minutes',
        },
        {
            id: 'NF-02',
            name: 'Dual Node Failure',
            config: { failed_nodes: 2, total_nodes: 7 },
            consensus_impact: 'None — still above 2f+1 quorum (5/7)',
            service_impact: 'Low — regional latency increase if same-region nodes',
            recovery: 'Manual intervention recommended within 1 hour',
        },
        {
            id: 'NF-03',
            name: 'Critical Threshold (f+1)',
            config: { failed_nodes: 3, total_nodes: 7 },
            consensus_impact: 'DANGER — at minimum quorum (4/7). One more failure = halt.',
            service_impact: 'Degraded — verification latency doubles',
            recovery: 'Immediate escalation to ORANGE crisis level',
        },
        {
            id: 'NF-04',
            name: 'Consensus Loss',
            config: { failed_nodes: 4, total_nodes: 7 },
            consensus_impact: 'HALTED — below 2f+1 threshold. No verification possible.',
            service_impact: 'Platform-wide verification freeze',
            recovery: 'RED crisis level — emergency node activation protocol',
        },
        {
            id: 'NF-05',
            name: 'Byzantine Failure',
            config: { failed_nodes: 3, total_nodes: 7, byzantine: true },
            consensus_impact: 'COMPROMISED — malicious majority possible',
            service_impact: 'All verifications suspect — halt and audit',
            recovery: 'BLACK crisis level — full network rebuild from trusted genesis',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 5. MONTE CARLO RISK ENGINE
// ═══════════════════════════════════════════════════════════════════

const MONTE_CARLO_CONFIG = {
    default_simulations: 10000,
    confidence_levels: [0.95, 0.99, 0.999],  // 95th, 99th, 99.9th percentile
    risk_factors: {
        revenue_volatility_pct: 20,           // σ = 20%
        default_probability_pct: 2,           // 2% chance per counterparty per year
        carbon_price_volatility_pct: 35,      // σ = 35% (high volatility asset)
        operational_loss_frequency: 0.1,      // 10% chance of major incident per quarter
        regulatory_shock_probability: 0.05,   // 5% per year
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class SystemicRiskLabEngine {

    simulateContagion(source_entity, initial_impact, network_size, avg_connections) {
        const results = [];
        let currentImpact = initial_impact;
        let affectedCount = 1;
        let hop = 0;

        const rules = CONTAGION_MODEL.propagation_rules;

        while (currentImpact > 0.01 && hop < 6) {
            hop++;
            const directSpread = Math.min(avg_connections, network_size - affectedCount);
            const transmitted = currentImpact * rules.direct_exposure.transmission_rate;
            const decayed = transmitted * (1 - rules.direct_exposure.decay_per_hop);

            affectedCount += directSpread;
            results.push({
                hop,
                impact_magnitude: parseFloat(currentImpact.toFixed(4)),
                entities_affected: Math.min(affectedCount, network_size),
                transmitted_impact: parseFloat(transmitted.toFixed(4)),
            });

            currentImpact = decayed;
        }

        const totalAffectedPct = (Math.min(affectedCount, network_size) / network_size) * 100;

        return {
            source: source_entity,
            initial_impact,
            network_size,
            hops: results,
            total_affected_entities: Math.min(affectedCount, network_size),
            total_affected_pct: parseFloat(totalAffectedPct.toFixed(1)),
            containment_recommendation: totalAffectedPct > 30 ? 'CIRCUIT BREAKER — isolate sector' : 'MONITOR — contained',
            containment_mechanisms: CONTAGION_MODEL.containment_mechanisms,
        };
    }

    simulateNodeFailure(scenario_id) {
        const scenario = NODE_FAILURE_MODEL.scenarios.find(s => s.id === scenario_id);
        if (!scenario) return { error: `Unknown scenario: ${scenario_id}` };

        const remaining = scenario.config.total_nodes - scenario.config.failed_nodes;
        const quorum_required = Math.floor(scenario.config.total_nodes * 2 / 3) + 1;

        return {
            ...scenario,
            remaining_nodes: remaining,
            quorum_required,
            quorum_met: remaining >= quorum_required,
            byzantine_tolerance: Math.floor((scenario.config.total_nodes - 1) / 3),
        };
    }

    runMonteCarloVaR(portfolio_usd, simulations) {
        const n = simulations || MONTE_CARLO_CONFIG.default_simulations;
        const losses = [];

        for (let i = 0; i < n; i++) {
            // Simple normal distribution approximation using Box-Muller
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

            // Revenue loss
            const revLoss = portfolio_usd * (MONTE_CARLO_CONFIG.risk_factors.revenue_volatility_pct / 100) * z;
            // Carbon price shock
            const carbonLoss = portfolio_usd * 0.15 * (MONTE_CARLO_CONFIG.risk_factors.carbon_price_volatility_pct / 100) * z;
            // Default event (Bernoulli)
            const defaultLoss = Math.random() < (MONTE_CARLO_CONFIG.risk_factors.default_probability_pct / 100) ? portfolio_usd * 0.15 * Math.random() : 0;
            // Operational loss (Bernoulli)
            const opsLoss = Math.random() < MONTE_CARLO_CONFIG.risk_factors.operational_loss_frequency ? portfolio_usd * 0.05 * Math.random() : 0;

            const totalLoss = Math.max(0, revLoss + carbonLoss + defaultLoss + opsLoss);
            losses.push(totalLoss);
        }

        losses.sort((a, b) => a - b);

        const results = {};
        for (const cl of MONTE_CARLO_CONFIG.confidence_levels) {
            const idx = Math.floor(n * cl);
            results[`VaR_${(cl * 100).toFixed(1)}pct`] = Math.round(losses[idx]);
        }

        const mean = losses.reduce((s, l) => s + l, 0) / n;
        const tail = losses.slice(Math.floor(n * 0.95));
        const es = tail.reduce((s, l) => s + l, 0) / tail.length;

        return {
            portfolio_usd,
            simulations: n,
            value_at_risk: results,
            expected_shortfall_95pct: Math.round(es),
            mean_loss: Math.round(mean),
            max_loss: Math.round(losses[losses.length - 1]),
            interpretation: {
                VaR_95: `With 95% confidence, losses will not exceed $${results['VaR_95.0pct'].toLocaleString()} in a given period`,
                VaR_99: `With 99% confidence, losses will not exceed $${results['VaR_99.0pct'].toLocaleString()}`,
                ES: `If losses exceed the 95th percentile, the average loss is $${Math.round(es).toLocaleString()}`,
            },
        };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getContagionModel() { return CONTAGION_MODEL; }
    getSupplyChainShocks() { return SUPPLY_CHAIN_SHOCKS; }
    getCarbonFraudCascade() { return CARBON_FRAUD_CASCADE; }
    getNodeFailureModel() { return NODE_FAILURE_MODEL; }
    getMonteCarloConfig() { return MONTE_CARLO_CONFIG; }

    getFullLab() {
        return {
            title: 'Systemic Risk Simulation Lab — Market Infrastructure Grade',
            version: '1.0',
            inspired_by: ['BIS Stress Testing', 'EU DORA', 'Federal Reserve CCAR'],
            models: {
                contagion: CONTAGION_MODEL,
                supply_chain: SUPPLY_CHAIN_SHOCKS,
                carbon_fraud: CARBON_FRAUD_CASCADE,
                node_failure: NODE_FAILURE_MODEL,
                monte_carlo: MONTE_CARLO_CONFIG,
            },
        };
    }
}

module.exports = new SystemicRiskLabEngine();
