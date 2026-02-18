/**
 * Quick Win #2 — Monte Carlo Worker Thread
 * Offloads CPU-intensive Monte Carlo simulation to a separate thread
 * so the main event loop remains responsive for other requests.
 *
 * Usage:
 *   const { runMonteCarloWorker } = require('./monte-carlo-worker');
 *   const result = await runMonteCarloWorker(params, 5000);
 */
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

// ─── Worker Thread Code ───────────────────────────────────────────────────────
if (!isMainThread) {
    // This block runs inside the worker thread
    const { params, simulations } = workerData;

    const {
        avg_delay = 12,
        delay_stddev = 8,
        disruption_prob = 0.05,
        cost_per_delay_hour = 50,
        shipments_per_month = 100,
        partner_failure_prob = 0.02,
        quality_reject_rate = 0.03
    } = params;

    const results = [];
    let totalCost = 0;
    let disruptions = 0;
    let totalDelay = 0;
    let maxDelay = 0;
    let qualityFailures = 0;

    for (let i = 0; i < simulations; i++) {
        let simCost = 0;
        let simDelay = 0;
        let simDisrupted = false;

        for (let s = 0; s < shipments_per_month; s++) {
            // Box-Muller transform
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const delay = Math.max(0, avg_delay + z * delay_stddev);

            simDelay += delay;
            simCost += delay * cost_per_delay_hour;

            if (Math.random() < disruption_prob) {
                simDisrupted = true;
                simCost += 10000;
                simDelay += 72;
            }
            if (Math.random() < partner_failure_prob) {
                simCost += 25000;
                simDelay += 120;
            }
            if (Math.random() < quality_reject_rate) {
                qualityFailures++;
                simCost += 5000;
            }
        }

        totalCost += simCost;
        totalDelay += simDelay;
        if (simDisrupted) disruptions++;
        maxDelay = Math.max(maxDelay, simDelay);
        results.push({ cost: simCost, delay: simDelay, disrupted: simDisrupted });
    }

    // Sort for percentile calculation
    results.sort((a, b) => a.cost - b.cost);
    const p50 = results[Math.floor(simulations * 0.5)];
    const p95 = results[Math.floor(simulations * 0.95)];
    const p99 = results[Math.floor(simulations * 0.99)];

    // Build histogram
    function histogram(values, buckets) {
        if (values.length === 0) return [];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const width = (max - min) / buckets || 1;
        const hist = new Array(buckets).fill(0);
        values.forEach(v => {
            const idx = Math.min(buckets - 1, Math.floor((v - min) / width));
            hist[idx]++;
        });
        return hist.map((count, i) => ({
            range: `${Math.round(min + i * width)} - ${Math.round(min + (i + 1) * width)}`,
            count,
            pct: Math.round(count / values.length * 100)
        }));
    }

    // Recommendations
    const disruptionRate = disruptions / simulations;
    const qualityRate = qualityFailures / (simulations * shipments_per_month);
    const avgDelayPerShip = totalDelay / simulations / shipments_per_month;
    const recs = [];
    if (disruptionRate > 0.1) recs.push({ priority: 'high', action: 'Diversify supplier base — disruption risk exceeds 10%' });
    if (qualityRate > 0.05) recs.push({ priority: 'high', action: 'Implement incoming quality inspection — reject rate above 5%' });
    if (avgDelayPerShip > 24) recs.push({ priority: 'medium', action: 'Negotiate faster SLAs with carriers — avg delay exceeds 24h' });
    if (recs.length === 0) recs.push({ priority: 'low', action: 'Risk profile is within acceptable parameters' });

    parentPort.postMessage({
        summary: {
            simulations,
            avg_monthly_cost: Math.round(totalCost / simulations),
            avg_delay_hours: Math.round(totalDelay / simulations / shipments_per_month * 10) / 10,
            disruption_probability: Math.round(disruptions / simulations * 100) / 100,
            quality_failure_rate: Math.round(qualityFailures / (simulations * shipments_per_month) * 10000) / 100
        },
        risk_quantiles: {
            p50_cost: Math.round(p50.cost),
            p95_cost: Math.round(p95.cost),
            p99_cost: Math.round(p99.cost),
            var_95: Math.round(p95.cost - totalCost / simulations),
        },
        distribution: {
            cost_buckets: histogram(results.map(r => r.cost), 10),
            delay_buckets: histogram(results.map(r => r.delay), 10)
        },
        recommendations: recs,
        _computed_in: 'worker_thread'
    });
}

// ─── Main Thread API ──────────────────────────────────────────────────────────
/**
 * Run Monte Carlo simulation in a worker thread.
 * Returns a Promise that resolves with the simulation result.
 *
 * @param {object} params - Simulation parameters
 * @param {number} simulations - Number of iterations (max 10000)
 * @param {number} timeoutMs - Max time to wait (default 10s)
 */
function runMonteCarloWorker(params, simulations = 1000, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
            workerData: { params, simulations: Math.min(simulations, 10000) }
        });

        const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error('Monte Carlo worker timed out'));
        }, timeoutMs);

        worker.on('message', (result) => {
            clearTimeout(timer);
            resolve(result);
        });

        worker.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                clearTimeout(timer);
                reject(new Error(`Worker exited with code ${code}`));
            }
        });
    });
}

module.exports = { runMonteCarloWorker };
