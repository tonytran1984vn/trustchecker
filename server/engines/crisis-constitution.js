/**
 * TrustChecker — Crisis Constitution v1.0
 * CONSTITUTIONAL DOCUMENT: Emergency powers, chain of command, accountability
 * 
 * Defines: What happens when things go wrong.
 * Who gets power, how much, for how long, and who holds them accountable.
 * 
 * Core Principle: Emergency power is TEMPORARY, BOUNDED, and AUDITABLE.
 * No crisis justifies permanent power concentration.
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 1 — CRISIS LEVELS & ACTIVATION
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_1_LEVELS = {
    title: 'Crisis Level Definitions & Activation Authority',

    levels: {
        MONITOR: {
            description: 'Elevated awareness — anomalies detected but no impact',
            activation: 'Automatic (system-detected) or any ops team member',
            powers_granted: ['Enhanced monitoring', 'Alert notifications'],
            max_duration: null,
            auto_deactivate: false,
        },
        YELLOW: {
            description: 'Active issue — degraded performance or localized impact',
            activation: 'Ops lead or Risk officer',
            powers_granted: ['Redirect traffic', 'Activate runbooks', 'Scale resources'],
            max_duration_hours: 24,
            auto_deactivate: true,
        },
        ORANGE: {
            description: 'Serious threat — significant service impact or data at risk',
            activation: 'Admin + Risk officer (jointly)',
            powers_granted: ['Tenant-level kill-switch', 'Module isolation', 'Freeze carbon settlements', 'War room activation'],
            max_duration_hours: 12,
            auto_deactivate: true,
        },
        RED: {
            description: 'Critical emergency — platform-wide impact, data integrity threatened',
            activation: 'Dual-key: Admin + Super Admin (both required)',
            powers_granted: ['Global kill-switch', 'Halt all minting', 'Freeze all transactions', 'Emergency communication'],
            max_duration_hours: 6,
            auto_deactivate: true,
            requires_notification: ['Board', 'Legal Counsel', 'Regulatory contacts'],
        },
        BLACK: {
            description: 'Existential threat — complete compromise, regulatory emergency',
            activation: 'Triple-key: CEO + CTO + General Counsel',
            powers_granted: ['Complete platform shutdown', 'Data preservation mode', 'Regulatory notification', 'All manual overrides'],
            max_duration_hours: 4,
            auto_deactivate: true,
            requires_notification: ['Board (emergency session)', 'All regulators', 'Law enforcement (if applicable)'],
            mandatory_post_mortem: true,
        },
    },

    constitutional_limits: [
        'Crisis level cannot be used to override economic rights (Article 4 of Economic Charter)',
        'Kill-switch activation must be logged to immutable audit trail BEFORE execution',
        'All crisis actions auto-expire — no permanent emergency powers',
        'Deactivation requires formal sign-off from activating authority',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 2 — CHAIN OF COMMAND
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_2_COMMAND = {
    title: 'Crisis Chain of Command & Succession',

    command_structure: {
        crisis_commander: {
            role: 'Ultimate decision authority during crisis',
            primary: 'CTO',
            succession: ['VP Engineering', 'Senior Platform Architect', 'On-Call Lead'],
            authority: 'All technical decisions within crisis level powers',
            accountability: 'Post-crisis debrief within 48 hours',
        },
        communications_lead: {
            role: 'External & internal communications',
            primary: 'VP Communications',
            succession: ['Head of Product', 'CEO (direct)'],
            authority: 'All stakeholder messaging, regulatory notifications',
        },
        legal_advisor: {
            role: 'Legal compliance during crisis',
            primary: 'General Counsel',
            succession: ['External Legal Firm (retainer)', 'Compliance Officer'],
            authority: 'Regulatory notifications, evidence preservation, liability assessment',
        },
        technical_lead: {
            role: 'Hands-on technical response',
            primary: 'On-Call Engineer',
            succession: ['Platform Team Lead', 'Any Senior Engineer'],
            authority: 'Execute runbooks, deploy fixes, manage infrastructure',
        },
    },

    succession_rules: [
        'If primary is unreachable for 15 minutes, authority passes to first successor',
        'Successor must announce assumption of role in war room channel',
        'Primary reassumes authority upon return — they do NOT need to reclaim',
        'No individual can hold more than 2 crisis roles simultaneously',
        'Board Chair can override chain of command in BLACK-level crisis',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 3 — EMERGENCY POWERS & LIMITS
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_3_POWERS = {
    title: 'Emergency Powers Framework',

    granted_powers: {
        kill_switch: {
            scope: ['Tenant', 'Module', 'Global'],
            authorization: { tenant: '1 admin', module: '1 admin + 1 risk', global: '2 admins (dual-key)' },
            max_duration_hours: { tenant: 24, module: 12, global: 6 },
            audit: 'Every activation logged with: who, why, when, scope, hash',
        },
        data_freeze: {
            scope: 'Halt all writes to affected data partitions',
            authorization: 'Risk Officer + CTO',
            max_duration_hours: 12,
            side_effects: 'Read-only mode — all verification results cached but not persisted',
        },
        emergency_communication: {
            scope: 'Send alerts to all affected tenants',
            authorization: 'Communications Lead (no additional approval needed)',
            content_review: 'Legal must review before sending if content mentions data breach or regulatory action',
        },
        validator_suspension: {
            scope: 'Suspend specific validators suspected of compromise',
            authorization: 'Technical Lead + Risk Officer',
            max_duration_hours: 72,
            validator_rights: 'Suspended validator retains appeal right (14 days)',
        },
    },

    prohibited_during_crisis: [
        'Deploying new features (only hotfixes allowed)',
        'Changing pricing or billing for any tenant',
        'Modifying validator incentive formulas',
        'Deleting any data (preservation mode enforced)',
        'Accessing tenant encryption keys without legal authorization',
        'Making public statements without Legal review (except factual status updates)',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 4 — ACCOUNTABILITY & POST-CRISIS
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_4_ACCOUNTABILITY = {
    title: 'Accountability & Post-Crisis Requirements',

    post_crisis_obligations: {
        debrief: { deadline_hours: 48, participants: 'All crisis roles + affected team leads', format: 'Blameless retrospective' },
        post_mortem: { deadline_days: 7, template: '5-Whys + Timeline + Action Items', published_to: 'Internal + affected stakeholders' },
        root_cause_analysis: { deadline_days: 14, owner: 'Technical Lead', reviewed_by: 'Validator Council (if network-affecting)' },
        action_items: { tracking: 'All action items tracked with owner + deadline', review: 'Weekly until all closed' },
    },

    transparency_requirements: [
        'Crisis timeline published to affected tenants within 72 hours',
        'Root cause published (sanitized) within 14 days',
        'Financial impact assessment within 30 days',
        'SLA credit calculations completed within 30 days',
        'Annual crisis report published (all incidents, response times, improvements)',
    ],

    accountability_measures: {
        crisis_misuse: 'Using crisis powers for non-emergency purposes → immediate role suspension + Board review',
        delayed_deactivation: 'Failing to deactivate kill-switch after expiry → automatic deactivation + incident report',
        missing_audit: 'Any crisis action without audit trail → security investigation + mandatory retraining',
        coverup: 'Attempting to hide or minimize crisis impact → termination + potential legal action',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 5 — CRISIS DRILLS & PREPAREDNESS
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_5_DRILLS = {
    title: 'Crisis Preparedness & Drill Requirements',

    drill_schedule: {
        tabletop: { frequency: 'Monthly', participants: 'Leadership + on-call', duration_hours: 2 },
        simulation: { frequency: 'Quarterly', participants: 'Full response team', duration_hours: 4, uses_drill_mode: true },
        full_exercise: { frequency: 'Annually', participants: 'All staff + select validators', duration_hours: 8, includes: 'External communication drill' },
    },

    readiness_metrics: {
        mtta_target_minutes: { sev1: 5, sev2: 15, sev3: 30, sev4: 60 },
        mttr_target_minutes: { sev1: 60, sev2: 240, sev3: 480, sev4: 1440 },
        drill_pass_rate_pct: 90,
        succession_test: 'At least 1 drill per quarter uses succession (primary unavailable)',
    },

    playbook_requirements: [
        'Every crisis scenario must have a documented playbook',
        'Playbooks reviewed and updated quarterly',
        'New playbook required within 14 days of any novel incident',
        'Playbooks must include both technical AND communication steps',
        'All playbooks tested in at least 1 drill before being considered operational',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class CrisisConstitution {
    getConstitution() {
        return {
            title: 'Crisis Constitution — TrustChecker Platform',
            type: 'constitutional_document',
            version: '1.0',
            ratified: '2026-02-20',
            preamble: 'Emergency power is temporary, bounded, and auditable. No crisis justifies permanent power concentration.',
            articles: {
                article_1: ARTICLE_1_LEVELS,
                article_2: ARTICLE_2_COMMAND,
                article_3: ARTICLE_3_POWERS,
                article_4: ARTICLE_4_ACCOUNTABILITY,
                article_5: ARTICLE_5_DRILLS,
            },
            total_articles: 5,
            binding: true,
            jurisdiction: 'Platform-wide + Validator Network',
        };
    }

    getArticle(number) {
        const map = { 1: ARTICLE_1_LEVELS, 2: ARTICLE_2_COMMAND, 3: ARTICLE_3_POWERS, 4: ARTICLE_4_ACCOUNTABILITY, 5: ARTICLE_5_DRILLS };
        return map[number] || { error: 'Invalid article number. Valid: 1-5' };
    }

    // Validate a crisis action against constitutional limits
    validateCrisisAction(level, action, actor) {
        const levelDef = ARTICLE_1_LEVELS.levels[level];
        if (!levelDef) return { valid: false, error: `Invalid crisis level: ${level}` };

        const violations = [];
        const prohibitedActions = ARTICLE_3_POWERS.prohibited_during_crisis;

        if (prohibitedActions.some(p => action.toLowerCase().includes(p.toLowerCase().split(' ')[0]))) {
            violations.push(`Action "${action}" is prohibited during crisis`);
        }

        if (!levelDef.powers_granted.some(p => action.toLowerCase().includes(p.toLowerCase().split(' ')[0]))) {
            violations.push(`Action "${action}" not in granted powers for ${level} level`);
        }

        return {
            level,
            action,
            actor,
            valid: violations.length === 0,
            violations,
            max_duration_hours: levelDef.max_duration_hours || null,
            auto_deactivate: levelDef.auto_deactivate || false,
            requires_notification: levelDef.requires_notification || [],
        };
    }

    getDrillSchedule() { return ARTICLE_5_DRILLS.drill_schedule; }
    getCommandStructure() { return ARTICLE_2_COMMAND.command_structure; }
}

module.exports = new CrisisConstitution();
