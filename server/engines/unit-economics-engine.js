/**
 * TrustChecker — Unit Economics + Cost Structure Engine v1.0
 * Models TRUE cost of every transaction: compute, storage, blockchain gas, bandwidth, support
 * 
 * Purpose: Answer at any scale — "are we profitable per transaction?"
 * 
 * Cost Components per Transaction:
 *   1. Compute (CPU time per verification)
 *   2. Storage (DB rows, blob storage, audit trail)
 *   3. Blockchain Gas (on-chain sealing, NFT mint, carbon settlement)
 *   4. Bandwidth (API calls, webhook delivery, CDN)
 *   5. Support & Ops (pro-rated SLA-based)
 *   6. Compliance (audit, regulatory overhead)
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// COST STRUCTURE — per unit costs (USD)
// ═══════════════════════════════════════════════════════════════════

const COST_STRUCTURE = {
    compute: {
        name: 'Compute (CPU)',
        // Cost per 100ms of CPU time
        per_100ms: 0.000004,
        estimates: {
            qr_verification: { cpu_ms: 50, cost: 0.000002 },
            carbon_settlement: { cpu_ms: 500, cost: 0.00002 },
            nft_mint: { cpu_ms: 200, cost: 0.000008 },
            blockchain_seal: { cpu_ms: 150, cost: 0.000006 },
            risk_scoring: { cpu_ms: 300, cost: 0.000012 },
            ml_inference: { cpu_ms: 800, cost: 0.000032 },
            consensus_round: { cpu_ms: 1000, cost: 0.00004 },
        },
    },
    storage: {
        name: 'Storage',
        // Per GB per month
        db_per_gb_month: 0.10,      // PostgreSQL managed
        blob_per_gb_month: 0.023,   // S3-compatible
        audit_per_gb_month: 0.025,  // Immutable audit (write-once, append-only)
        estimates: {
            qr_verification: { bytes: 512, cost: 0.0000000016 },
            carbon_settlement: { bytes: 4096, cost: 0.0000000128 },
            nft_mint: { bytes: 8192, cost: 0.0000000256 },
            blockchain_seal: { bytes: 2048, cost: 0.0000000064 },
            audit_entry: { bytes: 1024, cost: 0.0000000032 },
            evidence_file_avg: { bytes: 1048576, cost: 0.0000032 },    // 1 MB
        },
    },
    blockchain: {
        name: 'Blockchain (Gas/Fees)',
        // External chain interaction costs
        estimates: {
            ethereum_seal: { gas_gwei: 50000, eth_price_usd: 3500, cost: 0.175 },
            polygon_seal: { gas_gwei: 50000, matic_price_usd: 0.8, cost: 0.00004 },
            base_seal: { gas_gwei: 50000, eth_price_usd: 3500, cost: 0.001 },      // L2
            solana_seal: { sol_lamports: 5000, sol_price_usd: 150, cost: 0.00005 },
            nft_mint_polygon: { gas_gwei: 150000, cost: 0.00012 },
            nft_mint_base: { gas_gwei: 150000, cost: 0.003 },
            carbon_anchoring: { gas_gwei: 80000, cost: 0.00006 },   // Polygon
            // Default: using Polygon as primary chain → LOW COST
            default_seal: 0.0001,
            default_nft: 0.0005,
            default_carbon: 0.0002,
        },
        selected_chain: 'polygon',   // Primary chain for cost calculation
    },
    bandwidth: {
        name: 'Bandwidth',
        per_gb: 0.09,    // CDN/egress
        estimates: {
            api_call_avg: { bytes: 2048, cost: 0.00000018 },
            webhook_delivery: { bytes: 1024, cost: 0.00000009 },
            report_export: { bytes: 524288, cost: 0.0000047 },      // 512 KB
            qr_image_serve: { bytes: 8192, cost: 0.00000073 },
        },
    },
    support: {
        name: 'Support & Ops',
        // Monthly overhead, pro-rated per transaction
        monthly_base: {
            free: 0,
            starter: 200,       // basic email support staff cost
            pro: 500,           // priority support
            business: 1500,     // dedicated account manager
            enterprise: 5000,   // white-glove
        },
        per_incident: 25,      // average support ticket cost
    },
    compliance: {
        name: 'Compliance & Audit',
        annual_base: 50000,        // SOC 2, ISO 27001, auditor fees
        per_gdpr_request: 15,      // DSAR processing
        per_regulatory_report: 50, // automated reporting
        per_data_retention_gb: 0.05, // monthly retention cost
    },
};

// ═══════════════════════════════════════════════════════════════════
// MARGIN TARGETS
// ═══════════════════════════════════════════════════════════════════

const MARGIN_TARGETS = {
    gross_margin_pct: 75,        // target: 75% gross margin
    contribution_margin_pct: 60, // after variable costs
    break_even_warning_pct: 30,  // alert if margin drops below 30%
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class UnitEconomicsEngine {

    // ─── Per-Transaction Cost Breakdown ───────────────────────────

    calculateTransactionCost(type) {
        const compute = COST_STRUCTURE.compute.estimates[type]?.cost || 0;
        const storage = COST_STRUCTURE.storage.estimates[type]?.cost || 0;
        const audit = COST_STRUCTURE.storage.estimates.audit_entry.cost;
        const bandwidth = COST_STRUCTURE.bandwidth.estimates.api_call_avg.cost * 2; // req + response

        let blockchain = 0;
        if (type === 'nft_mint') blockchain = COST_STRUCTURE.blockchain.estimates.default_nft;
        else if (type === 'blockchain_seal') blockchain = COST_STRUCTURE.blockchain.estimates.default_seal;
        else if (type === 'carbon_settlement') blockchain = COST_STRUCTURE.blockchain.estimates.default_carbon;

        const totalCost = compute + storage + audit + bandwidth + blockchain;

        return {
            type,
            cost_breakdown: {
                compute: this._round(compute, 8),
                storage: this._round(storage, 8),
                audit_trail: this._round(audit, 8),
                bandwidth: this._round(bandwidth, 8),
                blockchain_gas: this._round(blockchain, 6),
            },
            total_cost: this._round(totalCost, 6),
            dominant_cost: blockchain > compute ? 'blockchain' : 'compute',
        };
    }

    // ─── Unit Economics at Scale ───────────────────────────────────

    calculateUnitEconomics(params) {
        const {
            plan = 'pro',
            monthly_verifications = 10000,
            monthly_nft = 100,
            monthly_carbon = 500,
            monthly_seals = 1000,
            monthly_api = 50000,
            billing_cycle = 'monthly',
        } = params;

        // Revenue side
        const txFees = require('./transaction-fee-engine');
        const pricingEngine = require('./pricing-engine');
        const planDef = pricingEngine.PLANS?.[plan];
        const subscriptionRev = planDef ? (billing_cycle === 'annual' ? (planDef.price_annual || 0) / 12 : (planDef.price_monthly || 0)) : 0;

        const txRevCalcs = {
            qr_verification: txFees.calculateFee('qr_verification', monthly_verifications),
            nft_certificate: txFees.calculateFee('nft_certificate', monthly_nft),
            carbon_settlement: txFees.calculateFee('carbon_settlement', monthly_carbon),
            blockchain_seal: txFees.calculateFee('blockchain_seal', monthly_seals),
            api_call_external: txFees.calculateFee('api_call_external', monthly_api),
        };

        const totalTxRevenue = Object.values(txRevCalcs).reduce((a, c) => a + (c.total_cost || 0), 0);
        const totalRevenue = subscriptionRev + totalTxRevenue;

        // Cost side
        const costs = {
            compute: this._round(
                (COST_STRUCTURE.compute.estimates.qr_verification.cost * monthly_verifications) +
                (COST_STRUCTURE.compute.estimates.nft_mint.cost * monthly_nft) +
                (COST_STRUCTURE.compute.estimates.carbon_settlement.cost * monthly_carbon) +
                (COST_STRUCTURE.compute.estimates.blockchain_seal.cost * monthly_seals) +
                (COST_STRUCTURE.compute.estimates.risk_scoring.cost * monthly_verifications * 0.1), 4
            ),
            storage: this._round(
                (COST_STRUCTURE.storage.estimates.qr_verification.cost * monthly_verifications) +
                (COST_STRUCTURE.storage.estimates.nft_mint.cost * monthly_nft) +
                (COST_STRUCTURE.storage.estimates.carbon_settlement.cost * monthly_carbon) +
                (COST_STRUCTURE.storage.estimates.audit_entry.cost * (monthly_verifications + monthly_nft + monthly_carbon + monthly_seals)), 4
            ),
            blockchain: this._round(
                (COST_STRUCTURE.blockchain.estimates.default_seal * monthly_seals) +
                (COST_STRUCTURE.blockchain.estimates.default_nft * monthly_nft) +
                (COST_STRUCTURE.blockchain.estimates.default_carbon * monthly_carbon), 4
            ),
            bandwidth: this._round(
                COST_STRUCTURE.bandwidth.estimates.api_call_avg.cost * monthly_api * 2, 4
            ),
            support: this._round(COST_STRUCTURE.support.monthly_base[plan] || 0, 2),
            compliance: this._round(COST_STRUCTURE.compliance.annual_base / 12, 2),
        };

        const totalCost = Object.values(costs).reduce((a, c) => a + c, 0);
        const grossProfit = totalRevenue - totalCost;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Validator pool (20% of tx revenue)
        const validatorPool = totalTxRevenue * 0.20;
        const reservePool = totalTxRevenue * 0.10;
        const netPlatformRevenue = totalRevenue - validatorPool - reservePool - totalCost;
        const netMargin = totalRevenue > 0 ? (netPlatformRevenue / totalRevenue) * 100 : 0;

        return {
            plan,
            billing_cycle,
            revenue: {
                subscription: this._round(subscriptionRev, 2),
                transaction_fees: this._round(totalTxRevenue, 2),
                total: this._round(totalRevenue, 2),
            },
            costs: {
                ...costs,
                total: this._round(totalCost, 2),
            },
            distribution: {
                validator_pool: this._round(validatorPool, 2),
                reserve_pool: this._round(reservePool, 2),
            },
            margins: {
                gross_profit: this._round(grossProfit, 2),
                gross_margin_pct: this._round(grossMargin, 1),
                net_platform_revenue: this._round(netPlatformRevenue, 2),
                net_margin_pct: this._round(netMargin, 1),
                target_gross_margin_pct: MARGIN_TARGETS.gross_margin_pct,
                healthy: grossMargin >= MARGIN_TARGETS.break_even_warning_pct,
                status: grossMargin >= MARGIN_TARGETS.gross_margin_pct ? 'excellent'
                    : grossMargin >= 50 ? 'good'
                        : grossMargin >= MARGIN_TARGETS.break_even_warning_pct ? 'warning'
                            : 'critical',
            },
            volume: { monthly_verifications, monthly_nft, monthly_carbon, monthly_seals, monthly_api },
            cost_per_verification: this._round(totalCost / Math.max(monthly_verifications, 1), 6),
            revenue_per_verification: this._round(totalRevenue / Math.max(monthly_verifications, 1), 6),
        };
    }

    // ─── Scale Projection ─────────────────────────────────────────

    projectScale(baseVolume, multipliers = [1, 10, 100, 1000]) {
        return multipliers.map(m => {
            const result = this.calculateUnitEconomics({
                plan: m >= 100 ? 'enterprise' : m >= 10 ? 'business' : 'pro',
                monthly_verifications: baseVolume * m,
                monthly_nft: Math.floor(baseVolume * m * 0.01),
                monthly_carbon: Math.floor(baseVolume * m * 0.05),
                monthly_seals: Math.floor(baseVolume * m * 0.1),
                monthly_api: baseVolume * m * 5,
            });
            return {
                scale: `${m}x`,
                monthly_verifications: baseVolume * m,
                revenue: result.revenue.total,
                cost: result.costs.total,
                gross_margin_pct: result.margins.gross_margin_pct,
                net_margin_pct: result.margins.net_margin_pct,
                cost_per_tx: result.cost_per_verification,
                status: result.margins.status,
            };
        });
    }

    // ─── Cost Structure Config ────────────────────────────────────

    getCostStructure() { return COST_STRUCTURE; }
    getMarginTargets() { return MARGIN_TARGETS; }

    // ─── Blockchain Chain Comparison ──────────────────────────────

    getChainComparison() {
        const chains = COST_STRUCTURE.blockchain.estimates;
        return {
            comparison: [
                { chain: 'Ethereum L1', seal_cost: chains.ethereum_seal.cost, nft_cost: chains.ethereum_seal.cost * 3, verdict: 'Too expensive for high volume' },
                { chain: 'Polygon', seal_cost: chains.polygon_seal.cost, nft_cost: chains.nft_mint_polygon.cost, verdict: 'Recommended — lowest cost' },
                { chain: 'Base (L2)', seal_cost: chains.base_seal.cost, nft_cost: chains.nft_mint_base.cost, verdict: 'Good for Coinbase ecosystem' },
                { chain: 'Solana', seal_cost: chains.solana_seal.cost, nft_cost: chains.solana_seal.cost * 3, verdict: 'Ultra-low cost, different ecosystem' },
            ],
            selected: COST_STRUCTURE.blockchain.selected_chain,
            rationale: 'Polygon selected for lowest gas cost + EVM compatibility + enterprise adoption',
        };
    }

    _round(n, decimals) { return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals); }
}

module.exports = new UnitEconomicsEngine();
