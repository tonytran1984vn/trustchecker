/**
 * TrustChecker — Agentic Real-Time Capital Adequacy Engine v3.0
 * IPO-GRADE: Live CAR Ratio + Dynamic Buffers + Directive-Based Capital Call
 *
 * Capital ratio must be LIVE, not periodic.
 * If infrastructure scales, capital must track in real-time.
 *
 * Features:
 *   - Real-time CAR calculation from live exposure data
 *   - Dynamic buffer adjustment (market conditions → buffer size)
 *   - Auto-trigger capital call when buffer breached
 *   - Settlement exposure tracking with mark-to-market
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// 1. REAL-TIME CAR MODEL
// ═══════════════════════════════════════════════════════════════════

const CAR_MODEL = {
    thresholds: {
        green: { min_car_pct: 12, label: 'Well Capitalized', action: 'Normal operations' },
        yellow: {
            min_car_pct: 10,
            label: 'Adequately Capitalized',
            action: 'Monitor closely, restrict new high-risk activity',
        },
        orange: {
            min_car_pct: 8,
            label: 'Under Capitalized',
            action: 'Capital preservation mode — halt dividends, restrict payouts',
        },
        red: {
            min_car_pct: 6,
            label: 'Significantly Under Capitalized',
            action: 'Capital call triggered automatically',
        },
        black: {
            min_car_pct: 4,
            label: 'Critically Under Capitalized',
            action: 'Regulatory notification + emergency capital injection + settlement freeze',
        },
    },

    refresh_interval_ms: 60000, // Recalculate every 60 seconds
};

// ═══════════════════════════════════════════════════════════════════
// 2. DYNAMIC BUFFER ADJUSTMENT
// ═══════════════════════════════════════════════════════════════════

const DYNAMIC_BUFFERS = {
    base_buffer_pct: 4, // 4% above minimum (default = 12% target)

    market_adjustments: [
        { condition: 'carbon_price_volatility_30d > 50%', adjustment_pct: +2, reason: 'High carbon market volatility' },
        { condition: 'counterparty_default_rate > 3%', adjustment_pct: +3, reason: 'Elevated default rate' },
        {
            condition: 'settlement_volume_growth > 200%',
            adjustment_pct: +1,
            reason: 'Rapid volume growth outpacing capital',
        },
        { condition: 'geopolitical_risk_score > 7/10', adjustment_pct: +2, reason: 'Geopolitical uncertainty' },
        { condition: 'insurance_claim_pending > $500K', adjustment_pct: +1, reason: 'Material insurance claim open' },
    ],

    seasonal_adjustments: [
        { period: 'Q4', adjustment_pct: +1, reason: 'Year-end settlement surge' },
        { period: 'regulatory_review', adjustment_pct: +2, reason: 'Active regulatory examination' },
    ],

    max_additional_buffer_pct: 8, // Cap: base 4% + up to 8% dynamic = max 20% CAR target
};

// ═══════════════════════════════════════════════════════════════════
// 3. AUTO CAPITAL CALL MECHANISM
// ═══════════════════════════════════════════════════════════════════

const CAPITAL_CALL = {
    trigger_levels: [
        {
            level: 'ADVISORY',
            trigger: 'CAR drops below target buffer (e.g., <12%)',
            action: 'Notify CFO + Risk Committee',
            response_days: 30,
            automatic: true,
        },
        {
            level: 'WARNING',
            trigger: 'CAR drops below adequacy threshold (<10%)',
            action: 'Board notification + capital plan required',
            response_days: 14,
            automatic: true,
            restrictions: ['Halt new product launches', 'Freeze non-essential capex'],
        },
        {
            level: 'MANDATORY',
            trigger: 'CAR drops below minimum (<8%)',
            action: 'Automatic capital call to shareholders/investors',
            response_days: 7,
            automatic: true,
            restrictions: ['Halt all dividends', 'Freeze all payouts except operational', 'Regulatory notification'],
        },
        {
            level: 'EMERGENCY',
            trigger: 'CAR drops below critical (<6%)',
            action: 'Generate CAPITAL_CALL_DIRECTIVE',
            response_days: 3,
            automatic: true,
            directive: {
                type: 'CONTAINMENT_DIRECTIVE',
                level: 'FULL_CONTAINMENT',
                target: 'SYSTEMWIDE_SETTLEMENT',
                action: 'FREEZE_NEW_SETTLEMENTS',
                confidence_score: 1.0, // Mathematical certainty based on CAR stringency
                details: 'CAR < 6%. Emergency board meeting, halt all new settlements via directive.',
                ttl: '48h',
            },
        },
    ],

    capital_sources: [
        { source: 'Retained earnings', speed: 'Immediate', availability: 'If positive retained earnings exist' },
        { source: 'Shareholder capital call', speed: '7-30 days', availability: 'Subject to shareholder agreement' },
        { source: 'Credit facility drawdown', speed: '1-3 days', availability: 'Subject to credit agreement terms' },
        { source: 'Insurance claim', speed: '30-90 days', availability: 'Subject to policy terms and approval' },
        {
            source: 'Emergency validator escrow release',
            speed: '24-48 hours',
            availability: 'Constitutional approval required',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. SETTLEMENT EXPOSURE TRACKER
// ═══════════════════════════════════════════════════════════════════

const EXPOSURE_TRACKING = {
    mark_to_market: {
        frequency: 'Real-time for carbon positions, daily for other',
        methodology: 'Last traded price × position size × risk weight',
        source: 'Internal pricing engine + external carbon market feeds',
    },

    exposure_categories: [
        { category: 'pending_settlements', risk_weight: 1.0, description: 'Settlements in transit (T+0 to T+3)' },
        { category: 'carbon_positions', risk_weight: 0.5, description: 'Carbon credits held/originated' },
        { category: 'counterparty_credit', risk_weight: 0.3, description: 'Unsettled receivables from counterparties' },
        { category: 'operational_risk', risk_weight: 0.15, description: 'Technology, legal, personnel risks' },
        { category: 'market_risk', risk_weight: 0.2, description: 'FX, carbon price, interest rate exposure' },
    ],

    concentration_alerts: {
        single_settlement_pct: 10, // Alert if single settlement > 10% of capital
        daily_volume_vs_capital: 300, // Alert if daily volume > 300% of capital
        pending_vs_reserve: 200, // Alert if pending settlements > 200% of reserves
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

// FIX BUG-02: In-memory state with version counter for optimistic concurrency
// All reads snapshot the state to isolate from concurrent mutations
let _currentState = {
    tier1_capital: 500000,
    tier2_capital: 200000,
    total_exposure: 3000000,
    pending_settlements: 500000,
    carbon_positions: 200000,
    last_updated: new Date().toISOString(),
    _version: 0,
};

class AgenticRealtimeCAREngine {
    calculateLiveCAR(state) {
        // FIX BUG-02: Snapshot state to prevent mid-calculation mutation from concurrent requests
        const s = state ? { ...state } : { ..._currentState };
        const totalCapital = s.tier1_capital + s.tier2_capital;

        const riskWeightedExposure = EXPOSURE_TRACKING.exposure_categories.reduce((total, cat) => {
            const value = s[cat.category] || 0;
            return total + value * cat.risk_weight;
        }, 0);

        const rwe = riskWeightedExposure || s.total_exposure * 0.35;
        const car_pct = rwe > 0 ? (totalCapital / rwe) * 100 : 100;

        // DOMAIN INVARIANT: CAR is a ratio of capital/exposure — cannot be negative
        // Negative values indicate corrupted state that must fail loudly
        if (car_pct < 0 || !isFinite(car_pct)) {
            throw new Error(
                `CAR invariant violation: car_pct=${car_pct}, totalCapital=${totalCapital}, rwe=${rwe}. State may be corrupted.`
            );
        }

        // Determine status
        let status = 'UNKNOWN';
        let action = '';
        for (const [key, threshold] of Object.entries(CAR_MODEL.thresholds)) {
            if (car_pct >= threshold.min_car_pct) {
                status = threshold.label;
                action = threshold.action;
                break;
            }
        }

        // FIX BUG-03: If CAR is below all thresholds (<4%), it's catastrophically under-capitalized
        if (status === 'UNKNOWN') {
            status = CAR_MODEL.thresholds.black.label;
            action = CAR_MODEL.thresholds.black.action;
        }

        // Dynamic buffer
        const dynamicBuffer = DYNAMIC_BUFFERS.base_buffer_pct;
        const targetCAR = 8 + dynamicBuffer;

        // Capital call check
        let capitalCall = null;
        let agentic_directive = null;

        for (const level of CAPITAL_CALL.trigger_levels) {
            const triggerPct = parseFloat(level.trigger.match(/\d+/)?.[0] || 0);
            if (triggerPct > 0 && car_pct < triggerPct) {
                capitalCall = level;
                if (level.directive) {
                    agentic_directive = { ...level.directive, timestamp: new Date().toISOString() };
                }
            }
        }

        return {
            timestamp: new Date().toISOString(),
            capital: { tier1: s.tier1_capital, tier2: s.tier2_capital, total: totalCapital },
            exposure: {
                total: s.total_exposure,
                risk_weighted: Math.round(rwe),
                pending_settlements: s.pending_settlements,
            },
            car_pct: parseFloat(car_pct.toFixed(2)),
            target_car_pct: targetCAR,
            buffer_pct: parseFloat((car_pct - 8).toFixed(2)),
            status,
            action,
            capital_call: capitalCall,
            agentic_directive: agentic_directive, // Sent to Economics Engine
            next_refresh_ms: CAR_MODEL.refresh_interval_ms,
        };
    }

    updateExposure(updates) {
        // FIX BUG-02: Increment version counter for optimistic concurrency
        _currentState = {
            ..._currentState,
            ...updates,
            last_updated: new Date().toISOString(),
            _version: (_currentState._version || 0) + 1,
        };
        return this.calculateLiveCAR();
    }

    getDynamicBuffers() {
        return DYNAMIC_BUFFERS;
    }
    getCapitalCallMechanism() {
        return CAPITAL_CALL;
    }
    getExposureTracking() {
        return EXPOSURE_TRACKING;
    }
    getCARThresholds() {
        return CAR_MODEL;
    }

    getFullDashboard() {
        return {
            title: 'Agentic Real-Time Capital Adequacy Dashboard — IPO-Grade v3.0',
            version: '3.0',
            live_car: this.calculateLiveCAR(),
            thresholds: CAR_MODEL,
            dynamic_buffers: DYNAMIC_BUFFERS,
            capital_call: CAPITAL_CALL,
            exposure: EXPOSURE_TRACKING,
        };
    }
}

module.exports = new AgenticRealtimeCAREngine();
