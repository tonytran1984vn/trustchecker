jest.mock('../../../server/db', () => require('../../helpers/db-mock'));
jest.mock('../../../server/middleware/scm-state-machine', () => ({
    verifyChainIntegrity: jest.fn().mockResolvedValue({ valid: true }),
}));

const db = require('../../../server/db');
const { verifyChainIntegrity } = require('../../../server/middleware/scm-state-machine');

let twin;
beforeAll(() => {
    twin = require('../../../server/services/digital-twin');
});

beforeEach(() => {
    db.__resetMocks();
    verifyChainIntegrity.mockClear().mockResolvedValue({ valid: true });
});

describe('DigitalTwin', () => {
    describe('getState', () => {
        test('returns legacy state when no product_events', async () => {
            db.all
                .mockResolvedValueOnce([]) // product_events
                .mockResolvedValueOnce([{ event_type: 'SHIPPED', created_at: '2024-01-01' }]); // legacy

            const state = await twin.getState('p1');
            expect(state.source).toBe('legacy');
            expect(state.state).toBe('SHIPPED');
        });

        test('returns empty legacy when no events at all', async () => {
            db.all
                .mockResolvedValueOnce([]) // product_events
                .mockResolvedValueOnce([]); // legacy

            const state = await twin.getState('p1');
            expect(state.source).toBe('legacy');
            expect(state.state).toBe('_initial');
        });

        test('computes state from product_events', async () => {
            const events = [
                { id: '1', event_type: 'commission', from_state: '_initial', to_state: 'active', actor_id: 'a1', actor_role: 'admin', location_id: 'loc-1', partner_id: null, prev_event_hash: null, hash: 'hash1', created_at: '2024-01-01T00:00:00Z', metadata: '{}' },
                { id: '2', event_type: 'ship', from_state: 'active', to_state: 'in_transit', actor_id: 'a2', actor_role: 'operator', location_id: 'loc-2', partner_id: 'partner-1', prev_event_hash: 'hash1', hash: 'hash2', created_at: '2024-01-02T00:00:00Z', metadata: '{}' },
            ];
            db.all.mockResolvedValueOnce(events);

            const state = await twin.getState('p1');
            expect(state.source).toBe('product_events');
            expect(state.current_state).toBe('in_transit');
            expect(state.total_events).toBe(2);
            expect(state.location_history).toHaveLength(2);
            expect(state.custody_chain).toHaveLength(1);
            expect(state.anomalies).toEqual([]);
            expect(state.timeline).toHaveLength(2);
        });

        test('detects TIME_TRAVEL anomaly', async () => {
            const events = [
                { id: '1', event_type: 'commission', from_state: '_initial', to_state: 'active', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, prev_event_hash: null, hash: 'h1', created_at: '2024-01-02T00:00:00Z', metadata: null },
                { id: '2', event_type: 'ship', from_state: 'active', to_state: 'shipped', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, prev_event_hash: 'h1', hash: 'h2', created_at: '2024-01-01T00:00:00Z', metadata: null }, // before previous!
            ];
            db.all.mockResolvedValueOnce(events);

            const state = await twin.getState('p1');
            expect(state.anomalies.some(a => a.type === 'TIME_TRAVEL')).toBe(true);
        });

        test('detects STATE_MISMATCH anomaly', async () => {
            const events = [
                { id: '1', event_type: 'commission', from_state: '_initial', to_state: 'active', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, hash: 'h1', created_at: '2024-01-01T00:00:00Z', metadata: null },
                { id: '2', event_type: 'ship', from_state: 'WRONG_STATE', to_state: 'shipped', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, hash: 'h2', created_at: '2024-01-02T00:00:00Z', metadata: null },
            ];
            db.all.mockResolvedValueOnce(events);

            const state = await twin.getState('p1');
            expect(state.anomalies.some(a => a.type === 'STATE_MISMATCH')).toBe(true);
        });

        test('calls verifyChainIntegrity', async () => {
            db.all.mockResolvedValueOnce([
                { id: '1', event_type: 'commission', from_state: '_initial', to_state: 'active', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, hash: 'h1', created_at: '2024-01-01', metadata: null },
            ]);

            await twin.getState('p1');
            expect(verifyChainIntegrity).toHaveBeenCalledWith('p1');
        });
    });

    describe('reconcile', () => {
        test('reports synced when DB status matches computed', async () => {
            db.all.mockResolvedValueOnce([
                { id: '1', event_type: 'commission', from_state: '_initial', to_state: 'commission', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, hash: 'h1', created_at: '2024-01-01', metadata: null },
            ]);
            db.get.mockResolvedValueOnce({ id: 'p1', status: 'active' });

            const result = await twin.reconcile('p1');
            expect(result.reconciliation.synced).toBe(true);
        });

        test('reports mismatch when DB status differs', async () => {
            db.all.mockResolvedValueOnce([
                { id: '1', event_type: 'sell', from_state: 'active', to_state: 'sell', actor_id: 'a1', actor_role: 'admin', location_id: null, partner_id: null, hash: 'h1', created_at: '2024-01-01', metadata: null },
            ]);
            db.get.mockResolvedValueOnce({ id: 'p1', status: 'in_warehouse' });

            const result = await twin.reconcile('p1');
            expect(result.reconciliation.synced).toBe(false);
            expect(result.reconciliation.mismatches).toHaveLength(1);
            expect(result.reconciliation.mismatches[0].field).toBe('status');
        });
    });
});
