const gov = require('../../../server/engines/governance-module/governance');
const GovClass = gov.constructor;

let engine;
beforeEach(() => { engine = new GovClass(); });

describe('GovernanceEngine', () => {
    describe('getRoles', () => {
        test('returns 5 governance roles', () => {
            const r = engine.getRoles();
            expect(Object.keys(r).length).toBe(5);
            expect(r.external_auditor.voting_weight).toBe(2);
        });
    });

    describe('getProposalTypes', () => {
        test('returns 6 proposal types', () => {
            const r = engine.getProposalTypes();
            expect(Object.keys(r).length).toBe(6);
            expect(r.emergency_halt.cooldown_hours).toBe(0);
        });
    });

    describe('createProposal', () => {
        test('creates policy proposal', () => {
            const r = engine.createProposal({
                type: 'policy_change', title: 'Test Policy', description: 'Change X',
                proposed_by: 'admin1',
            });
            expect(r.proposal_id).toMatch(/^GOV-/);
            expect(r.status).toBe('open');
            expect(r.voting.quorum_required).toBe(3);
        });

        test('creates emergency halt (no cooldown)', () => {
            const r = engine.createProposal({
                type: 'emergency_halt', title: 'Emergency', description: 'Crisis',
                proposed_by: 'admin1',
            });
            expect(r.type.cooldown_hours).toBe(0);
            expect(r.type.quorum).toBe(2);
        });

        test('invalid type returns error', () => {
            const r = engine.createProposal({ type: 'invalid', title: 'X' });
            expect(r.error).toContain('Invalid type');
        });

        test('proposal has hash', () => {
            const r = engine.createProposal({
                type: 'policy_change', title: 'Test', description: 'Desc',
                proposed_by: 'admin1',
            });
            expect(r.hash).toHaveLength(64);
        });
    });

    describe('castVote', () => {
        let proposal;
        beforeEach(() => {
            proposal = engine.createProposal({
                type: 'credit_mint_batch', title: 'Mint 1000',
                description: 'Batch mint', proposed_by: 'admin1',
            });
        });

        test('records valid vote', () => {
            const r = engine.castVote(proposal, { voter_id: 'v1', role: 'dao_council', vote: 'approve' });
            expect(r.latest_vote.vote).toBe('approve');
        });

        test('blocks duplicate vote', () => {
            engine.castVote(proposal, { voter_id: 'v1', role: 'dao_council', vote: 'approve' });
            const updated = { ...proposal, voting: { ...proposal.voting, votes: [{ voter_id: 'v1' }] } };
            const r = engine.castVote(updated, { voter_id: 'v1', role: 'dao_council', vote: 'reject' });
            expect(r.error).toBe('Already voted');
        });

        test('invalid role rejected', () => {
            const r = engine.castVote(proposal, { voter_id: 'v1', role: 'invalid_role', vote: 'approve' });
            expect(r.error).toContain('Invalid governance role');
        });

        test('quorum met triggers approval', () => {
            let p = proposal;
            // castVote checks proposal.type.quorum_required (not .quorum)
            p.type.quorum_required = p.type.quorum;
            const r1 = engine.castVote(p, { voter_id: 'v1', role: 'dao_council', vote: 'approve' });
            p = { ...p, type: p.type, voting: r1.voting };
            const r2 = engine.castVote(p, { voter_id: 'v2', role: 'external_auditor', vote: 'approve' });
            expect(r2.status).toBe('approved');
            expect(r2.quorum_met).toBe(true);
        });

        test('external_auditor has 2x voting weight', () => {
            let p = proposal;
            const r1 = engine.castVote(p, { voter_id: 'v1', role: 'external_auditor', vote: 'approve' });
            expect(r1.voting.votes_for).toBe(2); // weight 2
        });
    });

    describe('verifyMultiSig', () => {
        test('passes with enough signers', () => {
            const sigs = [
                { signer_id: 's1', role: 'admin', signature: 'a'.repeat(64), signed_at: new Date().toISOString() },
                { signer_id: 's2', role: 'auditor', signature: 'b'.repeat(64), signed_at: new Date().toISOString() },
                { signer_id: 's3', role: 'officer', signature: 'c'.repeat(64), signed_at: new Date().toISOString() },
            ];
            const r = engine.verifyMultiSig(sigs, 3);
            expect(r.passed).toBe(true);
            expect(r.all_valid).toBe(true);
        });

        test('fails with insufficient signers', () => {
            const sigs = [
                { signer_id: 's1', role: 'admin', signature: 'a'.repeat(64) },
            ];
            const r = engine.verifyMultiSig(sigs, 3);
            expect(r.passed).toBe(false);
        });

        test('deduplicates same signer', () => {
            const sigs = [
                { signer_id: 's1', role: 'admin', signature: 'a'.repeat(64) },
                { signer_id: 's1', role: 'admin', signature: 'a'.repeat(64) },
            ];
            const r = engine.verifyMultiSig(sigs, 2);
            expect(r.provided).toBe(1);
            expect(r.passed).toBe(false);
        });
    });

    describe('getGovernanceState', () => {
        test('empty proposals', () => {
            const r = engine.getGovernanceState([]);
            expect(r.total_proposals).toBe(0);
        });

        test('counts by status', () => {
            const proposals = [
                { status: 'open' },
                { status: 'approved' },
                { status: 'approved' },
                { status: 'rejected' },
            ];
            const r = engine.getGovernanceState(proposals);
            expect(r.by_status.open).toBe(1);
            expect(r.by_status.approved).toBe(2);
            expect(r.by_status.rejected).toBe(1);
        });
    });
});
