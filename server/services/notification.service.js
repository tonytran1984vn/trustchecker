/**
 * TrustChecker — Notification Service (The Last Mile)
 * Phase 4: The Valuation Guard Alerting System
 */
const slack = require('./slack');

/**
 * Format large currency numbers into concise format (e.g. $250M)
 */
function formatCurrency(val) {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

/**
 * Generates an ASCII bar chart representing the 'Fat-tail' distribution
 */
function generateASCIIDistribution(p50, p95, p99) {
    const maxVal = p99;
    const maxBlocks = 15;

    // Safety check to avoid divide by zero
    if (maxVal <= 0) return '';

    const p50Blocks = Math.max(1, Math.floor((p50 / maxVal) * maxBlocks));
    const p95Blocks = Math.max(1, Math.floor((p95 / maxVal) * maxBlocks));
    const p99Blocks = maxBlocks;

    const renderBar = filled => {
        return '[' + '▓'.repeat(filled) + '░'.repeat(maxBlocks - filled) + ']';
    };

    return `Distribution Map:
Expected (P50):  ${formatCurrency(p50).padEnd(8)} ${renderBar(p50Blocks)}
Stress   (P95):  ${formatCurrency(p95).padEnd(8)} ${renderBar(p95Blocks)} <-- CRITICAL
Ruin     (P99):  ${formatCurrency(p99).padEnd(8)} ${renderBar(p99Blocks)}`;
}

/**
 * Multi-threshold Alert Trap
 * Evaluates simulation results and fires webhook alerts if the threshold is breached.
 */
async function triggerValuationAlert(orgId, orgName, results, simParams, overrideThreshold = 0.05) {
    // 1. Calculate Enterprise Value Destruction Ratio
    // Ensure Math safety for Baseline Gordon Growth
    const safeDenominator = Math.max(simParams.wacc_0 - simParams.g, 0.001);
    const fcfCap = simParams.fcf / safeDenominator;
    const evdRatio = results.P95.evd / fcfCap;

    // 2. Check against Tenant's specific risk appetite (default 5%)
    if (evdRatio > overrideThreshold) {
        // 3. Generate Visual Art (ASCII)
        const asciiMap = generateASCIIDistribution(results.P50.evd, results.P95.evd, results.P99.evd);

        // Fat-Tail Check: If P99 loss is more than 50% higher than P50 loss
        const isFatTail = results.P50.evd > 0 && (results.P99.evd - results.P50.evd) / results.P50.evd > 0.5;
        const fatTailWarning = isFatTail
            ? '\n\n⚠️ [FAT-TAIL ANOMALY DETECTED]: P99 Ruin scenario severely deviates from Expected baseline.'
            : '';

        // Differentiate ESG shock vs Macro Shock
        const totalWaccP95 = simParams.wacc_0 + results.P95.shockWACC;
        // Since MonteCarlo V3 dynamically shocks WACC base, we note if ESG is the main driver or Macro is assisting
        const shockFactorMsg = `Base Volatility (ESG Penalties): ${results.P95.dropESG.toFixed(2)} pts => Yield Premium +${(results.P95.shockWACC * 100).toFixed(2)}%`;

        const alertPayload = {
            org_name: orgName,
            org_id: orgId,
            p95_evd: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
            }).format(results.P95.evd),
            wacc_increase: (results.P95.shockWACC * 100).toFixed(2) + '%',
            shock_indicators: shockFactorMsg,
            ascii_map: asciiMap,
            fat_tail_warning: fatTailWarning,
            evd_ratio: (evdRatio * 100).toFixed(2),
        };

        // 4. Send via Slack (The Red Alert)
        await slack.sendAlert('valuation_guard', alertPayload);

        return true;
    }
    return false;
}

module.exports = {
    generateASCIIDistribution,
    triggerValuationAlert,
};
