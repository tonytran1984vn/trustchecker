const cg = require('../../../server/engines/governance-module/cryptographic-governance');
const CGClass = cg.constructor;

let engine;
beforeEach(() => { engine = new CGClass(); });

describe('CryptographicGovernanceEngine', () => {
    describe('getHSMArchitecture', () => {
        test('has 3 HSM types', () => {
            const r = engine.getHSMArchitecture();
            expect(r.design.primary_hsm).toBeDefined();
            expect(r.design.backup_hsm).toBeDefined();
            expect(r.design.cold_hsm).toBeDefined();
        });

        test('has 5-level key hierarchy', () => {
            expect(engine.getHSMArchitecture().key_hierarchy.length).toBe(5);
        });
    });

    describe('getMultisigPolicy', () => {
        test('has 6 policies', () => {
            expect(engine.getMultisigPolicy().policies.length).toBe(6);
        });

        test('root key ceremony requires 3 of 5', () => {
            const root = engine.getMultisigPolicy().policies[0];
            expect(root.threshold).toContain('3 of 5');
        });

        test('capital reserve requires unanimous (3 of 3)', () => {
            const reserve = engine.getMultisigPolicy().policies.find(p => p.operation.includes('Capital Reserve'));
            expect(reserve.threshold).toContain('3 of 3');
        });
    });

    describe('getKeyRecovery', () => {
        test('has 9 recovery steps', () => {
            expect(engine.getKeyRecovery().recovery_protocol.length).toBe(9);
        });
    });

    describe('getKeyRotation', () => {
        test('has 6 key types in schedule', () => {
            expect(engine.getKeyRotation().schedule.length).toBe(6);
        });

        test('TLS rotates monthly', () => {
            const tls = engine.getKeyRotation().schedule[0];
            expect(tls.rotation).toBe('Monthly');
        });
    });

    describe('getCeremonyProtocol', () => {
        test('has 3 ceremony types', () => {
            expect(engine.getCeremonyProtocol().ceremony_types.length).toBe(3);
        });
    });

    describe('getZeroTrust', () => {
        test('has 5 principles', () => {
            expect(engine.getZeroTrust().principles.length).toBe(5);
        });

        test('has maturity assessment', () => {
            expect(engine.getZeroTrust().maturity_assessment.current_level).toContain('Level 2');
        });
    });

    describe('assessKeyHealth', () => {
        test('all healthy', () => {
            const r = engine.assessKeyHealth(true, true, 5);
            expect(r.overall_health).toBe('HEALTHY');
        });

        test('keys not rotated is WARNING', () => {
            const r = engine.assessKeyHealth(false, true, 5);
            expect(r.overall_health).toBe('WARNING');
        });

        test('insufficient custodians is CRITICAL', () => {
            const r = engine.assessKeyHealth(true, true, 2);
            expect(r.overall_health).toBe('CRITICAL');
            expect(r.shamir_threshold_met).toBe(false);
        });

        test('defaults are healthy', () => {
            const r = engine.assessKeyHealth();
            expect(r.overall_health).toBe('HEALTHY');
        });
    });

    describe('getFullFramework', () => {
        test('returns complete framework', () => {
            const r = engine.getFullFramework();
            expect(r.version).toBe('1.0');
            expect(r.hsm).toBeDefined();
            expect(r.multisig).toBeDefined();
        });
    });
});
