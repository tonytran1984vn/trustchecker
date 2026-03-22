const ni = require('../../../server/engines/core/network-intelligence-engine');
const NIClass = ni.constructor;

let engine;
beforeEach(() => { engine = new NIClass(); });

describe('NetworkIntelligenceEngine', () => {
    describe('_confidence', () => {
        test('high confidence: >=10 orgs, >=50 ratings', () => {
            expect(engine._confidence(10, 50)).toBe('high');
        });

        test('medium confidence: >=5 orgs, >=20 ratings', () => {
            expect(engine._confidence(5, 20)).toBe('medium');
        });

        test('low confidence: >=2 orgs', () => {
            expect(engine._confidence(2, 5)).toBe('low');
        });

        test('insufficient confidence: <2 orgs', () => {
            expect(engine._confidence(1, 100)).toBe('insufficient');
        });

        test('zero orgs is insufficient', () => {
            expect(engine._confidence(0, 0)).toBe('insufficient');
        });

        test('boundary: exactly 10 orgs, 50 ratings = high', () => {
            expect(engine._confidence(10, 50)).toBe('high');
        });

        test('boundary: 10 orgs, 49 ratings = medium', () => {
            expect(engine._confidence(10, 49)).toBe('medium');
        });
    });
});
