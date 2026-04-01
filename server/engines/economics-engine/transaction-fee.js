/**
 * TrustChecker — Agentic Transaction Fee Pricing v3.0
 * Infrastructure Monetization: Dynamic Surge + Volume Pricing
 *
 * Shifts from pure SaaS subscription → Hybrid Model:
 *   Subscription (base) + Per-Transaction Fees (usage) + Volume Discounts
 *
 * Every billable event (scan, carbon settlement, NFT mint, blockchain seal, API call)
 * is metered and charged at volume-tiered rates.
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// FEE SCHEDULE (per transaction)
// ═══════════════════════════════════════════════════════════════════

const FEE_SCHEDULE = {
    qr_verification: {
        name: 'QR Verification',
        description: 'Each product authenticity QR scan verification',
        unit: 'verification',
        tiers: [
            { up_to: 1000, price: 0.02 },
            { up_to: 10000, price: 0.015 },
            { up_to: 100000, price: 0.008 },
            { up_to: null, price: 0.005 }, // unlimited
        ],
    },
    carbon_settlement: {
        name: 'Carbon Credit Settlement',
        description: 'Each carbon credit offset calculation and settlement',
        unit: 'settlement',
        tiers: [
            { up_to: 100, price: 0.5 },
            { up_to: 1000, price: 0.35 },
            { up_to: 10000, price: 0.2 },
            { up_to: null, price: 0.12 },
        ],
    },
    nft_certificate: {
        name: 'NFT Certificate Mint',
        description: 'Each trust certificate minted as NFT',
        unit: 'mint',
        tiers: [
            { up_to: 100, price: 1.5 },
            { up_to: 500, price: 1.0 },
            { up_to: 2000, price: 0.6 },
            { up_to: null, price: 0.35 },
        ],
    },
    blockchain_seal: {
        name: 'Blockchain Seal',
        description: 'Each immutable blockchain proof seal',
        unit: 'seal',
        tiers: [
            { up_to: 500, price: 0.25 },
            { up_to: 5000, price: 0.18 },
            { up_to: 50000, price: 0.1 },
            { up_to: null, price: 0.06 },
        ],
    },
    api_call_external: {
        name: 'External API Call',
        description: 'Third-party API gateway calls (partner integrations)',
        unit: 'call',
        tiers: [
            { up_to: 10000, price: 0.005 },
            { up_to: 100000, price: 0.003 },
            { up_to: null, price: 0.001 },
        ],
    },
};

// ═══════════════════════════════════════════════════════════════════
// REVENUE SPLIT (platform vs validator/partner)
// ═══════════════════════════════════════════════════════════════════

const REVENUE_SPLIT = {
    platform_percent: 70, // TrustChecker platform
    validator_percent: 20, // Network validators (future)
    reserve_percent: 10, // Operational reserve fund
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class TransactionFeeEngine {
    constructor() {
        // In-memory ledger (production: persisted to PostgreSQL)
        this.transactions = []; // all metered transactions
        this.monthlyAggregates = new Map(); // org_id → { type → count }
    }

    // ─── Fee Schedule ─────────────────────────────────────────────

    getFeeSchedule() {
        return {
            fee_schedule: FEE_SCHEDULE,
            revenue_split: REVENUE_SPLIT,
            total_transaction_types: Object.keys(FEE_SCHEDULE).length,
        };
    }

    // ─── Calculate fee for a given volume ─────────────────────────

    calculateFee(type, volume) {
        const schedule = FEE_SCHEDULE[type];
        if (!schedule) return { error: `Unknown transaction type: ${type}`, available: Object.keys(FEE_SCHEDULE) };

        let remaining = volume;
        let totalCost = 0;
        const breakdown = [];
        let prevCap = 0;

        for (const tier of schedule.tiers) {
            const cap = tier.up_to ?? Infinity;
            const tierVolume = Math.min(remaining, cap - prevCap);
            if (tierVolume <= 0) break;

            const tierCost = tierVolume * tier.price;
            totalCost += tierCost;
            breakdown.push({
                range: `${prevCap + 1} – ${cap === Infinity ? '∞' : cap}`,
                volume: tierVolume,
                unit_price: tier.price,
                subtotal: Math.round(tierCost * 100) / 100,
            });

            remaining -= tierVolume;
            prevCap = cap;
            if (remaining <= 0) break;
        }

        // ─── AGENTIC HYBRID PRICER v3.0 (Priority Processing) ─────────
        const contextPayload = schedule.context || {};
        const networkLoadPct = contextPayload.network_load_pct || 50;
        const isOffPeak = contextPayload.is_off_peak || false;
        const enterpriseLock = contextPayload.enterprise_price_lock || false;

        let surgeMultiplier = 1.0;
        const pricingFriction = [];
        let featureName = 'Standard Pricing';

        // Bounded Dynamic pricing: Mask surge as "Priority Services"
        // Enterprise lock bypasses all surge completely.
        if (!enterpriseLock) {
            if (networkLoadPct > 80 && !contextPayload.reserved_capacity) {
                surgeMultiplier = 1.25; // 25% capped surge
                pricingFriction.push('PRIORITY_PROCESSING_HIGH_LOAD');
                featureName = 'Priority Processing SLA';
            } else if (isOffPeak && networkLoadPct < 30) {
                surgeMultiplier = 0.85; // 15% discount
                pricingFriction.push('OFF_PEAK_CAPACITY_DISCOUNT');
                featureName = 'Off-Peak Discount';
            }
        } else {
            pricingFriction.push('ENTERPRISE_PRICE_LOCK_ACTIVE');
        }

        const agenticTotalCost = totalCost * surgeMultiplier;
        const effective_rate = volume > 0 ? Math.round((agenticTotalCost / volume) * 10000) / 10000 : 0;

        return {
            type,
            name: schedule.name,
            feature_applied: featureName,
            volume,
            base_cost: Math.round(totalCost * 100) / 100,
            surge_multiplier: surgeMultiplier,
            agentic_flags: pricingFriction,
            total_cost: Math.round(agenticTotalCost * 100) / 100,
            effective_rate,
            breakdown,
            // (Splits are now informational here, actual allocation shifted to fee-distribution Bounded Split)
            revenue_split_estimate: {
                platform: Math.round(agenticTotalCost * REVENUE_SPLIT.platform_percent) / 100,
                validator: Math.round(agenticTotalCost * REVENUE_SPLIT.validator_percent) / 100,
                reserve: Math.round(agenticTotalCost * REVENUE_SPLIT.reserve_percent) / 100,
            },
        };
    }

    /**
     * Agentic v3.0: Calculate Fee dynamically using Surge & Context
     */
    calculateAgenticFee(type, volume, context = {}) {
        const schedule = FEE_SCHEDULE[type];
        if (!schedule) return { error: `Unknown transaction type: ${type}` };
        schedule.context = context; // Inject context
        return this.calculateFee(type, volume);
    }

    // ─── Record transaction event ─────────────────────────────────

    recordTransaction(orgId, type, metadata = {}) {
        const schedule = FEE_SCHEDULE[type];
        if (!schedule) return { error: `Unknown transaction type: ${type}` };

        const period = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `${orgId}:${period}`;
        const agg = this.monthlyAggregates.get(key) || {};
        agg[type] = (agg[type] || 0) + 1;
        this.monthlyAggregates.set(key, agg);

        const fee = this._getCurrentTierPrice(type, agg[type]);

        const tx = {
            id: uuidv4(),
            org_id: orgId,
            type,
            period,
            volume_this_month: agg[type],
            unit_fee: fee,
            timestamp: new Date().toISOString(),
            metadata,
        };
        this.transactions.push(tx);

        return tx;
    }

    // ─── Get current tier price based on accumulated volume ───────

    _getCurrentTierPrice(type, currentVolume) {
        const schedule = FEE_SCHEDULE[type];
        if (!schedule) return 0;
        for (const tier of schedule.tiers) {
            if (tier.up_to === null || currentVolume <= tier.up_to) {
                return tier.price;
            }
        }
        return schedule.tiers[schedule.tiers.length - 1].price;
    }

    // ─── Revenue Report ───────────────────────────────────────────

    generateRevenueReport(period) {
        const targetPeriod = period || new Date().toISOString().slice(0, 7);

        const byType = {};
        let totalRevenue = 0;
        let totalTransactions = 0;

        // Aggregate from monthly aggregates
        for (const [key, agg] of this.monthlyAggregates) {
            if (!key.endsWith(targetPeriod)) continue;
            const orgId = key.split(':')[0];

            for (const [type, count] of Object.entries(agg)) {
                if (!byType[type]) byType[type] = { name: FEE_SCHEDULE[type]?.name, count: 0, revenue: 0 };
                byType[type].count += count;
                totalTransactions += count;
            }
        }

        // Calculate revenue per type
        for (const [type, data] of Object.entries(byType)) {
            const calc = this.calculateFee(type, data.count);
            data.revenue = calc.total_cost;
            totalRevenue += calc.total_cost;
        }

        return {
            period: targetPeriod,
            total_revenue: Math.round(totalRevenue * 100) / 100,
            total_transactions: totalTransactions,
            revenue_split: {
                platform: Math.round(totalRevenue * REVENUE_SPLIT.platform_percent) / 100,
                validator: Math.round(totalRevenue * REVENUE_SPLIT.validator_percent) / 100,
                reserve: Math.round(totalRevenue * REVENUE_SPLIT.reserve_percent) / 100,
            },
            by_type: byType,
            avg_revenue_per_tx:
                totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 10000) / 10000 : 0,
        };
    }

    // ─── Org Invoice ───────────────────────────────────────────

    generateOrgInvoice(orgId, period) {
        const targetPeriod = period || new Date().toISOString().slice(0, 7);
        const key = `${orgId}:${targetPeriod}`;
        const agg = this.monthlyAggregates.get(key) || {};

        const lineItems = [];
        let total = 0;

        for (const [type, count] of Object.entries(agg)) {
            const calc = this.calculateFee(type, count);
            lineItems.push({
                type,
                name: calc.name,
                volume: count,
                unit_price: calc.effective_rate,
                subtotal: calc.total_cost,
                breakdown: calc.breakdown,
            });
            total += calc.total_cost;
        }

        return {
            invoice_id: uuidv4(),
            org_id: orgId,
            period: targetPeriod,
            line_items: lineItems,
            subtotal: Math.round(total * 100) / 100,
            tax_rate: 0,
            tax_amount: 0,
            total: Math.round(total * 100) / 100,
            currency: 'USD',
            status: 'draft',
            generated_at: new Date().toISOString(),
        };
    }

    // ─── Pricing Simulator ────────────────────────────────────────

    simulate(usage = {}) {
        const results = {};
        let grandTotal = 0;

        for (const [type, volume] of Object.entries(usage)) {
            const calc = this.calculateFee(type, volume);
            if (calc.error) continue;
            results[type] = calc;
            grandTotal += calc.total_cost;
        }

        return {
            simulation: results,
            grand_total: Math.round(grandTotal * 100) / 100,
            revenue_split: {
                platform: Math.round(grandTotal * REVENUE_SPLIT.platform_percent) / 100,
                validator: Math.round(grandTotal * REVENUE_SPLIT.validator_percent) / 100,
                reserve: Math.round(grandTotal * REVENUE_SPLIT.reserve_percent) / 100,
            },
        };
    }

    // ─── Recent transactions ──────────────────────────────────────

    getRecentTransactions(limit = 50) {
        return this.transactions.slice(-limit).reverse();
    }
}

module.exports = new TransactionFeeEngine();
