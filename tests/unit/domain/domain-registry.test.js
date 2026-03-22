const { DomainRegistry, registry, DOMAINS } = require('../../../server/domain/domain-registry');

describe('DOMAINS', () => {
    test('defines 6 bounded contexts', () => {
        expect(Object.keys(DOMAINS)).toHaveLength(6);
        expect(DOMAINS.PRODUCT_AUTHENTICITY).toBeDefined();
        expect(DOMAINS.SUPPLY_CHAIN).toBeDefined();
        expect(DOMAINS.RISK_INTELLIGENCE).toBeDefined();
        expect(DOMAINS.ESG_COMPLIANCE).toBeDefined();
        expect(DOMAINS.IDENTITY).toBeDefined();
        expect(DOMAINS.BILLING).toBeDefined();
    });

    test('each domain has required fields', () => {
        for (const domain of Object.values(DOMAINS)) {
            expect(domain.name).toBeDefined();
            expect(domain.description).toBeDefined();
            expect(domain.aggregateRoots).toBeInstanceOf(Array);
            expect(domain.entities).toBeInstanceOf(Array);
            expect(domain.invariants).toBeInstanceOf(Array);
            expect(domain.ownedTables).toBeInstanceOf(Array);
        }
    });
});

describe('DomainRegistry', () => {
    test('singleton has all 6 domains registered', () => {
        expect(registry.domains.size).toBe(6);
    });

    test('getDomain returns correct domain', () => {
        const domain = registry.getDomain('PRODUCT_AUTHENTICITY');
        expect(domain.name).toBe('ProductAuthenticity');
    });

    test('getDomain returns null for unknown', () => {
        expect(registry.getDomain('NONEXISTENT')).toBeNull();
    });

    test('getDomainByTable maps tables to domains', () => {
        const domain = registry.getDomainByTable('products');
        expect(domain.name).toBe('ProductAuthenticity');

        const scDomain = registry.getDomainByTable('shipments');
        expect(scDomain.name).toBe('SupplyChain');
    });

    test('getDomainByTable returns null for unknown table', () => {
        expect(registry.getDomainByTable('nonexistent_table')).toBeNull();
    });

    test('getDomainByEvent maps events to domains', () => {
        const domain = registry.getDomainByEvent('scan.created');
        expect(domain.name).toBe('ProductAuthenticity');

        const ri = registry.getDomainByEvent('fraud.alert.created');
        expect(ri.name).toBe('RiskIntelligence');
    });

    test('getInvariantsForDomain returns invariants', () => {
        const invs = registry.getInvariantsForDomain('PRODUCT_AUTHENTICITY');
        expect(invs.length).toBeGreaterThan(0);
        expect(invs[0].id).toBe('PA-001');
    });

    test('getAllInvariants returns all across domains', () => {
        const all = registry.getAllInvariants();
        expect(all.length).toBeGreaterThan(20);
        expect(all[0].domain).toBeDefined();
    });

    test('checkTransactionBoundary detects single domain', () => {
        const result = registry.checkTransactionBoundary(['products', 'scan_events']);
        expect(result.crossesBoundary).toBe(false);
        expect(result.requiresSaga).toBe(false);
        expect(result.domains).toEqual(['PRODUCT_AUTHENTICITY']);
    });

    test('checkTransactionBoundary detects cross-domain', () => {
        const result = registry.checkTransactionBoundary(['products', 'shipments']);
        expect(result.crossesBoundary).toBe(true);
        expect(result.requiresSaga).toBe(true);
        expect(result.domains).toContain('PRODUCT_AUTHENTICITY');
        expect(result.domains).toContain('SUPPLY_CHAIN');
    });

    test('validateEventOwnership validates correct owner', () => {
        const result = registry.validateEventOwnership('scan.created', 'PRODUCT_AUTHENTICITY');
        expect(result.valid).toBe(true);
    });

    test('validateEventOwnership rejects wrong owner', () => {
        const result = registry.validateEventOwnership('scan.created', 'BILLING');
        expect(result.valid).toBe(false);
    });

    test('validateEventOwnership warns for unregistered events', () => {
        const result = registry.validateEventOwnership('unknown.event', 'ANY');
        expect(result.valid).toBe(true);
        expect(result.warning).toBeDefined();
    });

    test('getStats returns correct counts', () => {
        const stats = registry.getStats();
        expect(stats.totalDomains).toBe(6);
        expect(stats.totalInvariants).toBeGreaterThan(0);
        expect(stats.totalTables).toBeGreaterThan(0);
    });

    test('register throws on duplicate table ownership', () => {
        const r = new DomainRegistry();
        // Already registered in constructor, try to register again
        expect(() => r.register('DUPLICATE', {
            name: 'Dup',
            ownedTables: ['products'], // already owned by PRODUCT_AUTHENTICITY
            domainEvents: [],
            aggregateRoots: [],
            entities: [],
            invariants: [],
        })).toThrow(/already owned/);
    });
});
