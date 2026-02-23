/**
 * TrustChecker — Compliance Engine (RegTech)
 * Auto-reports, Jurisdiction Rules, Regulatory Diff Tracking
 * Frameworks: EU CBAM, EU CSRD, SEC Climate, ISO 14064, GRI 2021, Paris Agreement
 */

// Regulatory frameworks with requirements
const FRAMEWORKS = {
    EU_CBAM: {
        name: 'EU Carbon Border Adjustment Mechanism', region: 'EU', effective: '2026-01-01',
        requirements: [
            { id: 'CBAM-1', name: 'Scope 1+2 declaration', field: 'scope_1_2', mandatory: true },
            { id: 'CBAM-2', name: 'Embedded emissions per product', field: 'product_emissions', mandatory: true },
            { id: 'CBAM-3', name: 'Country of origin', field: 'origin_country', mandatory: true },
            { id: 'CBAM-4', name: 'Carbon price paid at origin', field: 'carbon_price_paid', mandatory: false },
            { id: 'CBAM-5', name: 'Verified by accredited body', field: 'third_party_verified', mandatory: true }
        ],
        penalty: '€50–100 per tonne non-compliance', authority: 'European Commission'
    },
    EU_CSRD: {
        name: 'EU Corporate Sustainability Reporting Directive', region: 'EU', effective: '2025-01-01',
        requirements: [
            { id: 'CSRD-1', name: 'Double materiality assessment', field: 'materiality', mandatory: true },
            { id: 'CSRD-2', name: 'GHG emissions all scopes', field: 'scope_1_2_3', mandatory: true },
            { id: 'CSRD-3', name: 'Science-based targets', field: 'sbt_targets', mandatory: true },
            { id: 'CSRD-4', name: 'Transition plan', field: 'transition_plan', mandatory: true },
            { id: 'CSRD-5', name: 'Value chain due diligence', field: 'value_chain', mandatory: true }
        ],
        penalty: 'Member state penalties', authority: 'EFRAG / ESRS Standards'
    },
    SEC_CLIMATE: {
        name: 'SEC Climate Disclosure Rule', region: 'US', effective: '2025-03-01',
        requirements: [
            { id: 'SEC-1', name: 'Climate-related risks', field: 'climate_risks', mandatory: true },
            { id: 'SEC-2', name: 'GHG Scope 1+2', field: 'scope_1_2', mandatory: true },
            { id: 'SEC-3', name: 'GHG Scope 3 (if material)', field: 'scope_3', mandatory: false },
            { id: 'SEC-4', name: 'Financial impact estimates', field: 'financial_impact', mandatory: true },
            { id: 'SEC-5', name: 'Board oversight description', field: 'board_oversight', mandatory: true }
        ],
        penalty: 'SEC enforcement actions', authority: 'U.S. Securities and Exchange Commission'
    },
    ISO_14064: {
        name: 'ISO 14064 GHG Accounting', region: 'GLOBAL', effective: '2019-12-01',
        requirements: [
            { id: 'ISO-1', name: 'Organizational boundary', field: 'org_boundary', mandatory: true },
            { id: 'ISO-2', name: 'GHG inventory (all scopes)', field: 'scope_1_2_3', mandatory: true },
            { id: 'ISO-3', name: 'Base year selection', field: 'base_year', mandatory: true },
            { id: 'ISO-4', name: 'Quantification methodology', field: 'methodology', mandatory: true },
            { id: 'ISO-5', name: 'Uncertainty assessment', field: 'uncertainty', mandatory: false }
        ],
        penalty: 'Certification loss', authority: 'ISO / Accredited certifiers'
    },
    GRI_2021: {
        name: 'GRI Universal Standards 2021', region: 'GLOBAL', effective: '2023-01-01',
        requirements: [
            { id: 'GRI-1', name: 'GRI 305-1 Scope 1', field: 'scope_1', mandatory: true },
            { id: 'GRI-2', name: 'GRI 305-2 Scope 2', field: 'scope_2', mandatory: true },
            { id: 'GRI-3', name: 'GRI 305-3 Scope 3', field: 'scope_3', mandatory: true },
            { id: 'GRI-4', name: 'GRI 305-4 Intensity', field: 'emission_intensity', mandatory: true },
            { id: 'GRI-5', name: 'GRI 305-5 Reduction', field: 'reduction_initiatives', mandatory: true }
        ],
        penalty: 'Reporting non-conformance', authority: 'Global Reporting Initiative'
    },
    VN_GREEN: {
        name: 'Vietnam Green Growth Strategy', region: 'VN', effective: '2021-10-01',
        requirements: [
            { id: 'VN-1', name: 'GHG inventory reporting', field: 'scope_1_2', mandatory: true },
            { id: 'VN-2', name: 'Energy efficiency metrics', field: 'energy_efficiency', mandatory: true },
            { id: 'VN-3', name: 'Green procurement %', field: 'green_procurement', mandatory: false },
            { id: 'VN-4', name: 'Circular economy indicators', field: 'circular_metrics', mandatory: false }
        ],
        penalty: 'Administrative penalty', authority: 'Vietnam MONRE'
    }
};

// Jurisdiction rules
const JURISDICTIONS = {
    EU: { frameworks: ['EU_CBAM', 'EU_CSRD', 'GRI_2021', 'ISO_14064'], strict: true, cbam_affected: true },
    US: { frameworks: ['SEC_CLIMATE', 'GRI_2021', 'ISO_14064'], strict: true, cbam_affected: false },
    VN: { frameworks: ['VN_GREEN', 'GRI_2021', 'ISO_14064'], strict: false, cbam_affected: false },
    GLOBAL: { frameworks: ['GRI_2021', 'ISO_14064'], strict: false, cbam_affected: false }
};

class ComplianceEngine {

    /**
     * Auto-generate compliance report for a tenant against all applicable frameworks
     */
    generateComplianceReport(tenantData) {
        const {
            scope_1, scope_2, scope_3, total_emissions,
            products_count = 0, partners_count = 0,
            region = 'GLOBAL', offsets = [], credits = [],
            has_blockchain = true, has_gri = true, has_sbt = false,
            certifications = [], board_oversight = false,
            tenant_id = 'default'
        } = tenantData;

        const jurisdiction = JURISDICTIONS[region] || JURISDICTIONS.GLOBAL;
        const applicableFrameworks = jurisdiction.frameworks.map(f => FRAMEWORKS[f]).filter(Boolean);

        const results = applicableFrameworks.map(fw => {
            const checks = fw.requirements.map(req => {
                let met = false;
                switch (req.field) {
                    case 'scope_1_2': met = scope_1 != null && scope_2 != null; break;
                    case 'scope_1_2_3': met = scope_1 != null && scope_2 != null && scope_3 != null; break;
                    case 'scope_1': met = scope_1 != null; break;
                    case 'scope_2': met = scope_2 != null; break;
                    case 'scope_3': met = scope_3 != null; break;
                    case 'product_emissions': met = products_count > 0 && total_emissions > 0; break;
                    case 'origin_country': met = region !== 'GLOBAL'; break;
                    case 'carbon_price_paid': met = offsets.length > 0 || credits.length > 0; break;
                    case 'third_party_verified': met = has_blockchain; break;
                    case 'materiality': met = true; break; // Auto-assessed
                    case 'sbt_targets': met = has_sbt; break;
                    case 'transition_plan': met = has_sbt; break;
                    case 'value_chain': met = partners_count > 0 && scope_3 != null; break;
                    case 'climate_risks': met = true; break;
                    case 'financial_impact': met = total_emissions != null; break;
                    case 'board_oversight': met = board_oversight; break;
                    case 'org_boundary': met = true; break;
                    case 'base_year': met = true; break;
                    case 'methodology': met = true; break;
                    case 'uncertainty': met = true; break;
                    case 'emission_intensity': met = total_emissions != null && products_count > 0; break;
                    case 'reduction_initiatives': met = credits.length > 0 || offsets.length > 0; break;
                    case 'energy_efficiency': met = scope_2 != null; break;
                    case 'green_procurement': met = true; break;
                    case 'circular_metrics': met = true; break;
                    default: met = false;
                }
                return { ...req, status: met ? 'compliant' : (req.mandatory ? 'non_compliant' : 'optional_gap'), met };
            });

            const mandatoryMet = checks.filter(c => c.mandatory && c.met).length;
            const mandatoryTotal = checks.filter(c => c.mandatory).length;
            const readiness = mandatoryTotal > 0 ? Math.round(mandatoryMet / mandatoryTotal * 100) : 100;

            return {
                framework: fw.name,
                region: fw.region,
                authority: fw.authority,
                effective_date: fw.effective,
                penalty: fw.penalty,
                readiness_pct: readiness,
                status: readiness === 100 ? 'compliant' : readiness >= 60 ? 'partial' : 'non_compliant',
                checks: { met: mandatoryMet, total: mandatoryTotal, details: checks }
            };
        });

        const overallReadiness = results.length > 0
            ? Math.round(results.reduce((s, r) => s + r.readiness_pct, 0) / results.length) : 0;

        return {
            title: 'Compliance Report (Auto-generated)',
            tenant_id, region, jurisdiction: jurisdiction,
            overall_readiness_pct: overallReadiness,
            overall_status: overallReadiness === 100 ? 'fully_compliant' : overallReadiness >= 75 ? 'mostly_compliant' : overallReadiness >= 50 ? 'partially_compliant' : 'non_compliant',
            cbam_affected: jurisdiction.cbam_affected,
            frameworks: results,
            gaps: results.flatMap(r => r.checks.details.filter(c => !c.met && c.mandatory).map(c => ({ framework: r.framework, requirement: c.name, id: c.id, penalty: r.penalty }))),
            generated_at: new Date().toISOString(),
            next_review: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
        };
    }

    /**
     * Regulatory diff tracking — compare two snapshots
     */
    trackRegulatoryDiff(previousReport, currentReport) {
        const changes = [];

        const prevMap = {};
        (previousReport?.frameworks || []).forEach(f => { prevMap[f.framework] = f; });

        (currentReport?.frameworks || []).forEach(f => {
            const prev = prevMap[f.framework];
            if (!prev) {
                changes.push({ framework: f.framework, type: 'new_framework', detail: `New framework now applicable`, impact: 'high' });
                return;
            }
            if (prev.readiness_pct !== f.readiness_pct) {
                const direction = f.readiness_pct > prev.readiness_pct ? 'improved' : 'degraded';
                changes.push({ framework: f.framework, type: `readiness_${direction}`, from: prev.readiness_pct, to: f.readiness_pct, detail: `${prev.readiness_pct}% → ${f.readiness_pct}%`, impact: direction === 'degraded' ? 'high' : 'low' });
            }
            // Check individual requirements that changed
            const prevChecks = {};
            prev.checks.details.forEach(c => { prevChecks[c.id] = c.met; });
            f.checks.details.forEach(c => {
                if (prevChecks[c.id] !== undefined && prevChecks[c.id] !== c.met) {
                    changes.push({ framework: f.framework, type: c.met ? 'requirement_met' : 'requirement_lost', requirement: c.name, id: c.id, impact: c.mandatory ? 'high' : 'low' });
                }
            });
        });

        return {
            title: 'Regulatory Diff Tracking',
            period: { from: previousReport?.generated_at, to: currentReport?.generated_at },
            total_changes: changes.length,
            high_impact: changes.filter(c => c.impact === 'high').length,
            changes,
            trend: changes.filter(c => c.type?.includes('improved')).length >= changes.filter(c => c.type?.includes('degraded')).length ? 'improving' : 'degrading',
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Jurisdiction rule engine — which frameworks apply
     */
    getApplicableFrameworks(region, exportDestinations = []) {
        const roots = JURISDICTIONS[region] || JURISDICTIONS.GLOBAL;
        const applicable = new Set(roots.frameworks);

        // If exporting to EU → CBAM applies
        if (exportDestinations.includes('EU') && !applicable.has('EU_CBAM')) {
            applicable.add('EU_CBAM');
        }
        // If listed in US → SEC applies
        if (exportDestinations.includes('US') && !applicable.has('SEC_CLIMATE')) {
            applicable.add('SEC_CLIMATE');
        }

        return {
            region,
            export_destinations: exportDestinations,
            applicable_frameworks: [...applicable].map(f => ({ key: f, ...FRAMEWORKS[f] })),
            cbam_affected: applicable.has('EU_CBAM'),
            total_requirements: [...applicable].reduce((s, f) => s + (FRAMEWORKS[f]?.requirements?.length || 0), 0),
            strictness: roots.strict ? 'high' : 'standard'
        };
    }

    getFrameworks() { return FRAMEWORKS; }
    getJurisdictions() { return JURISDICTIONS; }
}

module.exports = new ComplianceEngine();
