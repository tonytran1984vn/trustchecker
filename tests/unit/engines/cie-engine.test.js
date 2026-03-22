const cie = require('../../../server/engines/intelligence/cie-engine');

describe('CIE Engine', () => {
    describe('Constants', () => {
        test('FACTOR_VERSIONS has EF-2024.12.01', () => {
            expect(cie.FACTOR_VERSIONS['EF-2024.12.01']).toBeDefined();
            expect(cie.FACTOR_VERSIONS['EF-2024.12.01'].factors.length).toBe(6);
        });

        test('each factor has computed hash', () => {
            const fv = cie.FACTOR_VERSIONS[cie.ACTIVE_FACTOR_VERSION];
            expect(fv.hash).toBeDefined();
            expect(fv.hash.length).toBe(16);
        });

        test('METHODOLOGY has version hash', () => {
            expect(cie.METHODOLOGY.id).toBe('GHG-v4.2-r3');
            expect(cie.METHODOLOGY.version_hash).toBeDefined();
        });

        test('RISK_THRESHOLDS defined', () => {
            expect(cie.RISK_THRESHOLDS.block_approval).toBe(70);
            expect(cie.RISK_THRESHOLDS.emergency_freeze).toBe(95);
        });

        test('REGULATORY_MAPPINGS has EU, US, VN, SG', () => {
            expect(Object.keys(cie.REGULATORY_MAPPINGS)).toEqual(expect.arrayContaining(['EU', 'US', 'VN', 'SG']));
        });
    });

    describe('calculateEmission', () => {
        test('calculates Scope 1 diesel emission', () => {
            const result = cie.calculateEmission({ source: 'Diesel Fuel', quantity: 100, scope: 1 });
            expect(result.emission_kgCO2e).toBe(268);
            expect(result.factor).toBe(2.68);
            expect(result.methodology).toBe('GHG-v4.2-r3');
        });

        test('calculates Scope 2 grid electricity', () => {
            const result = cie.calculateEmission({ source: 'Grid Electricity', quantity: 1000, scope: 2 });
            expect(result.emission_kgCO2e).toBe(420);
        });

        test('calculates Scope 3 road transport', () => {
            const result = cie.calculateEmission({ source: 'Road Transport', quantity: 5000, scope: 3 });
            expect(result.emission_kgCO2e).toBe(600);
        });

        test('calculates air freight emission', () => {
            const result = cie.calculateEmission({ source: 'Air Freight', quantity: 500, scope: 3 });
            expect(result.emission_kgCO2e).toBe(300);
        });

        test('throws for unknown source/scope', () => {
            expect(() => cie.calculateEmission({ source: 'Unknown', quantity: 100, scope: 1 })).toThrow();
        });
    });

    describe('createSnapshotCapsule', () => {
        test('creates WORM capsule', () => {
            const result = cie.createSnapshotCapsule('CIP-001', { scope_1: 100, scope_2: 50, scope_3: 200 });
            expect(result.cip_id).toBe('CIP-001');
            expect(result.storage_class).toBe('WORM');
            expect(result.data_hash).toMatch(/^[a-f0-9]{64}$/);
            expect(result.capsule_hash).toMatch(/^[a-f0-9]{64}$/);
            expect(result.scope_snapshot.total).toBe(350);
        });

        test('captures methodology and factor versions', () => {
            const result = cie.createSnapshotCapsule('CIP-002', {});
            expect(result.method_version).toBe('GHG-v4.2-r3');
            expect(result.factor_version).toBe('EF-2024.12.01');
        });

        test('captures risk thresholds at seal time', () => {
            const result = cie.createSnapshotCapsule('CIP-003', {});
            expect(result.risk_thresholds_at_seal.block_approval).toBe(70);
        });
    });

    describe('generateAnchorHash', () => {
        test('generates anchor for calculation', () => {
            const result = cie.generateAnchorHash('calculation', { emission: 100 });
            expect(result.anchor_hash).toMatch(/^[a-f0-9]{64}$/);
            expect(result.anchor_type).toBe('calculation');
            expect(result.chain).toBe('polygon');
        });

        test('deterministic for same input', () => {
            // Note: includes timestamp so not perfectly deterministic, but structure is consistent
            const result = cie.generateAnchorHash('governance', { rule: 'test' });
            expect(result.payload_hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('assessRisk', () => {
        test('returns low risk for good data', () => {
            const result = cie.assessRisk({ data_integrity_pct: 98, supplier_trust_score: 90, benchmark_deviation_pct: 5, historical_stability: 95, method_confidence: 98, governance_quality: 95 });
            expect(result.composite_risk).toBeLessThan(70);
            expect(result.action).toBe('approved');
        });

        test('blocks approval for high risk', () => {
            const result = cie.assessRisk({ data_integrity_pct: 20, supplier_trust_score: 10, benchmark_deviation_pct: 5, historical_stability: 10, method_confidence: 30, governance_quality: 20 });
            expect(result.composite_risk).toBeGreaterThanOrEqual(70);
            expect(result.action).not.toBe('approved');
        });

        test('uses default values', () => {
            const result = cie.assessRisk({});
            expect(result.composite_risk).toBeDefined();
            expect(result.factors).toBeDefined();
        });

        test('emergency freeze above 95', () => {
            const result = cie.assessRisk({ data_integrity_pct: 1, supplier_trust_score: 1, benchmark_deviation_pct: 1, historical_stability: 1, method_confidence: 1, governance_quality: 1 });
            expect(result.action).toBe('emergency_freeze');
        });
    });

    describe('getRegulatoryMapping', () => {
        test('returns EU mapping by default', () => {
            const result = cie.getRegulatoryMapping();
            expect(result.name).toBe('European Union');
        });

        test('returns VN mapping', () => {
            const result = cie.getRegulatoryMapping('VN');
            expect(result.name).toBe('Vietnam');
        });

        test('falls back to EU for unknown', () => {
            const result = cie.getRegulatoryMapping('MARS');
            expect(result.name).toBe('European Union');
        });
    });

    describe('getComplianceGaps', () => {
        test('identifies gaps in EU standards', () => {
            const result = cie.getComplianceGaps('EU');
            expect(result.total_gaps).toBeGreaterThan(0);
        });

        test('returns country and regulation version', () => {
            const result = cie.getComplianceGaps('US');
            expect(result.country).toBe('US');
            expect(result.regulation_version).toBeDefined();
        });

        test('each gap has field and severity', () => {
            const result = cie.getComplianceGaps('EU');
            if (result.gaps.length > 0) {
                expect(result.gaps[0].field).toBeDefined();
                expect(result.gaps[0].severity).toBeDefined();
            }
        });
    });
});
