const db = require('../../db');

class ActionExecutor {
    constructor() {
        this.actions = {
            scale_up: async ctx => {
                console.log(`[ACTION] Scaling up resources to absorb burst. Context: ${JSON.stringify(ctx)}`);
                // Mock orchestration API calls
            },
            restart_service: async ctx => {
                console.log(`[ACTION] Restarting stalled microservice pods. Context: ${JSON.stringify(ctx)}`);
            },
            rollback_release: async ctx => {
                console.log(
                    `[ACTION] Triggering safe rollback to previous stable artifact. Context: ${JSON.stringify(ctx)}`
                );
            },
            throttle_traffic: async ctx => {
                console.log(`[ACTION] Throttling external traffic via API Gateway. Context: ${JSON.stringify(ctx)}`);
            },
        };
    }

    decideAction(rootCause) {
        switch (rootCause) {
            case 'traffic':
                return 'scale_up';
            case 'database_io':
            case 'latency':
                return 'restart_service';
            case 'error_rate':
                return 'rollback_release';
            default:
                return 'throttle_traffic';
        }
    }

    async execute(targetAnomaly, causalInference) {
        const actionCode = this.decideAction(causalInference.rootCause);

        let mode = 'AUTO_EXECUTE';
        if (causalInference.confidence < 0.8) {
            mode = 'RECOMMEND_ONLY';
        }

        const context = {
            anomalousNode: targetAnomaly,
            causalPath: causalInference.path,
        };

        const logResult = await db.all(
            `INSERT INTO autonomous_actions_log (action, root_cause, confidence, mode, status, context) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [
                actionCode,
                causalInference.rootCause,
                causalInference.confidence,
                mode,
                mode === 'AUTO_EXECUTE' ? 'COMPLETED' : 'PENDING',
                JSON.stringify(context),
            ]
        );

        if (mode === 'AUTO_EXECUTE') {
            await this.actions[actionCode](context);
        }

        return {
            log_id: logResult[0].id,
            action: actionCode,
            mode,
            executed: mode === 'AUTO_EXECUTE',
        };
    }
}

module.exports = { ActionExecutor };
