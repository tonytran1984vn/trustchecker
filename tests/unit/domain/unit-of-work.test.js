const { UnitOfWork, createUnitOfWork, unitOfWorkMiddleware } = require('../../../server/domain/unit-of-work');

describe('UnitOfWork', () => {
    let uow;
    const mockDb = {};

    beforeEach(() => {
        uow = new UnitOfWork(mockDb, { orgId: 'org-1', userId: 'u-1' });
    });

    test('creates with unique ID', () => {
        expect(uow.id).toMatch(/^uow_/);
        const uow2 = new UnitOfWork(mockDb);
        expect(uow.id).not.toBe(uow2.id);
    });

    test('starts in clean state', () => {
        expect(uow._operations).toEqual([]);
        expect(uow._pendingEvents).toEqual([]);
        expect(uow._committed).toBe(false);
        expect(uow._rolledBack).toBe(false);
    });

    test('trackCreate adds CREATE operation', () => {
        uow.trackCreate('Product', 'products', { name: 'Test' });
        expect(uow._operations).toHaveLength(1);
        expect(uow._operations[0].type).toBe('CREATE');
        expect(uow._operations[0].entity).toBe('Product');
    });

    test('trackUpdate adds UPDATE operation', () => {
        uow.trackUpdate('Product', 'products', 'p1', { name: 'Updated' }, { name: 'Old' });
        expect(uow._operations).toHaveLength(1);
        expect(uow._operations[0].type).toBe('UPDATE');
        expect(uow._operations[0].previousValues).toEqual({ name: 'Old' });
    });

    test('trackDelete adds DELETE operation', () => {
        uow.trackDelete('Product', 'products', 'p1');
        expect(uow._operations).toHaveLength(1);
        expect(uow._operations[0].type).toBe('DELETE');
    });

    test('addEvent stages domain event', () => {
        uow.addEvent('product.created', { id: 'p1' });
        expect(uow._pendingEvents).toHaveLength(1);
        expect(uow._pendingEvents[0].type).toBe('product.created');
        expect(uow._pendingEvents[0].context.orgId).toBe('org-1');
        expect(uow._pendingEvents[0].published).toBe(false);
    });

    test('chaining works', () => {
        const result = uow
            .trackCreate('Product', 'products', {})
            .trackUpdate('Scan', 'scans', 's1', {})
            .addEvent('product.created', {});
        expect(result).toBe(uow);
        expect(uow._operations).toHaveLength(2);
        expect(uow._pendingEvents).toHaveLength(1);
    });

    test('commit with no operations returns zero counts', async () => {
        const result = await uow.commit();
        expect(result).toEqual({ operations: 0, events: 0 });
        expect(uow._committed).toBe(true);
    });

    test('commit without $transaction marks committed', async () => {
        uow.trackCreate('Product', 'products', {});
        const result = await uow.commit();
        expect(result.operations).toBe(1);
        expect(uow._committed).toBe(true);
    });

    test('throws after commit', async () => {
        await uow.commit();
        expect(() => uow.trackCreate('X', 'x', {})).toThrow('already committed');
        expect(() => uow.addEvent('x', {})).toThrow('already committed');
    });

    test('rollback discards operations', () => {
        uow.trackCreate('A', 'a', {});
        uow.addEvent('b', {});
        uow.rollback();
        expect(uow._operations).toEqual([]);
        expect(uow._pendingEvents).toEqual([]);
        expect(uow._rolledBack).toBe(true);
    });

    test('throws after rollback', () => {
        uow.rollback();
        expect(() => uow.trackCreate('X', 'x', {})).toThrow('already rolled back');
    });

    test('toJSON returns diagnostics', () => {
        uow.trackCreate('Product', 'products', {});
        uow.addEvent('test', {});
        const json = uow.toJSON();
        expect(json.id).toBe(uow.id);
        expect(json.operations).toBe(1);
        expect(json.pendingEvents).toBe(1);
        expect(json.operationDetails[0].type).toBe('CREATE');
    });

    test('publishes events via eventBus after commit', async () => {
        const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
        const uow2 = new UnitOfWork(mockDb, { eventBus, orgId: 'o1' });
        uow2.trackCreate('X', 'x', {});
        uow2.addEvent('test.event', { data: 1 });
        await uow2.commit();
        expect(eventBus.publish).toHaveBeenCalledWith('test.event', { data: 1 }, expect.any(Object));
    });
});

describe('createUnitOfWork', () => {
    test('creates UoW from request context', () => {
        const db = {};
        const req = { orgId: 'org-1', user: { id: 'u1' } };
        const uow = createUnitOfWork(db, req, null);
        expect(uow).toBeInstanceOf(UnitOfWork);
        expect(uow.orgId).toBe('org-1');
        expect(uow.userId).toBe('u1');
    });
});

describe('unitOfWorkMiddleware', () => {
    test('attaches uow to req', () => {
        const mw = unitOfWorkMiddleware({}, null);
        const req = { orgId: 'o1', user: { id: 'u1' } };
        const res = { end: jest.fn() };
        const next = jest.fn();
        mw(req, res, next);
        expect(req.uow).toBeInstanceOf(UnitOfWork);
        expect(next).toHaveBeenCalled();
    });
});
