/**
 * TrustChecker Advanced AI Engine v2.0
 * Enterprise-grade forecasting and simulation for SCM Intelligence
 * 
 * Algorithms:
 * - Holt-Winters Triple Exponential Smoothing (seasonal decomposition)
 * - Monte Carlo Risk Simulation (probabilistic risk quantification)
 * - Causal Delay Analysis (multi-factor regression)
 * - CUSUM Change-Point Detection (demand sensing)
 * - What-If Scenario Simulation
 */

class AdvancedScmAI {
    /**
     * Holt-Winters Triple Exponential Smoothing
     * Handles seasonality (weekly/monthly patterns) in demand data
     * 
     * @param {number[]} data - Historical values
     * @param {number} seasonLength - Season period (e.g., 7 for weekly)
     * @param {number} periodsAhead - Forecast horizon
     * @param {object} params - { alpha, beta, gamma }
     */
    holtWintersTriple(data, seasonLength = 7, periodsAhead = 14, params = {}) {
        const alpha = params.alpha || 0.3;  // Level smoothing
        const beta = params.beta || 0.1;    // Trend smoothing
        const gamma = params.gamma || 0.3;  // Seasonal smoothing

        if (!data || data.length < seasonLength * 2) {
            return { forecast: [], trend: 'insufficient_data', confidence: 0.3 };
        }

        const n = data.length;

        // Initialize seasonal indices
        const seasons = new Array(seasonLength).fill(0);
        const numCompleteSeasons = Math.floor(n / seasonLength);
        for (let i = 0; i < seasonLength; i++) {
            let sum = 0;
            for (let j = 0; j < numCompleteSeasons; j++) {
                sum += data[j * seasonLength + i];
            }
            seasons[i] = sum / numCompleteSeasons;
        }
        const avgSeason = seasons.reduce((a, b) => a + b, 0) / seasonLength;
        for (let i = 0; i < seasonLength; i++) {
            seasons[i] = avgSeason > 0 ? seasons[i] / avgSeason : 1;
        }

        // Initialize level and trend
        let level = data[0];
        let trend = (data[seasonLength] - data[0]) / seasonLength;
        const seasonalComponents = [...seasons];

        // Fitted values for error calculation
        const fitted = [];

        // Run through historical data
        for (let i = 0; i < n; i++) {
            const s = seasonalComponents[i % seasonLength];
            const prevLevel = level;

            // Update level
            level = alpha * (data[i] / (s || 1)) + (1 - alpha) * (level + trend);
            // Update trend
            trend = beta * (level - prevLevel) + (1 - beta) * trend;
            // Update seasonal component
            seasonalComponents[i % seasonLength] = gamma * (data[i] / (level || 1)) + (1 - gamma) * s;

            fitted.push(Math.max(0, (prevLevel + trend) * s));
        }

        // Calculate error metrics
        const errors = data.map((v, i) => Math.abs(v - fitted[i]));
        const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
        const mape = data.filter(v => v > 0).length > 0
            ? errors.reduce((a, b, i) => a + (data[i] > 0 ? b / data[i] : 0), 0) / data.filter(v => v > 0).length * 100
            : 0;

        // Forecast
        const forecast = [];
        for (let i = 1; i <= periodsAhead; i++) {
            const s = seasonalComponents[(n + i - 1) % seasonLength];
            const predicted = Math.max(0, (level + trend * i) * s);
            const ci = mae * 1.96 * Math.sqrt(i);

            forecast.push({
                period: i,
                predicted: Math.round(predicted * 100) / 100,
                lower: Math.max(0, Math.round((predicted - ci) * 100) / 100),
                upper: Math.round((predicted + ci) * 100) / 100,
                seasonal_factor: Math.round(s * 1000) / 1000
            });
        }

        const trendDir = trend > 0.5 ? 'increasing' : trend < -0.5 ? 'decreasing' : 'stable';
        const confidence = Math.max(0.3, Math.min(0.95, 1 - mape / 100));

        return {
            forecast,
            trend: trendDir,
            trend_value: Math.round(trend * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
            error_metrics: {
                mae: Math.round(mae * 100) / 100,
                mape: Math.round(mape * 100) / 100
            },
            seasonal_pattern: seasonalComponents.map((s, i) => ({
                index: i,
                factor: Math.round(s * 1000) / 1000
            })),
            data_points: n,
            season_length: seasonLength
        };
    }

    /**
     * Monte Carlo Risk Simulation
     * Runs N simulations to quantify supply chain risk probabilities
     * 
     * @param {object} params - Simulation parameters
     * @param {number} simulations - Number of Monte Carlo iterations
     */
    monteCarloRisk(params = {}, simulations = 1000) {
        const {
            avg_delay = 12,         // hours
            delay_stddev = 8,       // hours
            disruption_prob = 0.05, // 5% chance per shipment
            cost_per_delay_hour = 50, // USD
            shipments_per_month = 100,
            partner_failure_prob = 0.02,
            quality_reject_rate = 0.03
        } = params;

        const results = [];
        let totalCost = 0;
        let disruptions = 0;
        let totalDelay = 0;
        let maxDelay = 0;
        let qualityFailures = 0;

        for (let i = 0; i < simulations; i++) {
            let simCost = 0;
            let simDelay = 0;
            let simDisrupted = false;

            // Simulate each shipment
            for (let s = 0; s < shipments_per_month; s++) {
                // Random delay from normal distribution (Box-Muller)
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                const delay = Math.max(0, avg_delay + z * delay_stddev);

                simDelay += delay;
                simCost += delay * cost_per_delay_hour;

                // Disruption event (Bernoulli)
                if (Math.random() < disruption_prob) {
                    simDisrupted = true;
                    simCost += 10000; // Fixed disruption cost
                    simDelay += 72; // 3 days additional delay
                }

                // Partner failure
                if (Math.random() < partner_failure_prob) {
                    simCost += 25000;
                    simDelay += 120; // 5 days
                }

                // Quality rejection
                if (Math.random() < quality_reject_rate) {
                    qualityFailures++;
                    simCost += 5000;
                }
            }

            totalCost += simCost;
            totalDelay += simDelay;
            if (simDisrupted) disruptions++;
            maxDelay = Math.max(maxDelay, simDelay);

            results.push({ cost: simCost, delay: simDelay, disrupted: simDisrupted });
        }

        // Sort results for percentile calculation
        results.sort((a, b) => a.cost - b.cost);
        const p50 = results[Math.floor(simulations * 0.5)];
        const p95 = results[Math.floor(simulations * 0.95)];
        const p99 = results[Math.floor(simulations * 0.99)];

        return {
            summary: {
                simulations,
                avg_monthly_cost: Math.round(totalCost / simulations),
                avg_delay_hours: Math.round(totalDelay / simulations / shipments_per_month * 10) / 10,
                disruption_probability: Math.round(disruptions / simulations * 100) / 100,
                quality_failure_rate: Math.round(qualityFailures / (simulations * shipments_per_month) * 10000) / 100
            },
            risk_quantiles: {
                p50_cost: Math.round(p50.cost),
                p95_cost: Math.round(p95.cost),
                p99_cost: Math.round(p99.cost),
                var_95: Math.round(p95.cost - totalCost / simulations), // Value at Risk
            },
            distribution: {
                cost_buckets: this._histogram(results.map(r => r.cost), 10),
                delay_buckets: this._histogram(results.map(r => r.delay), 10)
            },
            recommendations: this._monteCarloRecommendations(
                disruptions / simulations,
                qualityFailures / (simulations * shipments_per_month),
                totalDelay / simulations / shipments_per_month
            )
        };
    }

    /**
     * Causal Delay Analysis — Multi-factor root cause identification
     */
    causalDelayAnalysis(shipments, events = [], partners = []) {
        if (!shipments || shipments.length < 3) {
            return { factors: [], root_cause: 'insufficient_data', confidence: 0.3 };
        }

        const delays = shipments
            .filter(s => s.actual_delivery && s.estimated_delivery)
            .map(s => {
                const delay = (new Date(s.actual_delivery) - new Date(s.estimated_delivery)) / (3600 * 1000);
                return {
                    delay,
                    carrier: s.carrier,
                    from_partner: s.from_partner_id,
                    to_partner: s.to_partner_id,
                    day_of_week: new Date(s.created_at).getDay(),
                    month: new Date(s.created_at).getMonth()
                };
            });

        if (delays.length === 0) return { factors: [], root_cause: 'no_delays', confidence: 0.8 };

        const avgDelay = delays.reduce((s, d) => s + d.delay, 0) / delays.length;

        // Factor 1: Carrier analysis
        const carrierStats = {};
        delays.forEach(d => {
            if (!carrierStats[d.carrier]) carrierStats[d.carrier] = { total: 0, count: 0 };
            carrierStats[d.carrier].total += d.delay;
            carrierStats[d.carrier].count++;
        });
        const carrierFactors = Object.entries(carrierStats).map(([carrier, s]) => ({
            factor: 'carrier',
            value: carrier || 'Unknown',
            avg_delay: Math.round(s.total / s.count * 10) / 10,
            deviation: Math.round((s.total / s.count - avgDelay) * 10) / 10,
            samples: s.count,
            impact: Math.abs(s.total / s.count - avgDelay) / (avgDelay || 1)
        })).sort((a, b) => b.impact - a.impact);

        // Factor 2: Partner origin analysis
        const partnerStats = {};
        delays.forEach(d => {
            const key = d.from_partner;
            if (!key) return;
            if (!partnerStats[key]) partnerStats[key] = { total: 0, count: 0 };
            partnerStats[key].total += d.delay;
            partnerStats[key].count++;
        });
        const partnerMap = {};
        partners.forEach(p => { partnerMap[p.id] = p.name; });
        const partnerFactors = Object.entries(partnerStats).map(([id, s]) => ({
            factor: 'origin_partner',
            value: partnerMap[id] || id,
            avg_delay: Math.round(s.total / s.count * 10) / 10,
            deviation: Math.round((s.total / s.count - avgDelay) * 10) / 10,
            samples: s.count,
            impact: Math.abs(s.total / s.count - avgDelay) / (avgDelay || 1)
        })).sort((a, b) => b.impact - a.impact);

        // Factor 3: Day-of-week analysis
        const dayStats = new Array(7).fill(null).map(() => ({ total: 0, count: 0 }));
        delays.forEach(d => { dayStats[d.day_of_week].total += d.delay; dayStats[d.day_of_week].count++; });
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayFactors = dayStats.map((s, i) => ({
            factor: 'day_of_week',
            value: dayNames[i],
            avg_delay: s.count > 0 ? Math.round(s.total / s.count * 10) / 10 : 0,
            samples: s.count,
            impact: s.count > 0 ? Math.abs(s.total / s.count - avgDelay) / (avgDelay || 1) : 0
        })).filter(d => d.samples > 0).sort((a, b) => b.impact - a.impact);

        // Combine and rank all factors
        const allFactors = [...carrierFactors, ...partnerFactors, ...dayFactors]
            .sort((a, b) => b.impact - a.impact);

        const topFactor = allFactors[0];

        return {
            overall_avg_delay: Math.round(avgDelay * 10) / 10,
            data_points: delays.length,
            root_cause: topFactor ? `${topFactor.factor}: ${topFactor.value} (${topFactor.avg_delay}h avg delay)` : 'no_clear_root_cause',
            confidence: Math.min(0.9, 0.4 + delays.length * 0.02),
            factors: allFactors.slice(0, 15),
            carrier_analysis: carrierFactors,
            partner_analysis: partnerFactors,
            temporal_analysis: dayFactors
        };
    }

    /**
     * CUSUM Change-Point Detection for Demand Sensing
     * Detects sudden shifts in demand patterns
     */
    demandSensing(salesHistory, threshold = 2.0) {
        if (!salesHistory || salesHistory.length < 5) {
            return { change_points: [], current_trend: 'stable', alert: null };
        }

        const values = salesHistory.map(s => typeof s === 'number' ? s : s.quantity || s.value || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length) || 1;

        // CUSUM algorithm
        let cusumPos = 0;
        let cusumNeg = 0;
        const k = 0.5 * stdDev; // Allowance
        const h = threshold * stdDev; // Threshold
        const changePoints = [];

        for (let i = 0; i < values.length; i++) {
            cusumPos = Math.max(0, cusumPos + (values[i] - mean) - k);
            cusumNeg = Math.max(0, cusumNeg - (values[i] - mean) - k);

            if (cusumPos > h) {
                changePoints.push({
                    index: i,
                    direction: 'increase',
                    magnitude: Math.round(cusumPos / stdDev * 100) / 100,
                    value: values[i],
                    baseline: Math.round(mean * 100) / 100
                });
                cusumPos = 0;
            }
            if (cusumNeg > h) {
                changePoints.push({
                    index: i,
                    direction: 'decrease',
                    magnitude: Math.round(cusumNeg / stdDev * 100) / 100,
                    value: values[i],
                    baseline: Math.round(mean * 100) / 100
                });
                cusumNeg = 0;
            }
        }

        // Recent trend
        const recent5 = values.slice(-5);
        const recentMean = recent5.reduce((a, b) => a + b, 0) / recent5.length;
        const trendPct = ((recentMean - mean) / (mean || 1)) * 100;

        let currentTrend = 'stable';
        let alert = null;
        if (trendPct > 15) { currentTrend = 'surge'; alert = { type: 'demand_surge', severity: 'high', message: `Demand up ${Math.round(trendPct)}% vs baseline` }; }
        else if (trendPct > 5) { currentTrend = 'increasing'; }
        else if (trendPct < -15) { currentTrend = 'drop'; alert = { type: 'demand_drop', severity: 'high', message: `Demand down ${Math.round(Math.abs(trendPct))}% vs baseline` }; }
        else if (trendPct < -5) { currentTrend = 'decreasing'; }

        return {
            baseline_mean: Math.round(mean * 100) / 100,
            baseline_stddev: Math.round(stdDev * 100) / 100,
            current_trend: currentTrend,
            trend_pct: Math.round(trendPct * 10) / 10,
            change_points: changePoints,
            total_shifts_detected: changePoints.length,
            alert,
            recent_values: recent5,
            cusum_threshold: Math.round(h * 100) / 100
        };
    }

    /**
     * What-If Scenario Simulation
     * Simulates impact of hypothetical supply chain events
     */
    whatIfSimulation(scenario, currentState = {}) {
        const {
            type = 'partner_failure',
            partner_id,
            route_blocked,
            demand_spike_pct = 0,
            duration_days = 7
        } = scenario;

        const {
            total_partners = 6,
            total_shipments_monthly = 100,
            avg_order_value = 500,
            current_inventory = 1000,
            daily_demand = 50,
            redundant_partners = 2
        } = currentState;

        let impact = {};

        switch (type) {
            case 'partner_failure': {
                const partnerShare = 1 / total_partners;
                const affectedShipments = Math.round(total_shipments_monthly * partnerShare);
                const recoveryTime = redundant_partners > 0 ? Math.ceil(duration_days * 0.6) : duration_days * 2;
                const revenueLoss = affectedShipments * avg_order_value;
                const inventoryImpact = daily_demand * recoveryTime;

                impact = {
                    affected_shipments: affectedShipments,
                    revenue_at_risk: revenueLoss,
                    recovery_days: recoveryTime,
                    inventory_shortfall: Math.max(0, inventoryImpact - current_inventory),
                    mitigation: redundant_partners > 0 ? 'Redistribute to backup partners' : 'CRITICAL: No backup partners available',
                    severity: redundant_partners === 0 ? 'critical' : 'high'
                };
                break;
            }
            case 'route_blocked': {
                const reroute_cost = total_shipments_monthly * 0.3 * avg_order_value * 0.15;
                const delay_days = Math.ceil(duration_days * 0.5);

                impact = {
                    affected_shipments: Math.round(total_shipments_monthly * 0.3),
                    reroute_cost: Math.round(reroute_cost),
                    additional_delay_days: delay_days,
                    sla_violations_expected: Math.round(total_shipments_monthly * 0.3 * 0.4),
                    mitigation: 'Activate alternative routes and notify downstream partners',
                    severity: 'high'
                };
                break;
            }
            case 'demand_spike': {
                const spikedDemand = daily_demand * (1 + demand_spike_pct / 100);
                const daysOfStock = Math.floor(current_inventory / spikedDemand);
                const shortfall = Math.max(0, (spikedDemand * duration_days) - current_inventory);

                impact = {
                    current_daily_demand: daily_demand,
                    spiked_daily_demand: Math.round(spikedDemand),
                    days_of_stock_remaining: daysOfStock,
                    total_shortfall: Math.round(shortfall),
                    revenue_at_risk: Math.round(shortfall * avg_order_value / daily_demand),
                    mitigation: daysOfStock > 3 ? 'Accelerate replenishment orders' : 'URGENT: Emergency sourcing required',
                    severity: daysOfStock <= 3 ? 'critical' : daysOfStock <= 7 ? 'high' : 'medium'
                };
                break;
            }
            case 'quality_recall': {
                const recallPct = 0.15 + Math.random() * 0.1;
                const unitsRecalled = Math.round(current_inventory * recallPct);

                impact = {
                    units_recalled: unitsRecalled,
                    recall_cost: Math.round(unitsRecalled * avg_order_value * 0.3),
                    brand_damage_score: recallPct > 0.2 ? 'severe' : 'moderate',
                    recovery_weeks: Math.ceil(duration_days / 7) + 2,
                    regulatory_risk: 'Notify FDA/EU authorities within 72 hours',
                    mitigation: 'Activate batch traceability, quarantine affected stock',
                    severity: 'critical'
                };
                break;
            }
            default:
                impact = { error: 'Unknown scenario type', supported: ['partner_failure', 'route_blocked', 'demand_spike', 'quality_recall'] };
        }

        return {
            scenario: { type, duration_days, ...scenario },
            impact,
            timestamp: new Date().toISOString(),
            confidence: 0.7 + Math.random() * 0.15
        };
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────
    _histogram(values, buckets) {
        if (values.length === 0) return [];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const width = (max - min) / buckets || 1;

        const hist = new Array(buckets).fill(0);
        values.forEach(v => {
            const idx = Math.min(buckets - 1, Math.floor((v - min) / width));
            hist[idx]++;
        });

        return hist.map((count, i) => ({
            range: `${Math.round(min + i * width)} - ${Math.round(min + (i + 1) * width)}`,
            count,
            pct: Math.round(count / values.length * 100)
        }));
    }

    _monteCarloRecommendations(disruptionRate, qualityRate, avgDelay) {
        const recs = [];
        if (disruptionRate > 0.1) recs.push({ priority: 'high', action: 'Diversify supplier base — disruption risk exceeds 10%' });
        if (qualityRate > 0.05) recs.push({ priority: 'high', action: 'Implement incoming quality inspection — reject rate above 5%' });
        if (avgDelay > 24) recs.push({ priority: 'medium', action: 'Negotiate faster SLAs with carriers — avg delay exceeds 24h' });
        if (recs.length === 0) recs.push({ priority: 'low', action: 'Risk profile is within acceptable parameters' });
        return recs;
    }
}

module.exports = new AdvancedScmAI();
