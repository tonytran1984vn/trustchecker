const es = require('../../../server/engines/legal-entity-module/entity-structuring');
const ESClass = es.constructor;

let engine;
beforeEach(() => { engine = new ESClass(); });

describe('EntityStructuringEngine', () => {
    describe('getEntityArchitecture', () => {
        test('has 7 TrustChecker entities', () => {
            expect(engine.getEntityArchitecture().trustchecker_entities.length).toBe(7);
        });

        test('Holdings is in Singapore', () => {
            const h = engine.getEntityArchitecture().trustchecker_entities[0];
            expect(h.jurisdiction).toBe('Singapore');
            expect(h.type).toBe('Holding Company');
        });

        test('Settlement GmbH is in Germany', () => {
            const s = engine.getEntityArchitecture().trustchecker_entities.find(e => e.entity.includes('Settlement'));
            expect(s.jurisdiction).toContain('Germany');
            expect(s.regulated).toBe(true);
        });

        test('3 comparable companies listed', () => {
            expect(Object.keys(engine.getEntityArchitecture().comparables).length).toBe(3);
        });

        test('Capital Reserve Trust is bankruptcy-remote', () => {
            const t = engine.getEntityArchitecture().trustchecker_entities.find(e => e.entity.includes('Capital Reserve'));
            expect(t.type).toContain('Bankruptcy-Remote');
        });
    });

    describe('getInterEntity', () => {
        test('has 6 inter-entity contracts', () => {
            expect(engine.getInterEntity().contracts.length).toBe(6);
        });

        test('IP License at 5-8% royalty', () => {
            const ip = engine.getInterEntity().contracts[0];
            expect(ip.terms).toContain('5-8%');
        });
    });

    describe('getExternalTrust', () => {
        test('has 5 validation layers', () => {
            expect(engine.getExternalTrust().validation_layers.length).toBe(5);
        });

        test('API Transparency Portal has public endpoints', () => {
            const api = engine.getExternalTrust().validation_layers.find(l => l.layer.includes('API'));
            expect(api.public_endpoints.length).toBeGreaterThan(0);
        });
    });

    describe('getEntity', () => {
        test('finds Settlement entity', () => {
            const r = engine.getEntity('settlement');
            expect(r).toBeDefined();
            expect(r.entity).toContain('Settlement');
        });

        test('returns null for unknown', () => {
            expect(engine.getEntity('nonexistent')).toBeNull();
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
