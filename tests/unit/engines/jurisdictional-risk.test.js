const jr = require('../../../server/engines/regulatory-engine/jurisdictional-risk');
const JRClass = jr.constructor;

let engine;
beforeEach(() => { engine = new JRClass(); });

describe('JurisdictionalRiskEngine', () => {
    describe('getDeploymentMap', () => {
        test('has 5 deployment regions', () => {
            expect(engine.getDeploymentMap().regions.length).toBe(5);
        });

        test('EU-W and AP-SE are PRIMARY', () => {
            const regions = engine.getDeploymentMap().regions;
            expect(regions.find(r => r.region_id === 'EU-W').status).toBe('PRIMARY');
            expect(regions.find(r => r.region_id === 'AP-SE').status).toBe('PRIMARY');
        });

        test('US and UK are PLANNED', () => {
            const regions = engine.getDeploymentMap().regions;
            expect(regions.find(r => r.region_id === 'US-E').status).toBe('PLANNED');
        });
    });

    describe('getDataIsolation', () => {
        test('has 5 principles', () => {
            expect(engine.getDataIsolation().principles.length).toBe(5);
        });

        test('has 4 transfer mechanisms', () => {
            expect(engine.getDataIsolation().transfer_mechanisms.length).toBe(4);
        });

        test('has 5 data categories', () => {
            expect(engine.getDataIsolation().data_categories.length).toBe(5);
        });
    });

    describe('getGeoRouting', () => {
        test('has 5 routing rules', () => {
            expect(engine.getGeoRouting().routing_rules.length).toBe(5);
        });

        test('has 5 blocked corridors', () => {
            expect(engine.getGeoRouting().blocked_corridors.length).toBe(5);
        });
    });

    describe('getCarbonRegistryMap', () => {
        test('has 7 registries', () => {
            expect(engine.getCarbonRegistryMap().registries.length).toBe(7);
        });
    });

    describe('assessJurisdiction', () => {
        test('EU-W returns region data', () => {
            const r = engine.assessJurisdiction('EU-W');
            expect(r.region.name).toBe('EU West');
        });

        test('unknown region returns error', () => {
            const r = engine.assessJurisdiction('UNKNOWN');
            expect(r.error).toBeDefined();
        });
    });

    describe('getFullMap', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullMap().version).toBe('1.0');
        });
    });
});
