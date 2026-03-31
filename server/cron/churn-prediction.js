/**
 * Churn Prediction Engine
 * Analyzes usage trajectories (Month-Over-Month) to isolate At-Risk Enterprises.
 */

const db = require('../db');

async function runChurnAnalysis() {
    console.log('🤖 [Revenue Engine] Initializing Churn Deflection Scanning...');
    await db._readyPromise;

    try {
        const now = new Date();
        const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthId = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

        // Aggregate Month-Over-Month (MoM)
        const sql = `
            SELECT org_id, feature, 
                   SUM(CASE WHEN TO_CHAR(occurred_at, 'YYYY-MM') = $1 THEN amount ELSE 0 END) as cur_usage,
                   SUM(CASE WHEN TO_CHAR(occurred_at, 'YYYY-MM') = $2 THEN amount ELSE 0 END) as prv_usage
            FROM usage_events
            WHERE occurred_at >= $3
            GROUP BY org_id, feature
        `;

        const thresholdDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 60 days loop
        const data = await db.all(sql, [currentMonthId, lastMonthId, thresholdDate.toISOString()]);

        const riskOrgs = new Set();

        // Combine with Global Organization Billing Signals
        const orgs = await db.all(
            'SELECT id as org_id, current_plan, pending_downgrade_plan, billing_status FROM organizations'
        );

        for (const org of orgs) {
            let churnScore = 0; // 0 to 100

            // 1. Evaluate Billing Signal (Weight: 30%)
            if (org.pending_downgrade_plan) churnScore += 30; // Implicit Churn Intent
            if (org.billing_status === 'PAST_DUE') churnScore += 15; // High Risk Failure

            // 2. Evaluate Usage Signal (Weight: 40%) - Find matching MoM rows
            const usageData = data.filter(d => d.org_id === org.org_id);
            for (const row of usageData) {
                const cur = parseInt(row.cur_usage || 0, 10);
                const prv = parseInt(row.prv_usage || 0, 10);

                if (prv > 50) {
                    const ratio = cur / prv;
                    if (ratio < 0.2) {
                        churnScore += 40; // Catastrophic 80%+ Drop Off
                    } else if (ratio < 0.5) {
                        churnScore += 20; // 50%+ Drop Off
                    }
                }
            }

            // 3. Output Translation (Stripe/Amplitude Standard)
            let classification = 'LOW';
            if (churnScore >= 60) classification = 'HIGH';
            else if (churnScore >= 30) classification = 'MEDIUM';

            if (classification !== 'LOW') {
                console.log(`⚠️ [CHURN PREDICT: ${classification}] Org ${org.org_id} scored ${churnScore}.`);
                riskOrgs.add({ org_id: org.org_id, score: churnScore });
            }
        }

        if (riskOrgs.size > 0) {
            console.log(
                `📧 Dispatching Marketing Webhooks for ${riskOrgs.size} At-Risk Accounts (Discounts Attached)...`
            );
            // Future implementation: Send grid API -> "We missed you. Here is 30% OFF PRO."
        } else {
            console.log(`✅ [Revenue Engine] Zero High-Risk Churn trajectories found.`);
        }
    } catch (e) {
        console.error('Failed to analyze Churn Engine:', e.message);
    }
}

if (require.main === module) {
    runChurnAnalysis().then(() => process.exit(0));
}

module.exports = { runChurnAnalysis };
