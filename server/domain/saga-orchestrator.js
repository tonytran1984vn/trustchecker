/**
 * TrustChecker v9.4 — Saga Orchestrator
 * 
 * Multi-domain orchestration with compensation logic.
 * Implements 3 core sagas for cross-boundary workflows.
 * State machine per saga instance with timeout + DLQ support.
 */

const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// SAGA STATE MACHINE
// ═══════════════════════════════════════════════════════════════════

const SAGA_STATES = {
    CREATED: 'CREATED',
    RUNNING: 'RUNNING',
    STEP_PENDING: 'STEP_PENDING',
    STEP_COMPLETE: 'STEP_COMPLETE',
    COMPLETED: 'COMPLETED',
    COMPENSATING: 'COMPENSATING',
    COMPENSATION_COMPLETE: 'COMPENSATION_COMPLETE',
    FAILED: 'FAILED',
    TIMED_OUT: 'TIMED_OUT',
};

const VALID_TRANSITIONS = {
    [SAGA_STATES.CREATED]: [SAGA_STATES.RUNNING],
    [SAGA_STATES.RUNNING]: [SAGA_STATES.STEP_PENDING, SAGA_STATES.COMPLETED, SAGA_STATES.FAILED, SAGA_STATES.TIMED_OUT],
    [SAGA_STATES.STEP_PENDING]: [SAGA_STATES.STEP_COMPLETE, SAGA_STATES.COMPENSATING, SAGA_STATES.TIMED_OUT],
    [SAGA_STATES.STEP_COMPLETE]: [SAGA_STATES.STEP_PENDING, SAGA_STATES.COMPLETED, SAGA_STATES.COMPENSATING],
    [SAGA_STATES.COMPENSATING]: [SAGA_STATES.COMPENSATION_COMPLETE, SAGA_STATES.FAILED],
    [SAGA_STATES.COMPENSATION_COMPLETE]: [SAGA_STATES.FAILED],
};

// ═══════════════════════════════════════════════════════════════════
// SAGA DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const SAGA_DEFINITIONS = {
    SCAN_VERIFICATION: {
        name: 'ScanVerificationSaga',
        triggerEvent: 'scan.created',
        timeoutMs: 30000,
        steps: [
            {
                name: 'validate_product',
                domain: 'PRODUCT_AUTHENTICITY',
                action: 'validateProductExists',
                compensation: null, // No compensation — read-only
            },
            {
                name: 'run_fraud_check',
                domain: 'RISK_INTELLIGENCE',
                action: 'runFraudDetection',
                compensation: 'cancelFraudAlert',
            },
            {
                name: 'update_trust_score',
                domain: 'PRODUCT_AUTHENTICITY',
                action: 'recalculateTrustScore',
                compensation: 'revertTrustScore',
            },
            {
                name: 'send_notification',
                domain: 'IDENTITY',
                action: 'notifyScanResult',
                compensation: null, // Best-effort, no compensation
            },
        ],
    },

    SHIPMENT_LIFECYCLE: {
        name: 'ShipmentLifecycleSaga',
        triggerEvent: 'shipment.delivered',
        timeoutMs: 60000,
        steps: [
            {
                name: 'verify_delivery',
                domain: 'SUPPLY_CHAIN',
                action: 'verifyDeliveryCheckpoint',
                compensation: null,
            },
            {
                name: 'update_inventory',
                domain: 'SUPPLY_CHAIN',
                action: 'incrementInventory',
                compensation: 'decrementInventory',
            },
            {
                name: 'update_partner_score',
                domain: 'SUPPLY_CHAIN',
                action: 'recalculatePartnerScore',
                compensation: 'revertPartnerScore',
            },
            {
                name: 'generate_epcis_event',
                domain: 'SUPPLY_CHAIN',
                action: 'createDeliveryEPCIS',
                compensation: null, // EPCIS events are immutable
            },
        ],
    },

    FRAUD_INVESTIGATION: {
        name: 'FraudInvestigationSaga',
        triggerEvent: 'fraud.alert.created',
        timeoutMs: 120000,
        steps: [
            {
                name: 'collect_evidence',
                domain: 'PRODUCT_AUTHENTICITY',
                action: 'collectScanEvidence',
                compensation: null,
            },
            {
                name: 'analyze_risk_pattern',
                domain: 'RISK_INTELLIGENCE',
                action: 'analyzeRiskPattern',
                compensation: null,
            },
            {
                name: 'recalculate_trust',
                domain: 'PRODUCT_AUTHENTICITY',
                action: 'degradeTrustScore',
                compensation: 'restoreTrustScore',
            },
            {
                name: 'notify_stakeholders',
                domain: 'IDENTITY',
                action: 'notifyFraudDetected',
                compensation: null,
            },
        ],
    },
};

// ═══════════════════════════════════════════════════════════════════
// SAGA INSTANCE
// ═══════════════════════════════════════════════════════════════════

class SagaInstance {
    constructor(definition, triggerData, context = {}) {
        this.id = `saga_${crypto.randomBytes(8).toString('hex')}`;
        this.name = definition.name;
        this.state = SAGA_STATES.CREATED;
        this.definition = definition;
        this.triggerData = triggerData;
        this.context = context;
        this.currentStep = 0;
        this.completedSteps = [];
        this.stepResults = {};
        this.error = null;
        this.startedAt = Date.now();
        this.completedAt = null;
        this.timeoutMs = definition.timeoutMs;
        this.log = [];
    }

    _addLog(message, data = {}) {
        this.log.push({
            timestamp: new Date().toISOString(),
            step: this.currentStep,
            state: this.state,
            message,
            ...data,
        });
    }

    transition(newState) {
        const allowed = VALID_TRANSITIONS[this.state] || [];
        if (!allowed.includes(newState)) {
            throw new Error(`Invalid saga transition: ${this.state} → ${newState} (saga: ${this.id})`);
        }
        const oldState = this.state;
        this.state = newState;
        this._addLog(`State transition: ${oldState} → ${newState}`);
        if (newState === SAGA_STATES.COMPLETED || newState === SAGA_STATES.FAILED || newState === SAGA_STATES.TIMED_OUT) {
            this.completedAt = Date.now();
        }
    }

    isTimedOut() {
        return Date.now() - this.startedAt > this.timeoutMs;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            state: this.state,
            currentStep: this.currentStep,
            totalSteps: this.definition.steps.length,
            completedSteps: this.completedSteps,
            error: this.error,
            startedAt: new Date(this.startedAt).toISOString(),
            completedAt: this.completedAt ? new Date(this.completedAt).toISOString() : null,
            durationMs: (this.completedAt || Date.now()) - this.startedAt,
            log: this.log,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// SAGA ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

class SagaOrchestrator {
    constructor() {
        this.definitions = new Map();
        this.activeSagas = new Map();
        this.completedSagas = []; // Ring buffer — last 100
        this.stepHandlers = new Map();
        this.maxCompleted = 100;
        this.stats = {
            started: 0,
            completed: 0,
            failed: 0,
            compensated: 0,
            timedOut: 0,
        };

        // Register built-in saga definitions
        for (const [key, def] of Object.entries(SAGA_DEFINITIONS)) {
            this.definitions.set(key, def);
        }
    }

    /**
     * Register a step handler for a domain action.
     * @param {string} domain - Domain key
     * @param {string} action - Action name
     * @param {Function} handler - async (data, context) => result
     */
    registerHandler(domain, action, handler) {
        const key = `${domain}:${action}`;
        this.stepHandlers.set(key, handler);
    }

    /**
     * Start a saga by key with trigger data.
     * @param {string} sagaKey - SAGA_DEFINITIONS key
     * @param {Object} triggerData - Event data that triggered the saga
     * @param {Object} context - Tenant context, user info, etc.
     * @returns {SagaInstance}
     */
    async start(sagaKey, triggerData, context = {}) {
        const definition = this.definitions.get(sagaKey);
        if (!definition) throw new Error(`Unknown saga: ${sagaKey}`);

        const instance = new SagaInstance(definition, triggerData, context);
        this.activeSagas.set(instance.id, instance);
        this.stats.started++;

        instance._addLog(`Saga started with trigger: ${definition.triggerEvent}`, {
            triggerData: JSON.stringify(triggerData).slice(0, 200),
        });

        try {
            instance.transition(SAGA_STATES.RUNNING);
            await this._executeSteps(instance);
        } catch (err) {
            instance.error = err.message;
            instance._addLog(`Saga failed: ${err.message}`);

            // Attempt compensation
            if (instance.completedSteps.length > 0) {
                await this._compensate(instance);
            } else {
                try { instance.transition(SAGA_STATES.FAILED); } catch (e) { /* already in terminal state */ }
                this.stats.failed++;
            }
        } finally {
            this._archiveSaga(instance);
        }

        return instance;
    }

    /**
     * Execute saga steps sequentially.
     */
    async _executeSteps(instance) {
        const steps = instance.definition.steps;

        for (let i = 0; i < steps.length; i++) {
            instance.currentStep = i;
            const step = steps[i];

            // Check timeout
            if (instance.isTimedOut()) {
                instance.transition(SAGA_STATES.TIMED_OUT);
                this.stats.timedOut++;
                throw new Error(`Saga timed out at step ${i} (${step.name})`);
            }

            instance.transition(SAGA_STATES.STEP_PENDING);
            instance._addLog(`Executing step ${i}: ${step.name} (${step.domain}:${step.action})`);

            const handlerKey = `${step.domain}:${step.action}`;
            const handler = this.stepHandlers.get(handlerKey);

            if (!handler) {
                // No handler registered — use default pass-through
                instance._addLog(`No handler for ${handlerKey} — skipping (pass-through)`, { level: 'warn' });
                instance.transition(SAGA_STATES.STEP_COMPLETE);
                instance.completedSteps.push(step.name);
                continue;
            }

            try {
                const result = await Promise.race([
                    handler(instance.triggerData, {
                        ...instance.context,
                        sagaId: instance.id,
                        stepResults: instance.stepResults,
                    }),
                    this._timeout(instance.timeoutMs - (Date.now() - instance.startedAt)),
                ]);

                instance.stepResults[step.name] = result;
                instance.transition(SAGA_STATES.STEP_COMPLETE);
                instance.completedSteps.push(step.name);
                instance._addLog(`Step ${i} completed: ${step.name}`, {
                    resultSummary: JSON.stringify(result).slice(0, 100),
                });
            } catch (err) {
                instance._addLog(`Step ${i} failed: ${step.name} — ${err.message}`);
                throw err;
            }
        }

        instance.transition(SAGA_STATES.COMPLETED);
        this.stats.completed++;
        instance._addLog('Saga completed successfully');
    }

    /**
     * Run compensation in reverse order for completed steps.
     */
    async _compensate(instance) {
        instance._addLog('Starting compensation...');
        try {
            instance.transition(SAGA_STATES.COMPENSATING);
        } catch (e) {
            // May already be in a state that can't transition
            instance.state = SAGA_STATES.COMPENSATING;
        }

        const steps = instance.definition.steps;
        const completedIndices = instance.completedSteps
            .map(name => steps.findIndex(s => s.name === name))
            .filter(i => i >= 0)
            .reverse(); // Compensate in reverse order

        for (const idx of completedIndices) {
            const step = steps[idx];
            if (!step.compensation) {
                instance._addLog(`Step ${idx} (${step.name}) has no compensation — skipping`);
                continue;
            }

            const compensationKey = `${step.domain}:${step.compensation}`;
            const handler = this.stepHandlers.get(compensationKey);

            if (!handler) {
                instance._addLog(`No compensation handler for ${compensationKey}`, { level: 'warn' });
                continue;
            }

            try {
                await handler(instance.triggerData, {
                    ...instance.context,
                    sagaId: instance.id,
                    stepResults: instance.stepResults,
                    isCompensation: true,
                });
                instance._addLog(`Compensation for step ${idx} (${step.name}) completed`);
            } catch (err) {
                instance._addLog(`Compensation for step ${idx} (${step.name}) FAILED: ${err.message}`, { level: 'error' });
                // Continue compensating other steps — best effort
            }
        }

        try {
            instance.transition(SAGA_STATES.COMPENSATION_COMPLETE);
            instance.transition(SAGA_STATES.FAILED);
        } catch (e) {
            instance.state = SAGA_STATES.FAILED;
        }
        this.stats.compensated++;
        this.stats.failed++;
        instance._addLog('Compensation complete — saga marked as failed');
    }

    _timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Saga step timeout')), Math.max(ms, 100));
        });
    }

    _archiveSaga(instance) {
        this.activeSagas.delete(instance.id);
        this.completedSagas.push(instance.toJSON());
        if (this.completedSagas.length > this.maxCompleted) {
            this.completedSagas.shift();
        }
    }

    // ─── Diagnostics ────────────────────────────────────────────────

    getActiveSagas() {
        return [...this.activeSagas.values()].map(s => s.toJSON());
    }

    getRecentSagas(limit = 20) {
        return this.completedSagas.slice(-limit);
    }

    getSagaById(id) {
        const active = this.activeSagas.get(id);
        if (active) return active.toJSON();
        return this.completedSagas.find(s => s.id === id) || null;
    }

    getStats() {
        return {
            ...this.stats,
            active: this.activeSagas.size,
            definitions: [...this.definitions.keys()],
            registeredHandlers: [...this.stepHandlers.keys()],
        };
    }
}

// Singleton
const orchestrator = new SagaOrchestrator();

module.exports = {
    SagaOrchestrator,
    orchestrator,
    SAGA_DEFINITIONS,
    SAGA_STATES,
};
