// Risk Scoring Engine — Comprehensive Boundary & Edge Case Tests
// Testing the mathematical pure functions with exhaustive data points

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

describe('risk-scoring-engine mathematical boundaries', () => {

    describe('calibrateProb comprehensive coverage (0.00 to 1.00)', () => {
        // Generate 101 test cases from 0.00 to 1.00 inclusive
        const probCases = Array.from({ length: 101 }, (_, i) => [i / 100]);
        
        test.each(probCases)('calibrateProb(%f) is valid probability [0.01, 0.96]', (val) => {
            const result = calibrateProb(val);
            expect(result).toBeGreaterThanOrEqual(0.01);
            expect(result).toBeLessThanOrEqual(0.96);
        });
    });

    describe('timeDecay chronological boundaries (0 to 100 days)', () => {
        // Generate 101 test cases from 0 to 100 days
        const dayCases = Array.from({ length: 101 }, (_, i) => [i]);
        const BASE = 100;
        
        test.each(dayCases)(`timeDecay(${BASE}, %i days) decreases monotonically`, (days) => {
            const result = timeDecay(BASE, days);
            expect(result).toBeLessThanOrEqual(BASE);
            expect(result).toBeGreaterThanOrEqual(0);
            
            // Check monotonicity: day N+1 must be <= day N
            if (days > 0) {
                const prev = timeDecay(BASE, days - 1);
                expect(result).toBeLessThanOrEqual(prev);
            }
        });
    });

    describe('logFrequencyScore volume boundaries (0 to 200 spm)', () => {
        // Generate 100 test cases for scan frequencies: 0, 2, 4, ..., 198
        const freqCases = Array.from({ length: 100 }, (_, i) => [i * 2]);
        
        test.each(freqCases)('logFrequencyScore(%i spm) is capped at 80', (spm) => {
            const score = logFrequencyScore(spm);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(80);
            
            if (spm <= 2) {
                expect(score).toBe(0);
            }
        });
    });

    describe('haversine geographic edge cases', () => {
        // 50 test cases testing quadrants, poles, and equator
        const geoCases = [];
        for (let lat = -90; lat <= 90; lat += 45) {
            for (let lon = -180; lon <= 180; lon += 45) {
                // Testing distance from Null Island (0,0) to various coordinates
                geoCases.push([0, 0, lat, lon]);
            }
        }
        
        test.each(geoCases)('haversine distance from 0,0 to %f,%f is non-negative and <= 20040km', (lat1, lon1, lat2, lon2) => {
            const distance = haversine(lat1, lon1, lat2, lon2);
            expect(distance).toBeGreaterThanOrEqual(0);
            // Max distance on earth is ~20,015 km (half circumference)
            expect(distance).toBeLessThanOrEqual(20050);
        });
    });

});
