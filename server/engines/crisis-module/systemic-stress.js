/**
 * TrustChecker — Systemic Stress & Simulation Engine v1.0
 * FINAL PILLAR 1: Full stress testing framework
 *
 * Has Monte Carlo VaR in RiskLab. But doesn't have:
 *   - Extreme scenario modelling (regulatory, market, technical)
 *   - AI adversarial attack simulation
 *   - Network collapse simulation
 *   - Decision latency governance (who decides how fast when Trust Graph drifts)
 *   - Combined stress cascade (multi-factor simultaneous)
 *
 * IPO-level: MANDATORY. Regulators require documented stress test framework.
 * L5 SOVEREIGN UPGRADE: Adds Temporal Engine, Non-Linear Damage, Autonomous Execution.
 * V3.2 GUARDRAILS: Deterministic Seed, Scenario Hash.
 */
const crypto = require('crypto');
const killSwitchEngine = require('../infrastructure/kill-switch-engine');
const riskMemoryEngine = require('./risk-memory');
const eventBus = require('../infrastructure/event-bus');

function mulberry32(a) {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ═══════════════════════════════════════════════════════════════════
// 1. EXTREME SCENARIO LIBRARY
// ═══════════════════════════════════════════════════════════════════

const EXTREME_SCENARIOS = {
    scenarios: [
        // MARKET SCENARIOS
        {
            id: 'ES-01',
            category: 'Market',
            name: 'Carbon Price Collapse',
            description: 'Voluntary carbon credit price drops 70% within 30 days',
            probability: 'Low (5%)',
            severity: 'Critical',
            impact: { revenue_loss_pct: 40, settlement_reserve_strain: 'High', counterparty_default_increase: '3x' },
            affected_systems: ['settlement-engine', 'realtime-car-engine', 'treasury-liquidity-engine'],
            cascading: [
                'Reserve drawdown → CAR decline → Settlement freeze if < 6%',
                'Counterparty defaults → contagion risk → additional reserve draws',
            ],
            expected_car_impact_pct: -8,
        },
        {
            id: 'ES-02',
            category: 'Market',
            name: 'Global Supply Chain Disruption',
            description: 'Major trade route disruption (war, pandemic) affecting 30%+ of tracked supply chains',
            probability: 'Medium (15%)',
            severity: 'High',
            impact: { verification_volume_drop_pct: 40, org_churn_pct: 10, revenue_loss_pct: 25 },
            affected_systems: ['scm-engine', 'trust-graph-engine', 'revenue-governance-engine'],
            cascading: [
                'Volume drop → revenue decline → incentive auto-stabilizer triggers',
                'Trust data gaps → scoring accuracy degraded → potential KS-03',
            ],
            expected_car_impact_pct: -4,
        },
        // TECHNICAL SCENARIOS
        {
            id: 'ES-03',
            category: 'Technical',
            name: 'Cloud Provider Regional Failure',
            description: 'Primary cloud region (GCP europe-west1) offline for 72 hours',
            probability: 'Low (2%)',
            severity: 'Critical',
            impact: { service_downtime_hours: 4, data_recovery_time_hours: 2, sla_breach_pct: 60 },
            affected_systems: ['jurisdictional-risk-engine', 'kill-switch-engine'],
            cascading: [
                'SLA breach → credit provisions → cash flow impact',
                'If DR not activated in 4h → KS-01 Network Freeze',
            ],
            expected_car_impact_pct: -2,
        },
        {
            id: 'ES-04',
            category: 'Technical',
            name: 'Database Corruption',
            description: 'PostgreSQL primary corruption affecting trust score and audit tables',
            probability: 'Very Low (1%)',
            severity: 'Critical',
            impact: { data_loss_window_hours: 1, trust_score_recalculation_hours: 24, audit_integrity: 'Compromised' },
            affected_systems: ['trust-graph-engine', 'constitutional-audit-engine', 'ivu-engine'],
            cascading: [
                'Hash-chain integrity broken → BLACK alert → full network freeze',
                'Trust scores invalid → KS-03 Scoring Freeze → manual verification fallback',
            ],
            expected_car_impact_pct: -1,
        },
        // REGULATORY SCENARIOS
        {
            id: 'ES-05',
            category: 'Regulatory',
            name: 'Multi-Jurisdiction License Revocation',
            description: 'Settlement GmbH BaFin license suspended + MAS inquiry into SG entity',
            probability: 'Very Low (2%)',
            severity: 'Existential',
            impact: { settlement_halt: true, regulatory_timeline_months: 6, revenue_loss_pct: 60 },
            affected_systems: ['legal-entity-engine', 'regulatory-scenario-engine', 'kill-switch-engine'],
            cascading: [
                'KS-05 Settlement Freeze immediate',
                'CAR under pressure → emergency capital call',
                'IPO timeline: delayed 12-24 months minimum',
            ],
            expected_car_impact_pct: -15,
        },
        // ADVERSARIAL & SECURITY SCENARIOS
        {
            id: 'ES-06',
            category: 'Security',
            name: 'Credential Compromise (Admin Takeover)',
            description:
                'Super admin credentials compromised leading to unauthorized policy changes and data exfiltration',
            probability: 'Low (5%)',
            severity: 'Critical',
            impact: { data_exposure: 'High', compliance_breach: true, revenue_loss_pct: 15 },
            affected_systems: ['identity-access-engine', 'policy-engine', 'audit-engine'],
            cascading: [
                'Unauthorized policy changes → KS-02 Governance Freeze',
                'Data exfiltration → regulatory notification required',
            ],
            expected_car_impact_pct: -5,
        },
        {
            id: 'ES-07',
            category: 'Adversarial',
            name: 'AI Model Poisoning Attack',
            description: 'Coordinated data poisoning targeting Trust Score model — injecting false verification data',
            probability: 'Medium (10%)',
            severity: 'High',
            impact: { affected_scores_pct: 15, false_positive_increase: '5x', detection_time_hours: 4 },
            affected_systems: ['ivu-engine', 'trust-graph-engine', 'model-risk-tiering-engine'],
            cascading: [
                'Model drift detected → KS-03 Scoring Freeze auto-trigger',
                'If undetected >24h → trust erosion → org churn risk',
            ],
            mitigation: [
                'Continuous model monitoring (drift detection <2σ)',
                'Input validation + anomaly detection on verification data',
            ],
        },
        {
            id: 'ES-08',
            category: 'Adversarial',
            name: 'Coordinated DDoS + Exploit',
            description: 'Volumetric DDoS to mask targeted API exploit on settlement endpoints',
            probability: 'Medium (15%)',
            severity: 'High',
            impact: {
                service_degradation_hours: 2,
                potential_data_exposure: 'Settlement data',
                financial_loss_usd: 100000,
            },
            affected_systems: ['kill-switch-engine', 'api-security'],
            cascading: [
                'Rate limiter → circuit breaker CB-08',
                'If exploit succeeds → KS-05 Settlement Freeze',
                'Insurance claim for cyber event',
            ],
        },

        // FINANCIAL / BILLING ROADBLOCKS
        {
            id: 'ES-10',
            category: 'Financial',
            name: 'Payment Gateway Failure',
            description: 'Stripe integration offline for 48 hours causing mass billing failures and false churn',
            probability: 'Medium (10%)',
            severity: 'High',
            impact: { revenue_collection_delayed_pct: 40, false_churn_events: 1500, customer_support_load: 'Extreme' },
            affected_systems: ['billing-engine', 'subscription-manager'],
            cascading: [
                'Failed billings → auto-downgrade logic triggered incorrectly',
                'Customer panic → trust erosion',
            ],
            expected_car_impact_pct: -2,
        },

        // PRODUCT / MODEL FAILURES
        {
            id: 'ES-13',
            category: 'Model',
            name: 'Model Drift (ERQF Regression)',
            description: 'ERQF scoring algorithm deviates >3σ from baseline over 3 months, degrading accuracy',
            probability: 'Medium (15%)',
            severity: 'High',
            impact: {
                scoring_accuracy_drop_pct: 25,
                false_positive_flagging: 'High',
                institutional_trust_loss: 'Severe',
            },
            affected_systems: ['trust-graph-engine', 'erqf-model', 'ivu-engine'],
            cascading: [
                'Inaccurate scores → mispriced risk for enterprise clients',
                'Institutional clients trigger SLA exit clauses',
            ],
            expected_car_impact_pct: -10,
        },

        // HUMAN / GOVERNANCE RISK
        {
            id: 'ES-18',
            category: 'Governance',
            name: 'Misconfigured Policy (Admin Error)',
            description:
                'Platform admin accidentally commits a global settlement block rule via poorly scoped feature flag',
            probability: 'Medium (20%)',
            severity: 'Critical',
            impact: { platform_downtime_hours: 3, settlement_queue_backlog: 50000, revenue_loss_pct: 5 },
            affected_systems: ['policy-engine', 'feature-gate-engine', 'settlement-engine'],
            cascading: [
                'Legitimate transactions blocked → SLA penalties triggered',
                'Manual overrides required → decision latency spikes',
                'KS-02 Governance Freeze activated',
            ],
            expected_car_impact_pct: -3,
        },

        // COMBINED CASCADING
        {
            id: 'ES-21',
            category: 'Combined',
            name: 'Perfect Storm: Market + Regulatory + Technical',
            description: 'Simultaneous: carbon price -50%, EU regulatory freeze, 40% validators offline',
            probability: 'Very Low (0.5%)',
            severity: 'Existential',
            impact: { revenue_loss_pct: 70, settlement_halt: true, network_degraded: true },
            affected_systems: ['ALL — every engine affected'],
            cascading: [
                'CAR collapses → KS-05',
                'LCR collapses → waterfall full stress',
                'Network degraded → KS-04',
                'Revenue stabilizer → maximum stress',
                'Board + regulatory notification → L5 escalation',
            ],
            expected_car_impact_pct: -25,
            survival_plan: 'Capital Reserve Trust (bankruptcy-remote) + insurance + orderly wind-down protocol',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. DECISION LATENCY GOVERNANCE
// ═══════════════════════════════════════════════════════════════════

const DECISION_LATENCY = {
    title: 'Decision Latency Governance — Who decides, how fast, when Trust Graph drifts',
    principle: 'Every critical event has a maximum decision time. Exceeding it = automatic escalation.',

    events: [
        {
            event: 'Trust Graph drift detected (>2σ)',
            tier: 'T1 — Auto-response',
            decision_path: [
                { step: 1, action: 'AI auto-flags anomaly', max_time: '< 1 second', authority: 'System', human: false },
                {
                    step: 2,
                    action: 'KS-03 Scoring Freeze evaluated',
                    max_time: '< 5 seconds',
                    authority: 'Circuit breaker CB-03',
                    human: false,
                },
                {
                    step: 3,
                    action: 'If breach confirmed → scores frozen at T-1',
                    max_time: '< 10 seconds',
                    authority: 'Auto-enforce',
                    human: false,
                },
                {
                    step: 4,
                    action: 'Risk Committee notified',
                    max_time: '< 15 minutes',
                    authority: 'Alert system',
                    human: false,
                },
                {
                    step: 5,
                    action: 'Risk Committee review + decision',
                    max_time: '< 4 hours',
                    authority: 'Risk Committee',
                    human: true,
                },
                {
                    step: 6,
                    action: 'IVU validator review if scoring methodology involved',
                    max_time: '< 24 hours',
                    authority: 'IVU validator team',
                    human: true,
                },
            ],
            ivu_can_block: true,
            ceo_can_override: false,
            rationale: 'Scoring integrity is constitutional. CEO cannot override; only Risk + IVU can unfreeze.',
        },
        {
            event: 'Settlement failure rate spike (>5%)',
            tier: 'T1 — Auto-response + Human',
            decision_path: [
                {
                    step: 1,
                    action: 'Circuit breaker CB-02 evaluates',
                    max_time: '< 1 second',
                    authority: 'System',
                    human: false,
                },
                {
                    step: 2,
                    action: 'KS-05 Settlement Freeze if threshold met',
                    max_time: '< 5 seconds',
                    authority: 'Auto-enforce',
                    human: false,
                },
                {
                    step: 3,
                    action: 'CTO + Risk notified',
                    max_time: '< 5 minutes',
                    authority: 'Alert system',
                    human: false,
                },
                {
                    step: 4,
                    action: 'Root cause analysis begin',
                    max_time: '< 1 hour',
                    authority: 'Engineering + Risk',
                    human: true,
                },
            ],
            ivu_can_block: false,
            ceo_can_override: false,
        },
        {
            event: 'Revenue decline crosses -30% threshold',
            tier: 'T2 — Human-driven with auto-assist',
            decision_path: [
                {
                    step: 1,
                    action: 'Revenue stabilizer RS-02 auto-applies',
                    max_time: '< 1 minute',
                    authority: 'Integration locking engine',
                    human: false,
                },
                {
                    step: 2,
                    action: 'GGC emergency session scheduled',
                    max_time: '< 48 hours',
                    authority: 'GGC Chair',
                    human: true,
                },
                {
                    step: 3,
                    action: 'Cost reduction plan required',
                    max_time: '< 14 days',
                    authority: 'CFO + operating entity',
                    human: true,
                },
                {
                    step: 4,
                    action: 'Board updated',
                    max_time: '< 30 days',
                    authority: 'Board reporting cycle',
                    human: true,
                },
            ],
            ivu_can_block: false,
            ceo_can_override: false,
        },
        {
            event: 'Regulatory inquiry received',
            tier: 'T2 — Human-driven',
            decision_path: [
                {
                    step: 1,
                    action: 'Compliance Officer acknowledges',
                    max_time: '< 4 hours',
                    authority: 'Compliance',
                    human: true,
                },
                {
                    step: 2,
                    action: 'Legal counsel engaged',
                    max_time: '< 24 hours',
                    authority: 'Legal + Compliance',
                    human: true,
                },
                {
                    step: 3,
                    action: 'GGC + Board notified',
                    max_time: '< 48 hours',
                    authority: 'Reporting chain',
                    human: true,
                },
                {
                    step: 4,
                    action: 'Response plan drafted',
                    max_time: '< 7 days',
                    authority: 'Legal + Compliance + CTO',
                    human: true,
                },
            ],
            ivu_can_block: false,
            ceo_can_override: true,
        },
        {
            event: 'Validator Nakamoto Coefficient drops below 3',
            tier: 'T2 — Human + governance',
            decision_path: [
                {
                    step: 1,
                    action: 'Decentralization KPI engine alerts',
                    max_time: '< 1 hour',
                    authority: 'System',
                    human: false,
                },
                {
                    step: 2,
                    action: 'Risk Committee assesses concentration risk',
                    max_time: '< 24 hours',
                    authority: 'Risk',
                    human: true,
                },
                {
                    step: 3,
                    action: 'Emergency validator recruitment initiated',
                    max_time: '< 7 days',
                    authority: 'GGC + Operations',
                    human: true,
                },
                {
                    step: 4,
                    action: 'If not resolved → phase regression reported',
                    max_time: '< 30 days',
                    authority: 'GGC',
                    human: true,
                },
            ],
            ivu_can_block: true,
            ceo_can_override: false,
        },
    ],

    latency_sla: {
        auto_response: '< 10 seconds (system-level, no human)',
        tier_1_human: '< 4 hours (Risk Committee)',
        tier_2_human: '< 48 hours (GGC/Board)',
        escalation_on_breach: 'If decision time exceeded → auto-escalate to next level + log breach',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. NETWORK COLLAPSE SIMULATION
// ═══════════════════════════════════════════════════════════════════

const NETWORK_COLLAPSE = {
    scenarios: [
        {
            id: 'NC-01',
            name: 'Gradual Validator Attrition',
            model: 'Linear exit: 5% validators per month over 6 months',
            threshold_actions: [
                { at_pct_remaining: 80, action: 'Increased rewards + recruitment campaign' },
                { at_pct_remaining: 60, action: 'Emergency rewards boost + SLA relaxation' },
                { at_pct_remaining: 40, action: 'KS-04 Anchoring Freeze + off-chain verification mode' },
                { at_pct_remaining: 20, action: 'KS-01 Network Freeze + orderly migration to centralized fallback' },
            ],
            recovery: 'Network can restart from 20% with reduced SLA. Full recovery requires 50%+ restoration.',
        },
        {
            id: 'NC-02',
            name: 'Sudden Byzantine Failure',
            model: 'Instantaneous: 33%+ validators produce conflicting proofs',
            response: [
                'KS-01 immediate',
                'Fork resolution protocol (longest valid chain)',
                'Colluding validators identified + slashed',
                'Network restart with clean validator set',
            ],
            estimated_downtime_hours: 4,
        },
        {
            id: 'NC-03',
            name: 'Consensus Algorithm Failure',
            model: 'Bug in consensus causing non-deterministic finality',
            response: [
                'KS-01 + KS-04 immediate',
                'Rollback to last deterministic block',
                'Emergency patch + validator upgrade coordination',
                'Independent security audit before restart',
            ],
            estimated_downtime_hours: 24,
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class SystemicStressEngine {
    generateCausalScenario(seed) {
        const prng = seed ? mulberry32(seed) : Math.random;

        const CAUSAL_GRAPH = {
            'ES-01': [
                { target: 'ES-05', weight: 0.8, lag: 'T+24h' },
                { target: 'ES-10', weight: 0.6, lag: 'T+72h' },
            ],
            'ES-02': [
                { target: 'ES-08', weight: 0.7, lag: 'T+12h' },
                { target: 'ES-16', weight: 0.5, lag: 'T+48h' },
            ],
            'ES-03': [
                { target: 'ES-04', weight: 0.7, lag: 'T+24h' },
                { target: 'ES-08', weight: 0.4, lag: 'T+12h' },
            ],
            'ES-06': [
                { target: 'ES-18', weight: 0.9, lag: 'T+1h' },
                { target: 'ES-08', weight: 0.6, lag: 'T+12h' },
            ],
            'ES-07': [
                { target: 'ES-13', weight: 0.8, lag: 'T+7d' },
                { target: 'ES-14', weight: 0.4, lag: 'T+30d' },
            ],
            'ES-10': [
                { target: 'ES-11', weight: 0.9, lag: 'T+72h' },
                { target: 'ES-13', weight: 0.5, lag: 'T+7d' },
            ],
            'ES-18': [
                { target: 'ES-20', weight: 0.5, lag: 'T+1h' },
                { target: 'ES-04', weight: 0.8, lag: 'T+4h' },
            ],
        };

        const baseIds = Object.keys(CAUSAL_GRAPH);
        const rootId = baseIds[Math.floor(prng() * baseIds.length)];

        // Resolve cascade based on weights
        const causalChain = [{ id: rootId, lag: 'T+0' }];
        const edges = CAUSAL_GRAPH[rootId] || [];
        edges.forEach(edge => {
            if (prng() <= edge.weight) {
                causalChain.push({ id: edge.target, lag: edge.lag });
            }
        });

        const selected = causalChain
            .map(node => EXTREME_SCENARIOS.scenarios.find(s => s.id === node.id))
            .filter(Boolean);

        const combinedId = `ES-C-${Math.floor(1000 + prng() * 9000)}`;
        const combinedName = selected.map(s => s.category).join(' + ') + ' Cascade';
        const description = `Causal Chain: ${selected.map(s => s.name).join(' → ')}. Sovereign-grade composite scenario with specific propagation lags.`;

        let revImpact = 0;
        let carImpact = 0;
        const affected = new Set();
        const cascading = new Set();

        selected.forEach(s => {
            revImpact += s.impact.revenue_loss_pct || 0;
            carImpact += s.expected_car_impact_pct || 0;
            if (s.affected_systems) s.affected_systems.forEach(sys => affected.add(sys));
            if (s.cascading) s.cascading.forEach(c => cascading.add(c));
        });

        revImpact = Math.min(revImpact, 95);
        carImpact = Math.max(carImpact, -30);

        return {
            id: combinedId,
            category: 'Combined (Auto)',
            name: combinedName,
            description: description,
            probability: 'Very Low (< 1%)',
            severity: 'Existential (Multi-Failure)',
            impact: { revenue_loss_pct: revImpact, network_degraded: true, settlement_halt: true },
            affected_systems: Array.from(affected),
            cascading: Array.from(cascading),
            expected_car_impact_pct: carImpact,
            causal_chain: causalChain,
            survival_plan: 'Level 3 Sovereign Defense Protocol: Isolated Execute + Risk Memory Check.',
        };
    }

    runStressTest(scenario_id, current_car_pct, current_revenue_usd, execute_mode = 'dry-run', seed = null) {
        let activeSeed = seed;
        if (!activeSeed)
            activeSeed = crypto
                .createHash('sha256')
                .update(scenario_id || 'ES-UNKNOWN')
                .digest()
                .readInt32BE(0); // Deterministic fallback

        let scenario;
        if (scenario_id === 'ES-AUTO-COMPOSITE') {
            scenario = this.generateCausalScenario(activeSeed);
        } else {
            scenario = EXTREME_SCENARIOS.scenarios.find(s => s.id === scenario_id);
            if (scenario) {
                // Default 1 node timeline for basic scenarios
                scenario.causal_chain = [{ id: scenario.id, lag: 'T+0' }];
            }
        }

        if (!scenario) return { error: `Unknown scenario: ${scenario_id}` };

        // Guarantee scenario_hash
        const scenario_hash = crypto
            .createHash('sha256')
            .update(`${scenario.id}-${JSON.stringify(scenario.causal_chain)}-${activeSeed}`)
            .digest('hex')
            .substring(0, 12);

        const car = current_car_pct || 12;
        const revenue = current_revenue_usd || 1000000;
        const carImpact = scenario.expected_car_impact_pct || 0;
        const revImpact = scenario.impact.revenue_loss_pct || 0;

        // Non-Linear Damage: Tipping Point
        let postStressCAR = car + carImpact;
        let isTippingPoint = false;
        if (postStressCAR < 7) {
            isTippingPoint = true;
            postStressCAR -= 4; // Cascade collapse accelerates damage
        }

        const postStressRevenue = revenue * (1 - revImpact / 100);

        const killSwitches = new Set();
        const textToAnalyze = [
            scenario.description || '',
            ...(scenario.cascading || []),
            ...(scenario.affected_systems || []),
        ]
            .join(' ')
            .toUpperCase();

        if (textToAnalyze.includes('KS-01') || textToAnalyze.includes('NETWORK FREEZE')) killSwitches.add('KS-01');
        if (
            textToAnalyze.includes('KS-02') ||
            textToAnalyze.includes('GOVERNANCE FREEZE') ||
            textToAnalyze.includes('ORG FREEZE')
        )
            killSwitches.add('KS-02');
        if (
            textToAnalyze.includes('KS-03') ||
            textToAnalyze.includes('SCORING FREEZE') ||
            textToAnalyze.includes('TRUST SCORE FROZEN')
        )
            killSwitches.add('KS-03');
        if (textToAnalyze.includes('KS-04') || textToAnalyze.includes('ANCHORING FREEZE')) killSwitches.add('KS-04');
        if (textToAnalyze.includes('KS-05') || textToAnalyze.includes('SETTLEMENT FREEZE')) killSwitches.add('KS-05');
        if (textToAnalyze.includes('KS-06') || textToAnalyze.includes('FEE COLLECTION FREEZE'))
            killSwitches.add('KS-06');

        if (car + carImpact < 6) killSwitches.add('KS-05');

        // V3.1 State Machine logic
        const HORIZONS = ['T+0', 'T+1h', 'T+4h', 'T+12h', 'T+24h', 'T+48h', 'T+72h', 'T+7d', 'T+30d'];
        const activeKS = Array.from(killSwitches).sort();

        const stateMachine = {
            current_t: 0,
            horizon: HORIZONS.filter(h => scenario.causal_chain.some(c => c.lag === h) || h === 'T+0' || h === 'T+72h'),
            states: {},
            transitions: [],
        };

        let accumCAR = car;
        let accumRevLoss = 0;
        let accumDecay = 0;

        let finalFragility = 0;

        eventBus.clearSession(); // keep PoC clean
        const scenarioRootEvent = {
            event_id: crypto.randomUUID(),
            scenario_hash,
            root_scenario_id: scenario.id,
            producer: 'systemic-stress',
            occurred_at: new Date().toISOString(),
        };
        let globalSq = 1;
        const pushEv = (type, payload) =>
            eventBus.publish(type, {
                ...scenarioRootEvent,
                sequence_no: globalSq++,
                event_id: crypto.randomUUID(),
                data: payload,
            });

        pushEv('SCENARIO_STARTED', {
            scenario_id: scenario.id,
            composite: scenario_id === 'ES-AUTO-COMPOSITE',
            seed: activeSeed,
            horizon: stateMachine.horizon,
            initial_state: { car_pct: car, rev_loss_pct: 0, trust_decay: 0 },
        });

        scenario.causal_chain.forEach(c =>
            pushEv('CAUSAL_EDGE_TRIGGERED', { source_event: scenario.id, target_event: c.id, weight: 1, lag: c.lag })
        );

        stateMachine.horizon.forEach((t_point, index) => {
            const nodes = scenario.causal_chain.filter(c => c.lag === t_point);
            const localEvents = nodes.map(n => EXTREME_SCENARIOS.scenarios.find(s => s.id === n.id)?.name || n.id);

            if (t_point === 'T+0' && localEvents.length === 0) localEvents.push(scenario.name);

            // Linear progression simulated
            const stageRevImpact = revImpact / stateMachine.horizon.length;
            accumRevLoss += stageRevImpact;

            const stageCarImpact = carImpact / stateMachine.horizon.length || 0;
            accumCAR += stageCarImpact;
            accumDecay += 0.15; // Standard deterioration

            let carNormalized = Math.max(0, accumCAR) / car;
            if (isNaN(carNormalized)) carNormalized = 1.0;

            // Sovereign Fragility Index Function
            let fragility = 0.5 * (1 - carNormalized) * 100 + 0.3 * (accumDecay * 100) + 0.2 * accumRevLoss;

            // Non-linear Threshold
            if (accumCAR < 0.07 && accumDecay > 0.4) {
                fragility *= 2; // Tipping point EXPONENTIAL MULTIPLIER
                accumCAR -= 2;
                localEvents.push('Cascade Horizon Breached');
            }

            fragility = Math.min(100, Math.max(1, fragility));
            if (index === stateMachine.horizon.length - 1) finalFragility = fragility;

            stateMachine.states[t_point] = {
                events: localEvents.length > 0 ? localEvents : ['System propagates shock'],
                metrics: { car_pct: accumCAR, revenue_loss_pct: Math.min(95, accumRevLoss), trust_decay: accumDecay },
            };

            if (index > 0) {
                const prev = stateMachine.horizon[index - 1];
                stateMachine.transitions.push({
                    from: prev,
                    to: t_point,
                    trigger: nodes.length > 0 ? `Causal branch triggered` : `Time elapsed / Dependency lag`,
                    effects: [`car_pct dropped`, `trust_decay grew to ${accumDecay.toFixed(2)}`],
                });
                pushEv('STATE_TRANSITION', {
                    from: prev,
                    to: t_point,
                    trigger: nodes.length > 0 ? 'Causal branch triggered' : 'Time elapsed / Dependency lag',
                    applied_effects: ['car_pct dropped', `trust_decay grew to ${accumDecay.toFixed(2)}`],
                });
            }

            pushEv('METRIC_SNAPSHOT', {
                t: t_point,
                metrics: { car_pct: accumCAR, revenue_loss_pct: Math.min(95, accumRevLoss), trust_decay: accumDecay },
            });
        });

        activeKS.forEach(ksId =>
            pushEv('KILL_SWITCH_TRIGGERED', {
                switch_id: ksId,
                reason: 'Threshold breached during systemic shock',
                criticality: 'critical',
                reversible: true,
                mode: execute_mode,
            })
        );

        pushEv('SCENARIO_COMPLETED', {
            outcome: finalFragility >= 85 ? 'collapsed' : 'survived',
            final_metrics: {
                car_pct: accumCAR,
                revenue_loss_pct: accumRevLoss,
                trust_decay: accumDecay,
                fragility_index: finalFragility,
            },
            total_events: globalSq,
        });

        const uiTraceLogs = eventBus.getRecentScenarioEvents(scenario_hash);
        const executionLogs = uiTraceLogs.map(t =>
            typeof t.data === 'string' ? t.data : `[${t.event_type}] Seq: ${t.sequence_no} | ID: ${t.idempotency_key}`
        );
        const executionTrace = uiTraceLogs.filter(t => t.event_type === 'KILL_SWITCH_EXECUTED').map(t => t.data);

        return {
            scenario_status: execute_mode === 'commit' ? 'committed' : 'executed',
            scenario: {
                id: scenario.id,
                name: scenario.name,
                category: scenario.category,
                scenario_hash,
                seed: activeSeed,
            },
            description: scenario.description,
            probability: scenario.probability,
            severity: scenario.severity,
            pre_stress: { car_pct: car, annual_revenue: revenue },
            post_stress: {
                car_pct: parseFloat(accumCAR.toFixed(1)),
                annual_revenue: Math.round(revenue * (1 - accumRevLoss / 100)),
                revenue_loss_pct: accumRevLoss,
            },
            car_breached: accumCAR < 8,
            kill_switches_triggered: activeKS,
            cascading_effects: scenario.cascading,
            affected_systems: scenario.affected_systems,
            survival: scenario.survival_plan,
            fragility_index: Math.round(finalFragility),
            temporal_state: stateMachine,
            execution_logs: executionLogs,
            execution_trace: executionTrace,
        };
    }

    getScenarios() {
        return EXTREME_SCENARIOS;
    }
    getDecisionLatency() {
        return DECISION_LATENCY;
    }
    getNetworkCollapse() {
        return NETWORK_COLLAPSE;
    }

    getFullFramework() {
        return {
            title: 'Systemic Stress & Simulation — Critical Infrastructure-Grade',
            version: '1.0',
            scenarios: EXTREME_SCENARIOS,
            decision_latency: DECISION_LATENCY,
            network_collapse: NETWORK_COLLAPSE,
        };
    }
}

module.exports = new SystemicStressEngine();
