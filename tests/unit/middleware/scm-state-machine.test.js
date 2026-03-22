const {
    EVENT_TYPES, VALID_TRANSITIONS, RBAC_MATRIX,
    validateRBAC, computeEventHash, computeSignature, verifySignature,
} = require('../../../server/middleware/scm-state-machine');

describe('SCM State Machine', () => {
    describe('EVENT_TYPES', () => {
        test('has standard event types', () => {
            expect(EVENT_TYPES.PRODUCT_CREATED).toBe('PRODUCT_CREATED');
            expect(EVENT_TYPES.SHIPPED).toBe('SHIPPED');
            expect(EVENT_TYPES.SOLD).toBe('SOLD');
            expect(EVENT_TYPES.BLOCKED).toBe('BLOCKED');
        });

        test('has legacy event types', () => {
            expect(EVENT_TYPES.commission).toBe('commission');
            expect(EVENT_TYPES.ship).toBe('ship');
            expect(EVENT_TYPES.sell).toBe('sell');
        });
    });

    describe('VALID_TRANSITIONS', () => {
        test('_initial can commission or PRODUCT_CREATED', () => {
            expect(VALID_TRANSITIONS._initial).toContain('commission');
            expect(VALID_TRANSITIONS._initial).toContain('PRODUCT_CREATED');
        });

        test('commission can pack or ship', () => {
            expect(VALID_TRANSITIONS.commission).toContain('pack');
            expect(VALID_TRANSITIONS.commission).toContain('ship');
        });

        test('ship can receive', () => {
            expect(VALID_TRANSITIONS.ship).toContain('receive');
        });

        test('SOLD can be SCANNED', () => {
            expect(VALID_TRANSITIONS.SOLD).toContain('SCANNED');
        });

        test('return can go to BLOCKED', () => {
            expect(VALID_TRANSITIONS.return).toContain('BLOCKED');
        });
    });

    describe('RBAC_MATRIX', () => {
        test('factory can commission and ship', () => {
            expect(RBAC_MATRIX.factory).toContain('commission');
            expect(RBAC_MATRIX.factory).toContain('ship');
        });

        test('warehouse can receive and distribute', () => {
            expect(RBAC_MATRIX.warehouse).toContain('receive');
            expect(RBAC_MATRIX.warehouse).toContain('DISTRIBUTED');
        });

        test('retailer can sell and return', () => {
            expect(RBAC_MATRIX.retailer).toContain('sell');
            expect(RBAC_MATRIX.retailer).toContain('return');
        });

        test('admin has wildcard', () => {
            expect(RBAC_MATRIX.admin).toContain('*');
        });

        test('customer can scan', () => {
            expect(RBAC_MATRIX.customer).toContain('SCANNED');
        });
    });

    describe('validateRBAC', () => {
        test('factory can commission', () => {
            expect(validateRBAC('factory', 'commission').valid).toBe(true);
        });

        test('factory CANNOT sell', () => {
            const r = validateRBAC('factory', 'sell');
            expect(r.valid).toBe(false);
            expect(r.error).toContain('cannot create event');
        });

        test('admin can do anything', () => {
            expect(validateRBAC('admin', 'sell').valid).toBe(true);
            expect(validateRBAC('admin', 'commission').valid).toBe(true);
        });

        test('unknown role returns error', () => {
            expect(validateRBAC('hacker', 'sell').valid).toBe(false);
        });

        test('warehouse can receive', () => {
            expect(validateRBAC('warehouse', 'receive').valid).toBe(true);
        });

        test('customer CANNOT commission', () => {
            expect(validateRBAC('customer', 'commission').valid).toBe(false);
        });
    });

    describe('computeEventHash', () => {
        test('produces consistent SHA-256 hash', () => {
            const h1 = computeEventHash('P1', 'ship', 'commission', 'actor1', 'prev', '2024-01-01');
            const h2 = computeEventHash('P1', 'ship', 'commission', 'actor1', 'prev', '2024-01-01');
            expect(h1).toBe(h2);
            expect(h1).toHaveLength(64);
        });

        test('different inputs produce different hashes', () => {
            const h1 = computeEventHash('P1', 'ship', 'commission', 'actor1', 'prev', '2024-01-01');
            const h2 = computeEventHash('P2', 'ship', 'commission', 'actor1', 'prev', '2024-01-01');
            expect(h1).not.toBe(h2);
        });
    });

    describe('computeSignature', () => {
        test('produces versioned signature format', () => {
            const sig = computeSignature({ productId: 'P1', eventType: 'ship', actorId: 'A1' });
            const parts = sig.split(':');
            expect(parts.length).toBe(3); // keyVersion:nonce:hmac
            expect(parts[0]).toBe('1'); // key version
        });

        test('includes nonce (different each time)', () => {
            const sig1 = computeSignature({ productId: 'P1' });
            const sig2 = computeSignature({ productId: 'P1' });
            expect(sig1).not.toBe(sig2); // nonce makes them unique
        });
    });

    describe('verifySignature', () => {
        test('verifies valid signature format', () => {
            const sig = computeSignature({ productId: 'P1', eventType: 'ship' });
            const r = verifySignature({ productId: 'P1', eventType: 'ship' }, sig);
            expect(r.valid).toBe(true);
            expect(r.key_version).toBe('1');
        });

        test('rejects missing signature', () => {
            expect(verifySignature({}, null).valid).toBe(false);
            expect(verifySignature({}, null).reason).toBe('no_signature');
        });

        test('rejects invalid format', () => {
            expect(verifySignature({}, 'invalid').valid).toBe(false);
            expect(verifySignature({}, 'invalid').reason).toBe('invalid_format');
        });
    });
});
