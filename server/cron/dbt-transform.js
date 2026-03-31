/**
 * Mini-dbt Transformer Pipeline.
 * Extracts aggregated Facts from Hybrid DW schemas defining real Revenue Cohort valuations.
 */

const db = require('../db');

async function runDbtTransforms() {
    console.log('🏗️ [dbt Pipeline] Initializing nightly Data Warehouse Transformations...');
    await db._readyPromise;

    try {
        // --- 1. Materialize FACT_USAGE_DAILY (Using Hybrid Columns)
        console.log('📊 dbt-run: Building model `fact_usage_daily`');
        await db.run(
            `INSERT INTO fact_usage_daily (id, org_id, date, feature, total_usage)
             SELECT 
                 $1 || '_' || org_id || '_' || DATE(occurred_at) || '_' || feature,
                 org_id, 
                 DATE(occurred_at), 
                 feature, 
                 SUM(CAST(amount AS INTEGER))
             FROM dw_raw_events 
             WHERE event_type = 'USAGE_RECORDED' AND feature IS NOT NULL
             GROUP BY org_id, DATE(occurred_at), feature
             ON CONFLICT (org_id, date, feature) DO UPDATE SET 
                  total_usage = EXCLUDED.total_usage`,
            [require('crypto').randomUUID().split('-')[0]]
        );

        // --- 2. Materialize FACT_REVENUE_MONTHLY
        console.log('📊 dbt-run: Building model `fact_revenue_monthly`');
        await db.run(
            `INSERT INTO fact_revenue_monthly (id, org_id, month, total_revenue)
             SELECT
                $1 || '_' || org_id || '_' || DATE(occurred_at, 'start of month'),
                org_id,
                DATE(occurred_at, 'start of month'),
                SUM(amount)
             FROM dw_raw_events
             WHERE event_type = 'INVOICE_PAID' AND amount IS NOT NULL
             GROUP BY org_id, DATE(occurred_at, 'start of month')
             ON CONFLICT (org_id, month) DO UPDATE SET 
                  total_revenue = EXCLUDED.total_revenue`,
            [require('crypto').randomUUID().split('-')[0]]
        );

        // --- 3. Materialize FACT_EXPERIMENT_OUTCOME (LTV Joined)
        // --- 3. Materialize FACT_EXPERIMENT_OUTCOME (LTV Joined & Contextualized)
        console.log('📊 dbt-run: Building model `fact_experiment_outcomes`');
        await db.run(
            `INSERT INTO fact_experiment_outcomes (id, org_id, experiment, cohort, context_hash, exposed_at, cohort_age_days, ltv_matured)
              SELECT 
                 $1 || '_' || org_id || '_' || json_extract(payload, '$.experiment_key'),
                 org_id,
                 json_extract(payload, '$.experiment_key'),
                 json_extract(payload, '$.cohort'),
                 COALESCE(context_key, 'GLOBAL'),
                 MIN(occurred_at) as exposed_at,
                 ROUND(JULIANDAY('now') - JULIANDAY(MIN(occurred_at))),
                 CASE WHEN ROUND(JULIANDAY('now') - JULIANDAY(MIN(occurred_at))) >= 30 THEN 1 ELSE 0 END
              FROM dw_raw_events
              WHERE event_type = 'EXPERIMENT_EXPOSED'
              GROUP BY org_id, json_extract(payload, '$.experiment_key'), json_extract(payload, '$.cohort'), COALESCE(context_key, 'GLOBAL')
              ON CONFLICT (org_id, experiment) DO UPDATE SET
                 cohort = EXCLUDED.cohort,
                 context_hash = EXCLUDED.context_hash,
                 cohort_age_days = ROUND(JULIANDAY('now') - JULIANDAY(fact_experiment_outcomes.exposed_at)),
                 ltv_matured = CASE WHEN ROUND(JULIANDAY('now') - JULIANDAY(fact_experiment_outcomes.exposed_at)) >= 30 THEN 1 ELSE 0 END`,
            [require('crypto').randomUUID().split('-')[0]]
        );

        // 3b. Reward Matrix Update (Calculate Generated Revenue Post-Exposure)
        await db.run(
            `UPDATE fact_experiment_outcomes
               SET 
                   converted = true,
                   revenue_impact = (
                       SELECT COALESCE(SUM(amount), 0)
                       FROM dw_raw_events
                       WHERE event_type = 'INVOICE_PAID'
                       AND org_id = fact_experiment_outcomes.org_id
                       AND occurred_at > fact_experiment_outcomes.exposed_at
                   )
               WHERE org_id IN (
                   SELECT org_id FROM dw_raw_events WHERE event_type = 'INVOICE_PAID'
               )`
        );

        // --- 4. Materialize FACT_COHORT_RETENTION
        console.log('📊 dbt-run: Building model `fact_cohort_retention`');
        await db.run(
            `INSERT INTO fact_cohort_retention (id, cohort_month, lifetime_month, active_count, total_users, retention_rate)
             WITH cohort AS (
                 SELECT org_id, DATE(occurred_at, 'start of month') as cohort_month
                 FROM dw_raw_events WHERE event_type = 'INVOICE_PAID'
                 GROUP BY org_id
             ),
             activity AS (
                 SELECT org_id, DATE(occurred_at, 'start of month') as activity_month
                 FROM dw_raw_events WHERE event_type = 'INVOICE_PAID'
             ),
             CohortSizes AS (
                 SELECT cohort_month, COUNT(DISTINCT org_id) as total_users
                 FROM cohort GROUP BY cohort_month
             )
             SELECT 
                 $1 || '_' || c.cohort_month || '_' || ROUND((JULIANDAY(a.activity_month) - JULIANDAY(c.cohort_month)) / 30),
                 c.cohort_month, 
                 CAST(ROUND((JULIANDAY(a.activity_month) - JULIANDAY(c.cohort_month)) / 30) AS INTEGER) as month_number,
                 COUNT(DISTINCT a.org_id) as active_orgs,
                 s.total_users,
                 ROUND(CAST(COUNT(DISTINCT a.org_id) AS FLOAT) / s.total_users * 100.0, 2) as retention_rate
             FROM cohort c
             JOIN activity a ON c.org_id = a.org_id
             JOIN CohortSizes s ON c.cohort_month = s.cohort_month
             GROUP BY c.cohort_month, month_number
             ON CONFLICT (cohort_month, lifetime_month) DO UPDATE SET 
                  active_count = EXCLUDED.active_count, retention_rate = EXCLUDED.retention_rate`,
            [require('crypto').randomUUID().split('-')[0]]
        );

        // --- 5. Materialize FACT_EXPERIMENT_OBSERVATIONS (Phase 15: Causal Uplift)
        console.log('📈 dbt-run: Building model `fact_experiment_observations`');
        await db.run(
            `INSERT INTO fact_experiment_observations (id, org_id, context_key, variant, propensity_score, exposed_at, reward_at, reward, experiment_key)
             WITH ExpEvents AS (
                 SELECT org_id, COALESCE(context_key, 'GLOBAL') as context_key,
                        json_extract(payload, '$.cohort') as variant,
                        CAST(json_extract(payload, '$.propensity_score') AS FLOAT) as ps,
                        occurred_at as exposed_at,
                        json_extract(payload, '$.experiment_key') as experiment_key
                 FROM dw_raw_events WHERE event_type = 'EXPERIMENT_EXPOSED'
             ),
             RevEvents AS (
                 SELECT org_id, amount, occurred_at as reward_at
                 FROM dw_raw_events WHERE event_type = 'INVOICE_PAID'
             )
             SELECT 
                 $1 || '_' || e.org_id || '_' || e.exposed_at,
                 e.org_id, e.context_key, e.variant, COALESCE(e.ps, 0.5),
                 e.exposed_at, MIN(r.reward_at), COALESCE(SUM(r.amount), 0), e.experiment_key
             FROM ExpEvents e
             LEFT JOIN RevEvents r ON e.org_id = r.org_id AND r.reward_at >= e.exposed_at
             GROUP BY e.org_id, e.exposed_at, e.experiment_key
             ON CONFLICT (org_id, experiment_key, exposed_at) DO UPDATE SET 
                  reward = EXCLUDED.reward, reward_at = EXCLUDED.reward_at`,
            [require('crypto').randomUUID().split('-')[0]]
        );

        // --- 6. Materialize FACT_LTV_METRICS
        console.log('📊 dbt-run: Building model `fact_ltv_metrics`');
        await db.run(
            `INSERT INTO fact_ltv_metrics (id, experiment_key, cohort, total_exposures, arpu, churn_rate, ltv)
             WITH ExpStats AS (
                 SELECT experiment, cohort, COUNT(DISTINCT org_id) as exposures, SUM(revenue_impact) as total_rev
                 FROM fact_experiment_outcomes GROUP BY experiment, cohort
             ),
             ChurnRate AS (
                 -- 45 Days Inactivity Churn
                 SELECT 
                     SUM(CASE WHEN last_paid_at < datetime('now', '-45 days') THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as global_churn
                 FROM (
                     SELECT org_id, MAX(occurred_at) as last_paid_at
                     FROM dw_raw_events WHERE event_type = 'INVOICE_PAID' GROUP BY org_id
                 )
             )
             SELECT 
                 $1 || '_' || experiment || '_' || cohort,
                 experiment, 
                 cohort,
                 exposures,
                 CASE WHEN exposures > 0 THEN total_rev / exposures ELSE 0 END as arpu,
                 COALESCE((SELECT global_churn FROM ChurnRate), 0.10) as churn_rate,
                 -- Realized LTV = ARPU (Because ARPU directly represents SUM(revenue)/users in FactExperimentOutcome)
                 CASE WHEN exposures > 0 THEN total_rev / exposures ELSE 0 END as ltv
             FROM ExpStats
             ON CONFLICT (experiment_key, cohort) DO UPDATE SET 
                  total_exposures = EXCLUDED.total_exposures,
                  arpu = EXCLUDED.arpu,
                  churn_rate = EXCLUDED.churn_rate,
                  ltv = EXCLUDED.ltv`,
            [require('crypto').randomUUID().split('-')[0]]
        );

        // --- 6. Staleness Guard Sync
        await db.run(
            `INSERT INTO experiment_configs (experiment_key, weights, updated_at)
             VALUES ('SYSTEM_DBT_STATUS', '{}', NOW())
             ON CONFLICT (experiment_key) DO UPDATE SET updated_at = NOW()`
        );

        console.log('✅ [dbt Pipeline] DW Materialization completed successfully.');
    } catch (e) {
        console.error('🚨 [dbt Failure] Exception building Materialized Fact Tables:', e.message);
    }
}

if (require.main === module) {
    runDbtTransforms().then(() => process.exit(0));
}

module.exports = { runDbtTransforms };
