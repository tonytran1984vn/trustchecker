class MetricState {
    constructor() {
        this.ema = 0;
        this.variance = 0;
        this.stddev = 0;
        this.lastValue = 0;
        this.lastTs = 0;
        this.trendSlope = 0;
        this.sampleCount = 0;
        this.ring = new Float64Array(64);
        this.ringIndex = 0;
    }
}

class PredictiveOpsEngine {
    constructor() {
        this.metrics = new Map();

        this.config = {
            alpha: 0.2, // EMA factor
            beta: 0.1, // variance factor
            slopeAlpha: 0.3, // trend smoothing
            minSamples: 8, // lock-in warmup time
        };
    }

    getState(metric) {
        let s = this.metrics.get(metric);
        if (!s) {
            s = new MetricState();
            this.metrics.set(metric, s);
        }
        return s;
    }

    update(metric, value, tsStr) {
        const ts = new Date(tsStr).getTime();
        const s = this.getState(metric);
        const { alpha, beta, slopeAlpha } = this.config;

        if (s.sampleCount === 0) {
            s.ema = value;
            s.variance = 0;
            s.stddev = 0;
            s.lastValue = value;
            s.lastTs = ts;
            s.sampleCount = 1;
            return;
        }

        // Mathematical update sequence
        const prevEma = s.ema;
        const ema = alpha * value + (1 - alpha) * prevEma;

        const diff = value - ema;
        const variance = beta * diff * diff + (1 - beta) * s.variance;
        const stddev = Math.sqrt(variance);

        let slope = s.trendSlope;
        const dt = (ts - s.lastTs) / 1000;

        if (dt > 0) {
            const rawSlope = (value - s.lastValue) / dt;
            slope = slopeAlpha * rawSlope + (1 - slopeAlpha) * slope;
        }

        s.ring[s.ringIndex++ % s.ring.length] = value;
        s.ema = ema;
        s.variance = variance;
        s.stddev = stddev;
        s.trendSlope = slope;
        s.lastValue = value;
        s.lastTs = ts;
        s.sampleCount++;
    }

    detect(metric, value) {
        const s = this.metrics.get(metric);
        if (!s || s.sampleCount < this.config.minSamples) {
            return { anomaly: false };
        }

        if (s.stddev === 0) return { anomaly: false };

        const z = (value - s.ema) / s.stddev;

        // Volatility check threshold calculation
        const volatility = s.stddev / (Math.abs(s.ema) + 1e-6);
        const threshold = 2.5 + Math.min(1.5, volatility);

        return {
            anomaly: Math.abs(z) > threshold,
            z,
            threshold,
            slope: s.trendSlope,
            ema: s.ema,
            stddev: s.stddev,
        };
    }

    correlate(snapshot) {
        const e = snapshot['error rate pct'];
        const l = snapshot['api response p95 ms'];
        const b = snapshot['mrv backlog count'];

        if (!e || !l || !b) return false;

        // Mathematical logical topology checks
        return e.trendSlope > 0 && l.trendSlope > 0 && b.trendSlope > 0;
    }

    computeRiskScore(slaRatio, errorTrend, resolutionVelocity, anomalyScore) {
        return 0.35 * slaRatio + 0.25 * errorTrend + 0.2 * (1 - resolutionVelocity) + 0.2 * anomalyScore;
    }

    // L3.5 Deterministic State Management
    exportState() {
        // Sort keys to ensure deterministic representation for hashing
        const entries = Array.from(this.metrics.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const serialized = entries.map(([name, state]) => {
            return {
                name,
                state: {
                    ema: Number(state.ema.toFixed(6)),
                    variance: Number(state.variance.toFixed(6)),
                    stddev: Number(state.stddev.toFixed(6)),
                    lastValue: Number(state.lastValue.toFixed(6)),
                    lastTs: state.lastTs,
                    trendSlope: Number(state.trendSlope.toFixed(6)),
                    sampleCount: state.sampleCount,
                    // Note: Short ring buffer intentionally excluded from long-term deterministic snapshot.
                },
            };
        });
        return serialized;
    }

    importState(snapshot) {
        this.metrics.clear();
        for (const item of snapshot) {
            const ms = new MetricState();
            Object.assign(ms, item.state);
            this.metrics.set(item.name, ms);
        }
    }
}

class PredictiveModelV1 extends PredictiveOpsEngine {
    constructor() {
        super();
        this.config = {
            alpha: 0.2,
            beta: 0.1,
            slopeAlpha: 0.3,
            minSamples: 8,
        };
    }
}

class PredictiveModelV2 extends PredictiveOpsEngine {
    constructor() {
        super();
        this.config = {
            alpha: 0.3, // More reactive EMA smoothing
            beta: 0.15, // More reactive variance tracking
            slopeAlpha: 0.4, // Faster trend acquisition
            minSamples: 10, // Slightly longer warmup buffer to avoid false start positives
        };
    }
}

// Retro-compatible default exports and Class constructors
module.exports = new PredictiveModelV1();
module.exports.PredictiveOpsEngine = PredictiveOpsEngine;
module.exports.PredictiveModelV1 = PredictiveModelV1;
module.exports.PredictiveModelV2 = PredictiveModelV2;
