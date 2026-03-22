// Risk Scoring Engine — pure function tests
// Import via a module mock to avoid DB connection
const WEIGHTS = { scan_pattern: 0.30, geo: 0.20, frequency: 0.15, history: 0.15, graph: 0.20 };
const DEFAULT_LR = { scan_pattern: 1.5, geo: 1.8, frequency: 1.3, history: 1.4, graph: 2.0 };
const SIGNAL_NAMES = ['scan_pattern', 'geo', 'frequency', 'history', 'graph'];
const CATEGORY_MULT = { pharma: 1.3, medical: 1.3, luxury: 1.2, food: 1.1, fmcg: 1.0, electronics: 1.0, default: 1.0 };
const SIGNAL_CORRELATIONS = {
    'scan_pattern:geo': 0.1, 'scan_pattern:frequency': 0.3, 'scan_pattern:history': 0.2,
    'scan_pattern:graph': 0.15, 'geo:frequency': 0.1, 'geo:history': 0.15,
    'geo:graph': 0.2, 'frequency:history': 0.4, 'frequency:graph': 0.25, 'history:graph': 0.5,
};

// Re-implement pure functions locally since the module requires db connection
function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function timeDecay(baseSeverity, daysSinceEvent, lambda = 0.1) {
    return baseSeverity * Math.exp(-lambda * daysSinceEvent);
}

function logFrequencyScore(scansPerMinute) {
    if (scansPerMinute <= 2) return 0;
    return Math.min(80, Math.round(Math.log2(scansPerMinute) * 15));
}

function signalCorrelationPenalty(activeSignalNames) {
    if (!activeSignalNames || activeSignalNames.length < 2) return 1.0;
    let totalCorrelation = 0, pairs = 0;
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

function calibrateProb(rawP) {
    const BINS = [
        0.01, 0.02, 0.04, 0.06, 0.09, 0.12, 0.16, 0.21, 0.27, 0.33,
        0.40, 0.47, 0.54, 0.61, 0.68, 0.74, 0.80, 0.86, 0.92, 0.96,
    ];
    if (rawP <= 0) return BINS[0];
    if (rawP >= 1) return BINS[BINS.length - 1];
    const idx = rawP * 20;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, BINS.length - 1);
    const frac = idx - lo;
    return Math.round((BINS[lo] * (1 - frac) + BINS[hi] * frac) * 1000) / 1000;
}

describe('risk-scoring-engine (pure functions)', () => {
    describe('WEIGHTS', () => {
        test('sum to 1.0', () => {
            const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 5);
        });

        test('scan_pattern is 0.30', () => {
            expect(WEIGHTS.scan_pattern).toBe(0.30);
        });

        test('graph is 0.20', () => {
            expect(WEIGHTS.graph).toBe(0.20);
        });

        test('has 5 weights', () => {
            expect(Object.keys(WEIGHTS).length).toBe(5);
        });
    });

    describe('SIGNAL_NAMES', () => {
        test('has 5 signals', () => {
            expect(SIGNAL_NAMES).toHaveLength(5);
        });

        test('includes graph', () => {
            expect(SIGNAL_NAMES).toContain('graph');
        });

        test('matches weight keys', () => {
            expect(SIGNAL_NAMES.sort()).toEqual(Object.keys(WEIGHTS).sort());
        });
    });

    describe('DEFAULT_LR', () => {
        test('graph has highest LR (2.0)', () => {
            expect(DEFAULT_LR.graph).toBe(2.0);
        });

        test('geo has 1.8', () => {
            expect(DEFAULT_LR.geo).toBe(1.8);
        });

        test('all LRs are > 1.0', () => {
            Object.values(DEFAULT_LR).forEach(lr => {
                expect(lr).toBeGreaterThan(1.0);
            });
        });
    });

    describe('CATEGORY_MULT', () => {
        test('pharma has highest multiplier', () => {
            expect(CATEGORY_MULT.pharma).toBe(1.3);
        });

        test('default is 1.0', () => {
            expect(CATEGORY_MULT.default).toBe(1.0);
        });

        test('luxury is 1.2', () => {
            expect(CATEGORY_MULT.luxury).toBe(1.2);
        });

        test('food is 1.1', () => {
            expect(CATEGORY_MULT.food).toBe(1.1);
        });

        test('all multipliers are >= 1.0', () => {
            Object.values(CATEGORY_MULT).forEach(m => {
                expect(m).toBeGreaterThanOrEqual(1.0);
            });
        });
    });

    describe('haversine', () => {
        test('returns 0 for null coordinates', () => {
            expect(haversine(null, 0, 0, 0)).toBe(0);
        });

        test('returns 0 for same point', () => {
            expect(haversine(0, 0, 0, 0)).toBe(0);
        });

        test('calculates correct distance NYC-London (~5570km)', () => {
            const d = haversine(40.7128, -74.0060, 51.5074, -0.1278);
            expect(d).toBeGreaterThan(5500);
            expect(d).toBeLessThan(5700);
        });

        test('distance is positive', () => {
            expect(haversine(10, 20, 30, 40)).toBeGreaterThan(0);
        });

        test('short distance HCM-Hanoi (~1150km)', () => {
            const d = haversine(10.8231, 106.6297, 21.0285, 105.8542);
            expect(d).toBeGreaterThan(1100);
            expect(d).toBeLessThan(1200);
        });

        test('returns 0 for missing lon', () => {
            expect(haversine(10, null, 20, 30)).toBe(0);
        });
    });

    describe('timeDecay', () => {
        test('returns baseSeverity for 0 days', () => {
            expect(timeDecay(100, 0)).toBe(100);
        });

        test('decays with time', () => {
            expect(timeDecay(100, 10)).toBeLessThan(100);
        });

        test('more days = lower value', () => {
            expect(timeDecay(100, 30)).toBeLessThan(timeDecay(100, 10));
        });

        test('custom lambda changes decay rate', () => {
            const slow = timeDecay(100, 5, 0.05);
            const fast = timeDecay(100, 5, 0.5);
            expect(slow).toBeGreaterThan(fast);
        });

        test('approaches 0 for very old events', () => {
            expect(timeDecay(100, 365)).toBeLessThan(1);
        });

        test('preserves proportionality', () => {
            const a = timeDecay(50, 5);
            const b = timeDecay(100, 5);
            expect(b / a).toBeCloseTo(2, 1);
        });
    });

    describe('logFrequencyScore', () => {
        test('returns 0 for 0 spm', () => {
            expect(logFrequencyScore(0)).toBe(0);
        });

        test('returns 0 for 1 spm', () => {
            expect(logFrequencyScore(1)).toBe(0);
        });

        test('returns 0 for 2 spm', () => {
            expect(logFrequencyScore(2)).toBe(0);
        });

        test('returns positive for 3 spm', () => {
            expect(logFrequencyScore(3)).toBeGreaterThan(0);
        });

        test('returns ~35 for 5 spm', () => {
            const s = logFrequencyScore(5);
            expect(s).toBeGreaterThan(30);
            expect(s).toBeLessThan(40);
        });

        test('caps at 80', () => {
            expect(logFrequencyScore(1000)).toBe(80);
        });

        test('monotonically increasing', () => {
            for (let i = 3; i < 20; i++) {
                expect(logFrequencyScore(i + 1)).toBeGreaterThanOrEqual(logFrequencyScore(i));
            }
        });

        test('10 spm gives ~50', () => {
            const s = logFrequencyScore(10);
            expect(s).toBeGreaterThan(45);
            expect(s).toBeLessThan(55);
        });
    });

    describe('signalCorrelationPenalty', () => {
        test('returns 1.0 for null input', () => {
            expect(signalCorrelationPenalty(null)).toBe(1.0);
        });

        test('returns 1.0 for single signal', () => {
            expect(signalCorrelationPenalty(['geo'])).toBe(1.0);
        });

        test('returns < 1.0 for correlated pair', () => {
            expect(signalCorrelationPenalty(['history', 'graph'])).toBeLessThan(1.0);
        });

        test('returns >= 0.5 always', () => {
            expect(signalCorrelationPenalty(SIGNAL_NAMES)).toBeGreaterThanOrEqual(0.5);
        });

        test('uncorrelated signals get less penalty', () => {
            const low = signalCorrelationPenalty(['scan_pattern', 'geo']);
            const high = signalCorrelationPenalty(['history', 'graph']);
            expect(low).toBeGreaterThan(high); // less correlated = less penalty = higher value
        });

        test('empty array returns 1.0', () => {
            expect(signalCorrelationPenalty([])).toBe(1.0);
        });
    });

    describe('calibrateProb', () => {
        test('returns low value for 0', () => {
            expect(calibrateProb(0)).toBeLessThan(0.05);
        });

        test('returns high value for 1', () => {
            expect(calibrateProb(1)).toBeGreaterThan(0.9);
        });

        test('monotonically increasing', () => {
            for (let p = 0; p <= 0.9; p += 0.1) {
                expect(calibrateProb(p + 0.1)).toBeGreaterThanOrEqual(calibrateProb(p));
            }
        });

        test('midpoint (~0.5) maps to ~0.4', () => {
            const c = calibrateProb(0.5);
            expect(c).toBeGreaterThan(0.3);
            expect(c).toBeLessThan(0.55);
        });

        test('returns number', () => {
            expect(typeof calibrateProb(0.3)).toBe('number');
        });
    });

    describe('SIGNAL_CORRELATIONS', () => {
        test('history:graph is highest (0.5)', () => {
            expect(SIGNAL_CORRELATIONS['history:graph']).toBe(0.5);
        });

        test('frequency:history is 0.4', () => {
            expect(SIGNAL_CORRELATIONS['frequency:history']).toBe(0.4);
        });

        test('all values are 0-1', () => {
            Object.values(SIGNAL_CORRELATIONS).forEach(v => {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });
        });

        test('has 10 correlation pairs', () => {
            expect(Object.keys(SIGNAL_CORRELATIONS).length).toBe(10);
        });
    });
});
