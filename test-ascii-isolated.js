/**
 * Isolated Test for ASCII Distribution Generation
 */

function formatCurrency(val) {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

function generateASCIIDistribution(p50, p95, p99) {
    const maxVal = p99;
    const maxBlocks = 15;
    
    if (maxVal <= 0) return '';

    const p50Blocks = Math.max(1, Math.floor((p50 / maxVal) * maxBlocks));
    const p95Blocks = Math.max(1, Math.floor((p95 / maxVal) * maxBlocks));
    const p99Blocks = maxBlocks;

    const renderBar = (filled) => {
        return '[' + '▓'.repeat(filled) + '░'.repeat(maxBlocks - filled) + ']';
    };

    return `Distribution Map:
Expected (P50):  ${formatCurrency(p50).padEnd(8)} ${renderBar(p50Blocks)}
Stress   (P95):  ${formatCurrency(p95).padEnd(8)} ${renderBar(p95Blocks)} <-- CRITICAL
Ruin     (P99):  ${formatCurrency(p99).padEnd(8)} ${renderBar(p99Blocks)}`;
}

// Test data
const p50 = 253000000;
const p95 = 285000000;
const p99 = 300000000;

console.log("Testing ASCII Distribution Generation (Hardcoded Copy):");
console.log("──────────────────────────────────────────────────");
console.log(generateASCIIDistribution(p50, p95, p99));
console.log("──────────────────────────────────────────────────");
