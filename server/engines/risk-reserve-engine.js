/**
 * TrustChecker — Risk Reserve + Settlement Safeguards Engine v1.0
 * Fraud Reserve, Reversal Pool, Chargeback Protocol, Settlement Insurance
 * 
 * Every transaction fee contributes to reserves that protect against:
 *   1. Fraudulent verifications (false positives/negatives)
 *   2. Carbon credit reversals (invalidated offsets)
 *   3. NFT certificate disputes
 *   4. Chargeback from payment processors
 *   5. Regulatory fines / penalties
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// RESERVE POLICY
// ═══════════════════════════════════════════════════════════════════

const RESERVE_POLICY = {
    fraud_reserve: {
        name: 'Fraud Reserve',
        contribution_pct: 3,        // 3% of all transaction revenue
        min_balance: 10000,         // minimum $10K
        max_claim_pct: 50,          // max 50% of reserve per single claim
        description: 'Covers fraudulent verification claims, counterfeit disputes',
    },
    reversal_pool: {
        name: 'Carbon Reversal Pool',
        contribution_pct: 5,        // 5% of carbon transaction revenue
        min_balance: 25000,
        max_claim_pct: 30,
        description: 'Covers invalidated carbon credits, baseline recalculations',
    },
    chargeback_reserve: {
        name: 'Chargeback Reserve',
        contribution_pct: 2,
        min_balance: 5000,
        max_claim_pct: 100,         // fully covers chargebacks
        description: 'Covers payment processor chargebacks and billing disputes',
    },
    regulatory_reserve: {
        name: 'Regulatory Reserve',
        contribution_pct: 1,
        min_balance: 50000,
        max_claim_pct: 25,
        description: 'Covers potential regulatory fines, compliance penalties',
    },
    insurance_pool: {
        name: 'Settlement Insurance',
        contribution_pct: 2,
        min_balance: 100000,
        max_claim_pct: 10,
        description: 'Self-insurance for catastrophic settlement failures',
    },
};

// ═══════════════════════════════════════════════════════════════════
// CHARGEBACK PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const CHARGEBACK_PROTOCOL = {
    investigation_sla_hours: 48,
    max_resolution_days: 30,
    auto_approve_below: 50,        // auto-approve claims < $50
    require_evidence_above: 100,   // require evidence for claims > $100
    escalation_thresholds: {
        tier1: { max_amount: 500, approver: 'ops_manager' },
        tier2: { max_amount: 5000, approver: 'risk_officer' },
        tier3: { max_amount: null, approver: 'super_admin' },
    },
    statuses: ['submitted', 'investigating', 'evidence_requested', 'approved', 'denied', 'paid_out'],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class RiskReserveEngine {
    constructor() {
        this.balances = {
            fraud_reserve: 0,
            reversal_pool: 0,
            chargeback_reserve: 0,
            regulatory_reserve: 0,
            insurance_pool: 0,
        };
        this.contributions = [];
        this.claims = [];
        this.chargebacks = [];
    }

    // ─── Contribute to reserves from transaction revenue ──────────

    contribute(totalTxRevenue, breakdown = {}) {
        const contributions = {};
        let totalContributed = 0;

        for (const [reserveId, policy] of Object.entries(RESERVE_POLICY)) {
            // Carbon reversal pool only takes from carbon revenue
            let base = totalTxRevenue;
            if (reserveId === 'reversal_pool') base = breakdown.carbon_revenue || totalTxRevenue * 0.15;

            const amount = Math.round(base * policy.contribution_pct) / 100;
            this.balances[reserveId] += amount;
            contributions[reserveId] = { amount: this._round(amount), new_balance: this._round(this.balances[reserveId]) };
            totalContributed += amount;
        }

        const record = {
            id: uuidv4(),
            total_tx_revenue: this._round(totalTxRevenue),
            total_contributed: this._round(totalContributed),
            contributions,
            timestamp: new Date().toISOString(),
        };
        this.contributions.push(record);
        return record;
    }

    // ─── File a claim against a reserve ───────────────────────────

    fileClaim(reserveId, amount, reason, claimant, evidence = null) {
        const policy = RESERVE_POLICY[reserveId];
        if (!policy) return { error: `Invalid reserve: ${reserveId}`, available: Object.keys(RESERVE_POLICY) };

        const maxClaim = this.balances[reserveId] * policy.max_claim_pct / 100;
        if (amount > maxClaim) {
            return { error: `Claim $${amount} exceeds max ${policy.max_claim_pct}% ($${this._round(maxClaim)}) of ${policy.name}` };
        }

        // Determine approval tier
        let approver = 'auto';
        let autoApprove = amount <= CHARGEBACK_PROTOCOL.auto_approve_below;
        if (!autoApprove) {
            for (const [tier, rule] of Object.entries(CHARGEBACK_PROTOCOL.escalation_thresholds)) {
                if (rule.max_amount === null || amount <= rule.max_amount) {
                    approver = rule.approver;
                    break;
                }
            }
        }

        const claim = {
            id: uuidv4(),
            reserve_id: reserveId,
            reserve_name: policy.name,
            amount: this._round(amount),
            reason,
            claimant,
            evidence,
            status: autoApprove ? 'approved' : 'submitted',
            requires_evidence: amount > CHARGEBACK_PROTOCOL.require_evidence_above && !evidence,
            approver,
            investigation_deadline: new Date(Date.now() + CHARGEBACK_PROTOCOL.investigation_sla_hours * 3600000).toISOString(),
            resolution_deadline: new Date(Date.now() + CHARGEBACK_PROTOCOL.max_resolution_days * 86400000).toISOString(),
            filed_at: new Date().toISOString(),
        };

        if (autoApprove) {
            this.balances[reserveId] -= amount;
            claim.paid_at = new Date().toISOString();
            claim.status = 'paid_out';
        }

        this.claims.push(claim);
        return { status: claim.status, claim };
    }

    // ─── Approve/Deny a pending claim ─────────────────────────────

    resolveClaim(claimId, decision, resolvedBy) {
        const claim = this.claims.find(c => c.id === claimId);
        if (!claim) return { error: 'Claim not found' };
        if (claim.status === 'paid_out' || claim.status === 'denied') return { error: `Claim already ${claim.status}` };

        if (decision === 'approve') {
            this.balances[claim.reserve_id] -= claim.amount;
            claim.status = 'paid_out';
            claim.paid_at = new Date().toISOString();
        } else {
            claim.status = 'denied';
            claim.denial_reason = resolvedBy.reason || 'Insufficient evidence';
        }

        claim.resolved_by = resolvedBy.user || resolvedBy;
        claim.resolved_at = new Date().toISOString();
        return { status: claim.status, claim };
    }

    // ─── Reserve Health ───────────────────────────────────────────

    getReserveHealth() {
        const health = {};
        let totalBalance = 0;

        for (const [id, policy] of Object.entries(RESERVE_POLICY)) {
            const balance = this.balances[id];
            totalBalance += balance;
            const funded = balance >= policy.min_balance;
            health[id] = {
                name: policy.name,
                balance: this._round(balance),
                min_required: policy.min_balance,
                funded_pct: this._round(Math.min(balance / policy.min_balance * 100, 100)),
                status: funded ? 'funded' : balance > 0 ? 'underfunded' : 'empty',
                contribution_rate_pct: policy.contribution_pct,
            };
        }

        const funded = Object.values(health).filter(h => h.status === 'funded').length;
        return {
            overall_status: funded === 5 ? 'fully_funded' : funded >= 3 ? 'partially_funded' : 'critical',
            total_reserves: this._round(totalBalance),
            reserves: health,
            claims_summary: {
                total: this.claims.length,
                pending: this.claims.filter(c => c.status === 'submitted' || c.status === 'investigating').length,
                paid: this.claims.filter(c => c.status === 'paid_out').length,
                denied: this.claims.filter(c => c.status === 'denied').length,
                total_paid_out: this._round(this.claims.filter(c => c.status === 'paid_out').reduce((a, c) => a + c.amount, 0)),
            },
        };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getReservePolicy() { return RESERVE_POLICY; }
    getChargebackProtocol() { return CHARGEBACK_PROTOCOL; }
    getClaims(limit = 20) { return this.claims.slice(-limit).reverse(); }
    getContributions(limit = 20) { return this.contributions.slice(-limit).reverse(); }

    _round(n) { return Math.round(n * 100) / 100; }
}

module.exports = new RiskReserveEngine();
