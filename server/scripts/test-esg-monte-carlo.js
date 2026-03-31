const { runMonteCarloESGSimulation } = require('../utils/causal-inference');

console.log("════════════════════════════════════════════════════════════════════");
console.log(" ERQF v3.0: AGENTIC MONTE CARLO - ESG & VALUATION SHOCK SIMULATOR ");
console.log("════════════════════════════════════════════════════════════════════");

const pharmaBaseParams = {
    basePFraud: 0.12,  // 12% fraud rate
    baseWCRS: 0.40,    // 40% compliance failure rate
    m_scale: 1.5,      // Large leak
    kappa: 25.0,       // High sensitivity for Life-Critical
    zeta: 100.0,
    fcf: 50000000,     // 50M FCF
    wacc_0: 0.08,      // 8% base WACC
    g: 0.02,           // 2% growth
    lambda_esg: 0.0005, // 5 bps per point
    df: 4,             // Thick tail for black swans
    // --- New Dynamic Parameters ---
    volP: 0.05,        // Higher volatility for Pharma fraud
    volW: 0.03,        // Higher volatility for compliance
    volM: 0.8,         // Severe leak scale volatility
    volMacro: 0.008,   // 80 bps macro WACC volatility
    gamma: 0.2         // 20% Contagion Factor (e.g. from Branded House)
};

console.log("\n[SCENARIO] Risk Cluster A: Pharmaceutical Corporation");
console.log("Running 10,000 simulations using Student-t distribution...");

const start = performance.now();
const results = runMonteCarloESGSimulation(pharmaBaseParams, 10000);
const end = performance.now();

console.log(`Simulation completed in ${(end - start).toFixed(2)} ms.\n`);

const fmtUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const fmtESG = (val) => val.toFixed(2);
const fmtWACC = (val) => (val * 100).toFixed(2) + '%';

console.log("📊 RESULT PERCENTILES (Sorted by Worst Outcome):");
console.log("────────────────────────────────────────────────────────────────────");
console.log(`🟢 P50 (Expected)     | ESG Drop: ${fmtESG(results.P50.dropESG).padEnd(8)} | WACC Increase: ${fmtWACC(results.P50.shockWACC).padEnd(6)} | Value Destruction: ${fmtUSD(results.P50.evd)}`);
console.log(`🟡 P95 (Stress)       | ESG Drop: ${fmtESG(results.P95.dropESG).padEnd(8)} | WACC Increase: ${fmtWACC(results.P95.shockWACC).padEnd(6)} | Value Destruction: ${fmtUSD(results.P95.evd)}`);
console.log(`🔴 P99 (Tail/Ruin)    | ESG Drop: ${fmtESG(results.P99.dropESG).padEnd(8)} | WACC Increase: ${fmtWACC(results.P99.shockWACC).padEnd(6)} | Value Destruction: ${fmtUSD(results.P99.evd)}`);
console.log("────────────────────────────────────────────────────────────────────");

console.log("\n[CFO WARNING SYSTEM GENERATED]:");
console.log(`If current compliance trajectories hold, there is a 5% chance (P95) that ESG penalties will trigger a ${fmtWACC(results.P95.shockWACC)} borrowing cost shock.`);
console.log(`This translates directly to a loss of ${fmtUSD(results.P95.evd)} in Enterprise Value over the next fiscal cycle.`);
