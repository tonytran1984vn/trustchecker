const { TrustEventBus, EVENT_TYPES } = (() => {
    // Need access to the class, not just singleton
    const mod = require('../../../server/events');
    return { TrustEventBus: mod.eventBus.constructor, EVENT_TYPES: mod.EVENT_TYPES };
})();

describe('TrustEventBus', () => {
    let bus;

    beforeEach(() => {
        bus = new TrustEventBus();
    });

    test('starts with empty state', () => {
        expect(bus.wsClients.size).toBe(0);
        expect(bus.eventLog).toEqual([]);
    });

    test('addClient registers ws and auto-removes on close', () => {
        const handlers = {};
        const ws = { on: jest.fn((event, cb) => { handlers[event] = cb; }) };
        bus.addClient(ws);
        expect(bus.wsClients.size).toBe(1);

        // Simulate close
        handlers.close();
        expect(bus.wsClients.size).toBe(0);
    });

    test('broadcast sends to OPEN ws clients', () => {
        const ws1 = { readyState: 1, send: jest.fn(), on: jest.fn() };
        const ws2 = { readyState: 3, send: jest.fn(), on: jest.fn() }; // CLOSED
        bus.addClient(ws1);
        bus.addClient(ws2);

        bus.broadcast('TEST_EVENT', { foo: 'bar' });
        expect(ws1.send).toHaveBeenCalled();
        expect(ws2.send).not.toHaveBeenCalled();

        const payload = JSON.parse(ws1.send.mock.calls[0][0]);
        expect(payload.type).toBe('TEST_EVENT');
        expect(payload.data).toEqual({ foo: 'bar' });
        expect(payload.timestamp).toBeDefined();
    });

    test('broadcast adds to eventLog', () => {
        bus.broadcast('EVT', { x: 1 });
        expect(bus.eventLog).toHaveLength(1);
        expect(bus.eventLog[0].type).toBe('EVT');
    });

    test('eventLog caps at 500', () => {
        for (let i = 0; i < 510; i++) {
            bus.broadcast('EVT', { i });
        }
        expect(bus.eventLog.length).toBe(500);
    });

    test('emitEvent emits and broadcasts', () => {
        const listener = jest.fn();
        bus.on('MY_EVENT', listener);
        const ws = { readyState: 1, send: jest.fn(), on: jest.fn() };
        bus.addClient(ws);

        bus.emitEvent('MY_EVENT', { data: 1 });
        expect(listener).toHaveBeenCalledWith({ data: 1 });
        expect(ws.send).toHaveBeenCalled();
    });

    test('getRecentEvents returns reversed latest', () => {
        bus.broadcast('A', {});
        bus.broadcast('B', {});
        bus.broadcast('C', {});

        const recent = bus.getRecentEvents(2);
        expect(recent).toHaveLength(2);
        expect(recent[0].type).toBe('C');
        expect(recent[1].type).toBe('B');
    });

    test('getStats returns correct counts', () => {
        bus.broadcast('X', {});
        bus.broadcast('Y', {});
        const ws = { readyState: 1, send: jest.fn(), on: jest.fn() };
        bus.addClient(ws);

        const stats = bus.getStats();
        expect(stats.total_events).toBe(2);
        expect(stats.connected_clients).toBe(1);
        expect(stats.recent_types).toContain('X');
        expect(stats.recent_types).toContain('Y');
    });
});

describe('EVENT_TYPES', () => {
    test('contains all expected event types', () => {
        expect(EVENT_TYPES.QR_SCANNED).toBe('QRScanned');
        expect(EVENT_TYPES.FRAUD_FLAGGED).toBe('FraudFlagged');
        expect(EVENT_TYPES.USER_LOGIN).toBe('UserLogin');
        expect(EVENT_TYPES.PRODUCT_REGISTERED).toBe('ProductRegistered');
        expect(EVENT_TYPES.SYSTEM_ALERT).toBe('SystemAlert');
    });

    test('has 11 event types', () => {
        expect(Object.keys(EVENT_TYPES).length).toBe(11);
    });
});
