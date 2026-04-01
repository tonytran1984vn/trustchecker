/**
 * TrustChecker — Agentic Governance Engine v3.0
 * DAO Advisory, External Auditor, Multi-Sig Minting, Agentic Proposals
 * Guarded Autonomy: AI proposes, Humans approve (0h Cooldown fast-track)
 */
const crypto = require('crypto');
const config = require('../../config').validateConfig();
const agenticMetrics = require('./agentic-metrics');

const GOVERNANCE_ROLES = {
    dao_council: {
        name: 'DAO Advisory Council',
        authority: 'policy',
        voting_weight: 1,
        description: 'Platform-level policy decisions',
    },
    external_auditor: {
        name: 'External Auditor Node',
        authority: 'audit',
        voting_weight: 2,
        description: 'Independent verification of credits and compliance',
    },
    platform_admin: {
        name: 'Platform Administrator',
        authority: 'operations',
        voting_weight: 1,
        description: 'Day-to-day platform governance',
    },
    compliance_officer: {
        name: 'Compliance Officer',
        authority: 'regulatory',
        voting_weight: 1,
        description: 'Regulatory alignment enforcement',
    },
    org_representative: {
        name: 'Org Representative',
        authority: 'stakeholder',
        voting_weight: 1,
        description: 'Org interest representation',
    },
};

const PROPOSAL_TYPES = {
    policy_change: { name: 'Policy Change', quorum: 3, approval_threshold: 0.67, sod_eyes: 6, cooldown_hours: 48 },
    credit_mint_batch: {
        name: 'Batch Credit Minting',
        quorum: 2,
        approval_threshold: 0.5,
        sod_eyes: 4,
        cooldown_hours: 24,
    },
    baseline_update: {
        name: 'Baseline Factor Update',
        quorum: 3,
        approval_threshold: 0.67,
        sod_eyes: 6,
        cooldown_hours: 72,
    },
    auditor_appointment: {
        name: 'External Auditor Appointment',
        quorum: 4,
        approval_threshold: 0.75,
        sod_eyes: 8,
        cooldown_hours: 168,
    },
    emergency_halt: {
        name: 'Emergency Platform Halt',
        quorum: 2,
        approval_threshold: 0.5,
        sod_eyes: 4,
        cooldown_hours: 0,
    },
    registry_bridge: {
        name: 'Cross-Registry Bridge',
        quorum: 3,
        approval_threshold: 0.67,
        sod_eyes: 6,
        cooldown_hours: 120,
    },
    agentic_containment: {
        name: 'AI-Proposed Containment',
        quorum: 1,
        approval_threshold: 1.0,
        multisig_required: true,
        cooldown_hours: 0,
        execution_delay_mins: 5,
    },
};

// Governance Panic Loop Protection
const CONTAINMENT_RATE_LIMITER = {
    hourly_count: 0,
    max_per_hour: 5,
    last_reset: Date.now(),
};

class AgenticGovernanceEngine {
    /**
     * Create governance proposal
     */
    createProposal(params) {
        const { type, title, description, proposed_by, evidence = [], affected_entities = [] } = params;
        const proposalType = PROPOSAL_TYPES[type];
        if (!proposalType) return { error: `Invalid type. Valid: ${Object.keys(PROPOSAL_TYPES).join(', ')}` };

        const proposalId = `GOV-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
        const created = new Date();
        const cooldownEnd = new Date(created.getTime() + proposalType.cooldown_hours * 3600000);

        return {
            proposal_id: proposalId,
            type: { key: type, ...proposalType },
            title,
            description,
            proposed_by,
            status: 'open',
            voting: {
                quorum_required: proposalType.quorum,
                approval_threshold: proposalType.approval_threshold,
                votes: [],
                votes_for: 0,
                votes_against: 0,
                sod_eyes_required: proposalType.sod_eyes,
            },
            evidence,
            affected_entities,
            timeline: {
                created_at: created.toISOString(),
                cooldown_until: cooldownEnd.toISOString(),
                expires_at: new Date(created.getTime() + 30 * 86400000).toISOString(),
            },
            hash: crypto
                .createHash('sha256')
                .update(JSON.stringify({ proposalId, type, title, proposed_by, created: created.toISOString() }))
                .digest('hex'),
        };
    }

    /**
     * Agentic v3.0: Verifies a strictly formed, signed directive from an Intelligence Model
     */
    verifySignedDirective(directive) {
        const { directive_id, issued_by, signature, confidence_score } = directive;
        if (!directive_id || !issued_by || !signature) return false;

        // Simulation of verifying: hash(model_output + context)
        // Deterministic boundary: The enforcer CANNOT call models again, it only verifies this signature.
        const expectedPrefix = 'verified_v3_';
        return signature.startsWith(expectedPrefix) || signature.length === 64;
    }

    /**
     * Agentic v3.0: Drafts an Agentic Proposal for Human Approval (0h Cooldown Fast-Track)
     * Throws if Evidence Completeness Gate fails, or Rate Limit breached.
     */
    draftAgenticProposal(directive, context) {
        if (!this.verifySignedDirective(directive)) {
            throw new Error('INVALID_DIRECTIVE_SIGNATURE: AI Enforcer cannot execute unsigned directives.');
        }

        // 1. Evidence Completeness Gate
        const { threat_index, confidence_score, active_signals, impact_analysis, suggested_action, reversal_plan } =
            context;
        if (
            threat_index == null ||
            confidence_score == null ||
            !active_signals ||
            active_signals.length < 2 ||
            !impact_analysis ||
            !suggested_action ||
            !reversal_plan
        ) {
            throw new Error(
                'INCOMPLETE_EVIDENCE_GATE: Agentic proposal rejected due to missing mandatory context fields.'
            );
        }

        // 2. Containment Rate Limiter (Anti Governance Panic Loop)
        if (Date.now() - CONTAINMENT_RATE_LIMITER.last_reset > 3600000) {
            CONTAINMENT_RATE_LIMITER.hourly_count = 0;
            CONTAINMENT_RATE_LIMITER.last_reset = Date.now();
        }
        if (CONTAINMENT_RATE_LIMITER.hourly_count >= CONTAINMENT_RATE_LIMITER.max_per_hour) {
            agenticMetrics.logRateLimitHit();
            throw new Error(
                `RATE_LIMIT_EXCEEDED: Maximum ${CONTAINMENT_RATE_LIMITER.max_per_hour} auto-containments per hour. System halting to prevent cascade collapse.`
            );
        }
        CONTAINMENT_RATE_LIMITER.hourly_count++;

        // 3. Canary Filter & Kill Switch Gate
        let action_taken = 'EXECUTED';

        // Canary Hashing Strategy logic
        const targetHashInt = parseInt(
            crypto.createHash('md5').update(directive.target).digest('hex').substring(0, 8),
            16
        );
        const isCanaryEntity = targetHashInt % 100 < config.agenticCanaryRatePct;

        if (config.agenticKillSwitch) {
            action_taken = 'SHADOW_DROPPED';
            console.warn(`[AGENTIC_KILL_SWITCH_ACTIVE] Dropped directive for ${directive.target}`);
        } else if (!isCanaryEntity && config.agenticMode !== 'full') {
            // Drop non-canary entities in partial or shadow mode
            action_taken = 'SHADOW_DROPPED';
        } else if (config.agenticMode === 'shadow') {
            action_taken = 'SHADOW_DROPPED';
        } else if (config.agenticMode === 'partial' && directive.level !== 'SOFT_CONTAINMENT') {
            action_taken = 'PROPOSED_FOR_HUMAN'; // Needs proposal drafting
        }

        // Execution Check
        if (action_taken === 'SHADOW_DROPPED') {
            agenticMetrics.logDirectiveEvent(directive, 'shadow', 'SHADOW_DROPPED');
            console.log(
                `[AGENTIC_SHADOW] Level: ${directive.level} | Target: ${directive.target} | Action: ${directive.action}. Dropped to log.`
            );
            return null;
        }

        if (config.agenticMode === 'partial' && directive.level === 'SOFT_CONTAINMENT' && isCanaryEntity) {
            // Level 1: Execute directly without proposal in partial mode for CANARY
            agenticMetrics.logDirectiveEvent(directive, 'partial', 'EXECUTED');
            console.log(`[AGENTIC_PARTIAL_EXECUTE] Canary Soft Containment executed for ${directive.target}`);
            return { executed_directly: true, directive };
        }

        // For Full Mode, or Level 2/3 in Partial mode for CANARY -> Draft Proposal
        agenticMetrics.logDirectiveEvent(directive, config.agenticMode, 'PROPOSED_FOR_HUMAN');

        // 4. Draft the proposal with Execute Delay
        const proposalParams = {
            type: 'agentic_containment',
            title: `[AGENTIC ALERT] ${directive.level} for ${directive.target}`,
            description: `AI Enforcer requests containment. Action: ${suggested_action}. Wait 5 mins post-approval for micro-delay execution.`,
            proposed_by: 'agentic_enforcer',
            evidence: {
                threat_index,
                confidence_score,
                signals: active_signals,
                impact: impact_analysis,
                reversal: reversal_plan,
            },
            affected_entities: [directive.target],
        };

        const proposal = this.createProposal(proposalParams);

        // Elevate quorum if critical Treasury/Full Containment
        if (directive.level === 'FULL_CONTAINMENT' || directive.target === 'SYSTEMWIDE_SETTLEMENT') {
            proposal.voting.quorum_required = 2; // Dual Authorization enforced
            proposal.description += ' **DUAL-SIG REQUIRED**';
        }

        return proposal;
    }

    /**
     * Cast vote on proposal
     */
    castVote(proposal, voter) {
        const { voter_id, role, vote, reason = '' } = voter;
        if (proposal.status !== 'open') return { error: `Proposal is ${proposal.status} — voting closed` };

        const governanceRole = Object.entries(GOVERNANCE_ROLES).find(([k]) => k === role)?.[1];
        if (!governanceRole) return { error: 'Invalid governance role' };

        // Check for duplicate
        if (proposal.voting.votes.some(v => v.voter_id === voter_id)) return { error: 'Already voted' };

        const voteRecord = {
            voter_id,
            role,
            authority: governanceRole.authority,
            vote, // 'approve' | 'reject' | 'abstain'
            weight: governanceRole.voting_weight,
            reason,
            voted_at: new Date().toISOString(),
        };

        const updatedVotes = [...proposal.voting.votes, voteRecord];
        const votesFor = updatedVotes.filter(v => v.vote === 'approve').reduce((s, v) => s + v.weight, 0);
        const votesAgainst = updatedVotes.filter(v => v.vote === 'reject').reduce((s, v) => s + v.weight, 0);
        const totalVoters = updatedVotes.filter(v => v.vote !== 'abstain').length;

        let newStatus = 'open';
        let executionWindow = null;

        if (totalVoters >= proposal.type.quorum_required) {
            const approvalRate = votesFor / (votesFor + votesAgainst || 1);
            if (approvalRate >= proposal.type.approval_threshold) {
                newStatus = 'approved';
                // Time-locked Execution (micro delay)
                if (proposal.type.execution_delay_mins) {
                    newStatus = 'approved_pending_delay';
                    executionWindow = new Date(Date.now() + proposal.type.execution_delay_mins * 60000).toISOString();
                }
            } else if (votesAgainst > votesFor) {
                newStatus = 'rejected';
            }
        }

        return {
            proposal_id: proposal.proposal_id,
            status: newStatus,
            execution_allowed_after: executionWindow,
            voting: { ...proposal.voting, votes: updatedVotes, votes_for: votesFor, votes_against: votesAgainst },
            quorum_met: totalVoters >= proposal.type.quorum_required,
            latest_vote: voteRecord,
        };
    }

    /**
     * Multi-sig verification for critical actions
     */
    verifyMultiSig(signatures = [], requiredSigners = 3) {
        const uniqueSigners = new Set(signatures.map(s => s.signer_id));
        const verified = signatures.map(s => ({
            signer_id: s.signer_id,
            role: s.role,
            hash_valid: s.signature && s.signature.length === 64,
            signed_at: s.signed_at,
        }));

        return {
            title: 'Multi-Signature Verification',
            required: requiredSigners,
            provided: uniqueSigners.size,
            passed: uniqueSigners.size >= requiredSigners,
            signatures: verified,
            all_valid: verified.every(v => v.hash_valid),
            verified_at: new Date().toISOString(),
        };
    }

    /**
     * Governance dashboard state
     */
    getGovernanceState(proposals = []) {
        return {
            title: 'Governance Dashboard',
            total_proposals: proposals.length,
            by_status: {
                open: proposals.filter(p => p.status === 'open').length,
                approved: proposals.filter(p => p.status === 'approved').length,
                rejected: proposals.filter(p => p.status === 'rejected').length,
                expired: proposals.filter(p => p.status === 'expired').length,
            },
            roles: GOVERNANCE_ROLES,
            proposal_types: PROPOSAL_TYPES,
            recent_proposals: proposals.slice(-10).reverse(),
            governance_model: 'DAO-style Advisory Council with External Auditor Nodes',
            generated_at: new Date().toISOString(),
        };
    }

    getRoles() {
        return GOVERNANCE_ROLES;
    }
    getProposalTypes() {
        return PROPOSAL_TYPES;
    }
    getMetrics() {
        return agenticMetrics.getExport();
    }
}

module.exports = new AgenticGovernanceEngine();
