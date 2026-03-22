const fl = require('../../../server/engines/legal-entity-module/forensic-logic');
const FLClass = fl.constructor;

let engine;
beforeEach(() => { engine = new FLClass(); });

describe('ForensicLogicEngine', () => {
    describe('getEvidenceChain', () => {
        test('has 5 evidence categories', () => {
            expect(engine.getEvidenceChain().evidence_categories.length).toBe(5);
        });

        test('chain uses SHA-256', () => {
            expect(engine.getEvidenceChain().chain_structure.algorithm).toContain('SHA-256');
        });

        test('minimum retention is 7 years', () => {
            expect(engine.getEvidenceChain().chain_structure.retention.minimum_years).toBe(7);
        });
    });

    describe('getInvestigationProtocol', () => {
        test('has 5 triggers', () => {
            expect(engine.getInvestigationProtocol().triggers.length).toBe(5);
        });

        test('has 5 investigation phases', () => {
            expect(engine.getInvestigationProtocol().investigation_phases.length).toBe(5);
        });

        test('regulatory inquiry has 4h SLA', () => {
            const reg = engine.getInvestigationProtocol().triggers.find(t => t.trigger.includes('Regulatory'));
            expect(reg.sla_hours).toBe(4);
        });
    });

    describe('getTamperDetection', () => {
        test('has 5 detection layers', () => {
            expect(engine.getTamperDetection().detection_layers.length).toBe(5);
        });

        test('hash chain check every 60 seconds', () => {
            const hc = engine.getTamperDetection().detection_layers[0];
            expect(hc.check_frequency).toContain('60 seconds');
        });
    });

    describe('getRegulatoryEvidence', () => {
        test('has 3 package types', () => {
            expect(engine.getRegulatoryEvidence().packages.length).toBe(3);
        });
    });

    describe('getDisputeForensics', () => {
        test('has 4 dispute types', () => {
            expect(engine.getDisputeForensics().dispute_types.length).toBe(4);
        });

        test('trust score dispute target 95%', () => {
            const ts = engine.getDisputeForensics().dispute_types[0];
            expect(ts.resolution_rate_target_pct).toBe(95);
        });
    });

    describe('verifyChainIntegrity', () => {
        test('default sample is valid', () => {
            const r = engine.verifyChainIntegrity();
            expect(r.integrity_valid).toBe(true);
            expect(r.alert_level).toBe('GREEN');
        });

        test('broken chain returns BLACK alert', () => {
            const r = engine.verifyChainIntegrity([
                { id: 1, hash: 'abc', prev: '000' },
                { id: 2, hash: 'def', prev: 'WRONG' }
            ]);
            expect(r.integrity_valid).toBe(false);
            expect(r.alert_level).toBe('BLACK');
            expect(r.breaks.length).toBe(1);
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
