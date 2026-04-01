const { Worker } = require('bullmq');
const db = require('../db');

console.log('👷 [DW Worker] Starting Analytics ETL Background Consumer (Batch Mode)...');

let eventBuffer = [];
const BATCH_SIZE = 100;
let flushTimeout = null;

async function flushEvents() {
    if (eventBuffer.length === 0) return;

    // Copy reference and clear buffer immediately
    const batch = [...eventBuffer];
    eventBuffer = [];
    if (flushTimeout) clearTimeout(flushTimeout);

    try {
        await db._readyPromise;

        const placeholders = batch
            .map((_, i) => {
                const base = i * 12;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12})`;
            })
            .join(', ');

        const values = batch.flatMap(job => {
            const { event_id, event_type, version, org_id, payload, occurred_at } = job.data;
            const uuid = event_id || require('crypto').randomUUID();

            // Extract Indexed Columns from JSON dynamically
            const feature = payload?.feature || null;
            const amount = payload?.amount || payload?.increment || null;
            const plan = payload?.plan || null;

            // Contextual Hot Columns
            const context_key = payload?.context_hash || null;
            const geo_tier = payload?.geo_tier || null;
            const usage_velocity = payload?.usage_velocity || null;
            const company_size = payload?.company_size || null;

            return [
                uuid,
                event_type,
                version,
                org_id,
                feature,
                amount,
                plan,
                context_key,
                geo_tier,
                usage_velocity,
                company_size,
                JSON.stringify(payload),
            ];
        });

        // Postgres/SQLite Idempotent Batch Insert
        await db.run(
            `INSERT INTO dw_raw_events (event_id, event_type, version, org_id, feature, amount, plan, context_key, geo_tier, usage_velocity, company_size, payload)
             VALUES ${placeholders}
             ON CONFLICT (event_id) DO NOTHING`,
            values
        );

        // --- Causal Ledger (Phase 17): Secure Single-Touch Fact Backups
        const exposures = batch.filter(j => j.data.event_type === 'EXPERIMENT_EXPOSED');
        if (exposures.length > 0) {
            const expPlaceholders = exposures
                .map(
                    (_, i) =>
                        `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
                )
                .join(', ');
            const expVals = [];
            exposures.forEach(e => {
                const p = e.data.payload || {};
                expVals.push(
                    require('crypto').randomUUID(),
                    e.data.org_id,
                    p.context_hash || 'GLOBAL',
                    p.cohort || 'A_CONTROL',
                    new Date(e.data.occurred_at || new Date()).toISOString(),
                    parseFloat(p.propensity_score || 0.5)
                );
            });
            await db.run(
                `INSERT INTO fact_exposures (id, org_id, context_key, variant, timestamp, propensity_score)
                 VALUES ${expPlaceholders}`,
                expVals
            );
        }

        // --- LAYER B (Online Brain): Synchronize Redis Realtime Causal Metrics
        const { getRedisClient } = require('../services/redis');
        const redis = getRedisClient();
        if (redis) {
            for (const job of batch) {
                const { event_type, org_id, payload, occurred_at } = job.data;
                const amt = parseFloat(payload?.amount || payload?.increment || 0);
                const eventTs = new Date(occurred_at || new Date()).getTime();

                // 1. ZSET Exposure Context Mapping (Wait for late Invoice)
                if (event_type === 'EXPERIMENT_EXPOSED') {
                    const ctx = payload?.context_hash || 'GLOBAL';
                    const cohort = payload?.cohort || 'A_CONTROL';
                    const ps = parseFloat(payload?.propensity_score || 0.5);

                    const pendingBlock = JSON.stringify({ ctx, cohort, ps, ts: eventTs });

                    // Route Pending Exposure mapped to Event Time via ZADD safely extending Multi-Touch Window
                    await redis.zadd(`pending_exposures:${org_id}`, eventTs, pendingBlock);

                    // Offline Increment Context Counts
                    await redis.hincrby(`bandit_state:${ctx}:${cohort}`, 'count', 1);
                }

                // 2. Multi-Touch Payment Causal Evaluation
                if (event_type === 'INVOICE_PAID' && amt > 0) {
                    const cutoffTs = eventTs - 45 * 24 * 60 * 60 * 1000; // 45 Day Sliding Window
                    await redis.zremrangebyscore(`pending_exposures:${org_id}`, '-inf', cutoffTs); // Wipe stale memory

                    const pendingListRaw = await redis.zrangebyscore(`pending_exposures:${org_id}`, cutoffTs, eventTs);

                    if (pendingListRaw.length > 0) {
                        // Math: Log Variance Control avoiding SaaS Skew Implosions
                        const log_amt = Math.log1p(amt);
                        let totalDecay = 0;
                        const exposures = [];

                        // Build Softmax Weights Time-Decay Window
                        for (const raw of pendingListRaw) {
                            const parsed = JSON.parse(raw);
                            const delay_days = Math.max(0, (eventTs - parsed.ts) / (1000 * 60 * 60 * 24));
                            const decay = Math.exp(-0.05 * delay_days);
                            totalDecay += decay;
                            exposures.push({ ...parsed, decay });
                        }

                        // Apportion Causal Variances per multi-touch slice
                        for (const exp of exposures) {
                            const { ctx, cohort, ps, decay } = exp;
                            const weight_i = decay / totalDecay; // Normalized Temporal Softmax

                            // Math: IPS Explosion Limits Guard
                            const ps_clamped = Math.max(parseFloat(ps || 0.5), 0.05);

                            // Math: TRUE Causal Debiased Fractional Reward
                            const multi_touch_reward = (log_amt / ps_clamped) * weight_i;

                            // Online Learning Tracking O(1)
                            if (ctx && cohort) {
                                await redis.hincrbyfloat(
                                    `bandit_state:${ctx}:${cohort}`,
                                    'reward_sum',
                                    multi_touch_reward
                                );
                                await redis.hincrbyfloat(
                                    `bandit_state:${ctx}:${cohort}`,
                                    'reward_sq_sum',
                                    multi_touch_reward * multi_touch_reward
                                );
                            }
                        }
                    }
                }
            }
        }

        console.log(`[ETL Batch] Flushed ${batch.length} tracking records into DW + Causal Redis Pipeline.`);
    } catch (e) {
        console.error(`[Analytics Buffer] Bulk Insert Failed:`, e.message);
        // Fallback: Dump payload log, but do not crash Node.js loop to protect primary server
    }
}

const worker = new Worker(
    'analytics-events',
    async job => {
        // BullMQ Idempotency: Bind Job ID to Event ID
        job.data.event_id = job.id || require('crypto').randomUUID();
        job.data.occurred_at = job.data.timestamp || new Date().toISOString();

        eventBuffer.push(job);

        if (eventBuffer.length >= BATCH_SIZE) {
            await flushEvents();
        } else {
            // Debounce Flush (Flush anyway after 3 seconds of inactivity)
            if (flushTimeout) clearTimeout(flushTimeout);
            flushTimeout = setTimeout(flushEvents, 3000);
        }
    },
    {
        connection: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379,
        },
        concurrency: 1, // Concurrency 1 ensures Buffer safety sequentially
    }
);

worker.on('failed', (job, err) => {
    console.error(`🚨 [Analytics DLQ] DW Job failed ${job.id}:`, err.message);
});

// ════════════════════════════════════════════════════════════════════════════
// PHASE 3: PREDICTIVE ETL WORKER (MONTE CARLO V3.0)
// ════════════════════════════════════════════════════════════════════════════
const { Queue } = require('bullmq');
const { runMonteCarloESGSimulation } = require('../utils/causal-inference');

// 1. Setup Queue with Hourly Cron
const predictiveQueue = new Queue('predictive-etl', {
    connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
    },
});

// Schedule the repeatable job to run every hour at minute 0
predictiveQueue
    .add(
        'hourly-valuation-guard',
        {},
        {
            repeat: { pattern: '0 * * * *' },
            jobId: 'hourly-valuation-guard-cron', // Ensure uniqueness
        }
    )
    .catch(err => console.error('Failed to schedule predictive cron:', err.message));

// 2. The Agentic Worker
const predictiveWorker = new Worker(
    'predictive-etl',
    async job => {
        console.log(`🔮 [Predictive ETL] Starting Hourly Valuation Guard Simulation...`);
        await db._readyPromise;

        // A. Extract: Get all active organizations
        const orgs = await db.all(
            `SELECT id, name, plan as current_plan, settings FROM organizations WHERE status = 'active'`
        );

        let simulatedCount = 0;
        const alertsToSend = [];

        for (const org of orgs) {
            // B. Extract: Calculate dynamic risk inputs for the organization
            const stats = await db.get(
                `
            SELECT 
                COALESCE(AVG(fraud_score), 0.05) as avg_fraud
            FROM scan_events 
            WHERE org_id = $1 AND scanned_at > NOW() - INTERVAL '30 days'
        `,
                [org.id]
            );

            const basePFraud = Math.max(0.01, parseFloat(stats.avg_fraud));

            // WCRS (Compliance Risk Score) — DATA-DRIVEN from compliance_records
            // Counts non_compliant (weight 1.0) + partial (weight 0.5) as failures
            const compStats = await db.get(
                `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'non_compliant') as non_comp,
                    COUNT(*) FILTER (WHERE status = 'partial') as partial
                FROM compliance_records 
                WHERE entity_type = 'product' 
                AND entity_id IN (SELECT id FROM products WHERE org_id = $1)
            `,
                [org.id]
            );
            const baseWCRS =
                compStats && parseInt(compStats.total) > 0
                    ? Math.max(
                          0.05,
                          (parseInt(compStats.non_comp || 0) + parseInt(compStats.partial || 0) * 0.5) /
                              parseInt(compStats.total)
                      )
                    : org.current_plan === 'enterprise'
                      ? 0.15
                      : 0.35; // Fallback with plan-based estimate

            let settings = {};
            try {
                settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings || {};
            } catch (e) {
                settings = {};
            }

            const industry = settings.industry_type || 'default';

            // Map Industry to Risk Clusters for Fat-Tail Volatilities
            let volP = 0.03,
                volW = 0.02,
                volM = 0.5,
                volMacro = 0.005,
                gamma = 0;

            if (
                ['pharmaceutical', 'aviation', 'nuclear_energy', 'blood_vaccine', 'life_medical_device'].includes(
                    industry
                )
            ) {
                volP = 0.05;
                volW = 0.03;
                volM = 0.8;
                volMacro = 0.008; // Cluster A (Life-Critical)
            } else if (['banking_finance', 'cybersecurity', 'saas', 'telecom'].includes(industry)) {
                volP = 0.04;
                volW = 0.02;
                volM = 0.6;
                volMacro = 0.01; // Cluster B (Systemic Trust)
            } else if (['luxury', 'premium_wine', 'cosmetics_skincare', 'premium_real_estate'].includes(industry)) {
                volP = 0.06;
                volW = 0.01;
                volM = 0.3;
                volMacro = 0.005; // Cluster C (Brand-Driven)
            }

            if (settings.brand_architecture === 'branded_house') gamma = 0.2;

            const financials = settings.financials || {};
            const fcf = parseFloat(financials.fcf) || 50000000;
            const wacc_0 = parseFloat(financials.wacc_0) || 0.08;
            const g = Math.max(0.01, parseFloat(financials.g) || 0.02); // Guard growth rate

            // C. Simulate: Run Monte Carlo V3.0
            const simParams = {
                basePFraud,
                baseWCRS,
                m_scale: 1.2,
                kappa: 20.0,
                zeta: 100.0,
                fcf,
                wacc_0,
                g,
                lambda_esg: 0.0005,
                df: 4,
                volP,
                volW,
                volM,
                volMacro,
                gamma,
            };

            const results = runMonteCarloESGSimulation(simParams, 10000);

            // D. Persist: Save to Postgres (RiskAnalyticSnapshot)
            const uuid = require('crypto').randomUUID();
            await db.run(
                `
            INSERT INTO risk_analytic_snapshots (
                id, org_id, base_p_fraud, base_wcrs,
                p50_esg_drop, p50_wacc_shock, p50_evd,
                p95_esg_drop, p95_wacc_shock, p95_evd,
                p99_esg_drop, p99_wacc_shock, p99_evd
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9, $10,
                $11, $12, $13
            )
        `,
                [
                    uuid,
                    org.id,
                    basePFraud,
                    baseWCRS,
                    results.P50.dropESG,
                    results.P50.shockWACC,
                    results.P50.evd,
                    results.P95.dropESG,
                    results.P95.shockWACC,
                    results.P95.evd,
                    results.P99.dropESG,
                    results.P99.shockWACC,
                    results.P99.evd,
                ]
            );

            simulatedCount++;

            // E. Notify Logic: The Valuation Guard Alert
            const { triggerValuationAlert } = require('../services/notification.service');
            let orgSettings = {};
            try {
                orgSettings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings || {};
            } catch (e) {
                orgSettings = {};
            }

            const customThreshold =
                typeof orgSettings.custom_evd_threshold === 'number' ? orgSettings.custom_evd_threshold : 0.05;

            const triggered = await triggerValuationAlert(
                org.id,
                org.name || 'Unknown',
                results,
                simParams,
                customThreshold
            );
            if (triggered) {
                alertsToSend.push(org.id);
            }
        }

        console.log(
            `✅ [Predictive ETL] Successfully simulated and stored metrics for ${simulatedCount} organizations.`
        );

        if (alertsToSend.length > 0) {
            console.warn(
                `🛑 [Predictive ETL] CRITICAL: ${alertsToSend.length} organizations breached their EVD risk threshold!`
            );
        }
    },
    {
        connection: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379,
        },
        concurrency: 1,
    }
);

predictiveWorker.on('failed', (job, err) => {
    console.error(`🚨 [Predictive ETL] Simulation Job failed ${job.id}:`, err.message);
});

module.exports = {
    worker,
    predictiveWorker,
};
