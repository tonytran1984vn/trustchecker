/**
 * TrustChecker — Regulatory Scenario Engine v1.0
 * IPO-GRADE: Regulatory Shock Simulation
 * 
 * Economic stress tests exist. But regulatory stress tests don't.
 * Global supply chain infra MUST simulate regulatory shocks:
 *   - Sudden classification changes (MiCA, SEC)
 *   - Carbon regulation freezes
 *   - Sanctions expansion (OFAC)
 *   - Country-level settlement prohibition
 * 
 * Models: EU DORA, Federal Reserve CCAR regulatory scenarios
 */

// ═══════════════════════════════════════════════════════════════════
// 1. REGULATORY SHOCK SCENARIOS
// ═══════════════════════════════════════════════════════════════════

const REGULATORY_SCENARIOS = {
    scenarios: [
        {
            id: 'REG-01',
            name: 'MiCA Classification Change',
            description: 'EU reclassifies carbon settlement tokens as e-money or security',
            probability: 'Medium (15-25%)',
            trigger: 'EU regulatory consultation or court ruling',
            impact: {
                operational: 'Must obtain e-money/security license within 6 months',
                financial: 'Compliance cost $500K-$2M, revenue freeze during transition',
                timeline_months: 6,
                affected_entities: ['Settlement GmbH'],
                affected_revenue_pct: 35,
            },
            mitigation: [
                'Pre-apply for all possible classifications (defensive licensing)',
                'Structure carbon tokens to avoid security classification',
                'Maintain legal opinions from 3+ jurisdictions',
                'Settlement GmbH pre-capitalized for licensing compliance',
            ],
            response_playbook: {
                immediate: 'Legal review (48h), regulatory advisor engagement, client notification',
                short_term: 'File license application, adjust token structure if needed',
                medium_term: 'Obtain license, update compliance framework, audit integration',
            },
        },
        {
            id: 'REG-02',
            name: 'EU Carbon Rule Freeze',
            description: 'EU freezes all voluntary carbon credit trading for regulatory review',
            probability: 'Low (5-10%)',
            trigger: 'Major carbon fraud scandal or political shift',
            impact: {
                operational: 'EU carbon settlement halted, verification backlog',
                financial: 'Settlement revenue from EU drops 100% during freeze',
                timeline_months: 3,
                affected_entities: ['Settlement GmbH', 'Technology Pte Ltd'],
                affected_revenue_pct: 25,
            },
            mitigation: [
                'Geographic diversification — ensure <40% revenue from EU carbon',
                'Pre-position non-EU carbon registries (Gold Standard, Verra)',
                'Revenue buffer from non-carbon streams (SaaS, verification)',
                'Insurance: regulatory action coverage in PI/E&O policy',
            ],
            response_playbook: {
                immediate: 'Halt EU carbon settlements, notify clients, activate reserve',
                short_term: 'Redirect volume to non-EU markets, engage regulatory lobbyists',
                medium_term: 'Comply with new requirements, resume when authorized',
            },
        },
        {
            id: 'REG-03',
            name: 'OFAC Sanctions Expansion',
            description: 'OFAC adds countries where TrustChecker has active validators or clients',
            probability: 'Medium (10-20%)',
            trigger: 'Geopolitical escalation (e.g., new sanctions on major trading partner)',
            impact: {
                operational: 'Must immediately disconnect sanctioned entities, validators, transactions',
                financial: 'Revenue loss from affected region + compliance costs',
                timeline_months: 1,
                affected_entities: ['All entities'],
                affected_revenue_pct: '5-20% depending on country',
            },
            mitigation: [
                'Real-time OFAC/SDN screening on all new entities and transactions',
                'Geographic diversification — no single country >40%',
                'Pre-built sanctions compliance module with auto-disconnect',
                'Legal opinions on secondary sanctions risk for non-US entities',
            ],
            response_playbook: {
                immediate: 'Automated SDN list check → auto-suspend matching entities (< 1 hour)',
                short_term: 'Manual review of all relationships in affected country',
                medium_term: 'Wind down affected operations, restructure validator network',
            },
        },
        {
            id: 'REG-04',
            name: 'Country-Level Settlement Prohibition',
            description: 'Specific country bans cross-border carbon credit settlement',
            probability: 'Medium (15-25%)',
            trigger: 'Domestic carbon market protection or capital controls',
            impact: {
                operational: 'Settlement corridor closed, affected transactions frozen',
                financial: 'Corridor revenue drops to zero, rerouting costs',
                timeline_months: 12,
                affected_entities: ['Settlement GmbH', 'Vietnam Co Ltd'],
            },
            mitigation: [
                'Multi-corridor architecture — no single corridor >15% of volume',
                'Domestic entity in key markets (Vietnam Co Ltd) for local settlement',
                'Carbon credit netting agreements to reduce cross-border dependency',
                'Pre-negotiated fallback corridors for top-10 routes',
            ],
        },
        {
            id: 'REG-05',
            name: 'Data Localization Mandate',
            description: 'Major jurisdiction requires all data to be stored domestically',
            probability: 'High (30-40%)',
            trigger: 'GDPR evolution, China PIPL expansion, India DPDP Act',
            impact: {
                operational: 'Must deploy domestic infrastructure in affected jurisdiction',
                financial: 'Infrastructure cost increase 20-30%, multi-region complexity',
                timeline_months: 12,
                affected_entities: ['Data Compliance Ltd', 'Technology Pte Ltd'],
            },
            mitigation: [
                'Multi-region cloud architecture (already designed)',
                'Data Compliance Ltd in Ireland for EU data sovereignty',
                'Pre-deploy data residency options in top-5 markets',
                'Encryption-at-rest with customer-managed keys',
            ],
        },
        {
            id: 'REG-06',
            name: 'Tax Regime Change',
            description: 'Key jurisdiction changes tax treatment of carbon credits or digital assets',
            probability: 'High (25-35%)',
            trigger: 'Budget policy change, OECD BEPS Pillar 2 implementation',
            impact: {
                operational: 'Restructure inter-entity pricing, update compliance',
                financial: 'Effective tax rate change ±5-15pp, transfer pricing adjustment',
                timeline_months: 6,
                affected_entities: ['Holdings Ltd', 'IP Ltd', 'Settlement GmbH'],
            },
            mitigation: [
                'Multi-jurisdiction structure provides flexibility',
                'IP in Singapore (favorable IP regime)',
                'Regular transfer pricing documentation (OECD guidelines)',
                'Tax advisory retainer with Big 4 firm',
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. REGULATORY READINESS SCORECARD
// ═══════════════════════════════════════════════════════════════════

const READINESS_SCORECARD = {
    jurisdictions: [
        { jurisdiction: 'EU/EEA', framework: 'MiCA + GDPR + EU ETS', readiness_score: 75, gaps: ['MiCA license pending', 'Carbon settlement specific authorization'] },
        { jurisdiction: 'US', framework: 'SEC + CFTC + OFAC', readiness_score: 50, gaps: ['Securities classification unclear', 'CFTC carbon derivative ruling pending'] },
        { jurisdiction: 'Singapore', framework: 'MAS + PSA', readiness_score: 85, gaps: ['Payment services license scope clarification'] },
        { jurisdiction: 'Vietnam', framework: 'SBV + MOIT', readiness_score: 60, gaps: ['Carbon credit regulatory framework emerging', 'FDI routing compliance'] },
        { jurisdiction: 'UK', framework: 'FCA + UK ETS', readiness_score: 70, gaps: ['Post-Brexit divergence from EU rules'] },
    ],

    composite_score: 68,
    target: 80,
    review_frequency: 'Quarterly',
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class RegulatoryScenarioEngine {

    simulateScenario(scenario_id, current_revenue_usd) {
        const scenario = REGULATORY_SCENARIOS.scenarios.find(s => s.id === scenario_id);
        if (!scenario) return { error: `Unknown scenario: ${scenario_id}` };

        const revenue = current_revenue_usd || 1000000;
        const affectedPct = typeof scenario.impact.affected_revenue_pct === 'number' ? scenario.impact.affected_revenue_pct : 15;
        const revenueLoss = revenue * (affectedPct / 100);
        const complianceCost = scenario.impact.financial?.includes('$500K') ? 1000000 : 200000;
        const totalImpact = revenueLoss * (scenario.impact.timeline_months / 12) + complianceCost;

        return {
            scenario: { id: scenario.id, name: scenario.name },
            probability: scenario.probability,
            revenue_impact: {
                annual_revenue: revenue,
                affected_pct: affectedPct,
                monthly_loss: Math.round(revenueLoss / 12),
                duration_months: scenario.impact.timeline_months,
                total_impact: Math.round(totalImpact),
            },
            affected_entities: scenario.impact.affected_entities,
            mitigation_count: scenario.mitigation.length,
            mitigations: scenario.mitigation,
            response: scenario.response_playbook,
            capital_needed: Math.round(totalImpact * 1.2),
        };
    }

    getScenarios() { return REGULATORY_SCENARIOS; }
    getReadinessScorecard() { return READINESS_SCORECARD; }

    getFullFramework() {
        return {
            title: 'Regulatory Scenario Engine — IPO-Grade',
            version: '1.0',
            scenarios: REGULATORY_SCENARIOS,
            readiness: READINESS_SCORECARD,
        };
    }
}

module.exports = new RegulatoryScenarioEngine();
