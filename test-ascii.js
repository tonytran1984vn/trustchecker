const { generateASCIIDistribution } = require('./server/services/notification.service');

// Mock data
const p50 = 253000000;
const p95 = 285000000;
const p99 = 300000000;

console.log("Testing ASCII Distribution Generation (Isolated):");
console.log("──────────────────────────────────────────────────");
try {
    const output = generateASCIIDistribution(p50, p95, p99);
    console.log(output);
} catch (err) {
    console.error("Error generating ASCII:", err.message);
}
console.log("──────────────────────────────────────────────────");
