/**
 * TrustChecker — Decentralization KPI Engine v1.0
 * IPO-GRADE: Measurable Thresholds for Phase Transitions
 * 
 * Charter has 3 phases: Permissioned → Governed → Autonomous
 * This engine defines OBJECTIVE METRICS to move between phases.
 * Without measurable KPIs, decentralization roadmap is just narrative.
 * 
 * Metrics: Nakamoto Coefficient, Validator Diversity Index, 
 * Geographic Distribution, Governance Independence Score
 */

// ═══════════════════════════════════════════════════════════════════
// 1. DECENTRALIZATION PHASES WITH OBJECTIVE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════

const PHASES = {
    phase_1_permissioned: {
        name: 'Permissioned',
        status: 'CURRENT',
        description: 'Platform-controlled validator set, centralized governance',
        entry_criteria: 'Genesis — no prerequisites',
        exit_criteria: {
            min_validators: 15,
            min_independent_validators_pct: 30,
            min_geographic_regions: 3,
            nakamoto_coefficient_min: 3,
            governance_independence_min_pct: 40,
            min_months_stable: 6,
            uptime_99_pct: true,
            external_audit_passed: true,
        },
        governance: 'Platform retains veto power',
        estimated_duration_months: '12-18',
    },
    phase_2_governed: {
        name: 'Governed',
        status: 'PLANNED',
        description: 'Community-elected council, shared governance, platform retains emergency powers only',
        entry_criteria: 'Phase 1 exit criteria met + GGC super-majority vote (75%)',
        exit_criteria: {
            min_validators: 50,
            min_independent_validators_pct: 60,
            min_geographic_regions: 6,
            nakamoto_coefficient_min: 7,
            governance_independence_min_pct: 60,
            min_months_stable: 12,
            zero_platform_veto_12_months: true,
            decentralization_score_min: 70,
            external_audit_passed: true,
        },
        governance: 'GGC governs, platform has emergency-only powers',
        estimated_duration_months: '18-36',
    },
    phase_3_autonomous: {
        name: 'Autonomous',
        status: 'PLANNED',
        description: 'Fully decentralized — no single entity has override power',
        entry_criteria: 'Phase 2 exit criteria met + network-wide referendum (67% validator vote)',
        exit_criteria: null,    // Terminal phase
        governance: 'Protocol-governed, human override requires 90%+ consensus',
        estimated_duration_months: 'Indefinite',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 2. DECENTRALIZATION METRICS
// ═══════════════════════════════════════════════════════════════════

const METRICS = {
    nakamoto_coefficient: {
        description: 'Minimum number of entities needed to control 51% of validation power',
        calculation: 'Sort validators by weight descending, count entities until cumulative >= 51%',
        ideal: '>= 10 (highly decentralized)',
        warning: '< 5 (concentration risk)',
        critical: '< 3 (effectively centralized)',
    },

    validator_diversity_index: {
        description: 'Shannon entropy of validator distribution across entities',
        calculation: 'H = -Σ(pi × log2(pi)) where pi = weight_share of entity i',
        max_value: 'log2(N) where N = number of independent entities',
        normalization: 'VDI = H / log2(N) × 100 (0-100 scale)',
        ideal: '>= 80 (well distributed)',
        warning: '< 60 (moderate concentration)',
        critical: '< 40 (poor distribution)',
    },

    geographic_distribution: {
        description: 'HHI (Herfindahl-Hirschman Index) of validator distribution across regions',
        calculation: 'HHI = Σ(si²) where si = share of region i',
        ideal: '< 1500 (competitive/distributed)',
        warning: '1500-2500 (moderate concentration)',
        critical: '> 2500 (high concentration)',
    },

    governance_independence_score: {
        description: 'Composite score measuring how independent governance is from platform entity',
        components: [
            { metric: 'GGC independent member %', weight: 30 },
            { metric: 'Validator community representation', weight: 20 },
            { metric: 'External audit compliance', weight: 15 },
            { metric: 'Treasury multi-sig independence', weight: 15 },
            { metric: 'Amendment process inclusivity', weight: 10 },
            { metric: 'Dispute resolution independence', weight: 10 },
        ],
        range: '0-100',
    },

    decentralization_score: {
        description: 'Composite score combining all metrics',
        formula: '(Nakamoto_norm × 25) + (VDI × 25) + ((10000-HHI)/100 × 25) + (GIS × 25)',
        range: '0-100',
        phase_thresholds: { permissioned: 30, governed: 70, autonomous: 85 },
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class DecentralizationKPIEngine {

    calculateNakamotoCoefficient(validators) {
        if (!validators || validators.length === 0) return { coefficient: 0, warning: 'No validators' };

        const sorted = [...validators].sort((a, b) => (b.weight || 1) - (a.weight || 1));
        const totalWeight = sorted.reduce((s, v) => s + (v.weight || 1), 0);
        const threshold = totalWeight * 0.51;

        let cumulative = 0;
        let count = 0;
        for (const v of sorted) {
            cumulative += (v.weight || 1);
            count++;
            if (cumulative >= threshold) break;
        }

        return {
            coefficient: count,
            total_validators: validators.length,
            status: count >= 10 ? 'EXCELLENT' : count >= 5 ? 'GOOD' : count >= 3 ? 'WARNING' : 'CRITICAL',
        };
    }

    calculateDiversityIndex(validators) {
        if (!validators || validators.length === 0) return { vdi: 0 };

        const entities = {};
        const totalWeight = validators.reduce((s, v) => s + (v.weight || 1), 0);
        validators.forEach(v => {
            const entity = v.entity || v.id;
            entities[entity] = (entities[entity] || 0) + (v.weight || 1);
        });

        const n = Object.keys(entities).length;
        if (n <= 1) return { vdi: 0, status: 'CRITICAL' };

        let entropy = 0;
        for (const weight of Object.values(entities)) {
            const p = weight / totalWeight;
            if (p > 0) entropy -= p * Math.log2(p);
        }

        const maxEntropy = Math.log2(n);
        const vdi = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

        return {
            vdi: parseFloat(vdi.toFixed(1)),
            entropy: parseFloat(entropy.toFixed(3)),
            max_entropy: parseFloat(maxEntropy.toFixed(3)),
            unique_entities: n,
            status: vdi >= 80 ? 'EXCELLENT' : vdi >= 60 ? 'GOOD' : vdi >= 40 ? 'WARNING' : 'CRITICAL',
        };
    }

    calculateGeographicHHI(validators) {
        if (!validators || validators.length === 0) return { hhi: 10000, status: 'CRITICAL' };

        const regions = {};
        validators.forEach(v => {
            const region = v.region || 'unknown';
            regions[region] = (regions[region] || 0) + 1;
        });

        const total = validators.length;
        let hhi = 0;
        const distribution = {};
        for (const [region, count] of Object.entries(regions)) {
            const share = (count / total) * 100;
            hhi += share * share;
            distribution[region] = parseFloat(share.toFixed(1));
        }

        return {
            hhi: Math.round(hhi),
            regions: Object.keys(regions).length,
            distribution,
            status: hhi < 1500 ? 'DISTRIBUTED' : hhi < 2500 ? 'MODERATE' : 'CONCENTRATED',
        };
    }

    calculateDecentralizationScore(validators) {
        const nakamoto = this.calculateNakamotoCoefficient(validators);
        const diversity = this.calculateDiversityIndex(validators);
        const geographic = this.calculateGeographicHHI(validators);

        const nakamotoNorm = Math.min(100, (nakamoto.coefficient / 10) * 100);
        const geoNorm = Math.min(100, (10000 - geographic.hhi) / 100);
        const gis = 40; // Default — would come from governance data

        const score = (nakamotoNorm * 0.25) + (diversity.vdi * 0.25) + (geoNorm * 0.25) + (gis * 0.25);

        let currentPhase = 'permissioned';
        if (score >= 85) currentPhase = 'autonomous';
        else if (score >= 70) currentPhase = 'governed';

        return {
            score: parseFloat(score.toFixed(1)),
            phase_eligible: currentPhase,
            components: { nakamoto_coefficient: nakamoto, validator_diversity: diversity, geographic_hhi: geographic, governance_independence: gis },
            thresholds: METRICS.decentralization_score.phase_thresholds,
        };
    }

    assessPhaseReadiness(validators, currentPhase) {
        const phase = PHASES[`phase_1_${currentPhase}`] || PHASES[`phase_2_${currentPhase}`] || PHASES.phase_1_permissioned;
        const exitCriteria = phase.exit_criteria;
        if (!exitCriteria) return { phase: phase.name, terminal: true, message: 'Terminal phase — no exit criteria' };

        const score = this.calculateDecentralizationScore(validators);
        const nakamoto = score.components.nakamoto_coefficient;
        const diversity = score.components.validator_diversity;
        const geographic = score.components.geographic_hhi;

        const checks = [
            { criterion: 'min_validators', required: exitCriteria.min_validators, actual: validators.length, met: validators.length >= exitCriteria.min_validators },
            { criterion: 'nakamoto_coefficient', required: exitCriteria.nakamoto_coefficient_min, actual: nakamoto.coefficient, met: nakamoto.coefficient >= exitCriteria.nakamoto_coefficient_min },
            { criterion: 'geographic_regions', required: exitCriteria.min_geographic_regions, actual: geographic.regions, met: geographic.regions >= exitCriteria.min_geographic_regions },
        ];

        const allMet = checks.every(c => c.met);

        return {
            current_phase: phase.name,
            next_phase: currentPhase === 'permissioned' ? 'Governed' : 'Autonomous',
            overall_ready: allMet,
            checks,
            decentralization_score: score.score,
            recommendation: allMet ? 'READY for phase transition — initiate governance vote' : 'NOT READY — address unmet criteria',
        };
    }

    getPhases() { return PHASES; }
    getMetrics() { return METRICS; }

    getFullKPIDashboard(validators) {
        return {
            title: 'Decentralization KPI Dashboard — IPO-Grade',
            version: '1.0',
            phases: PHASES,
            metrics: METRICS,
            current_assessment: validators ? this.calculateDecentralizationScore(validators) : null,
        };
    }
}

module.exports = new DecentralizationKPIEngine();
