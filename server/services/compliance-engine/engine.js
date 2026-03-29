/**
 * server/services/compliance-engine/engine.js
 * Core Node.js Compliance Logic: Deterministic Evaluation & Idempotency Guarantee
 */

const { encryptContextHash } = require('./crypto-hasher');
const { buildEngine } = require('./dsl-compiler');
const dbWriter = require('./postgres-sync-writer');

class ComplianceEngine {
    constructor(writer) {
        this.writer = writer;
        this.inflight = new Map();
        this.cachedRuleEngines = new Map();

        // Cần initListener() asynchronous. Bình thường sẽ gọi ở Boot strap file (index.js)
        this.writer.initListener().catch(console.error);
    }

    async evaluate(request, resBuffer) {
        // === START X-Engine-Time Metrics ===
        const start = process.hrtime.bigint();

        try {
            let executionPromise = this.inflight.get(request.request_id);

            if (!executionPromise) {
                let timeoutId;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('CRITICAL_EVAL_TIMEOUT')), 5000);
                });

                const execWrapper = this._executeEvaluation(request);

                // Dọn rác Timeout ngay lập tức nếu Logic chạy Nhanh hơn 5 giây
                execWrapper.finally(() => clearTimeout(timeoutId));

                executionPromise = Promise.race([execWrapper, timeoutPromise]);

                this.inflight.set(request.request_id, executionPromise);
            }

            const decision = await executionPromise;
            return decision;
        } finally {
            if (resBuffer && typeof resBuffer.setHeader === 'function') {
                const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
                resBuffer.setHeader('X-Engine-Time', durationMs.toFixed(2));
            }
            this.inflight.delete(request.request_id);
        }
    }

    async _executeEvaluation(requestData) {
        // 1. LẤY LOCK
        const lockStatus = await this.writer.lock(requestData);
        if (!lockStatus.isOwner) {
            return lockStatus.cachedDecision;
        }

        const originalLockedAt = lockStatus.originalLockedAt;

        try {
            // 2. CRYPTO HASH
            const { hash, hash_key_id } = encryptContextHash(requestData, 'v1_test_snap');

            // 3. COMPILE LÕI DSL TỪ BỘ NHỚ
            const rulesVersion = 'v1';
            let evaluateLogic = this.cachedRuleEngines.get(`${requestData.org_id}_${rulesVersion}`);
            if (!evaluateLogic) {
                // Mock Quy Định Hardcode Rủi Ro cho C1-C10 CHAOS TEST (Nghiệp vụ thực tế Get từ DB)
                const rules = [
                    {
                        rule_id: 'risk_limit_strict',
                        priority: 100,
                        effect: 'DENY',
                        message: 'Supplier must explicitly have trust score >= 60',
                        condition: {
                            AND: [
                                { field: 'supplier.trust_score', operator: 'EXISTS' },
                                { NOT: { field: 'supplier.trust_score', operator: 'GT', value: 60 } },
                            ],
                        },
                    },
                ];
                evaluateLogic = buildEngine(rules);
                this.cachedRuleEngines.set(`${requestData.org_id}_${rulesVersion}`, evaluateLogic);
            }

            // 4. KIỂM THỰC DATA VÀ CHẠY
            const rawDecision = evaluateLogic(requestData);

            const decision = {
                ...rawDecision,
                request_id: requestData.request_id,
                context_hash: hash,
                hash_key_id: hash_key_id,
                policy_version_id: rulesVersion,
            };

            // 5. COMMIT KẾT QUẢ / NHẢ LISTENERS
            await this.writer.commit(requestData, decision, originalLockedAt);
            return decision;
        } catch (error) {
            console.error('Core Engine Exception:', error);
            throw error;
        }
    }
}

// Bơm Database Idempotency Writer vào Engine
module.exports = new ComplianceEngine(dbWriter);
