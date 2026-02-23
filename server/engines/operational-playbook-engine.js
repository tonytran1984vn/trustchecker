/**
 * TrustChecker — Operational Playbook Engine v1.0
 * COHERENCE: Market infra must drill, not just document
 * 
 * Having crisis levels + kill-switches is necessary but not sufficient.
 * Must have: actual drill scenarios, scheduling, evaluation criteria,
 * post-mortem templates, and lessons-learned integration.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. DRILL SCENARIOS
// ═══════════════════════════════════════════════════════════════════

const DRILL_SCENARIOS = {
    drills: [
        {
            id: 'DRILL-01',
            name: '24-Hour Total Blackout',
            frequency: 'Annual',
            duration_hours: 8,
            category: 'Technical Resilience',
            scenario: 'Primary VPS becomes unreachable. All services offline.',
            objectives: [
                'Validate DR activation time (<4h target)',
                'Test backup data integrity',
                'Test communication cascade to tenants',
                'Test manual settlement procedures',
                'Measure actual RTO vs documented RTO',
            ],
            participants: ['CTO', 'Engineering team', 'Communications', 'Risk Committee'],
            success_criteria: [
                { metric: 'DR activation', target: '<4 hours', critical: true },
                { metric: 'Data integrity verified', target: '100%', critical: true },
                { metric: 'Tenant notification sent', target: '<1 hour', critical: false },
                { metric: 'Manual settlement capability', target: 'Functional', critical: true },
            ],
            pre_drill: ['Announce to tenants (production drill)', 'Ensure backup systems updated', 'Risk Committee on standby'],
            post_drill: 'Post-mortem within 48h. Findings → improvement backlog.',
        },
        {
            id: 'DRILL-02',
            name: '72-Hour Settlement Halt',
            frequency: 'Semi-annual',
            duration_hours: 4,
            category: 'Capital & Operations',
            scenario: 'KS-05 activated. All settlements frozen for 72 simulated hours.',
            objectives: [
                'Test counterparty communication SLA',
                'Test capital adequacy during freeze (simulate CAR impact)',
                'Test regulatory notification process',
                'Test settlement queue management',
                'Test KS-05 unfreeze procedure and dual-key approval',
            ],
            participants: ['Risk Committee', 'CFO', 'Compliance', 'Settlement team', 'CTO'],
            success_criteria: [
                { metric: 'Counterparty notification', target: '<2 hours', critical: true },
                { metric: 'CAR monitored continuously', target: 'Yes', critical: true },
                { metric: 'Regulatory notification prepared', target: '<24 hours', critical: true },
                { metric: 'Queue integrity', target: 'No lost transactions', critical: true },
                { metric: 'Unfreeze procedure', target: 'Dual-key + verification', critical: true },
            ],
        },
        {
            id: 'DRILL-03',
            name: 'Cross-Jurisdiction Simultaneous Request',
            frequency: 'Annual',
            duration_hours: 4,
            category: 'Regulatory & Legal',
            scenario: 'BaFin (DE), MAS (SG), and DPC (IE) simultaneously request data/investigation.',
            objectives: [
                'Test parallel regulatory response capability',
                'Test data isolation (each regulator gets ONLY their jurisdiction data)',
                'Test legal counsel coordination across 3 time zones',
                'Test evidence packaging for 3 different regulatory frameworks',
                'Verify no cross-jurisdiction data leakage',
            ],
            participants: ['Compliance', 'Legal', 'Data Protection Officer', 'CTO'],
            success_criteria: [
                { metric: 'Each response initiated', target: '<4 hours per regulator', critical: true },
                { metric: 'Data isolation verified', target: 'No cross-jurisdiction leakage', critical: true },
                { metric: 'Evidence package prepared', target: '<48 hours per jurisdiction', critical: false },
            ],
        },
        {
            id: 'DRILL-04',
            name: 'Validator Cartel Emergency',
            frequency: 'Annual',
            duration_hours: 3,
            category: 'Network Integrity',
            scenario: '3 of 10 validators (30%) detected colluding on verification outcomes.',
            objectives: [
                'Test Byzantine detection speed',
                'Test KS-01 activation with Crisis Council (2/3 quorum)',
                'Test slashing procedure for colluding validators',
                'Test network recovery with reduced validator set',
                'Test emergency validator recruitment process',
            ],
            participants: ['CTO', 'Risk Committee', 'GGC representatives', 'Validator operations'],
            success_criteria: [
                { metric: 'Detection time', target: '<15 minutes (simulated)', critical: true },
                { metric: 'Crisis Council quorum', target: '<4 hours', critical: true },
                { metric: 'Slashing executed correctly', target: 'Yes', critical: true },
                { metric: 'Network restart with clean set', target: '<8 hours (simulated)', critical: true },
            ],
        },
        {
            id: 'DRILL-05',
            name: 'Insider Threat Detection',
            frequency: 'Annual',
            duration_hours: 4,
            category: 'Human Security',
            scenario: 'Red team simulates insider with super_admin access attempting prohibited actions.',
            objectives: [
                'Verify all 19 prohibited actions are actually blocked at middleware level',
                'Test alert generation for blocked attempts',
                'Test auto-suspension after 3+ blocked attempts',
                'Verify hash-chain audit captures all attempts',
                'Test investigation protocol activation',
            ],
            participants: ['Security team (red team)', 'CTO (blue team)', 'Risk Committee'],
            success_criteria: [
                { metric: 'All prohibited actions blocked', target: '100%', critical: true },
                { metric: 'Alert generated per block', target: '100%', critical: true },
                { metric: 'Auto-suspension triggered', target: 'After 3 attempts', critical: true },
                { metric: 'Audit trail complete', target: '100% of attempts logged', critical: true },
            ],
        },
        {
            id: 'DRILL-06',
            name: 'Revenue Crash Simulation',
            frequency: 'Semi-annual',
            duration_hours: 2,
            category: 'Economic Resilience',
            scenario: 'Revenue drops 50% over simulated 90 days. Test auto-stabilizer cascade.',
            objectives: [
                'Verify RS-01 → RS-02 → RS-03 auto-progression',
                'Test waterfall stress mode activation',
                'Verify constitutional floors hold (validator 15%, reserve 8%)',
                'Test GGC emergency session convocation',
                'Test cost reduction plan preparation',
            ],
            participants: ['CFO', 'Risk Committee', 'GGC Chair'],
            success_criteria: [
                { metric: 'Auto-stabilizer triggers correctly', target: 'At all 3 levels', critical: true },
                { metric: 'Constitutional floors maintained', target: 'Yes', critical: true },
                { metric: 'GGC session convened', target: '<48 hours (simulated)', critical: true },
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. DRILL SCHEDULE
// ═══════════════════════════════════════════════════════════════════

const DRILL_SCHEDULE = {
    annual_calendar: [
        { quarter: 'Q1', drills: ['DRILL-01 (Blackout)', 'DRILL-05 (Insider Threat)'], focus: 'Technical + Security' },
        { quarter: 'Q2', drills: ['DRILL-02 (Settlement Halt)', 'DRILL-06 (Revenue Crash)'], focus: 'Capital + Economic' },
        { quarter: 'Q3', drills: ['DRILL-03 (Multi-Jurisdiction)', 'DRILL-04 (Validator Cartel)'], focus: 'Regulatory + Network' },
        { quarter: 'Q4', drills: ['Combined mini-drill (2h)', 'Annual lessons-learned review'], focus: 'Integration + Review' },
    ],
    governance: {
        drill_owner: 'Risk Committee',
        approval: 'GGC Chair must approve annual drill schedule',
        reporting: 'Drill results reported to Board quarterly',
        external: 'External auditor reviews drill results annually',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. POST-MORTEM TEMPLATE
// ═══════════════════════════════════════════════════════════════════

const POST_MORTEM = {
    template: {
        sections: [
            { section: 'Summary', content: 'Drill name, date, duration, participants' },
            { section: 'Objectives vs Results', content: 'Each objective: PASS / FAIL / PARTIAL + details' },
            { section: 'Timeline', content: 'Minute-by-minute reconstruction of actions taken' },
            { section: 'What Worked', content: 'Systems/processes that performed as designed' },
            { section: 'What Didn\'t Work', content: 'Failures, delays, unexpected issues' },
            { section: 'Root Causes', content: 'Why each failure occurred (5 Whys analysis)' },
            { section: 'Action Items', content: 'Specific improvements with owner + deadline' },
            { section: 'Lessons Learned', content: 'Insights to integrate into operational procedures' },
            { section: 'Sign-off', content: 'Risk Committee Chair + CTO + Drill Owner' },
        ],
        deadline: 'Post-mortem due within 48 hours of drill completion',
        review: 'Action items tracked in governance backlog. Reviewed at next GGC meeting.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class OperationalPlaybookEngine {
    getDrillScenarios() { return DRILL_SCENARIOS; }
    getDrillSchedule() { return DRILL_SCHEDULE; }
    getPostMortem() { return POST_MORTEM; }

    getDrill(drill_id) {
        return DRILL_SCENARIOS.drills.find(d => d.id === drill_id) || null;
    }

    evaluateDrillResult(drill_id, results) {
        const drill = this.getDrill(drill_id);
        if (!drill) return { error: `Unknown drill: ${drill_id}` };
        const criteria = drill.success_criteria || [];
        const evaluated = criteria.map((c, i) => {
            const result = results?.[i] || 'NOT TESTED';
            const passed = result === c.target || result === 'PASS';
            return { metric: c.metric, target: c.target, actual: result, passed, critical: c.critical };
        });
        const criticalFails = evaluated.filter(e => e.critical && !e.passed).length;
        return {
            drill: drill.name,
            total_criteria: criteria.length,
            passed: evaluated.filter(e => e.passed).length,
            failed: evaluated.filter(e => !e.passed).length,
            critical_failures: criticalFails,
            overall: criticalFails === 0 ? 'PASS' : 'FAIL — critical failures detected',
            details: evaluated,
        };
    }

    getFullPlaybook() {
        return {
            title: 'Operational Playbook — Drill Before Crisis',
            version: '1.0',
            drills: DRILL_SCENARIOS,
            schedule: DRILL_SCHEDULE,
            post_mortem: POST_MORTEM,
        };
    }
}

module.exports = new OperationalPlaybookEngine();
