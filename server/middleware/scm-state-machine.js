/**
 * SCM State Machine — RED-TEAM P2-1
 * Enforces valid supply chain event transitions.
 * 
 * Valid transitions:
 *   null → commission
 *   commission → pack | ship (simple chains)
 *   pack → ship
 *   ship → receive
 *   receive → sell | ship | return
 *   sell → return
 *   return → destroy | commission (re-enter)
 */
const db = require('../db');

const VALID_TRANSITIONS = {
    '_initial':    ['commission'],
    'commission':  ['pack', 'ship'],
    'pack':        ['ship'],
    'ship':        ['receive'],
    'receive':     ['sell', 'ship', 'return'],
    'sell':        ['return'],
    'return':      ['destroy', 'commission'],
};

/**
 * Validate lifecycle transition
 */
async function validateTransition(productId, batchId, newEventType) {
    let lastEvent = null;
    if (productId) {
        lastEvent = await db.get(
            `SELECT event_type FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [productId]
        );
    } else if (batchId) {
        lastEvent = await db.get(
            `SELECT event_type FROM supply_chain_events WHERE batch_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [batchId]
        );
    }

    const currentState = lastEvent?.event_type || '_initial';
    const allowedNext = VALID_TRANSITIONS[currentState];

    if (!allowedNext) {
        return { valid: false, currentState, error: `Terminal state "${currentState}" — no further events allowed` };
    }
    if (!allowedNext.includes(newEventType)) {
        return { valid: false, currentState, error: `Invalid transition: "${currentState}" → "${newEventType}". Allowed: [${allowedNext.join(', ')}]` };
    }
    return { valid: true, currentState };
}

/**
 * Check for duplicate receive (idempotency — P2-4)
 */
async function checkDuplicateReceive(productId, batchId, eventType) {
    if (eventType !== 'receive') return { isDuplicate: false };
    
    const existing = await db.get(
        `SELECT id, created_at FROM supply_chain_events 
         WHERE (product_id = $1 OR batch_id = $2) AND event_type = 'receive'
         ORDER BY created_at DESC LIMIT 1`,
        [productId || '', batchId || '']
    );

    if (existing) {
        const reShipped = await db.get(
            `SELECT id FROM supply_chain_events 
             WHERE (product_id = $1 OR batch_id = $2) AND event_type = 'ship'
             AND created_at > $3 LIMIT 1`,
            [productId || '', batchId || '', existing.created_at]
        );
        if (!reShipped) {
            return { isDuplicate: true, existingId: existing.id, receivedAt: existing.created_at };
        }
    }
    return { isDuplicate: false };
}

/**
 * Validate partner belongs to org (P2-3)
 */
async function validatePartner(partnerId, orgId) {
    if (!partnerId) return { valid: true };
    
    const partner = await db.get(
        'SELECT id, name, status FROM partners WHERE id = $1 AND org_id = $2',
        [partnerId, orgId]
    );
    
    if (!partner) {
        return { valid: false, error: `Partner "${partnerId}" not found in your organization` };
    }
    if (partner.status === 'suspended' || partner.status === 'blocked') {
        return { valid: false, error: `Partner "${partner.name}" is ${partner.status}` };
    }
    return { valid: true, partner };
}

/**
 * Validate batch quantity (P2-5)
 */
async function validateBatchQuantity(batchId, eventType) {
    if (!batchId || !['ship', 'sell'].includes(eventType)) return { valid: true };

    const batch = await db.get('SELECT quantity, status FROM batches WHERE id = $1', [batchId]);
    if (!batch) return { valid: true }; // No batch = no quantity check

    if (batch.status === 'recalled') {
        return { valid: false, error: `Batch is recalled — cannot ${eventType}` };
    }

    // Count items already shipped/sold from this batch
    const shipped = await db.get(
        `SELECT COUNT(*) as cnt FROM supply_chain_events WHERE batch_id = $1 AND event_type IN ('ship', 'sell')`,
        [batchId]
    );
    
    if (shipped && shipped.cnt >= batch.quantity) {
        return { valid: false, error: `Batch quantity exceeded: ${shipped.cnt}/${batch.quantity} already processed` };
    }
    return { valid: true, remaining: batch.quantity - (shipped?.cnt || 0) };
}

module.exports = { validateTransition, checkDuplicateReceive, validatePartner, validateBatchQuantity, VALID_TRANSITIONS };
