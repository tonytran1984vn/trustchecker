/**
 * server/services/compliance-engine/engine.js
 * Core Node.js Compliance Logic: Deterministic Evaluation & Idempotency Guarantee
 */

const { encryptContextHash } = require('./crypto-hasher');
const { buildEngine } = require('./dsl-compiler');
const dbWriter = require('./postgres-sync-writer');
const db = require('../../db');

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

            // 3. XÂY DỰNG CACHE LUẬT KÉP (DUAL-LAYER LOAD)
            const cacheKey = `${requestData.org_id}_${requestData.action}_dual`;
            let evaluateBundle = this.cachedRuleEngines.get(cacheKey);

            if (!evaluateBundle) {
                // Ưu tiên Tuyệt Đối: Platform Hệ Thống (Mệnh Lệnh Cốt Lõi)
                const sysPolicy = await db.get(
                    `SELECT rules_jsonb, version_id FROM compliance_policies WHERE org_id = 'SYSTEM' AND action = $1 AND is_active = true LIMIT 1`,
                    [requestData.action]
                );

                // Ưu tiên Sân Nhà: Org Tự Thiết Luật Cục Bộ Thêm
                let orgPolicy = null;
                if (requestData.org_id && requestData.org_id !== 'SYSTEM') {
                    orgPolicy = await db.get(
                        `SELECT rules_jsonb, version_id FROM compliance_policies WHERE org_id = $1 AND action = $2 AND is_active = true LIMIT 1`,
                        [requestData.org_id, requestData.action]
                    );
                }

                if (!sysPolicy && !orgPolicy) {
                    throw new Error(
                        `CRITICAL: No valid Active compliance policy defined for Action [${requestData.action}]. Halting operation.`
                    );
                }

                evaluateBundle = {
                    sysVersion: sysPolicy ? sysPolicy.version_id : null,
                    orgVersion: orgPolicy ? orgPolicy.version_id : null,
                    sysLogic: sysPolicy
                        ? buildEngine(
                              typeof sysPolicy.rules_jsonb === 'string'
                                  ? JSON.parse(sysPolicy.rules_jsonb)
                                  : sysPolicy.rules_jsonb
                          )
                        : null,
                    orgLogic: orgPolicy
                        ? buildEngine(
                              typeof orgPolicy.rules_jsonb === 'string'
                                  ? JSON.parse(orgPolicy.rules_jsonb)
                                  : orgPolicy.rules_jsonb
                          )
                        : null,
                };

                // Nhớ vào Lưới Nhện Cache (Hit-rate: 99.99%)
                this.cachedRuleEngines.set(cacheKey, evaluateBundle);
            }

            // 4. KIỂM THỰC DATA VÀ CHẠY 2 LỚP TUẦN TỰ (Sequential Evaluator)
            // Khởi điểm: Mặc định được lưu thông nếu Không có luật Cản bước.
            let rawDecision = { is_allowed: true, reason: 'Passed dual layer implicitly.', code: 'ALLOW' };
            const appliedVersions = [];

            // 4A. Ép Chạy SYSTEM trước tiên (Quyền Trượng Platform)
            if (evaluateBundle.sysLogic) {
                rawDecision = evaluateBundle.sysLogic(requestData);
                appliedVersions.push(evaluateBundle.sysVersion);
            }

            // 4B. TẦNG ORG - MẶT ĐẤT (Chỉ chạy khi lọt qua Tầng Platform)
            if (rawDecision.is_allowed && evaluateBundle.orgLogic) {
                const orgDecision = evaluateBundle.orgLogic(requestData);
                if (!orgDecision.is_allowed) {
                    rawDecision = orgDecision; // Trượt ở tầng Cục bộ
                }
                appliedVersions.push(evaluateBundle.orgVersion);
            }

            const finalVersionIds = appliedVersions.join(' | ');

            const decision = {
                ...rawDecision,
                request_id: requestData.request_id,
                context_hash: hash,
                hash_key_id: hash_key_id,
                policy_version_id: finalVersionIds,
            };

            // 5. COMMIT KẾT QUẢ / NHẢ LISTENERS
            await this.writer.commit(requestData, decision, originalLockedAt);
            return decision;
        } catch (error) {
            console.error('Core Engine Exception:', error);
            throw error;
        }
    }

    clearCache(orgId = null, action = null) {
        if (!orgId && !action) {
            this.cachedRuleEngines.clear(); // WIPE ALL
        } else {
            // Because cacheKeys are now 'orgId_action_dual'
            for (const key of this.cachedRuleEngines.keys()) {
                // Nếu xóa SYSTEM Action, quét Nát toàn bộ Cache Kép của Bất kỳ Tằng Org Nào liên quan Action Đó
                if (orgId === 'SYSTEM' && key.endsWith(`_${action}_dual`)) {
                    this.cachedRuleEngines.delete(key);
                }
                // Nếu xóa Local Org, Chỉ xóa đúng Lõi kép Của Thằng Nghịch Ngợm Này
                else if (orgId !== 'SYSTEM' && key.startsWith(`${orgId}_`) && key.endsWith(`_${action}_dual`)) {
                    this.cachedRuleEngines.delete(key);
                }
            }
        }
    }
}

// Bơm Database Idempotency Writer vào Engine
module.exports = new ComplianceEngine(dbWriter);
