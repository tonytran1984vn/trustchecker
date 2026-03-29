/**
 * server/services/compliance-engine/crypto-hasher.js
 * Generates identical hashes for identical JSON structures, regardless of key order.
 * Ensures data footprint immutability.
 */
const crypto = require('crypto');
const stableStringify = require('fast-json-stable-stringify');

// Hệ thống quản lý Key Rotation (Bản lề sau này xoay khóa mà không phá Audit cũ)
const CURRENT_KEY_ID = 'v1_production_secret';
const SECRET_KEYS = {
    v1_production_secret: process.env.COMPLIANCE_SIGNING_SECRET || 'fallback-dev-key-7a91X',
};

/**
 * Tạo Forensic Context Hash.
 * Chống Lại Payload Mismatch và Kẻ tấn công đảo trật tự JSON.
 */
function encryptContextHash(requestData, policySnapshotHash) {
    if (!requestData || !requestData.request_id) {
        throw new Error('Hash requires RequestId to prevent Replay Attacks');
    }

    const key = SECRET_KEYS[CURRENT_KEY_ID];
    if (!key) throw new Error(`Missing Signing Secret for KeyID: ${CURRENT_KEY_ID}`);

    // Stable Stringify loại bỏ khoảng trắng dư thừa và xếp Alpha từng key
    const payloadSignatureData = {
        req: requestData.request_id,
        org: requestData.org_id,
        supplier: requestData.supplier, // Toàn bộ object con bị khóa Cứng order
        product: requestData.product,
        event: requestData.event,
        policy_hash: policySnapshotHash,
    };

    const canonicalString = stableStringify(payloadSignatureData);

    const hash = crypto.createHmac('sha256', key).update(canonicalString).digest('hex');

    return {
        hash,
        hash_key_id: CURRENT_KEY_ID,
    };
}

module.exports = {
    encryptContextHash,
};
