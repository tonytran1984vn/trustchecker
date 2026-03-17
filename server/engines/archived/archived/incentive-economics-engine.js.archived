/**
 * TrustChecker — Economic Incentive & Slashing Engine v1.0
 * TRUST GRAPH → ECONOMIC ENFORCEMENT
 * 
 * Without economic incentives, Trust Graph is just an analytics graph.
 * This engine makes trust ENFORCEABLE through:
 *   - Reputation staking (validators put "skin in the game")
 *   - Slashing mechanics (dishonest behavior = economic loss)
 *   - Reward distribution (honest = profitable)
 *   - Game theory equilibrium (Nash: honest is dominant strategy)
 * 
 * Inspired by: Ethereum PoS economics, Chainlink staking, Eigenlayer
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// 1. REPUTATION STAKING MODEL
// ═══════════════════════════════════════════════════════════════════

const STAKING_MODEL = {
    title: 'Reputation Staking — Skin in the Game',

    stake_types: {
        reputation_stake: {
            description: 'Trust score as economic stake — earned through honest verification',
            initial_score: 50,       // New validators start at 50/100
            max_score: 100,
            min_operational: 20,     // Below 20 → suspended
            earning_rate: 0.1,       // +0.1 per honest verification round
            decay_rate: 0.01,        // -0.01 per day of inactivity (use it or lose it)
        },
        economic_stake: {
            description: 'USD-equivalent deposit — slashable collateral',
            min_usd: 1000,           // Minimum $1,000 deposit
            recommended_usd: 5000,
            max_usd: 100000,
            locked_period_days: 30,  // Cannot withdraw for 30 days
            exit_notice_days: 14,    // 14-day notice before withdrawal
        },
    },

    staking_tiers: [
        { tier: 'Observer', min_reputation: 0, min_stake_usd: 0, verification_weight: 0, reward_multiplier: 0 },
        { tier: 'Apprentice', min_reputation: 20, min_stake_usd: 1000, verification_weight: 0.5, reward_multiplier: 0.5 },
        { tier: 'Validator', min_reputation: 50, min_stake_usd: 2500, verification_weight: 1.0, reward_multiplier: 1.0 },
        { tier: 'Senior', min_reputation: 75, min_stake_usd: 5000, verification_weight: 1.5, reward_multiplier: 1.5 },
        { tier: 'Guardian', min_reputation: 90, min_stake_usd: 10000, verification_weight: 2.0, reward_multiplier: 2.0 },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. SLASHING MECHANICS (PENALTY TIERS)
// ═══════════════════════════════════════════════════════════════════

const SLASHING_TIERS = {
    title: 'Graduated Slashing — Proportional to Offense Severity',

    offenses: {
        // Tier 0: Warning
        late_vote: {
            tier: 0,
            severity: 'WARNING',
            reputation_slash_pct: 0,
            economic_slash_pct: 0,
            description: 'Vote submitted after round timeout but within grace period',
            grace_count: 5,   // 5 warnings before escalation to Tier 1
            recovery: 'Auto — no action needed',
        },
        // Tier 1: Minor
        missed_round: {
            tier: 1,
            severity: 'MINOR',
            reputation_slash: 0.5,    // -0.5 reputation
            economic_slash_pct: 0,
            description: 'Failed to participate in assigned consensus round',
            threshold: '3 consecutive misses',
            recovery: '24h good behavior → auto-recover',
        },
        extended_downtime: {
            tier: 1,
            severity: 'MINOR',
            reputation_slash: 2.0,
            economic_slash_pct: 0.5,  // 0.5% of stake
            description: 'Node offline > 4 hours without maintenance notice',
            recovery: 'Return to service + 48h monitoring',
        },
        // Tier 2: Moderate
        incorrect_vote: {
            tier: 2,
            severity: 'MODERATE',
            reputation_slash: 5.0,
            economic_slash_pct: 2.0,
            description: 'Vote against provably correct consensus multiple times',
            threshold: '3 incorrect votes in 24h',
            review: 'Validator Council review within 7 days',
            appeal_days: 14,
        },
        sla_breach: {
            tier: 2,
            severity: 'MODERATE',
            reputation_slash: 3.0,
            economic_slash_pct: 1.0,
            description: 'Failed to meet committed SLA metrics',
            recovery: 'Corrective action plan within 72h',
        },
        // Tier 3: Severe
        coordinated_rejection: {
            tier: 3,
            severity: 'SEVERE',
            reputation_slash: 25.0,
            economic_slash_pct: 10.0,
            description: 'Statistical evidence of coordinated rejection pattern',
            detection: 'Correlation analysis: >80% vote alignment with specific group',
            review: 'GGC emergency review',
            appeal_days: 14,
        },
        data_integrity_violation: {
            tier: 3,
            severity: 'SEVERE',
            reputation_slash: 50.0,
            economic_slash_pct: 25.0,
            description: 'Submitting falsified verification data',
            review: 'Immediate suspension + forensic investigation',
            appeal_days: 30,
        },
        // Tier 4: Critical (Permanent)
        fraud_attempt: {
            tier: 4,
            severity: 'CRITICAL',
            reputation_slash: 100.0, // Full reputation wipe
            economic_slash_pct: 100.0, // Full stake confiscation
            description: 'Proven fraud: forging results, key compromise, collusion',
            review: 'Permanent ban — no appeal',
            confiscated_to: 'insurance_reserve_pool',
            legal_action: 'May trigger legal proceedings',
        },
    },

    constitutional_limits: {
        max_slash_per_incident_pct: 50,        // Max 50% of stake per incident (except Tier 4)
        cooldown_between_slashes_hours: 24,    // Cannot slash same validator twice in 24h
        max_cumulative_daily_slash_pct: 30,    // Max 30% total daily slash across all incidents
        evidence_required: true,               // No slashing without published evidence
        appeal_window: true,                   // All Tier 1-3 have appeal rights
        slashed_funds_destination: 'Confiscated → 50% insurance pool, 50% honest validator reward pool',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. REWARD DISTRIBUTION (HONEST BEHAVIOR INCENTIVE)
// ═══════════════════════════════════════════════════════════════════

const REWARD_MODEL = {
    title: 'Honest Behavior Reward Distribution',

    revenue_allocation: {
        validator_pool_pct: 20,        // 20% of platform revenue → validator rewards
        honest_bonus_pool_pct: 5,      // 5% → bonus pool for highest-integrity validators
        slashed_redistribution_pct: 50, // 50% of slashed funds → honest validators
    },

    reward_formula: {
        description: 'Reward = BaseReward × TrustMultiplier × UptimeBonus × RegionBonus',
        base_reward: 'pro-rata share of validator pool based on verification volume',
        trust_multiplier: 'reputation_score / 100 (range: 0.2 - 1.0)',
        uptime_bonus: '1.0 + (uptime_pct - 95) × 0.02 (max 1.10)',
        region_bonus: 'Under-served regions get 1.2x - 1.5x multiplier',
    },

    vesting: {
        earned_rewards: 'Immediately claimable',
        bonus_rewards: '30-day vesting (forfeited if slashed during vesting)',
        slashed_redistribution: '14-day vesting',
    },

    anti_gaming: [
        'Minimum verification volume required to earn rewards (no free-riding)',
        'Sybil resistance: each node requires unique hardware attestation',
        'Geographic diversity requirement: rewards capped if region is over-saturated',
        'Time-weighted: longer tenure = higher trust multiplier (anti-churn)',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. GAME THEORY EQUILIBRIUM
// ═══════════════════════════════════════════════════════════════════

const GAME_THEORY = {
    title: 'Nash Equilibrium Analysis — Honest is Dominant Strategy',

    payoff_matrix: {
        description: 'Expected value analysis for validator behavior',
        honest: {
            expected_reward_monthly_usd: 500,
            reputation_gain: '+3.0/month',
            stake_risk: 0,
            long_term_value: 'Compounding trust → higher tier → higher rewards',
        },
        lazy: {
            expected_reward_monthly_usd: 200,    // Lower volume = lower pro-rata
            reputation_gain: '-0.3/month',        // Decay from missed rounds
            stake_risk: '0.5% per incident',
            long_term_value: 'Declining tier → eventual suspension',
        },
        malicious: {
            expected_reward_monthly_usd: 0,
            reputation_gain: '-25 to -100',
            stake_risk: '10-100% confiscation',
            long_term_value: 'Permanent ban + legal risk',
            detection_probability: '> 95% within 7 days (statistical + hash verification)',
        },
    },

    equilibrium: {
        nash: 'Honest verification is strictly dominant strategy',
        reasoning: [
            'Cost of cheating (stake loss + ban) >> Benefit of cheating (near zero)',
            'Detection probability > 95% makes cheating negative EV',
            'Reputation compounds → honest validators earn exponentially more over time',
            'Collusion requires majority → detected by correlation analysis before quorum',
        ],
        mechanism_design: 'Incentive Compatible (IC) + Individual Rational (IR)',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 5. NODE TRUST ECONOMICS
// ═══════════════════════════════════════════════════════════════════

const NODE_ECONOMICS = {
    operating_costs: {
        hardware: { monthly_usd: 50, description: 'VPS/Cloud instance' },
        bandwidth: { monthly_usd: 20, description: 'Data transfer' },
        maintenance: { monthly_usd: 10, description: 'Monitoring + updates' },
        stake_opportunity_cost: { monthly_usd: 25, description: '5% annual on $5K stake' },
    },
    total_monthly_cost_usd: 105,

    breakeven_analysis: {
        min_verification_volume: 200,   // Rounds per month to break even
        at_base_tier: 'Breakeven at ~200 verifications/month',
        at_senior_tier: 'Profitable at ~100 verifications/month (1.5x multiplier)',
        at_guardian_tier: 'Highly profitable at ~75 verifications/month (2.0x multiplier)',
    },

    roi_projection: {
        year_1: { roi_pct: 15, assumes: 'Validator tier, avg volume' },
        year_2: { roi_pct: 35, assumes: 'Senior tier (reputation compounds)' },
        year_3: { roi_pct: 60, assumes: 'Guardian tier + bonus pool access' },
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class IncentiveEconomicsEngine {

    calculateSlashing(offense, current_reputation, current_stake_usd) {
        const rule = SLASHING_TIERS.offenses[offense];
        if (!rule) return { error: `Unknown offense: ${offense}` };

        const limits = SLASHING_TIERS.constitutional_limits;
        let rep_slash = Math.min(rule.reputation_slash || 0, current_reputation);
        let eco_slash_usd = current_stake_usd * ((rule.economic_slash_pct || 0) / 100);

        // Apply constitutional limit (except Tier 4)
        if (rule.tier < 4) {
            const max_eco = current_stake_usd * (limits.max_slash_per_incident_pct / 100);
            eco_slash_usd = Math.min(eco_slash_usd, max_eco);
        }

        return {
            offense,
            tier: rule.tier,
            severity: rule.severity,
            reputation: { before: current_reputation, slash: rep_slash, after: Math.max(0, current_reputation - rep_slash) },
            economic: { before: current_stake_usd, slash_usd: Math.round(eco_slash_usd), after: Math.round(current_stake_usd - eco_slash_usd) },
            recovery: rule.recovery || 'N/A',
            appeal_days: rule.appeal_days || 0,
            confiscated_to: eco_slash_usd > 0 ? SLASHING_TIERS.constitutional_limits.slashed_funds_destination : null,
        };
    }

    calculateReward(verification_volume, reputation_score, uptime_pct, region, total_pool_usd) {
        const base = (verification_volume / 1000) * (total_pool_usd / 100);
        const trust_mult = Math.max(0.2, reputation_score / 100);
        const uptime_bonus = uptime_pct >= 95 ? 1.0 + (uptime_pct - 95) * 0.02 : 0.8;
        const region_mult = ['AF-S', 'ME-S', 'AP-SE'].includes(region) ? 1.3 : 1.0;

        const reward = base * trust_mult * uptime_bonus * region_mult;

        return {
            verification_volume,
            reputation_score,
            uptime_pct,
            region,
            pool_usd: total_pool_usd,
            base_reward: Math.round(base * 100) / 100,
            trust_multiplier: trust_mult.toFixed(2),
            uptime_bonus: uptime_bonus.toFixed(2),
            region_bonus: region_mult.toFixed(1),
            final_reward_usd: Math.round(reward * 100) / 100,
        };
    }

    getStakingTier(reputation_score, stake_usd) {
        let current = STAKING_MODEL.staking_tiers[0];
        for (const tier of STAKING_MODEL.staking_tiers) {
            if (reputation_score >= tier.min_reputation && stake_usd >= tier.min_stake_usd) {
                current = tier;
            }
        }
        return current;
    }

    getNodeEconomics() { return NODE_ECONOMICS; }
    getGameTheory() { return GAME_THEORY; }
    getStakingModel() { return STAKING_MODEL; }
    getSlashingTiers() { return SLASHING_TIERS; }
    getRewardModel() { return REWARD_MODEL; }

    getFullDesign() {
        return {
            title: 'Economic Incentive & Slashing Design — Trust Enforcement Layer',
            version: '1.0',
            principle: 'Trust Graph + Economic Enforcement = Real Infrastructure',
            staking: STAKING_MODEL,
            slashing: SLASHING_TIERS,
            rewards: REWARD_MODEL,
            game_theory: GAME_THEORY,
            node_economics: NODE_ECONOMICS,
        };
    }
}

module.exports = new IncentiveEconomicsEngine();
