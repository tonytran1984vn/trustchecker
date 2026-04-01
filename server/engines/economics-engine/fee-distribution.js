/**
 * TrustChecker — Agentic Fee Distribution Engine v3.0
 * Infrastructure Monetization: Bounded Dynamic Split & Controlled Autonomy
 *
 * Revenue Flow:
 *   Transaction Fee → Platform (70%) → Validator Pool (20%) → Reserve (10%)
 *   Validator Pool → Distributed by: trust_score × rounds_participated × region_weight
 *   Partner Rev → Distributed by: referral volume × partner tier
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUTION POLICY
// ═══════════════════════════════════════════════════════════════════

const DISTRIBUTION_POLICY = {
    // Legacy mapping (maintained for fallback)
    platform_pct: 70,
    validator_pool_pct: 20,
    reserve_pct: 10,

    // v3.0 Bounded Dynamic Split Engine Guardrails
    dynamic_bounds: {
        reserve: { min: 15, max: 35 }, // Reserve Floor: 15%
        ops_platform: { min: 5, max: 15 },
        distribution: { min: 50, max: 75 }, // Validators + Partners
    },

    // Validator distribution weights
    validator_weights: {
        trust_score: 0.4, // 40% weight on trust score
        rounds_participated: 0.35, // 35% weight on participation
        uptime: 0.15, // 15% weight on uptime
        region_scarcity: 0.1, // 10% bonus for under-served regions
    },
    // Minimum payout threshold (USD)
    min_payout: 10.0,
    // Payout cycle
    payout_cycle: 'monthly',
};

// ═══════════════════════════════════════════════════════════════════
// PARTNER TIERS
// ═══════════════════════════════════════════════════════════════════

const PARTNER_TIERS = {
    bronze: {
        name: 'Bronze',
        min_referrals: 0,
        max_referrals: 50,
        revenue_share_pct: 10,
        bonus_pct: 0,
    },
    silver: {
        name: 'Silver',
        min_referrals: 51,
        max_referrals: 200,
        revenue_share_pct: 15,
        bonus_pct: 2,
    },
    gold: {
        name: 'Gold',
        min_referrals: 201,
        max_referrals: 1000,
        revenue_share_pct: 20,
        bonus_pct: 5,
    },
    platinum: {
        name: 'Platinum',
        min_referrals: 1001,
        max_referrals: null,
        revenue_share_pct: 25,
        bonus_pct: 10,
    },
};

// ═══════════════════════════════════════════════════════════════════
// REGION SCARCITY WEIGHTS
// ═══════════════════════════════════════════════════════════════════

const REGION_SCARCITY = {
    'ap-southeast': 1.0,
    'ap-east': 1.0,
    'eu-west': 0.8, // well-served → lower scarcity bonus
    'eu-north': 0.9,
    'us-east': 0.7, // most served
    'us-west': 0.8,
    'me-south': 1.5, // under-served → higher bonus
    'af-south': 2.0, // most under-served
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class FeeDistributionEngine {
    constructor() {
        this.distributions = []; // distribution records
        this.validatorBalances = new Map(); // node_id → { balance, total_earned, payouts }
        this.partnerBalances = new Map(); // partner_id → { balance, tier, referrals }
        this.payoutHistory = [];
    }

    // ─── Calculate Validator Distribution ─────────────────────────

    calculateValidatorDistribution(totalRevenue, validators = []) {
        const pool = (totalRevenue * DISTRIBUTION_POLICY.validator_pool_pct) / 100;
        if (validators.length === 0 || pool <= 0) {
            return { pool, validators: [], message: 'No eligible validators' };
        }

        const weights = DISTRIBUTION_POLICY.validator_weights;

        // Calculate raw scores
        const scored = validators.map(v => {
            const regionWeight = REGION_SCARCITY[v.region] || 1.0;
            const rawScore =
                (v.trust_score / 100) * weights.trust_score +
                (Math.min(v.rounds_participated, 1000) / 1000) * weights.rounds_participated +
                (v.uptime_pct / 100) * weights.uptime +
                (regionWeight / 2.0) * weights.region_scarcity;
            return { ...v, raw_score: rawScore, region_weight: regionWeight };
        });

        // Normalize scores
        const totalScore = scored.reduce((a, s) => a + s.raw_score, 0);
        const distributed = scored
            .map(s => {
                const share = totalScore > 0 ? s.raw_score / totalScore : 1 / scored.length;
                const amount = Math.round(pool * share * 100) / 100;
                return {
                    node_id: s.node_id,
                    name: s.name || s.node_id,
                    region: s.region,
                    trust_score: s.trust_score,
                    rounds: s.rounds_participated,
                    uptime: s.uptime_pct,
                    region_weight: s.region_weight,
                    raw_score: Math.round(s.raw_score * 10000) / 10000,
                    share_pct: Math.round(share * 10000) / 100,
                    amount,
                };
            })
            .sort((a, b) => b.amount - a.amount);

        // Update balances
        for (const d of distributed) {
            const bal = this.validatorBalances.get(d.node_id) || { balance: 0, total_earned: 0, payouts: 0 };
            bal.balance += d.amount;
            bal.total_earned += d.amount;
            this.validatorBalances.set(d.node_id, bal);
        }

        const record = {
            id: uuidv4(),
            type: 'validator_distribution',
            total_revenue: totalRevenue,
            pool,
            validators_count: distributed.length,
            distributions: distributed,
            period: new Date().toISOString().slice(0, 7),
            created_at: new Date().toISOString(),
        };
        this.distributions.push(record);

        return record;
    }

    // ─── Partner Revenue Sharing ──────────────────────────────────

    calculatePartnerRevenue(partnerId, referralVolume, transactionRevenue) {
        // Determine tier
        let currentTier = 'bronze';
        for (const [tier, def] of Object.entries(PARTNER_TIERS)) {
            if (
                referralVolume >= def.min_referrals &&
                (def.max_referrals === null || referralVolume <= def.max_referrals)
            ) {
                currentTier = tier;
            }
        }

        const tierDef = PARTNER_TIERS[currentTier];
        const baseShare = (transactionRevenue * tierDef.revenue_share_pct) / 100;
        const bonus = (baseShare * tierDef.bonus_pct) / 100;
        const total = Math.round((baseShare + bonus) * 100) / 100;

        // Update partner balance
        const bal = this.partnerBalances.get(partnerId) || {
            balance: 0,
            total_earned: 0,
            tier: currentTier,
            referrals: 0,
        };
        bal.balance += total;
        bal.total_earned += total;
        bal.tier = currentTier;
        bal.referrals = referralVolume;
        this.partnerBalances.set(partnerId, bal);

        return {
            partner_id: partnerId,
            tier: currentTier,
            tier_info: tierDef,
            referral_volume: referralVolume,
            transaction_revenue: transactionRevenue,
            base_share: Math.round(baseShare * 100) / 100,
            bonus: Math.round(bonus * 100) / 100,
            total_payout: total,
            current_balance: bal.balance,
        };
    }

    // ─── Bounded Dynamic Split (Agentic v3.0) ─────────────────────

    resolveAgenticSplit(totalRevenue, systemState = {}) {
        const { reserve_ratio = 20, volatility_spike = false, admin_override = null } = systemState;
        const bounds = DISTRIBUTION_POLICY.dynamic_bounds;

        let activeSplit = { reserve: 20, ops: 15, distribution: 65 };
        let mode = 'STANDARD';
        const flags = [];

        if (admin_override) {
            activeSplit = admin_override;
            mode = 'MANUAL_OVERRIDE';
            flags.push('ADMIN_OVERRIDE_ACTIVE');
        } else if (reserve_ratio < bounds.reserve.min || volatility_spike) {
            // Emergency Mode Trigger
            activeSplit.reserve = 50; // Priority fill
            activeSplit.ops = 10;
            activeSplit.distribution = 40; // Reduced yield to restore solvency
            mode = 'EMERGENCY_RESERVE_PRIORITY';
            flags.push('EMERGENCY_MODE_ACTIVATED: Yield Restricted');
        } else {
            // Dynamic auto-balance based on reserve health
            // If reserve is healthy (e.g. 25%), we can maximize distribution (yield)
            if (reserve_ratio > 25) {
                activeSplit.reserve = bounds.reserve.min; // 15
                activeSplit.ops = 10;
                activeSplit.distribution = bounds.distribution.max; // 75
                flags.push('OPTIMIZED_YIELD_MODE');
            } else {
                // Typical safe balance
                activeSplit.reserve = 25;
                activeSplit.ops = 10;
                activeSplit.distribution = 65;
            }
        }

        return {
            total_revenue: totalRevenue,
            mode,
            flags,
            split_pct: activeSplit,
            allocations: {
                reserve: Math.round(totalRevenue * (activeSplit.reserve / 100) * 100) / 100,
                ops: Math.round(totalRevenue * (activeSplit.ops / 100) * 100) / 100,
                distribution: Math.round(totalRevenue * (activeSplit.distribution / 100) * 100) / 100,
            },
            audit_log: `Split resolved at ${new Date().toISOString()} under mode ${mode} with Reserve Ratio: ${reserve_ratio}%`,
        };
    }

    getRevenueBreakdown(totalRevenue, systemState = {}) {
        // Now redirects to the Agentic Splitter instead of the static logic
        return this.resolveAgenticSplit(totalRevenue, systemState);
    }

    // ─── Process Payout ───────────────────────────────────────────

    processPayout(entityType, entityId) {
        let balance;
        if (entityType === 'validator') {
            balance = this.validatorBalances.get(entityId);
        } else if (entityType === 'partner') {
            balance = this.partnerBalances.get(entityId);
        }
        if (!balance) return { error: `No balance found for ${entityType}:${entityId}` };
        if (balance.balance < DISTRIBUTION_POLICY.min_payout) {
            return {
                error: `Balance $${balance.balance.toFixed(2)} below minimum payout $${DISTRIBUTION_POLICY.min_payout}`,
            };
        }

        const payout = {
            id: uuidv4(),
            entity_type: entityType,
            entity_id: entityId,
            amount: balance.balance,
            status: 'processed',
            processed_at: new Date().toISOString(),
        };

        balance.payouts = (balance.payouts || 0) + 1;
        balance.balance = 0;
        this.payoutHistory.push(payout);

        return { status: 'payout_processed', payout };
    }

    // ─── Balances Overview ────────────────────────────────────────

    getValidatorBalances() {
        const entries = [];
        for (const [nodeId, bal] of this.validatorBalances) {
            entries.push({ node_id: nodeId, ...bal });
        }
        return {
            total_unpaid: entries.reduce((a, e) => a + e.balance, 0),
            total_earned: entries.reduce((a, e) => a + e.total_earned, 0),
            validators: entries.sort((a, b) => b.total_earned - a.total_earned),
        };
    }

    getPartnerBalances() {
        const entries = [];
        for (const [partnerId, bal] of this.partnerBalances) {
            entries.push({ partner_id: partnerId, ...bal });
        }
        return {
            total_unpaid: entries.reduce((a, e) => a + e.balance, 0),
            total_earned: entries.reduce((a, e) => a + e.total_earned, 0),
            partners: entries.sort((a, b) => b.total_earned - a.total_earned),
        };
    }

    getPayoutHistory(limit = 20) {
        return this.payoutHistory.slice(-limit).reverse();
    }

    // ─── Getters ──────────────────────────────────────────────────

    getDistributionPolicy() {
        return DISTRIBUTION_POLICY;
    }
    getPartnerTiers() {
        return PARTNER_TIERS;
    }
    getRegionScarcity() {
        return REGION_SCARCITY;
    }
    getDistributionHistory(limit = 20) {
        return this.distributions.slice(-limit).reverse();
    }
}

module.exports = new FeeDistributionEngine();
