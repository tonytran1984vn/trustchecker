/**
 * TrustChecker — Jurisdictional Risk & Data Sovereignty Engine v1.0
 * CRITICAL: Global infrastructure needs geo-compliance routing
 *
 * Without jurisdictional mapping: scaling globally = regulatory explosion.
 * This engine maps: deployment regions, data residency, carbon registry
 * jurisdiction, cross-border constraints, OFAC/sanctions.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. MULTI-REGION DEPLOYMENT MAP
// ═══════════════════════════════════════════════════════════════════

const DEPLOYMENT_MAP = {
    regions: [
        {
            region_id: 'EU-W',
            name: 'EU West',
            cloud: 'GCP europe-west1 (Belgium)',
            data_entity: 'TrustChecker Data Compliance Ltd (Ireland)',
            settlement_entity: 'TrustChecker Settlement GmbH (Germany)',
            regulatory_framework: ['MiCA', 'GDPR', 'EU ETS', 'CSRD'],
            carbon_registries: ['EU ETS Registry', 'Gold Standard (Geneva)'],
            data_residency: 'EU data stays in EU — GDPR Article 44-49',
            status: 'PRIMARY',
        },
        {
            region_id: 'AP-SE',
            name: 'Asia Pacific Southeast',
            cloud: 'GCP asia-southeast1 (Singapore)',
            data_entity: 'TrustChecker Technology Pte Ltd (Singapore)',
            settlement_entity: 'TrustChecker Technology Pte Ltd (non-regulated settlement via SG)',
            regulatory_framework: ['MAS PSA', 'PDPA', 'Singapore Carbon Tax'],
            carbon_registries: ['Verra (via SG office)', 'Gold Standard'],
            data_residency: 'APAC data processed in SG — PDPA compliant',
            status: 'PRIMARY',
        },
        {
            region_id: 'VN',
            name: 'Vietnam',
            cloud: 'GCP asia-southeast1 or Vietnam local DC',
            data_entity: 'TrustChecker Vietnam Co Ltd',
            settlement_entity: 'TrustChecker Vietnam Co Ltd (local only)',
            regulatory_framework: ['SBV regulations', 'MOIT', 'Vietnam Cybersecurity Law'],
            carbon_registries: ['Vietnam National Carbon Registry (emerging)'],
            data_residency: 'Vietnam Cybersecurity Law may require local storage for certain data',
            status: 'ACTIVE',
        },
        {
            region_id: 'US-E',
            name: 'US East',
            cloud: 'GCP us-east1 (South Carolina)',
            data_entity: 'TBD — US entity required for US data',
            settlement_entity: 'TBD — SEC/CFTC classification pending',
            regulatory_framework: ['SEC', 'CFTC', 'OFAC', 'CCPA/CPRA'],
            carbon_registries: ['CAR (Climate Action Reserve)', 'ACR (American Carbon Registry)'],
            data_residency: 'US data in US — CCPA/CPRA for California residents',
            status: 'PLANNED',
        },
        {
            region_id: 'UK',
            name: 'United Kingdom',
            cloud: 'GCP europe-west2 (London)',
            data_entity: 'TBD — Post-Brexit UK entity',
            settlement_entity: 'Possible FCA-regulated entity',
            regulatory_framework: ['FCA', 'UK GDPR', 'UK ETS'],
            carbon_registries: ['UK ETS Registry'],
            data_residency: 'UK adequacy decision from EU — data can flow EU↔UK',
            status: 'PLANNED',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. CROSS-BORDER DATA ISOLATION
// ═══════════════════════════════════════════════════════════════════

const DATA_ISOLATION = {
    principles: [
        'Data generated in jurisdiction X stays in jurisdiction X by default',
        'Cross-border transfer requires legal basis (adequacy, SCCs, BCRs)',
        'PII never leaves originating region without explicit consent + legal basis',
        'Aggregated/anonymized data can flow freely (not PII)',
        'Audit logs replicated to governance region for oversight (non-PII)',
    ],

    transfer_mechanisms: [
        { mechanism: 'EU Adequacy Decision', from: 'EU', to: 'UK, Japan, South Korea, NZ', status: 'Active' },
        { mechanism: 'Standard Contractual Clauses (SCCs)', from: 'EU', to: 'US, SG, VN', status: 'Required' },
        { mechanism: 'APEC CBPR', from: 'SG', to: 'US, Japan, South Korea', status: 'Available' },
        { mechanism: 'Vietnam Cybersecurity Assessment', from: 'VN', to: 'Any', status: 'Case-by-case approval' },
    ],

    data_categories: [
        {
            category: 'PII (user data)',
            isolation: 'STRICT — stays in originating region',
            cross_border: 'Only with legal basis',
        },
        {
            category: 'Transaction data',
            isolation: 'MODERATE — stays in settlement region',
            cross_border: 'Aggregated OK, individual requires basis',
        },
        {
            category: 'Carbon credit data',
            isolation: 'LOW — registry-linked, follows registry jurisdiction',
            cross_border: 'Registry transfers permitted',
        },
        { category: 'Trust scores', isolation: 'LOW — aggregated metrics', cross_border: 'Freely shared (non-PII)' },
        {
            category: 'Audit logs',
            isolation: 'REPLICATED — copies to governance region',
            cross_border: 'Non-PII audit data flows to oversight',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. GEO-COMPLIANCE ROUTING
// ═══════════════════════════════════════════════════════════════════

const GEO_ROUTING = {
    routing_rules: [
        { rule: 'EU entity transaction → route through EU-W region', enforcement: 'Automatic at API gateway' },
        { rule: 'US entity transaction → route through US-E region', enforcement: 'Automatic at API gateway' },
        { rule: 'OFAC-sanctioned country origin → BLOCK', enforcement: 'Real-time SDN check at transaction entry' },
        {
            rule: 'Cross-border carbon settlement → route through Settlement GmbH',
            enforcement: 'Settlement routing engine',
        },
        {
            rule: 'Vietnam entity → route through VN region for local compliance',
            enforcement: 'Automatic + Vietnam Cybersecurity Law check',
        },
    ],

    blocked_corridors: [
        { from: '*', to: 'NK', reason: 'OFAC comprehensive sanctions' },
        { from: '*', to: 'IR', reason: 'OFAC comprehensive sanctions' },
        { from: '*', to: 'SY', reason: 'OFAC comprehensive sanctions' },
        { from: '*', to: 'CU', reason: 'OFAC comprehensive sanctions' },
        { from: '*', to: 'RU', reason: 'Sectoral sanctions (carbon/energy related)' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. CARBON REGISTRY JURISDICTION MAP
// ═══════════════════════════════════════════════════════════════════

const CARBON_REGISTRY_MAP = {
    registries: [
        {
            registry: 'EU ETS',
            jurisdiction: 'EU',
            type: 'Compliance (mandatory)',
            settlement_entity: 'Settlement GmbH',
            data_residency: 'EU',
            integration: 'API + regulatory reporting',
        },
        {
            registry: 'UK ETS',
            jurisdiction: 'UK',
            type: 'Compliance',
            settlement_entity: 'TBD (UK entity)',
            data_residency: 'UK',
            integration: 'API (post-Brexit separate)',
        },
        {
            registry: 'Verra VCS',
            jurisdiction: 'Global (HQ: US)',
            type: 'Voluntary',
            settlement_entity: 'Technology Pte Ltd (SG)',
            data_residency: 'Origin region',
            integration: 'API',
        },
        {
            registry: 'Gold Standard',
            jurisdiction: 'Global (HQ: CH)',
            type: 'Voluntary',
            settlement_entity: 'Settlement GmbH (EU) or Technology Pte Ltd (APAC)',
            data_residency: 'Origin region',
            integration: 'API',
        },
        {
            registry: 'CAR',
            jurisdiction: 'US',
            type: 'Voluntary',
            settlement_entity: 'TBD (US entity)',
            data_residency: 'US',
            integration: 'Planned',
        },
        {
            registry: 'ACR',
            jurisdiction: 'US',
            type: 'Voluntary',
            settlement_entity: 'TBD (US entity)',
            data_residency: 'US',
            integration: 'Planned',
        },
        {
            registry: 'Vietnam Carbon Registry',
            jurisdiction: 'VN',
            type: 'Emerging compliance',
            settlement_entity: 'Vietnam Co Ltd',
            data_residency: 'VN',
            integration: 'Planned (2026-2027)',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class JurisdictionalRiskEngine {
    constructor() {
        this.version = '3.0';
        this.deploymentMap = DEPLOYMENT_MAP;
        this.dataIsolation = DATA_ISOLATION;
        this.geoRouting = GEO_ROUTING;
        this.carbonRegistries = CARBON_REGISTRY_MAP;
    }

    getDeploymentMap() {
        return this.deploymentMap;
    }
    getDataIsolation() {
        return this.dataIsolation;
    }
    getGeoRouting() {
        return this.geoRouting;
    }
    getCarbonRegistryMap() {
        return this.carbonRegistries;
    }

    /**
     * Agentic v3.0: Assess Geo-Compliance & Sanctions automatically
     */
    assessJurisdiction(region_id, transactionPayload = null) {
        const region = this.deploymentMap.regions.find(r => r.region_id === region_id);
        if (!region) return { error: `Unknown region: ${region_id}` };

        let riskScore = 0;
        let requiresSCC = false;
        const violations = [];
        const blockedBy = [];

        const registries = this.carbonRegistries.registries.filter(
            r => r.jurisdiction.includes(region.name.split(' ')[0]) || r.jurisdiction === 'Global'
        );

        // Sanction Evaluation Agent
        if (transactionPayload && transactionPayload.destination) {
            const dest = transactionPayload.destination;
            const blocked = this.geoRouting.blocked_corridors.find(c => c.to === dest || c.to === '*');
            if (blocked && (blocked.to === dest || transactionPayload.origin === blocked.from)) {
                blockedBy.push(blocked.reason);
                riskScore += 100; // Critical Fat-tail risk
            } else {
                // Cross-border dynamic evaluation
                const mechanism = this.dataIsolation.transfer_mechanisms.find(
                    m => m.from === region.name.split(' ')[0] && m.to.includes(dest)
                );
                if (mechanism && mechanism.status === 'Required') {
                    requiresSCC = true;
                    riskScore += 25; // Compliance friction
                } else if (!mechanism) {
                    riskScore += 50; // Unregulated corridor
                    violations.push(`Unmapped data corridor to ${dest}`);
                }
            }
        }

        return {
            region,
            registries,
            compliance_status: {
                is_blocked: blockedBy.length > 0,
                block_reasons: blockedBy,
                requires_scc: requiresSCC,
                geo_risk_score: riskScore,
                violations,
            },
            blocked_corridors: this.geoRouting.blocked_corridors,
        };
    }

    /**
     * Agentic v3.0: Compute Sovereignty Exposure
     */
    computeSovereigntyExposure(dataPayloads) {
        let totalExposure = 0;
        let criticalFlags = 0;
        const recommendations = [];

        dataPayloads.forEach(payload => {
            if (payload.contains_pii && payload.cross_border) {
                totalExposure += 50000; // Expected Regulatory Fine (EVD) proxy
                criticalFlags++;
                recommendations.push(`Hold PII in origin cluster for payload ${payload.id}`);
            }
            if (payload.origin === 'VN' && !payload.local_replica) {
                totalExposure += 100000; // Vietnam Cybersecurity Law penalty risk
                criticalFlags++;
                recommendations.push(`Create local replica in VN Node for payload ${payload.id}`);
            }
        });

        return {
            sovereignty_risk_score: criticalFlags > 0 ? (totalExposure > 100000 ? 'Critical' : 'High') : 'Low',
            estimated_fine_exposure: totalExposure,
            critical_flags: criticalFlags,
            agentic_recommendations: recommendations,
        };
    }

    getFullMap() {
        return {
            title: 'Jurisdictional Risk & Data Sovereignty — Agentic Infrastructure-Grade',
            version: this.version,
            deployment: this.deploymentMap,
            data_isolation: this.dataIsolation,
            geo_routing: this.geoRouting,
            carbon_registries: this.carbonRegistries,
        };
    }
}

module.exports = new JurisdictionalRiskEngine();
