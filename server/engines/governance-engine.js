/**
 * TrustChecker — Governance Engine
 * DAO Advisory, External Auditor, Multi-Sig Minting, Governance Upgrade
 */
const crypto = require('crypto');

const GOVERNANCE_ROLES = {
    dao_council: { name: 'DAO Advisory Council', authority: 'policy', voting_weight: 1, description: 'Platform-level policy decisions' },
    external_auditor: { name: 'External Auditor Node', authority: 'audit', voting_weight: 2, description: 'Independent verification of credits and compliance' },
    platform_admin: { name: 'Platform Administrator', authority: 'operations', voting_weight: 1, description: 'Day-to-day platform governance' },
    compliance_officer: { name: 'Compliance Officer', authority: 'regulatory', voting_weight: 1, description: 'Regulatory alignment enforcement' },
    tenant_representative: { name: 'Tenant Representative', authority: 'stakeholder', voting_weight: 1, description: 'Tenant interest representation' }
};

const PROPOSAL_TYPES = {
    policy_change: { name: 'Policy Change', quorum: 3, approval_threshold: 0.67, sod_eyes: 6, cooldown_hours: 48 },
    credit_mint_batch: { name: 'Batch Credit Minting', quorum: 2, approval_threshold: 0.50, sod_eyes: 4, cooldown_hours: 24 },
    baseline_update: { name: 'Baseline Factor Update', quorum: 3, approval_threshold: 0.67, sod_eyes: 6, cooldown_hours: 72 },
    auditor_appointment: { name: 'External Auditor Appointment', quorum: 4, approval_threshold: 0.75, sod_eyes: 8, cooldown_hours: 168 },
    emergency_halt: { name: 'Emergency Platform Halt', quorum: 2, approval_threshold: 0.50, sod_eyes: 4, cooldown_hours: 0 },
    registry_bridge: { name: 'Cross-Registry Bridge', quorum: 3, approval_threshold: 0.67, sod_eyes: 6, cooldown_hours: 120 }
};

class GovernanceEngine {

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
            title, description, proposed_by,
            status: 'open',
            voting: {
                quorum_required: proposalType.quorum,
                approval_threshold: proposalType.approval_threshold,
                votes: [], votes_for: 0, votes_against: 0,
                sod_eyes_required: proposalType.sod_eyes
            },
            evidence, affected_entities,
            timeline: { created_at: created.toISOString(), cooldown_until: cooldownEnd.toISOString(), expires_at: new Date(created.getTime() + 30 * 86400000).toISOString() },
            hash: crypto.createHash('sha256').update(JSON.stringify({ proposalId, type, title, proposed_by, created: created.toISOString() })).digest('hex')
        };
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
            voter_id, role, authority: governanceRole.authority,
            vote, // 'approve' | 'reject' | 'abstain'
            weight: governanceRole.voting_weight,
            reason, voted_at: new Date().toISOString()
        };

        const updatedVotes = [...proposal.voting.votes, voteRecord];
        const votesFor = updatedVotes.filter(v => v.vote === 'approve').reduce((s, v) => s + v.weight, 0);
        const votesAgainst = updatedVotes.filter(v => v.vote === 'reject').reduce((s, v) => s + v.weight, 0);
        const totalVoters = updatedVotes.filter(v => v.vote !== 'abstain').length;

        let newStatus = 'open';
        if (totalVoters >= proposal.type.quorum_required) {
            const approvalRate = votesFor / (votesFor + votesAgainst || 1);
            if (approvalRate >= proposal.type.approval_threshold) newStatus = 'approved';
            else if (votesAgainst > votesFor) newStatus = 'rejected';
        }

        return {
            proposal_id: proposal.proposal_id,
            status: newStatus,
            voting: { ...proposal.voting, votes: updatedVotes, votes_for: votesFor, votes_against: votesAgainst },
            quorum_met: totalVoters >= proposal.type.quorum_required,
            latest_vote: voteRecord
        };
    }

    /**
     * Multi-sig verification for critical actions
     */
    verifyMultiSig(signatures = [], requiredSigners = 3) {
        const uniqueSigners = new Set(signatures.map(s => s.signer_id));
        const verified = signatures.map(s => ({
            signer_id: s.signer_id, role: s.role,
            hash_valid: s.signature && s.signature.length === 64,
            signed_at: s.signed_at
        }));

        return {
            title: 'Multi-Signature Verification',
            required: requiredSigners, provided: uniqueSigners.size,
            passed: uniqueSigners.size >= requiredSigners,
            signatures: verified,
            all_valid: verified.every(v => v.hash_valid),
            verified_at: new Date().toISOString()
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
                expired: proposals.filter(p => p.status === 'expired').length
            },
            roles: GOVERNANCE_ROLES,
            proposal_types: PROPOSAL_TYPES,
            recent_proposals: proposals.slice(-10).reverse(),
            governance_model: 'DAO-style Advisory Council with External Auditor Nodes',
            generated_at: new Date().toISOString()
        };
    }

    getRoles() { return GOVERNANCE_ROLES; }
    getProposalTypes() { return PROPOSAL_TYPES; }
}

module.exports = new GovernanceEngine();
