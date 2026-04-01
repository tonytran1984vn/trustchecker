/**
 * TrustChecker — Agentic Chaos Simulator (Pre-Deployment Gate)
 * 
 * Replays 1000 dummy entities through RiskRadar + Governance with Dependency Graphs
 * and Noise injection to test Cascade Collapses and False Positive Rates.
 */

const AgenticRiskRadar = require('../engines/intelligence/risk-radar');
const AgenticGovernanceEngine = require('../engines/governance-module/governance');
const AgenticMetrics = require('../engines/governance-module/agentic-metrics');
const config = require('../config').validateConfig();

// Force mode to partial for simulation if not set
if (config.agenticMode === 'shadow') config.agenticMode = 'partial';

const NUM_ENTITIES = 1000;

// Layer 1 & 2: Dummy Generator + Graph
console.log('=> Layer 1: Generating 1000 Supply Chain Entities...');
const entities = new Map();
for (let i = 0; i < NUM_ENTITIES; i++) {
    const isAmlRisk = Math.random() < 0.10; // 10% AML risk
    const isCarbonRisk = Math.random() < 0.15; // 15% Carbon overclaim
    const isSupplyRisk = Math.random() < 0.05; // 5% Supply disruption

    entities.set(`SUP-${i}`, {
        id: `SUP-${i}`,
        type: 'supplier',
        dependencies: [], // Filled later
        exposure: Math.floor(Math.random() * 5000000), // Up to $5M
        aml_flags: isAmlRisk ? ['SUSPICIOUS_TRANSFER'] : [],
        carbon_overclaim_pct: isCarbonRisk ? Math.floor(Math.random() * 40) + 15 : 0,
        inventory_buffer_days: isSupplyRisk ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 60) + 15, // <3 days = risk
        is_frozen: false
    });
}

// Layer 2: Dependency Graph
console.log('=> Layer 2: Building Dependency Graph...');
for (let i = 0; i < NUM_ENTITIES; i++) {
    const ent = entities.get(`SUP-${i}`);
    const numDeps = Math.floor(Math.random() * 4); // 0-3 dependencies
    for (let d = 0; d < numDeps; d++) {
        const depId = `SUP-${Math.floor(Math.random() * NUM_ENTITIES)}`;
        if (depId !== ent.id) ent.dependencies.push(depId);
    }
}

// Layer 3: Noise Injection
console.log('=> Layer 3: Injecting Noise...');
const noise = { delayed: 0, conflicting: 0, missing: 0 };
entities.forEach(ent => {
    const r = Math.random();
    if (r < 0.05) { ent.aml_flags = undefined; noise.missing++; }
    else if (r < 0.10) { ent.inventory_buffer_days += 10; noise.conflicting++; } // Conflicting signal
});
console.log(`   Noise injected: ${noise.missing} missing, ${noise.conflicting} conflicting.`);

// Execution Loop (Testing Cascade)
console.log(`\n=> STARTING SIMULATION [MODE: ${config.agenticMode}]`);
let maxCascadeDepth = 0;
let frozenCount = 0;

function simulateEntity(entId, depth = 0) {
    if (depth > maxCascadeDepth) maxCascadeDepth = depth;
    const ent = entities.get(entId);
    if (!ent || ent.is_frozen) return;

    // Build risk payload
    const payload = {
        target_id: ent.id,
        partners: [{ id: ent.id, kyc_status: ent.aml_flags && ent.aml_flags.length > 0 ? 'failed' : 'passed', trust_score: ent.aml_flags && ent.aml_flags.length > 0 ? 10 : 90, type: 'oem' }],
        inventory: [{ quantity: ent.inventory_buffer_days < 3 ? 5 : 50, min_stock: 10 }],
        sustainability: [{ overall_score: ent.carbon_overclaim_pct > 20 ? 10 : 80 }],
        leaks: ent.exposure > 4000000 ? [ {risk_score: 90, authorized_price: 100, listing_price: 50} ] : [],
        violations: ent.aml_flags && ent.aml_flags.length > 0 ? [ {penalty_amount: 50000} ] : [],
        shipments: ent.inventory_buffer_days < 3 ? [{ actual_delivery: new Date().toISOString(), estimated_delivery: new Date(Date.now() - 86400000).toISOString() }] : [],
        certifications: ent.carbon_overclaim_pct > 20 ? [{ expiry_date: new Date(Date.now() - 86400000).toISOString() }] : [],
        alerts: ent.exposure > 4000000 ? [{ severity: 'high', alert_type: 'STATISTICAL_ANOMALY' }] : []
    };

    const radarResult = AgenticRiskRadar.resolveAgenticThreatIndex(payload);
    
    if (radarResult.directive && radarResult.directive.level !== 'ALERT_ONLY') {
        const directive = radarResult.directive;
        
        // Inject signature constraints required by Governance Engine v3.0
        directive.directive_id = 'sim-' + Math.random().toString(36).substring(7);
        directive.issued_by = 'AgenticRiskRadar v3.0';
        directive.signature = 'verified_v3_dummy_signature';

        // Build Governance Evidence Context
        const context = {
            threat_index: radarResult.overall_threat_index,
            confidence_score: directive.confidence_score,
            active_signals: radarResult.active_signals,
            impact_analysis: `Exposure: $${ent.exposure}`,
            suggested_action: directive.action,
            reversal_plan: 'Regulator clears AML flag.'
        };

        try {
            const proposal = AgenticGovernanceEngine.draftAgenticProposal(directive, context);
            
            // If executed or proposal drafted (meaning level 2/3 containment in partial mode)
            if ((proposal && proposal.executed_directly) || radarResult.directive.level === 'FULL_CONTAINMENT') {
                ent.is_frozen = true;
                frozenCount++;
                
                // Cascade to dependencies!
                ent.dependencies.forEach(dep => {
                    simulateEntity(dep, depth + 1);
                });
            }
        } catch (e) {
            if (e.message.includes('RATE_LIMIT_EXCEEDED')) {
                // Ignore, handled by metrics
            } else {
                console.error(e.message);
            }
        }
    }
}

// Run through all independently
entities.forEach(ent => {
    simulateEntity(ent.id, 0);
});

// Update Cascade Metrics
AgenticMetrics.logCascadeImpact(maxCascadeDepth, (frozenCount / NUM_ENTITIES) * 100);

// Print Results
console.log('\n=== Agentic Simulation Report ===');
console.log(`Entities: ${NUM_ENTITIES}`);
const finalMetrics = AgenticGovernanceEngine.getMetrics();
console.log(`Containments Issued/Drafted: ${finalMetrics.containments_issued}`);
console.log(`Shadow Drops: ${finalMetrics.shadow_drops}`);
console.log(`Proposals Drafted: ${finalMetrics.proposals_drafted}`);
console.log(`Level 1 Direct Executions: ${finalMetrics.full_executions}`);
console.log(`Avg Confidence: ${finalMetrics.avg_confidence}`);
console.log('');
console.log(`Cascade Depth Max: ${finalMetrics.cascade_depth_max}`);
console.log(`Network Impact Peak: ${finalMetrics.network_impact_peak_pct.toFixed(2)}%`);
console.log(`Rate Limit Hits (Saved Cascade): ${finalMetrics.rate_limit_hits || 0}`);

console.log('');
console.log(`False Positive Rate: ${finalMetrics.false_positive_rate}`);
console.log('STATUS: ' + (finalMetrics.network_impact_peak_pct > 15 ? '⚠️ DANGER (Network cascade too high)' : 
                             finalMetrics.network_impact_peak_pct > 5 ? '⚠️ WARNING (Moderate Impact)' : '✅ SAFE'));
