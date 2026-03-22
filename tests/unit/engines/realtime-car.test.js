const car = require('../../../server/engines/intelligence/realtime-car-engine');

describe('RealtimeCAREngine', () => {
    describe('calculateLiveCAR', () => {
        test('calculates CAR percentage', () => {
            const result = car.calculateLiveCAR({
                tier1_capital: 500000, tier2_capital: 200000,
                total_exposure: 3000000, pending_settlements: 500000,
                carbon_positions: 200000,
            });
            expect(result.car_pct).toBeDefined();
            expect(result.capital.total).toBe(700000);
            expect(result.status).toBeDefined();
        });

        test('returns 100% CAR when no exposure', () => {
            const result = car.calculateLiveCAR({
                tier1_capital: 500000, tier2_capital: 200000,
                total_exposure: 0, pending_settlements: 0, carbon_positions: 0,
            });
            expect(result.car_pct).toBe(100);
        });

        test('Well Capitalized above 12%', () => {
            const result = car.calculateLiveCAR({
                tier1_capital: 1000000, tier2_capital: 500000,
                total_exposure: 5000000, pending_settlements: 100000, carbon_positions: 50000,
            });
            expect(result.status).toBe('Well Capitalized');
        });

        test('triggers capital call when below threshold', () => {
            const result = car.calculateLiveCAR({
                tier1_capital: 30000, tier2_capital: 10000,
                total_exposure: 5000000, pending_settlements: 2000000,
                carbon_positions: 1000000,
            });
            expect(result.capital_call).not.toBeNull();
        });

        test('includes buffer calculation', () => {
            const result = car.calculateLiveCAR({
                tier1_capital: 500000, tier2_capital: 200000,
                total_exposure: 3000000,
            });
            expect(result.buffer_pct).toBeDefined();
            expect(result.target_car_pct).toBeDefined();
        });

        test('includes next refresh interval', () => {
            const result = car.calculateLiveCAR({ tier1_capital: 100, tier2_capital: 0, total_exposure: 1000 });
            expect(result.next_refresh_ms).toBe(60000);
        });
    });

    describe('updateExposure', () => {
        test('updates state and recalculates', () => {
            const result = car.updateExposure({ tier1_capital: 800000 });
            expect(result.capital.tier1).toBe(800000);
        });
    });

    describe('getters', () => {
        test('getDynamicBuffers returns buffer config', () => {
            const buffers = car.getDynamicBuffers();
            expect(buffers.base_buffer_pct).toBe(4);
            expect(buffers.market_adjustments.length).toBeGreaterThan(0);
        });

        test('getCapitalCallMechanism returns 4 trigger levels', () => {
            const cc = car.getCapitalCallMechanism();
            expect(cc.trigger_levels.length).toBe(4);
            expect(cc.capital_sources.length).toBe(5);
        });

        test('getExposureTracking returns 5 categories', () => {
            const et = car.getExposureTracking();
            expect(et.exposure_categories.length).toBe(5);
        });

        test('getCARThresholds returns 5 thresholds', () => {
            const t = car.getCARThresholds();
            expect(Object.keys(t.thresholds).length).toBe(5);
        });
    });

    describe('getFullDashboard', () => {
        test('returns complete dashboard', () => {
            const dash = car.getFullDashboard();
            expect(dash.title).toContain('Capital Adequacy');
            expect(dash.live_car).toBeDefined();
            expect(dash.thresholds).toBeDefined();
            expect(dash.dynamic_buffers).toBeDefined();
            expect(dash.capital_call).toBeDefined();
            expect(dash.exposure).toBeDefined();
        });
    });
});
