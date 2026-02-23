/**
 * TrustChecker — Reputation & Market Signaling Engine
 * Company Trust Score, Supply Chain Transparency Index, Carbon Integrity Score
 */

class ReputationEngine {

    /**
     * Company Trust Score (0–100) — composite of 6 dimensions
     */
    calculateTrustScore(params) {
        const {
            product_authenticity = 50, supply_chain_transparency = 50,
            esg_performance = 50, carbon_integrity = 50,
            compliance_readiness = 50, partner_reliability = 50,
            verified_credentials = 0, blockchain_anchored = false,
            incident_count = 0, total_products = 0
        } = params;

        const dimensions = [
            { name: 'Product Authenticity', weight: 0.20, value: product_authenticity, source: 'QR verification rate' },
            { name: 'Supply Chain Transparency', weight: 0.20, value: supply_chain_transparency, source: 'Partner + route coverage' },
            { name: 'ESG Performance', weight: 0.15, value: esg_performance, source: 'Carbon grade + ESG score' },
            { name: 'Carbon Integrity', weight: 0.15, value: carbon_integrity, source: 'MRV confidence + credit legitimacy' },
            { name: 'Compliance Readiness', weight: 0.15, value: compliance_readiness, source: 'Regulatory framework coverage' },
            { name: 'Partner Reliability', weight: 0.15, value: partner_reliability, source: 'Partner trust avg + on-time delivery' }
        ];

        let rawScore = dimensions.reduce((s, d) => s + d.value * d.weight, 0);

        // Bonuses
        if (verified_credentials > 3) rawScore = Math.min(100, rawScore + 5);
        if (blockchain_anchored) rawScore = Math.min(100, rawScore + 3);

        // Penalties
        if (incident_count > 5) rawScore = Math.max(0, rawScore - 10);
        if (total_products === 0) rawScore = Math.max(0, rawScore - 15);

        const score = Math.round(rawScore);

        return {
            title: 'Company Trust Score',
            trust_score: score,
            trust_grade: score >= 85 ? 'AAA' : score >= 75 ? 'AA' : score >= 65 ? 'A' : score >= 50 ? 'BBB' : score >= 35 ? 'BB' : 'B',
            dimensions, bonuses: { verified_credentials: verified_credentials > 3, blockchain_anchored },
            penalties: { high_incidents: incident_count > 5, no_products: total_products === 0 },
            market_signal: score >= 75 ? 'Premium Trust — eligible for green finance & partner preference' : score >= 50 ? 'Standard Trust — meets baseline requirements' : 'Below Threshold — improvement required',
            publishable: score >= 50, assessed_at: new Date().toISOString()
        };
    }

    /**
     * Supply Chain Transparency Index (SCTI)
     */
    calculateTransparencyIndex(params) {
        const {
            total_products = 0, tracked_products = 0,
            total_partners = 0, verified_partners = 0,
            total_shipments = 0, traced_shipments = 0,
            has_did = false, has_vc = false, has_blockchain = false,
            scope_3_covered = false, gri_reported = false
        } = params;

        const metrics = [
            { name: 'Product Traceability', score: total_products > 0 ? Math.round(tracked_products / total_products * 100) : 0, weight: 0.25 },
            { name: 'Partner Verification', score: total_partners > 0 ? Math.round(verified_partners / total_partners * 100) : 0, weight: 0.20 },
            { name: 'Shipment Tracing', score: total_shipments > 0 ? Math.round(traced_shipments / total_shipments * 100) : 0, weight: 0.20 },
            { name: 'Digital Identity (DID)', score: has_did ? 100 : 0, weight: 0.10 },
            { name: 'Verifiable Credentials', score: has_vc ? 100 : 0, weight: 0.10 },
            { name: 'Blockchain Anchoring', score: has_blockchain ? 100 : 0, weight: 0.05 },
            { name: 'Scope 3 Coverage', score: scope_3_covered ? 100 : 0, weight: 0.05 },
            { name: 'GRI Reporting', score: gri_reported ? 100 : 0, weight: 0.05 }
        ];

        const index = Math.round(metrics.reduce((s, m) => s + m.score * m.weight, 0));

        return {
            title: 'Supply Chain Transparency Index (SCTI)',
            index, grade: index >= 80 ? 'Transparent' : index >= 50 ? 'Partial' : 'Opaque',
            metrics,
            recommendation: index >= 80 ? 'Publish index — strong market signal' : index >= 50 ? 'Improve DID + VC adoption' : 'Urgent: increase partner verification & traceability',
            assessed_at: new Date().toISOString()
        };
    }

    /**
     * Carbon Integrity Score (CIS)
     */
    calculateCarbonIntegrity(params) {
        const {
            total_credits = 0, verified_credits = 0,
            avg_mrv_confidence = 0, double_count_incidents = 0,
            avg_additionality_pass_rate = 0, blockchain_anchored_pct = 0,
            retired_pct = 0, third_party_verified = false
        } = params;

        const factors = [
            { name: 'MRV Confidence', score: avg_mrv_confidence, weight: 0.30 },
            { name: 'Additionality Pass Rate', score: avg_additionality_pass_rate, weight: 0.25 },
            { name: 'Blockchain Anchoring', score: blockchain_anchored_pct, weight: 0.15 },
            { name: 'Retirement Rate', score: retired_pct, weight: 0.10 },
            { name: 'No Double Counting', score: double_count_incidents === 0 ? 100 : Math.max(0, 100 - double_count_incidents * 20), weight: 0.15 },
            { name: 'Third-Party Verified', score: third_party_verified ? 100 : 0, weight: 0.05 }
        ];

        const integrity = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0));

        return {
            title: 'Carbon Integrity Score (CIS)',
            integrity_score: integrity,
            grade: integrity >= 80 ? 'AAA' : integrity >= 60 ? 'AA' : integrity >= 40 ? 'A' : 'B',
            factors,
            market_credibility: integrity >= 80 ? 'High — credits accepted by major registries' : integrity >= 60 ? 'Medium — acceptable for voluntary market' : 'Low — internal use only',
            assessed_at: new Date().toISOString()
        };
    }

    /**
     * Cross-tenant reputation index (Super Admin)
     */
    buildPlatformIndex(tenants = []) {
        const index = tenants.map(t => ({
            tenant_id: t.tenant_id, tenant_name: t.tenant_name,
            trust_score: t.trust_score || 0, transparency_index: t.transparency_index || 0,
            carbon_integrity: t.carbon_integrity || 0,
            composite: Math.round(((t.trust_score || 0) * 0.4 + (t.transparency_index || 0) * 0.3 + (t.carbon_integrity || 0) * 0.3)),
            grade: 'pending'
        })).sort((a, b) => b.composite - a.composite);

        index.forEach((t, i) => {
            t.rank = i + 1;
            t.grade = t.composite >= 80 ? 'AAA' : t.composite >= 65 ? 'AA' : t.composite >= 50 ? 'A' : t.composite >= 35 ? 'BBB' : 'BB';
        });

        return {
            title: 'Platform Trust & Reputation Index',
            total_tenants: index.length,
            avg_composite: index.length > 0 ? Math.round(index.reduce((s, t) => s + t.composite, 0) / index.length) : 0,
            index, generated_at: new Date().toISOString()
        };
    }
}

module.exports = new ReputationEngine();
