const ccme = require('../../../server/engines/intelligence/carbon-credit-engine');

// Get fresh instance
const CarbonClass = ccme.constructor;

let engine;
beforeEach(() => {
    engine = new CarbonClass();
});

describe('CarbonCreditMintingEngine', () => {
    describe('L1 — ingestEvent', () => {
        test('ingests valid event', () => {
            const result = engine.ingestEvent({
                product_id: 'p1', shipment_id: 's1',
                carrier: 'Maersk', distance_km: 1000, weight_tonnes: 2.0,
            });
            expect(result.status).toBe('ingested');
            expect(result.event.product_id).toBe('p1');
        });

        test('rejects duplicate (idempotency)', () => {
            engine.ingestEvent({ product_id: 'p1', shipment_id: 's1', timestamp: '2024-01-15T10:00:00Z' });
            const result = engine.ingestEvent({ product_id: 'p1', shipment_id: 's1', timestamp: '2024-01-15T11:00:00Z' });
            expect(result.status).toBe('duplicate');
        });

        test('infers transport mode from carrier', () => {
            const result = engine.ingestEvent({ product_id: 'p1', shipment_id: 's-air', carrier: 'FedEx Air', distance_km: 500 });
            expect(result.event.actual_mode).toBeDefined();
        });

        test('auto-assigns cold_storage for Healthcare', () => {
            const result = engine.ingestEvent({ product_id: 'p1', shipment_id: 's-hc', product_category: 'Healthcare', distance_km: 500 });
            expect(result.event.warehouse_type).toBe('cold_storage');
        });
    });

    describe('L2 — computeBaseline', () => {
        test('calculates static baseline', () => {
            const event = { route_type: 'international', distance_km: 1000, weight_tonnes: 2, origin_region: 'GLOBAL', product_category: 'General' };
            const result = engine.computeBaseline(event);
            expect(result.selected.emission_kgCO2e).toBeGreaterThan(0);
            expect(result.methodology).toContain('Conservative');
        });

        test('uses historical baseline if lower', () => {
            const event = { route_type: 'international', distance_km: 1000, weight_tonnes: 1, origin_region: 'GLOBAL' };
            const result = engine.computeBaseline(event, { avg_factor: 0.001, sample_count: 50, period: '12m' });
            expect(result.baselines.length).toBe(3);
        });

        test('includes CBAM flag for EU', () => {
            const event = { route_type: 'domestic_long', distance_km: 500, weight_tonnes: 1, origin_region: 'EU' };
            const result = engine.computeBaseline(event);
            expect(result.cbam_applicable).toBe(true);
        });
    });

    describe('L2 — simulateCounterfactual', () => {
        test('calculates transport reduction', () => {
            const event = { actual_mode: 'rail', distance_km: 1000, weight_tonnes: 1, warehouse_type: 'ambient', storage_days: 2, product_category: 'General', baseline_mode: 'air' };
            const baseline = engine.computeBaseline({ route_type: 'international', distance_km: 1000, weight_tonnes: 1, origin_region: 'GLOBAL' });
            const result = engine.simulateCounterfactual(event, baseline);
            expect(result.reduction.transport_kgCO2e).toBeGreaterThanOrEqual(0);
            expect(result.reduction.percentage).toBeDefined();
        });

        test('includes warehouse and manufacturing emissions', () => {
            const event = { actual_mode: 'road', distance_km: 500, weight_tonnes: 1, warehouse_type: 'cold_storage', storage_days: 5, product_category: 'Electronics', baseline_mode: 'air' };
            const baseline = engine.computeBaseline({ route_type: 'international', distance_km: 500, weight_tonnes: 1, origin_region: 'GLOBAL' });
            const result = engine.simulateCounterfactual(event, baseline);
            expect(result.actual.warehouse_kgCO2e).toBeGreaterThan(0);
            expect(result.actual.manufacturing_kgCO2e).toBe(15.0);
        });
    });

    describe('L3 — verifyMRV', () => {
        test('returns verified for clean event', () => {
            const event = {
                event_id: 'e1', product_id: 'p1', shipment_id: 's1',
                distance_km: 500, weight_tonnes: 1, actual_mode: 'rail',
                timestamp: new Date().toISOString(),
                fingerprint: { validated: true },
            };
            const cf = { reduction: { transport_kgCO2e: 200, percentage: 60, tCO2e: 0.2 } };
            const result = engine.verifyMRV(event, cf);
            expect(result.mrv_status).toBe('verified');
            expect(result.confidence_score).toBeGreaterThanOrEqual(70);
            expect(result.verification_hash).toMatch(/^[a-f0-9]{64}$/);
        });

        test('fails for implausible distance', () => {
            const event = { event_id: 'e2', distance_km: -100, weight_tonnes: 1, actual_mode: 'road', timestamp: new Date().toISOString(), fingerprint: { validated: true }, product_id: 'p1', shipment_id: 's1' };
            const cf = { reduction: { transport_kgCO2e: 100, percentage: 50, tCO2e: 0.1 } };
            const result = engine.verifyMRV(event, cf);
            expect(result.confidence_score).toBeLessThan(100);
        });

        test('reduces confidence without fingerprint', () => {
            const event = { event_id: 'e3', distance_km: 500, weight_tonnes: 1, actual_mode: 'rail', timestamp: new Date().toISOString(), fingerprint: { validated: false }, product_id: 'p1', shipment_id: 's1' };
            const cf = { reduction: { transport_kgCO2e: 200, percentage: 60, tCO2e: 0.2 } };
            const result = engine.verifyMRV(event, cf);
            expect(result.confidence_score).toBeLessThan(100);
        });
    });

    describe('L4 — checkAdditionality', () => {
        test('passes for valid mode shift', () => {
            const event = { baseline_mode: 'air', actual_mode: 'rail', shipment_id: 's1', product_id: 'p1', route_type: 'international' };
            const cf = { reduction: { transport_kgCO2e: 200, percentage: 60 } };
            const result = engine.checkAdditionality(event, cf);
            expect(result.passed).toBe(true);
            expect(result.reduction_uid).toBeDefined();
        });

        test('fails for same-mode (no shift)', () => {
            const event = { baseline_mode: 'road', actual_mode: 'road', shipment_id: 's2', product_id: 'p1' };
            const cf = { reduction: { transport_kgCO2e: 200, percentage: 60 } };
            const result = engine.checkAdditionality(event, cf);
            expect(result.passed).toBe(false);
        });

        test('fails for duplicate claim', () => {
            const event = { baseline_mode: 'air', actual_mode: 'rail', shipment_id: 's3', product_id: 'p1', route_type: 'int' };
            const cf = { reduction: { transport_kgCO2e: 200, percentage: 50 } };
            const history = [{ shipment_id: 's3', product_id: 'p1', actual_mode: 'road', route_type: 'int' }];
            const result = engine.checkAdditionality(event, cf, history);
            expect(result.passed).toBe(false);
        });

        test('fails for below minimum threshold', () => {
            const event = { baseline_mode: 'air', actual_mode: 'rail', shipment_id: 's4', product_id: 'p1' };
            const cf = { reduction: { transport_kgCO2e: 50, percentage: 10 } };
            const result = engine.checkAdditionality(event, cf);
            expect(result.passed).toBe(false);
        });
    });

    describe('L5 — mintCredit', () => {
        test('accumulates fractional reduction', () => {
            const result = engine.mintCredit({
                event: { actual_mode: 'rail', baseline_mode: 'air', route_type: 'int', distance_km: 500, origin_region: 'EU' },
                counterfactual: { reduction: { transport_kgCO2e: 200 } },
                mrvResult: { mrv_status: 'verified', confidence_score: 90, verification_hash: 'abc', checks: { passed: 8, total: 10 } },
                additionalityResult: { passed: true, reduction_uid: 'uid1', rules: { passed: 5, total: 5 } },
                issuer_id: 'issuer1', org_id: 'org1',
            });
            expect(result.status).toBe('accumulated');
            expect(result.accumulated_kgCO2e).toBeGreaterThan(0);
        });

        test('rejects if MRV failed', () => {
            const result = engine.mintCredit({
                event: {}, counterfactual: {}, additionalityResult: { passed: true },
                mrvResult: { mrv_status: 'failed' },
            });
            expect(result.error).toContain('MRV');
        });

        test('rejects if additionality failed', () => {
            const result = engine.mintCredit({
                event: {}, counterfactual: {}, additionalityResult: { passed: false },
                mrvResult: { mrv_status: 'verified' },
            });
            expect(result.error).toContain('Additionality');
        });
    });

    describe('L6 — transferCredit', () => {
        const mockCredit = {
            credit_id: 'c1', status: 'minted', org_id: 'org1',
            current_owner_id: 'owner1', provenance: [],
        };

        test('blocks transfer of retired credit', () => {
            const r = engine.transferCredit({ ...mockCredit, status: 'retired' }, 'new', { id: 'a1' });
            expect(r.error).toContain('retired');
        });

        test('blocks self-approve without SoD', () => {
            const r = engine.transferCredit(mockCredit, 'new', { id: 'a1' }, []);
            expect(r.error).toContain('SoD');
        });
    });

    describe('L6 — retireCredit', () => {
        test('retires credit permanently', () => {
            const credit = { credit_id: 'c1', status: 'active', provenance: [] };
            const result = engine.retireCredit(credit, 'admin1');
            expect(result.status).toBe('retired');
            expect(result.credit.retirement.permanent).toBe(true);
        });

        test('blocks re-retirement', () => {
            const result = engine.retireCredit({ status: 'retired' }, 'admin');
            expect(result.error).toContain('already retired');
        });
    });

    describe('L7 — generateEvidencePackage', () => {
        test('generates court-ready package', () => {
            const credit = { credit_id: 'c1', serial_number: 'SN1', vintage_year: 2024, quantity_tCO2e: 1, status: 'minted', issuer_id: 'i1', current_owner_id: 'o1', blockchain: { evidence_hash: 'h1' }, provenance: [] };
            const mrv = { confidence_score: 90, verification_hash: 'vh1', checks: { passed: 8, total: 10 }, methodology: 'GHG', details: [] };
            const add = { reduction_uid: 'r1', status: 'passed', rules: { passed: 5, total: 5, details: [] }, double_counted: false };
            const cf = { baseline: {}, actual: {}, reduction: {} };
            const result = engine.generateEvidencePackage(credit, mrv, add, cf);
            expect(result.classification).toContain('Court-Ready');
        });
    });

    describe('assessCreditRisk', () => {
        test('returns risk score for credit', () => {
            const credit = { credit_id: 'c1', mrv: { confidence_score: 90 }, project: { intervention: 'air → rail' }, provenance: [{ confidence: 90 }] };
            const result = engine.assessCreditRisk(credit, { trust_score: 80 });
            expect(result.risk_score).toBeDefined();
            expect(result.risk_level).toBeDefined();
            expect(result.factors.length).toBe(5);
        });
    });

    describe('assessPortfolioRisk', () => {
        test('returns clean for empty portfolio', () => {
            const result = engine.assessPortfolioRisk([], []);
            expect(result.risk_level).toBe('low');
        });

        test('detects double counting', () => {
            const credits = [
                { additionality: { reduction_uid: 'same' }, quantity_tCO2e: 1, mrv: { confidence_score: 90 } },
                { additionality: { reduction_uid: 'same' }, quantity_tCO2e: 1, mrv: { confidence_score: 90 } },
            ];
            const result = engine.assessPortfolioRisk(credits);
            expect(result.signals.find(s => s.type === 'double_counting')).toBeDefined();
        });
    });
});
