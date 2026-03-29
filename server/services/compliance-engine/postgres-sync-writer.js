/**
 * server/services/compliance-engine/postgres-sync-writer.js
 * Implementation of EvaluationLogWriter Interface.
 * Strategy: "Option A+" (Synchronous DB Write with Async-ready abstraction).
 */

const db = require('../../db');
const logger = require('../../lib/logger');
const os = require('os');
const stableStringify = require('fast-json-stable-stringify');
const EventEmitter = require('events');

const LOCK_TIMEOUT_SEC = 30; // Giới hạn Lease 30 giây

class PostgresSyncWriter {
    constructor() {
        this.hostId = process.env.POD_NAME || os.hostname();
        this.listenClient = null;
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.setMaxListeners(0); // Không bị cảnh báo Memory Leak trên Node
    }

    /**
     * Khởi động Client độc lập dành riêng cho Postgres LISTEN
     */
    async initListener() {
        if (!this.listenClient) {
            this.listenClient = await db._pool.connect();
            // Lắng nghe Channel Broadcast từ các Pods khác
            this.listenClient.on('notification', msg => {
                const channelBytes = msg.channel.split('_');
                const reqId = channelBytes.slice(2).join('_'); // channel = eval_done_{reqId}
                if (reqId) {
                    try {
                        const decision = JSON.parse(msg.payload);
                        this.eventEmitter.emit(`done_${reqId}`, decision);
                    } catch (e) {
                        logger.error('Failed to parse Pub/Sub notify payload', { reqId, error: e.message });
                    }
                }
            });
            await this.listenClient.query('LISTEN eval_done_broadcast'); // Đăng ký (Có thể dùng wildcard với Pg 15+)
        }
    }

    /**
     * Nỗ lực giành Quyền Ghi (Idempotency Lock) hoặc Takeover nếu Quá Hạn
     */
    async lock(requestContext) {
        const { request_id, org_id, action } = requestContext;

        // Cố gắng INSERT_FIRST.
        // Lưu ý do cơ chế Partition có thể không có Unique Global Index,
        // Ta dùng Select For Update kết hợp Advisory Lock nếu cực hình.
        // Tuy nhiên, logic chuẩn:

        // 1. Lấy trạng thái hiện tại (Nếu đã tồn tại)
        let existingLog = await db.get(
            `SELECT status, locked_at, lock_owner_id, decision_jsonb FROM evaluation_logs WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [request_id]
        );

        if (!existingLog) {
            // Chưa ai xử lý -> Giành quyền Owner
            try {
                // Rủi ro Race Condition nhỏ tại đây sẽ nổ Lỗi UNIQUE CONSTRAINT (Do Postgres bắt) => Bị nhảy sang Catch
                await db.run(
                    `INSERT INTO evaluation_logs (request_id, org_id, action, status, locked_at, lock_owner_id, created_at)
                     VALUES ($1, $2, $3, 'PROCESSING', NOW(), $4, NOW())`,
                    [request_id, org_id, action, this.hostId]
                );
                return { isOwner: true, originalLockedAt: null }; // NULL = Vừa mới đẻ ra
            } catch (err) {
                if (err.code === '23505') {
                    // Unique Violation (Bị gã khác giành trước sấp mặt 1ms)
                    existingLog = await db.get(
                        `SELECT status, locked_at, lock_owner_id, decision_jsonb FROM evaluation_logs WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1`,
                        [request_id]
                    );
                } else {
                    throw err;
                }
            }
        }

        if (existingLog) {
            if (existingLog.status === 'DONE') {
                return { isOwner: false, cachedDecision: existingLog.decision_jsonb }; // Trả thẳng kết quả
            }

            // Đang PROCESSING nhưng có dấu hiệu Bị Treo (Split-Brain / Pod Die)? Cướp cờ (Takeover)
            const lockedAtTime = new Date(existingLog.locked_at).getTime();
            if (Date.now() - lockedAtTime > LOCK_TIMEOUT_SEC * 1000) {
                // Cú đấm Update Cướp quyền
                const takeOverRes = await db._pool.query(
                    `UPDATE evaluation_logs 
                     SET locked_at = NOW(), lock_owner_id = $1 
                     WHERE request_id = $2 AND locked_at = $3`, // Trói chặt locked_at cũ chống Cướp tay đôi
                    [this.hostId, request_id, existingLog.locked_at]
                );
                if (takeOverRes.rowCount === 1) {
                    logger.warn('Lease Taken over for Ghost Request', { request_id });
                    return { isOwner: true, originalLockedAt: existingLog.locked_at }; // Ghi nhớ locked_at mốc này để Commit
                }
            }

            // Nếu Lock còn hiệu lực, rút lui làm Waiter (Chờ kết quả thụ động)
            const decision = await this._hybridWaitForDecision(request_id);
            return { isOwner: false, cachedDecision: decision };
        }
    }

    /**
     * Owner nhả kết quả cuối cùng vào Audit Log, sử dụng Ràng Buộc Update Tối Hậu.
     */
    async commit(requestContext, decision, originalLockedAt) {
        const { request_id } = requestContext;

        const payloadStr = stableStringify(decision);

        // 1. Cập nhật Status và Extract Hot Fields dội vào Column (Bảo vệ tốc độ Search cho Admin sau này)
        const updateSQL = `
            UPDATE evaluation_logs 
            SET status = 'DONE',
                is_allowed = $1,
                rejection_reason = $2,
                violated_rule_ids = $3::jsonb,
                decision_jsonb = $4::jsonb,
                context_hash = $5,
                policy_version_id = $6
            WHERE request_id = $7
              ${originalLockedAt ? 'AND locked_at = $8' : 'AND lock_owner_id = $8'} 
        `;

        const updateParams = [
            decision.is_allowed,
            decision.rejection_reason || null,
            JSON.stringify(decision.violated_rule_ids || []),
            payloadStr,
            decision.context_hash || null,
            decision.policy_version_id || 'v1',
            request_id,
            originalLockedAt || this.hostId,
        ];

        const res = await db._pool.query(updateSQL, updateParams);

        if (res.rowCount === 0) {
            // TÔI BỊ KẺ KHÁC LẤY MẤT QUYỀN VÌ RỚT MẠNG QUÁ LÂU! = ABORT
            throw new Error('CRITICAL: Evaluation process overtaken by Lease Timeout. Transaction halted.');
        }

        // 2. Châm pháo sáng Báo hiệu cho các Đàn em Cùng Cổng (Bắn Notify)
        try {
            // Dùng LISTEN riêng rẽ cho từng ID (Cần dọn rác listen) hoặc dùng Kênh Chung:
            await db.run(`SELECT pg_notify('eval_done_' || $1, $2)`, [request_id, payloadStr]);
        } catch (e) {
            logger.error('Failed to emit Pub/Sub', { error: e.message });
        }
    }

    /**
     * Vệ binh C2/C8: Hybrid Fallback Waiter
     * Chống Bão Polling và Chống Listen Leak (Zombie).
     */
    async _hybridWaitForDecision(request_id) {
        return new Promise(async (resolve, reject) => {
            let timerFallback;

            // Hàm Cleanup Event Listeners ngăn Zombie Memory Leak (C8)
            const cleanup = () => {
                clearTimeout(timerFallback);
                this.eventEmitter.removeAllListeners(`done_${request_id}`);
            };

            // 1. Phục binh chờ NOTIFY
            this.eventEmitter.once(`done_${request_id}`, decision => {
                cleanup();
                resolve(decision);
            });

            // 2. Fallback Radar Timeout 500ms (Phát chống Lạc Tín Hiệu - C2)
            const checkFallback = async () => {
                try {
                    const row = await db.get(
                        `SELECT decision_jsonb, status FROM evaluation_logs WHERE request_id = $1`,
                        [request_id]
                    );
                    if (row && row.status === 'DONE') {
                        cleanup();
                        resolve(row.decision_jsonb);
                        return;
                    }
                    if (row && row.status === 'FAILED') {
                        cleanup();
                        reject(new Error('Evaluation failed by Owner'));
                        return;
                    }
                    // Chưa Xong -> Backoff 100ms -> 200ms -> ...
                    timerFallback = setTimeout(checkFallback, 200);
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            timerFallback = setTimeout(checkFallback, 100); // 100ms nhảy radar 1 lần

            // Max Wait 1 Giây chặn Đứng Hệ thống Die do Đợi (UX Choke)
            setTimeout(() => {
                cleanup();
                reject(new Error(`EVAL_POLLING_TIMEOUT_EXCEEDED (1000ms)`));
            }, 1000);
        });
    }
}

module.exports = new PostgresSyncWriter();
