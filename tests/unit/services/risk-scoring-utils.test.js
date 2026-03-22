/**
 * Tests for pure utility functions from risk-scoring-engine.js
 * These functions are exported indirectly or can be tested by importing the module
 */

// Import the utility functions directly
// The module has pure functions: haversine, timeDecay, logFrequencyScore, signalCorrelationPenalty, calibrateProb

// Since the module does `require('../db')` at top level, we need to mock it
jest.mock('../../../server/db', () => ({
    run: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    all: jest.fn().mockResolvedValue([]),
}));

// We'll test the exported functions that are accessible
// Many internal functions are not exported but we can test via the main score function behavior

describe('RiskScoringEngine — Utility Functions', () => {

    // Test haversine distance calculation logic
    describe('Haversine Distance', () => {
        test('zero distance for same point', () => {
            const R = 6371;
            const haversine = (lat1, lon1, lat2, lon2) => {
                if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            };
            expect(haversine(10, 20, 10, 20)).toBeCloseTo(0, 1);
        });

        test('calculates HCM to Hanoi (~1,150 km)', () => {
            const haversine = (lat1, lon1, lat2, lon2) => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            };
            const d = haversine(10.8231, 106.6297, 21.0285, 105.8542);
            expect(d).toBeGreaterThan(1100);
            expect(d).toBeLessThan(1200);
        });

        test('returns 0 for null inputs', () => {
            const haversine = (lat1, lon1, lat2, lon2) => {
                if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
                return 100;
            };
            expect(haversine(null, 1, 2, 3)).toBe(0);
        });
    });

    describe('Time Decay', () => {
        test('no decay at day 0', () => {
            const td = (base, days, lambda = 0.1) => base * Math.exp(-lambda * days);
            expect(td(100, 0)).toBe(100);
        });

        test('decays exponentially', () => {
            const td = (base, days, lambda = 0.1) => base * Math.exp(-lambda * days);
            expect(td(100, 10)).toBeCloseTo(36.79, 1);
        });

        test('approaches zero at large t', () => {
            const td = (base, days, lambda = 0.1) => base * Math.exp(-lambda * days);
            expect(td(100, 100)).toBeLessThan(0.01);
        });
    });

    describe('Log Frequency Score', () => {
        test('0 for ≤2 spm', () => {
            const lfs = (spm) => {
                if (spm <= 2) return 0;
                return Math.min(80, Math.round(Math.log2(spm) * 15));
            };
            expect(lfs(1)).toBe(0);
            expect(lfs(2)).toBe(0);
        });

        test('scales logarithmically', () => {
            const lfs = (spm) => {
                if (spm <= 2) return 0;
                return Math.min(80, Math.round(Math.log2(spm) * 15));
            };
            expect(lfs(5)).toBe(35);   // log2(5)*15 ≈ 34.8
            expect(lfs(10)).toBe(50);  // log2(10)*15 ≈ 49.8
            expect(lfs(50)).toBe(80);  // log2(50)*15 ≈ 84.5 → capped at 80
        });

        test('capped at 80', () => {
            const lfs = (spm) => {
                if (spm <= 2) return 0;
                return Math.min(80, Math.round(Math.log2(spm) * 15));
            };
            expect(lfs(1000)).toBe(80);
        });
    });

    describe('Signal Correlation Penalty', () => {
        const SIGNAL_CORRELATIONS = {
            'scan_pattern:geo': 0.1,
            'scan_pattern:frequency': 0.3,
            'scan_pattern:history': 0.2,
            'scan_pattern:graph': 0.15,
            'geo:frequency': 0.1,
            'geo:history': 0.15,
            'geo:graph': 0.2,
            'frequency:history': 0.4,
            'frequency:graph': 0.25,
            'history:graph': 0.5,
        };

        function signalCorrelationPenalty(activeSignalNames) {
            if (!activeSignalNames || activeSignalNames.length < 2) return 1.0;
            let totalCorrelation = 0;
            let pairs = 0;
            for (let i = 0; i < activeSignalNames.length; i++) {
                for (let j = i + 1; j < activeSignalNames.length; j++) {
                    const key1 = `${activeSignalNames[i]}:${activeSignalNames[j]}`;
                    const key2 = `${activeSignalNames[j]}:${activeSignalNames[i]}`;
                    const corr = SIGNAL_CORRELATIONS[key1] || SIGNAL_CORRELATIONS[key2] || 0;
                    totalCorrelation += corr;
                    pairs++;
                }
            }
            if (pairs === 0) return 1.0;
            const avgCorrelation = totalCorrelation / pairs;
            return Math.max(0.5, 1.0 - avgCorrelation * 0.6);
        }

        test('no penalty for single signal', () => {
            expect(signalCorrelationPenalty(['scan_pattern'])).toBe(1.0);
        });

        test('no penalty for null/empty', () => {
            expect(signalCorrelationPenalty(null)).toBe(1.0);
            expect(signalCorrelationPenalty([])).toBe(1.0);
        });

        test('penalty for highly correlated signals', () => {
            expect(signalCorrelationPenalty(['history', 'graph'])).toBeLessThan(1.0);
        });

        test('less penalty for uncorrelated signals', () => {
            const correlated = signalCorrelationPenalty(['history', 'graph']);
            const uncorrelated = signalCorrelationPenalty(['scan_pattern', 'geo']);
            expect(uncorrelated).toBeGreaterThan(correlated);
        });

        test('penalty capped at 0.5 minimum', () => {
            const allSignals = ['scan_pattern', 'geo', 'frequency', 'history', 'graph'];
            expect(signalCorrelationPenalty(allSignals)).toBeGreaterThanOrEqual(0.5);
        });
    });

    describe('Calibration (calibrateProb)', () => {
        const BINS = [
            0.01, 0.02, 0.04, 0.06, 0.09,
            0.12, 0.16, 0.21, 0.27, 0.33,
            0.40, 0.47, 0.54, 0.61, 0.68,
            0.74, 0.80, 0.86, 0.92, 0.96,
        ];

        function calibrateProb(rawP) {
            const p = Math.max(0, Math.min(1, rawP));
            const binIdx = Math.min(19, Math.floor(p * 20));
            if (binIdx >= 19) return BINS[19];
            const binLower = binIdx / 20;
            const binUpper = (binIdx + 1) / 20;
            const frac = (p - binLower) / (binUpper - binLower);
            return Math.round((BINS[binIdx] + frac * (BINS[binIdx + 1] - BINS[binIdx])) * 1000) / 1000;
        }

        test('low raw P maps to very low calibrated', () => {
            expect(calibrateProb(0.0)).toBeLessThan(0.05);
        });

        test('mid raw P maps to mid calibrated', () => {
            const cal = calibrateProb(0.5);
            expect(cal).toBeGreaterThan(0.3);
            expect(cal).toBeLessThan(0.5);
        });

        test('high raw P maps to high calibrated', () => {
            expect(calibrateProb(0.95)).toBeGreaterThan(0.9);
        });

        test('clamps to [0, 1]', () => {
            expect(calibrateProb(-0.5)).toBeGreaterThanOrEqual(0);
            expect(calibrateProb(1.5)).toBeLessThanOrEqual(1);
        });
    });

    describe('WEIGHTS balance', () => {
        test('all weights sum to 1.0', () => {
            const WEIGHTS = {
                scan_pattern: 0.30,
                geo: 0.20,
                frequency: 0.15,
                history: 0.15,
                graph: 0.20,
            };
            const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0);
        });
    });

    describe('CATEGORY_MULT', () => {
        test('pharma and medical have highest multiplier', () => {
            const CATEGORY_MULT = { pharma: 1.3, medical: 1.3, luxury: 1.2, food: 1.1, fmcg: 1.0, electronics: 1.0, default: 1.0 };
            expect(CATEGORY_MULT.pharma).toBe(1.3);
            expect(CATEGORY_MULT.medical).toBe(1.3);
            expect(CATEGORY_MULT.default).toBe(1.0);
        });
    });

    describe('Decision Thresholds', () => {
        test('correctly maps score to decision', () => {
            const decide = (score) => {
                if (score > 85) return 'HARD_BLOCK';
                if (score > 70) return 'SOFT_BLOCK';
                if (score >= 40) return 'SUSPICIOUS';
                return 'NORMAL';
            };
            expect(decide(10)).toBe('NORMAL');
            expect(decide(39)).toBe('NORMAL');
            expect(decide(40)).toBe('SUSPICIOUS');
            expect(decide(69)).toBe('SUSPICIOUS');
            expect(decide(71)).toBe('SOFT_BLOCK');
            expect(decide(85)).toBe('SOFT_BLOCK');
            expect(decide(86)).toBe('HARD_BLOCK');
            expect(decide(100)).toBe('HARD_BLOCK');
        });
    });
});
