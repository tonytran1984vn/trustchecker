/**
 * TrustChecker — Risk Model Governance (L3→L4 Hardening)
 * Model versioning, drift detection, weight lock, change approval workflow
 * 
 * This is NOT a new feature — it hardens the existing Risk Engine
 * so that risk weights cannot be changed without auditable approval.
 */
const crypto = require('crypto');

class RiskModelGovernance {
    constructor() {
        // Active model version (immutable once deployed)
        this._versions = [];
        this._activeVersion = null;
        this._pendingChanges = [];
        this._scoreHistory = []; // for drift detection
        this._overrideLog = []; // immutable append-only
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODEL VERSIONING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Register a model version — weights are frozen once deployed
     */
    registerVersion(params) {
        const { weights, description, registered_by, approved_by } = params;
        if (!weights || typeof weights !== 'object') return { error: 'Weights object required' };
        if (!approved_by) return { error: 'approved_by required — weight changes need Compliance approval' };
        if (registered_by === approved_by) return { error: 'Registerer and approver must be different (SoD enforcement)' };

        const version = {
            version_id: `RM-${this._versions.length + 1}.0`,
            weights: Object.freeze({ ...weights }), // immutable
            hash: crypto.createHash('sha256').update(JSON.stringify(weights)).digest('hex'),
            registered_by,
            approved_by,
            status: 'deployed',
            created_at: new Date().toISOString(),
            frozen: true
        };

        // Deactivate previous
        if (this._activeVersion) {
            this._activeVersion.status = 'archived';
        }

        this._versions.push(version);
        this._activeVersion = version;

        return {
            message: 'Model version deployed',
            version: version.version_id,
            hash: version.hash,
            weights_frozen: true,
            weight_count: Object.keys(weights).length,
            sod_verified: registered_by !== approved_by,
            deployed_at: version.created_at
        };
    }

    /**
     * Get active model version
     */
    getActiveVersion() {
        if (!this._activeVersion) {
            // Bootstrap with default weights — still requires future governance
            return {
                version_id: 'RM-0.1-BOOTSTRAP',
                weights: {
                    route_gaming: 0.25, carbon_gaming: 0.20, phantom_network: 0.20,
                    velocity_anomaly: 0.15, device_cluster: 0.10, temporal_anomaly: 0.10
                },
                status: 'bootstrap',
                warning: 'Bootstrap weights — not yet governance-approved. Register a versioned model.'
            };
        }
        return this._activeVersion;
    }

    /**
     * Get version history
     */
    getVersionHistory() {
        return {
            title: 'Risk Model Version History',
            total: this._versions.length,
            active: this._activeVersion?.version_id || 'RM-0.1-BOOTSTRAP',
            versions: this._versions.map(v => ({
                version_id: v.version_id, hash: v.hash.slice(0, 16) + '…',
                status: v.status, registered_by: v.registered_by,
                approved_by: v.approved_by, created_at: v.created_at
            }))
        };
    }

    /**
     * Rollback to a previous version — requires dual approval
     */
    rollback(targetVersionId, requestedBy, approvedBy) {
        if (requestedBy === approvedBy) return { error: 'Rollback requires dual approval (SoD)' };

        const target = this._versions.find(v => v.version_id === targetVersionId);
        if (!target) return { error: `Version ${targetVersionId} not found` };

        if (this._activeVersion) this._activeVersion.status = 'archived';
        target.status = 'deployed';
        this._activeVersion = target;

        return {
            message: `Rolled back to ${targetVersionId}`,
            version: target.version_id, hash: target.hash.slice(0, 16) + '…',
            requested_by: requestedBy, approved_by: approvedBy,
            rolled_back_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // DRIFT DETECTION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Record a risk score for drift monitoring
     */
    recordScore(score, context = {}) {
        this._scoreHistory.push({
            score, context,
            model_version: this._activeVersion?.version_id || 'bootstrap',
            recorded_at: new Date().toISOString()
        });

        // Keep last 1000 scores
        if (this._scoreHistory.length > 1000) {
            this._scoreHistory = this._scoreHistory.slice(-1000);
        }
    }

    /**
     * Detect model drift — score distribution shift
     */
    detectDrift() {
        if (this._scoreHistory.length < 20) {
            return { title: 'Drift Detection', status: 'insufficient_data', message: 'Need ≥20 scored events to detect drift', samples: this._scoreHistory.length };
        }

        const scores = this._scoreHistory.map(s => s.score);
        const n = scores.length;
        const half = Math.floor(n / 2);
        const recent = scores.slice(half);
        const baseline = scores.slice(0, half);

        const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
        const stdDev = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length); };

        const baselineMean = mean(baseline);
        const recentMean = mean(recent);
        const baselineStd = stdDev(baseline);
        const recentStd = stdDev(recent);
        const meanShift = Math.abs(recentMean - baselineMean);
        const stdShift = Math.abs(recentStd - baselineStd);

        // Drift thresholds
        const meanDrifted = meanShift > 10; // >10 point shift
        const varianceDrifted = stdShift > 5; // variance change
        const drifted = meanDrifted || varianceDrifted;

        return {
            title: 'Model Drift Detection',
            drifted,
            severity: drifted ? (meanShift > 20 ? 'critical' : 'warning') : 'none',
            baseline: { mean: Math.round(baselineMean * 100) / 100, std_dev: Math.round(baselineStd * 100) / 100, samples: baseline.length },
            recent: { mean: Math.round(recentMean * 100) / 100, std_dev: Math.round(recentStd * 100) / 100, samples: recent.length },
            shift: { mean_shift: Math.round(meanShift * 100) / 100, variance_shift: Math.round(stdShift * 100) / 100 },
            recommendation: drifted ? 'Model weights may need recalibration — initiate change approval workflow' : 'Model stable — no action required',
            model_version: this._activeVersion?.version_id || 'bootstrap',
            analyzed_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // WEIGHT CHANGE APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Propose weight change — starts approval workflow
     * Cannot be deployed until approved by Compliance
     */
    proposeWeightChange(params) {
        const { proposed_weights, reason, proposed_by, evidence = [] } = params;
        if (!proposed_weights || !reason || !proposed_by) {
            return { error: 'proposed_weights, reason, and proposed_by all required' };
        }

        const currentWeights = this.getActiveVersion().weights;
        const diffs = [];
        Object.entries(proposed_weights).forEach(([k, v]) => {
            if (currentWeights[k] !== undefined && currentWeights[k] !== v) {
                diffs.push({ weight: k, from: currentWeights[k], to: v, change: Math.round((v - currentWeights[k]) * 100) / 100 });
            }
        });

        const changeId = `WC-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
        const change = {
            change_id: changeId,
            proposed_weights,
            current_weights: { ...currentWeights },
            diffs,
            reason, evidence,
            proposed_by,
            status: 'pending_review',
            approvals: [],
            required_approvals: 2, // Compliance + Risk Lead
            hash: crypto.createHash('sha256').update(JSON.stringify({ changeId, proposed_weights, reason })).digest('hex'),
            created_at: new Date().toISOString()
        };

        this._pendingChanges.push(change);
        return change;
    }

    /**
     * Approve or reject a weight change
     */
    reviewWeightChange(changeId, reviewer) {
        const { reviewer_id, role, decision, reason = '' } = reviewer;
        const change = this._pendingChanges.find(c => c.change_id === changeId);
        if (!change) return { error: 'Change not found' };
        if (change.status !== 'pending_review') return { error: `Change is ${change.status}` };
        if (change.proposed_by === reviewer_id) return { error: 'Proposer cannot approve own change (SoD)' };
        if (change.approvals.some(a => a.reviewer_id === reviewer_id)) return { error: 'Already reviewed' };

        change.approvals.push({ reviewer_id, role, decision, reason, reviewed_at: new Date().toISOString() });

        const approveCount = change.approvals.filter(a => a.decision === 'approve').length;
        const rejectCount = change.approvals.filter(a => a.decision === 'reject').length;

        if (rejectCount > 0) change.status = 'rejected';
        else if (approveCount >= change.required_approvals) change.status = 'approved';

        return {
            change_id: changeId, status: change.status,
            approvals: change.approvals.length, required: change.required_approvals,
            message: change.status === 'approved' ? 'Change approved — ready to deploy via registerVersion()' : change.status === 'rejected' ? 'Change rejected' : 'Awaiting additional approvals'
        };
    }

    /**
     * Get pending changes
     */
    getPendingChanges() {
        return {
            title: 'Pending Weight Changes',
            total: this._pendingChanges.length,
            pending: this._pendingChanges.filter(c => c.status === 'pending_review').length,
            changes: this._pendingChanges.map(c => ({
                change_id: c.change_id, status: c.status, proposed_by: c.proposed_by,
                diffs_count: c.diffs.length, approvals: c.approvals.length,
                required: c.required_approvals, created_at: c.created_at
            }))
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // RISK OVERRIDE AUDIT (immutable, hash-linked)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Log a risk override — every override is hashed and linked
     * Requires dual approval
     */
    logOverride(params) {
        const { action, entity_id, original_score, override_score, reason, overridden_by, approved_by } = params;
        if (!approved_by) return { error: 'Override requires dual approval' };
        if (overridden_by === approved_by) return { error: 'Override and approval must be different users (SoD)' };

        const prevHash = this._overrideLog.length > 0 ? this._overrideLog[this._overrideLog.length - 1].hash : '0'.repeat(64);
        const entry = {
            index: this._overrideLog.length,
            action, entity_id, original_score, override_score,
            reason, overridden_by, approved_by,
            timestamp: new Date().toISOString(),
            prev_hash: prevHash
        };
        entry.hash = crypto.createHash('sha256').update(prevHash + JSON.stringify(entry)).digest('hex');

        this._overrideLog.push(entry);
        return {
            message: 'Override logged (immutable)',
            index: entry.index, hash: entry.hash.slice(0, 16) + '…',
            chain_length: this._overrideLog.length,
            sod_verified: true
        };
    }

    /**
     * Get override audit trail (append-only, hash-linked)
     */
    getOverrideLog() {
        return {
            title: 'Risk Override Audit Trail (Immutable)',
            total: this._overrideLog.length,
            chain_valid: this._verifyOverrideChain(),
            entries: this._overrideLog.slice(-20).map(e => ({
                index: e.index, action: e.action, entity_id: e.entity_id,
                original: e.original_score, override: e.override_score,
                by: e.overridden_by, approved: e.approved_by,
                hash: e.hash.slice(0, 16) + '…', at: e.timestamp
            }))
        };
    }

    _verifyOverrideChain() {
        for (let i = 1; i < this._overrideLog.length; i++) {
            const prev = this._overrideLog[i - 1];
            const curr = this._overrideLog[i];
            if (curr.prev_hash !== prev.hash) return false;
        }
        return true;
    }
}

// Singleton — governance state persists in memory (DB-backed in production)
module.exports = new RiskModelGovernance();
