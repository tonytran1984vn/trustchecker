const crypto = require('crypto');
const db = require('../../db');

class AutoPromotionEngine {
    constructor(dbClient) {
        this.db = dbClient;
    }

    // Mathematical safety guardrails restricting model transitions
    shouldPromote(summary) {
        if (!summary || summary.total_events < 50) return false; // Minimum statistical confidence window

        const regressionRate = summary.regressions / summary.total_events;
        const improvementRate = summary.improvements / summary.total_events;
        const noiseRate = summary.drifts / summary.total_events; // Represents OVER_ESCALATION metric analog for drifts from V1 bounds

        // Hard Constraints
        return (
            regressionRate < 0.02 && // <2% regressions
            noiseRate < 0.03 && // <3% noise / escalation drifts
            improvementRate >= 0.03 // >=3% improvement floor
        );
    }

    async evaluateAndPromote(runId, modelB) {
        const summaries = await this.db.all('SELECT * FROM replay_diff_summary WHERE run_id = $1', [runId]);
        if (!summaries || summaries.length === 0) return { promoted: false, reason: 'No diff summary found.' };

        const summary = summaries[0];
        const isApproved = this.shouldPromote(summary);

        const reasonPayload = JSON.stringify({
            regressions: summary.regressions,
            improvements: summary.improvements,
            total_events: summary.total_events,
        });

        await this.db.run('INSERT INTO promotion_logs (run_id, target_model, status, reason) VALUES ($1, $2, $3, $4)', [
            runId,
            modelB,
            isApproved ? 'PROMOTED_TO_CANARY' : 'REJECTED',
            reasonPayload,
        ]);

        if (isApproved) {
            // Push to Canary State
            await this.db.run('UPDATE model_governance_state SET canary_model = $1, mode = $2 WHERE id = 1', [
                modelB,
                'CANARY',
            ]);
        }

        return { promoted: isApproved, summary };
    }

    async triggerKillSwitch() {
        // Immediate Override < 1s roll back to STABLE V1
        await this.db.run(
            'UPDATE model_governance_state SET mode = $1, kill_switch_engaged = $2, canary_model = NULL WHERE id = 1',
            ['STABLE', true]
        );
        console.warn('⚠️ ENFORCED KILL SWITCH: Predictive Models rolled back to V1 Rule-Based Stable.');
    }

    async resetKillSwitch() {
        // Reset Kill Switch — return to normal STABLE operations
        await this.db.run('UPDATE model_governance_state SET kill_switch_engaged = $1 WHERE id = 1', [false]);
        console.warn('✅ KILL SWITCH RESET: System returned to standard autonomy mode.');
    }

    async promoteCanaryToActive(modelB) {
        await this.db.run(
            'UPDATE model_governance_state SET active_model = $1, mode = $2, canary_model = NULL WHERE id = 1',
            [modelB, 'STABLE']
        );
    }
}

// Stateful Governance Context Router
class GovernanceRouter {
    constructor() {
        this.cacheTime = 0;
        this.stateInfo = {
            active_model: 'PredictiveModelV1',
            mode: 'STABLE',
            kill_switch_engaged: false,
            canary_model: null,
        };
    }

    async syncState(dbClient) {
        // Debounce DB syncs locally to avoid blocking event loop telemetry floods (1000ms TTL Cache)
        if (Date.now() - this.cacheTime < 1000) return this.stateInfo;

        const results = await dbClient.all('SELECT * FROM model_governance_state WHERE id = 1');
        if (results && results.length > 0) {
            this.stateInfo = results[0];
            this.cacheTime = Date.now();
        }
        return this.stateInfo;
    }

    /**
     * Deterministic Request Routing
     * Uses Crypto hash of incident timestamp to statically slice 5-10% of traffic.
     */
    shouldRouteToCanary(timestampStr) {
        if (this.stateInfo.mode !== 'CANARY' || this.stateInfo.kill_switch_engaged) return false;

        const timestampSafe = String(timestampStr);
        const hashInt = parseInt(crypto.createHash('md5').update(timestampSafe).digest('hex').substring(0, 8), 16);
        return hashInt % 100 < 5; // 5% Canary split
    }
}

module.exports = { AutoPromotionEngine, GovernanceRouter };
