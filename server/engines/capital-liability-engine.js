/**
 * TrustChecker — Capital & Liability Architecture Engine v1.0
 * MARKET INFRASTRUCTURE GRADE: Capital Adequacy + Settlement Risk
 * 
 * If TrustChecker is a Carbon Settlement Rail, it needs:
 *   - Capital adequacy (Basel-inspired minimum buffers)
 *   - Settlement guarantees (who pays if batch disputed)
 *   - Insurance wrappers (coverage for counterparty default)
 *   - Counterparty exposure limits (no single entity risk > X%)
 *   - Stress testing (extreme scenario simulations)
 * 
 * Regulatory Models: Basel III (banking), EMIR (clearing), CPMI-IOSCO (market infra)
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// 1. CAPITAL ADEQUACY MODEL
// ═══════════════════════════════════════════════════════════════════

const CAPITAL_ADEQUACY = {
    framework: 'TC-CAR (TrustChecker Capital Adequacy Requirements)',
    inspired_by: 'Basel III + CPMI-IOSCO PFMI',

    capital_tiers: {
        tier_1_core: {
            description: 'Core capital — cash, liquid holdings, retained earnings',
            min_ratio_pct: 8,    // Min 8% of risk-weighted settlement value
            components: ['cash_reserves', 'retained_earnings', 'equity'],
            available: true,
        },
        tier_2_supplementary: {
            description: 'Supplementary capital — insurance policies, credit lines',
            max_ratio_pct: 4,    // Up to 4% additional
            components: ['insurance_policies', 'standby_credit_lines', 'subordinated_debt'],
            available: true,
        },
        tier_3_contingent: {
            description: 'Contingent capital — emergency fundraising, protocol reserve',
            components: ['emergency_protocol_reserve', 'validator_escrow', 'parent_guarantee'],
            available: false,  // Only activated in crisis
        },
    },

    risk_weights: {
        qr_verification: 0.01,     // Very low risk — no settlement involved
        carbon_credit_mint: 0.50,  // High risk — creates financial instrument
        carbon_settlement: 1.00,   // Full risk weight — clearing obligation
        nft_certificate: 0.10,     // Low risk — certificate, not financial claim
        blockchain_anchor: 0.05,   // Minimal risk — data integrity only
        cross_border_transfer: 0.30, // Medium risk — regulatory + FX exposure
    },

    capital_floor: {
        min_absolute_usd: 500000,     // $500K minimum regardless of volume
        min_months_opex: 6,           // Must cover 6 months of operating expenses
        counterparty_buffer_pct: 15,  // 15% buffer over calculated requirement
    },
};

// ═══════════════════════════════════════════════════════════════════
// 2. SETTLEMENT RISK & LIABILITY ENGINE
// ═══════════════════════════════════════════════════════════════════

const SETTLEMENT_RISK = {
    settlement_types: {
        carbon_credit_mint: {
            settlement_cycle: 'T+2',     // 2 days from request to final settlement
            liability_chain: ['Issuer → Verifier → Platform → Registry'],
            platform_liability: 'Verification accuracy guarantee only — not credit quality',
            reserve_requirement_pct: 5,  // 5% of mint value held in escrow until T+2
            dispute_window_days: 30,
            max_platform_exposure_per_batch_usd: 100000,
        },
        carbon_settlement: {
            settlement_cycle: 'T+1',
            liability_chain: ['Buyer → Platform → Seller → Registry'],
            platform_liability: 'Settlement finality guarantee — platform backstops if counterparty defaults',
            reserve_requirement_pct: 10,
            dispute_window_days: 14,
            novation: true,   // Platform becomes central counterparty (CCP model)
        },
        cross_border_transfer: {
            settlement_cycle: 'T+3',
            liability_chain: ['Originator → Platform → Local Agent → Destination Registry'],
            platform_liability: 'Delivery-versus-payment guarantee',
            reserve_requirement_pct: 8,
            dispute_window_days: 45,
            fx_exposure: true,
        },
    },

    dispute_resolution: {
        auto_resolution_threshold_usd: 500,    // Under $500 → auto-resolve from reserve
        manual_review_threshold_usd: 5000,     // $500-$5K → risk committee review
        arbitration_threshold_usd: 50000,      // $5K-$50K → independent arbitrator
        litigation_threshold_usd: Infinity,    // $50K+ → legal proceedings
        escalation_timeline: {
            auto: '24 hours',
            manual: '7 business days',
            arbitration: '30 days',
            litigation: '90+ days',
        },
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. INSURANCE & LIABILITY COVER
// ═══════════════════════════════════════════════════════════════════

const INSURANCE_FRAMEWORK = {
    required_policies: [
        {
            type: 'Professional Indemnity (PI) / E&O',
            coverage_usd: 5000000,
            covers: 'Verification errors, scoring inaccuracies, advisory failures',
            deductible_usd: 25000,
            renewal: 'Annual',
        },
        {
            type: 'Cyber Liability',
            coverage_usd: 10000000,
            covers: 'Data breaches, ransomware, system compromise, business interruption',
            deductible_usd: 50000,
            renewal: 'Annual',
        },
        {
            type: 'Directors & Officers (D&O)',
            coverage_usd: 5000000,
            covers: 'Management decisions, regulatory actions, shareholder claims',
            deductible_usd: 10000,
            renewal: 'Annual',
        },
        {
            type: 'Carbon Settlement Bond',
            coverage_usd: 2000000,
            covers: 'Settlement default, counterparty failure, batch dispute loss',
            deductible_usd: 100000,
            renewal: 'Annual, linked to settlement volume',
        },
        {
            type: 'Technology Infrastructure Bond',
            coverage_usd: 3000000,
            covers: 'Platform downtime exceeding SLA, data loss, consensus failure',
            deductible_usd: 50000,
            renewal: 'Annual',
        },
    ],

    total_coverage_usd: 25000000,

    gap_analysis: {
        uninsurable_risks: [
            'Regulatory regime change (e.g., carbon credit regulations invalidated)',
            'Systemic blockchain failure (underlying chain compromise)',
            'Sovereign sanctions (operating jurisdiction sanctioned)',
        ],
        mitigation: 'Risk reserve pools + protocol-level safeguards + geographic diversification',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. COUNTERPARTY EXPOSURE LIMITS
// ═══════════════════════════════════════════════════════════════════

const COUNTERPARTY_LIMITS = {
    single_counterparty: {
        max_exposure_pct: 15,    // No single entity > 15% of total settlement value
        max_absolute_usd: 500000,
        breach_action: 'BLOCK new transactions + alert risk committee',
    },
    connected_parties: {
        max_combined_pct: 25,    // Connected entities combined < 25%
        definition: 'Entities with common ownership > 20% or shared management',
        detection: 'Graph analysis of ownership structure',
    },
    geographic_concentration: {
        max_single_country_pct: 40,  // No single country > 40% of volume
        max_single_region_pct: 60,   // No single region > 60%
        excluded_countries: ['NK', 'IR', 'SY', 'CU'],  // OFAC/sanctions
    },
    sectoral_concentration: {
        max_single_sector_pct: 50,
        sectors: ['manufacturing', 'agriculture', 'energy', 'transport', 'mining', 'services'],
    },
};

// ═══════════════════════════════════════════════════════════════════
// 5. STRESS TESTING FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const STRESS_SCENARIOS = {
    scenarios: [
        {
            id: 'ST-01',
            name: 'Carbon Price Collapse',
            description: 'Carbon credit price drops 80% in 30 days',
            parameters: { price_shock_pct: -80, duration_days: 30 },
            impact_areas: ['settlement_value', 'reserve_adequacy', 'counterparty_defaults'],
            severity: 'EXTREME',
        },
        {
            id: 'ST-02',
            name: 'Mass Counterparty Default',
            description: 'Top 3 counterparties default simultaneously',
            parameters: { default_count: 3, exposure_pct: 45 },
            impact_areas: ['capital_adequacy', 'insurance_claims', 'settlement_finality'],
            severity: 'EXTREME',
        },
        {
            id: 'ST-03',
            name: 'Regulatory Freeze',
            description: 'EU suspends carbon credit trading for 90 days',
            parameters: { freeze_region: 'EU', duration_days: 90 },
            impact_areas: ['revenue', 'settlement_pipeline', 'geographic_rebalancing'],
            severity: 'SEVERE',
        },
        {
            id: 'ST-04',
            name: 'Consensus Failure',
            description: '4 of 7 validators compromised',
            parameters: { compromised_nodes: 4, total_nodes: 7 },
            impact_areas: ['verification_integrity', 'trust_scores', 'settlement_halt'],
            severity: 'EXTREME',
        },
        {
            id: 'ST-05',
            name: 'Cyber Attack — Data Breach',
            description: 'Full database exfiltration + ransomware',
            parameters: { data_loss: true, downtime_hours: 72 },
            impact_areas: ['GDPR_fines', 'insurance_claim', 'reputation', 'SLA_credits'],
            severity: 'EXTREME',
        },
        {
            id: 'ST-06',
            name: 'Liquidity Crunch',
            description: 'Revenue drops 60% for 6 months + insurance claim denied',
            parameters: { revenue_drop_pct: -60, insurance_denied: true, duration_months: 6 },
            impact_areas: ['opex_coverage', 'capital_floor', 'validator_incentives'],
            severity: 'SEVERE',
        },
    ],

    run_frequency: 'Quarterly (minimum), after major market events',
    governance: 'Results reported to Risk Committee + GGC + Board',
    pass_criteria: 'Capital remains above floor after ANY single scenario AND top-2 combined',
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class CapitalLiabilityEngine {

    calculateCapitalRequirement(monthly_settlement_volume, transaction_mix) {
        const defaultMix = {
            qr_verification: 0.40,
            carbon_credit_mint: 0.15,
            carbon_settlement: 0.10,
            nft_certificate: 0.15,
            blockchain_anchor: 0.10,
            cross_border_transfer: 0.10,
        };
        const mix = transaction_mix || defaultMix;

        let riskWeightedValue = 0;
        for (const [type, pct] of Object.entries(mix)) {
            const weight = CAPITAL_ADEQUACY.risk_weights[type] || 0;
            riskWeightedValue += monthly_settlement_volume * pct * weight;
        }

        const tier1_required = riskWeightedValue * (CAPITAL_ADEQUACY.capital_tiers.tier_1_core.min_ratio_pct / 100);
        const tier2_additional = riskWeightedValue * (CAPITAL_ADEQUACY.capital_tiers.tier_2_supplementary.max_ratio_pct / 100);
        const buffer = riskWeightedValue * (CAPITAL_ADEQUACY.capital_floor.counterparty_buffer_pct / 100);

        const calculated = tier1_required + buffer;
        const floor = CAPITAL_ADEQUACY.capital_floor.min_absolute_usd;
        const required = Math.max(calculated, floor);

        return {
            monthly_settlement_volume,
            risk_weighted_value: Math.round(riskWeightedValue),
            tier_1_required: Math.round(tier1_required),
            tier_2_additional: Math.round(tier2_additional),
            counterparty_buffer: Math.round(buffer),
            total_calculated: Math.round(calculated),
            absolute_floor: floor,
            capital_required: Math.round(required),
            binding_constraint: calculated > floor ? 'risk_weighted' : 'absolute_floor',
        };
    }

    assessCounterpartyExposure(counterparty_id, exposure_usd, total_settlement_usd) {
        const pct = (exposure_usd / total_settlement_usd) * 100;
        const limit = COUNTERPARTY_LIMITS.single_counterparty;
        const breached = pct > limit.max_exposure_pct || exposure_usd > limit.max_absolute_usd;

        return {
            counterparty_id,
            exposure_usd,
            exposure_pct: pct.toFixed(2),
            limit_pct: limit.max_exposure_pct,
            limit_usd: limit.max_absolute_usd,
            breached,
            action: breached ? limit.breach_action : 'Within limits',
            headroom_usd: Math.max(0, limit.max_absolute_usd - exposure_usd),
            headroom_pct: Math.max(0, limit.max_exposure_pct - pct).toFixed(2),
        };
    }

    runStressTest(scenario_id, current_capital_usd) {
        const scenario = STRESS_SCENARIOS.scenarios.find(s => s.id === scenario_id);
        if (!scenario) return { error: `Unknown scenario: ${scenario_id}` };

        // Simplified impact calculation
        const impactMultiplier = scenario.severity === 'EXTREME' ? 0.60 : 0.35;
        const estimated_loss = current_capital_usd * impactMultiplier;
        const post_stress_capital = current_capital_usd - estimated_loss;
        const floor = CAPITAL_ADEQUACY.capital_floor.min_absolute_usd;

        return {
            scenario,
            current_capital: current_capital_usd,
            estimated_loss: Math.round(estimated_loss),
            post_stress_capital: Math.round(post_stress_capital),
            capital_floor: floor,
            passes: post_stress_capital >= floor,
            shortfall: post_stress_capital < floor ? Math.round(floor - post_stress_capital) : 0,
            verdict: post_stress_capital >= floor ? 'PASS — capital adequate post-stress' : 'FAIL — capital injection required',
        };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getCapitalFramework() { return CAPITAL_ADEQUACY; }
    getSettlementRisk() { return SETTLEMENT_RISK; }
    getInsuranceFramework() { return INSURANCE_FRAMEWORK; }
    getCounterpartyLimits() { return COUNTERPARTY_LIMITS; }
    getStressScenarios() { return STRESS_SCENARIOS; }

    getFullArchitecture() {
        return {
            title: 'Capital & Liability Architecture — Market Infrastructure Grade',
            version: '1.0',
            regulatory_models: ['Basel III', 'EMIR', 'CPMI-IOSCO PFMI'],
            capital: CAPITAL_ADEQUACY,
            settlement: SETTLEMENT_RISK,
            insurance: INSURANCE_FRAMEWORK,
            counterparty: COUNTERPARTY_LIMITS,
            stress_testing: STRESS_SCENARIOS,
        };
    }
}

module.exports = new CapitalLiabilityEngine();
