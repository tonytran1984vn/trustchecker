const le = require('../../../server/engines/legal-entity-module/legal-entity');
const LEClass = le.constructor;

let engine;
beforeEach(() => { engine = new LEClass(); });

describe('LegalEntityEngine', () => {
    describe('getEntityMap', () => {
        test('has holding company', () => {
            const r = engine.getEntityMap();
            expect(r.holding_company.name).toContain('Holdings');
            expect(r.holding_company.jurisdiction).toContain('Singapore');
        });

        test('has 3 operating entities', () => {
            expect(engine.getEntityMap().operating_entities.length).toBe(3);
        });

        test('has 4 specialized entities', () => {
            expect(engine.getEntityMap().specialized_entities.length).toBe(4);
        });

        test('Settlement GmbH is regulated', () => {
            const ops = engine.getEntityMap().operating_entities;
            const settlement = ops.find(e => e.name.includes('Settlement'));
            expect(settlement.regulated).toBe(true);
            expect(settlement.regulator).toContain('BaFin');
        });
    });

    describe('getRelationships', () => {
        test('all subsidiaries owned 100%', () => {
            const r = engine.getRelationships();
            expect(r.ownership.length).toBe(6);
            r.ownership.forEach(o => expect(o.ownership_pct).toBe(100));
        });

        test('has 6 inter-entity agreements', () => {
            expect(engine.getRelationships().agreements.length).toBe(6);
        });
    });

    describe('getRegulatoryMap', () => {
        test('4 entities require license', () => {
            expect(engine.getRegulatoryMap().entities_requiring_license.length).toBe(4);
        });

        test('3 entities are exempt', () => {
            expect(engine.getRegulatoryMap().entities_exempt.length).toBe(3);
        });

        test('5 ring-fencing principles', () => {
            expect(engine.getRegulatoryMap().ring_fencing_principles.length).toBe(5);
        });
    });

    describe('getIPORequirements', () => {
        test('9 entity structure requirements', () => {
            expect(engine.getIPORequirements().entity_structure.length).toBe(9);
        });

        test('3 listing considerations', () => {
            expect(engine.getIPORequirements().listing_considerations.length).toBe(3);
        });
    });

    describe('getEntityByName', () => {
        test('finds Holdings by partial name', () => {
            const r = engine.getEntityByName('Holdings');
            expect(r.name).toContain('Holdings');
        });

        test('finds Settlement GmbH', () => {
            const r = engine.getEntityByName('Settlement');
            expect(r.name).toContain('Settlement');
        });

        test('finds IP entity', () => {
            const r = engine.getEntityByName('IP Ltd');
            expect(r.name).toContain('IP');
        });

        test('returns null for unknown', () => {
            expect(engine.getEntityByName('NonExistent Corp')).toBeNull();
        });
    });

    describe('getRingFencingAnalysis', () => {
        test('has 5 critical isolation points', () => {
            const r = engine.getRingFencingAnalysis();
            expect(r.critical_isolation_points.length).toBe(5);
        });
    });

    describe('getFullArchitecture', () => {
        test('returns complete architecture', () => {
            const r = engine.getFullArchitecture();
            expect(r.version).toBe('1.0');
            expect(r.models).toContain('ICE/NYSE');
        });
    });
});
