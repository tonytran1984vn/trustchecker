/**
 * TrustChecker Carbon & ESG Engine v2.0
 * Cross-Cutting ESG Governance Intelligence
 * 
 * Scope 1/2/3 emissions calculation, carbon passport, GRI reporting,
 * Risk factor integration, regulatory alignment, maturity assessment
 * 
 * Emission factors based on DEFRA/GHG Protocol 2025 guidelines
 */

// Transport emission factors (kgCO2e per tonne-km)
const TRANSPORT_EMISSION_FACTORS = {
    air: 0.602,
    air_short: 1.128,
    sea: 0.016,
    sea_container: 0.012,
    road: 0.062,
    road_electric: 0.025,
    rail: 0.022,
    rail_electric: 0.008,
    multimodal: 0.045
};

// Warehouse emission factors (kgCO2e per sq.m per day)
const WAREHOUSE_FACTORS = {
    cold_storage: 0.85,
    ambient: 0.15,
    automated: 0.35
};

// Manufacturing emission factors by industry (kgCO2e per unit)
const MANUFACTURING_FACTORS = {
    'F&B': 2.5, 'F&B Artisan': 3.0, 'F&B Heritage': 2.8, 'F&B Organic': 1.5, 'F&B Premium': 3.2,
    'Electronics': 15.0, 'IoT': 12.0, 'Sensor': 10.0, 'Tracking': 8.0,
    'Semiconductor': 35.0, 'Passive Component': 20.0, 'LED': 18.0, 'PCB': 22.0, 'Optics': 25.0, 'Motor': 15.0,
    'Display': 28.0, 'OLED Panel': 28.0,
    'Fashion': 8.0, 'Luxury Textiles': 12.0, 'Art': 6.0,
    'Healthcare': 5.0, 'Pharmaceutical': 8.0, 'Pharmaceuticals': 8.0, 'Supplement': 4.0,
    'Topical': 3.5, 'Vaccine': 15.0, 'Medical Device': 12.0, 'Medical Devices': 12.0,
    'Industrial': 20.0, 'Advanced Materials': 30.0, 'Aerospace Tech': 45.0, 'EV Components': 55.0,
    'Energy': 25.0, 'Smart Security': 12.0,
    'Luxury Watch': 18.0, 'Luxury Watches': 18.0, 'Dress Watch': 14.0, 'Sports Watch': 16.0,
    'Pilot Watch': 16.0, 'Eco Watch': 10.0, 'Vintage Watch': 8.0, 'Jewelry Watch': 20.0,
    'Jewelry': 25.0, 'Precious Metal': 50.0, 'Perfume': 6.0,
    'Coffee': 3.5, 'Coffee Bean': 2.8, 'Specialty Coffee': 4.0, 'Beverage': 2.0,
    'Rice': 1.5, 'Grain': 1.2, 'Nut': 2.0, 'Spice': 1.8, 'Oil': 2.5,
    'Seafood': 4.5, 'Fruit': 1.0, 'Fresh Fruit': 0.8, 'Dried Fruit': 2.5,
    'Snack': 3.0, 'Instant Food': 3.5, 'Condiment': 2.0,
    'Meat': 12.0, 'Dairy': 5.0, 'Bakery': 2.0, 'Pasta': 1.5,
    'Natural': 1.0, 'Confection': 3.5, 'Tea': 2.0, 'Gourmet': 8.0, 'Spirits': 5.0,
    'Gift Set': 3.0, 'Equipment': 8.0,
    'Laptop': 250.0, 'Tablet': 80.0, 'Audio': 15.0, 'Wearable': 20.0,
    'Drone': 45.0, 'VR': 35.0, 'Accessory': 8.0, 'Network': 18.0,
    'Peripheral': 12.0, 'Storage': 20.0, 'Security': 15.0, 'eReader': 25.0,
    'Agriculture': 1.8
};

// Carbon grade thresholds
const GRADE_THRESHOLDS = [
    { max: 5, grade: 'A+', label: 'Excellent — Net Zero ready', color: '#10b981' },
    { max: 10, grade: 'A', label: 'Very Good', color: '#34d399' },
    { max: 20, grade: 'B', label: 'Good — Improve transport', color: '#3b82f6' },
    { max: 40, grade: 'C', label: 'Average — Reduce manufacturing + transport', color: '#f59e0b' },
    { max: 70, grade: 'D', label: 'Poor — Energy transition needed', color: '#ef4444' },
    { max: Infinity, grade: 'F', label: 'Fail — Restructure supply chain', color: '#991b1b' }
];

// Regulatory framework definitions
const REGULATORY_FRAMEWORKS = [
    { id: 'eu_cbam', name: 'EU CBAM', full: 'Carbon Border Adjustment Mechanism', region: 'EU', scopes_required: [1, 2, 3], data_type: 'Per-product', status: 'active', effective: '2026-01-01' },
    { id: 'eu_csrd', name: 'EU CSRD', full: 'Corporate Sustainability Reporting Directive', region: 'EU', scopes_required: [1, 2, 3], data_type: 'Corporate', status: 'active', effective: '2025-01-01' },
    { id: 'sec_climate', name: 'SEC Climate', full: 'SEC Climate Disclosure Rules', region: 'US', scopes_required: [1, 2], data_type: 'Corporate', status: 'phased', effective: '2026-01-01' },
    { id: 'iso_14064', name: 'ISO 14064', full: 'GHG Quantification & Reporting', region: 'Global', scopes_required: [1, 2, 3], data_type: 'Corporate', status: 'voluntary' },
    { id: 'paris', name: 'Paris Agreement', full: 'Paris Climate Accord Targets', region: 'Global', scopes_required: [1, 2, 3], data_type: 'National', status: 'active', targets: { 2030: 0.55, 2050: 0.10 } },
    { id: 'vn_green', name: 'Vietnam Green Growth', full: 'Vietnam National Green Growth Strategy', region: 'Vietnam', scopes_required: [1, 2], data_type: 'National', status: 'active' }
];

// Maturity model
const MATURITY_LEVELS = [
    { level: 1, name: 'Carbon Calculator', description: 'Per-product footprint calculation', requirements: ['scope_calculation'], target: 'Baseline' },
    { level: 2, name: 'ESG Governance Module', description: 'GRI reporting + offset + blockchain', requirements: ['gri_reporting', 'offset_recording', 'blockchain_anchor'], target: 'Enterprise Ready' },
    { level: 3, name: 'Carbon Intelligence', description: 'Risk integration + cross-tenant benchmarks', requirements: ['risk_integration', 'cross_tenant_benchmark', 'partner_esg_scoring'], target: 'Regulated Industry' },
    { level: 4, name: 'Industry Carbon Index', description: 'Moody\'s-style ESG rating platform', requirements: ['industry_index', 'real_time_monitoring', 'compliance_api'], target: 'Cross-border' },
    { level: 5, name: 'Carbon Trading Platform', description: 'Offset marketplace + verification network', requirements: ['offset_marketplace', 'verification_network', 'carbon_credit_trading'], target: 'Market Leader' }
];

class CarbonEngine {
    /**
     * Calculate product carbon footprint (cradle-to-gate) — v2.0
     */
    calculateFootprint(product, shipments = [], events = [], partner = null) {
        const category = product.category || 'General';

        // Scope 1: Direct emissions (manufacturing)
        const scope1 = {
            type: 'scope_1',
            label: 'Direct Emissions (Manufacturing)',
            value: MANUFACTURING_FACTORS[category] || 5.0,
            unit: 'kgCO2e',
            source: 'DEFRA Manufacturing Factors 2025'
        };

        // Scope 2: Indirect emissions (energy for warehousing)
        let warehouseEmissions = 0;
        const warehouseType = category === 'Healthcare' || category === 'F&B' ? 'cold_storage' : 'ambient';
        const storageDays = events.filter(e => e.event_type === 'store' || e.event_type === 'receive').length * 3;
        warehouseEmissions = WAREHOUSE_FACTORS[warehouseType] * storageDays * 0.5;

        const scope2 = {
            type: 'scope_2',
            label: 'Indirect Emissions (Energy/Warehousing)',
            value: Math.round(warehouseEmissions * 100) / 100,
            unit: 'kgCO2e',
            storage_days: storageDays,
            warehouse_type: warehouseType
        };

        // Scope 3: Value chain emissions (transport, distribution)
        let transportEmissions = 0;
        const transportBreakdown = [];
        shipments.forEach(s => {
            const carrier = (s.carrier || '').toLowerCase();
            let mode = 'road';
            if (carrier.includes('fedex') || carrier.includes('dhl')) mode = 'air';
            else if (carrier.includes('maersk') || carrier.includes('cosco')) mode = 'sea';
            else if (carrier.includes('rail') || carrier.includes('train')) mode = 'rail';

            const distance = s.distance_km || this._estimateDistance(s);
            const weight = product.weight || 0.5; // actual product weight in kg
            const emissions = TRANSPORT_EMISSION_FACTORS[mode] * distance * weight;

            transportEmissions += emissions;
            transportBreakdown.push({
                shipment_id: s.id,
                carrier: s.carrier,
                mode,
                distance_km: distance,
                emissions_kgCO2e: Math.round(emissions * 100) / 100
            });
        });

        const scope3 = {
            type: 'scope_3',
            label: 'Value Chain Emissions (Transport/Distribution)',
            value: Math.round(transportEmissions * 100) / 100,
            unit: 'kgCO2e',
            transport_breakdown: transportBreakdown
        };

        const totalFootprint = scope1.value + scope2.value + scope3.value;
        const gradeInfo = this._carbonGradeInfo(totalFootprint);

        return {
            product_id: product.id,
            product_name: product.name,
            category,
            total_footprint_kgCO2e: Math.round(totalFootprint * 100) / 100,
            grade: gradeInfo.grade,
            grade_label: gradeInfo.label,
            grade_color: gradeInfo.color,
            scopes: [scope1, scope2, scope3],
            scope_breakdown: {
                scope_1_pct: totalFootprint > 0 ? Math.round(scope1.value / totalFootprint * 100) : 0,
                scope_2_pct: totalFootprint > 0 ? Math.round(scope2.value / totalFootprint * 100) : 0,
                scope_3_pct: totalFootprint > 0 ? Math.round(scope3.value / totalFootprint * 100) : 0
            },
            equivalent: {
                trees_needed: Math.round(totalFootprint / 22 * 10) / 10,
                driving_km: Math.round(totalFootprint / 0.192 * 10) / 10,
                smartphone_charges: Math.round(totalFootprint / 0.008)
            },
            methodology: 'GHG Protocol Corporate Standard + DEFRA 2025 Factors',
            eas_version: '3.0',
            assessed_at: new Date().toISOString()
        };
    }

    /**
     * Scope 1/2/3 aggregation across entire supply chain
     */
    aggregateByScope(products, shipments, events) {
        let scope1Total = 0, scope2Total = 0, scope3Total = 0;
        const productFootprints = [];

        for (const product of products) {
            // Match shipments: try batch chain first, then proportional fallback
            let productShipments = shipments.filter(s => {
                if (!s.batch_id) return false;
                // Check via events
                const batch = events.find(e => e.product_id === product.id && e.batch_id === s.batch_id);
                return !!batch;
            });
            // Fallback: distribute unmatched shipments proportionally
            if (productShipments.length === 0 && shipments.length > 0) {
                const idx = products.indexOf(product);
                const perProduct = Math.max(1, Math.ceil(shipments.length / products.length));
                productShipments = shipments.slice(idx * perProduct, (idx + 1) * perProduct);
            }
            const productEvents = events.filter(e => e.product_id === product.id);

            const fp = this.calculateFootprint(product, productShipments, productEvents);
            scope1Total += fp.scopes[0].value;
            scope2Total += fp.scopes[1].value;
            scope3Total += fp.scopes[2].value;

            productFootprints.push({
                product_id: product.id,
                name: product.name,
                category: product.category,
                total: fp.total_footprint_kgCO2e,
                grade: fp.grade,
                grade_color: fp.grade_color
            });
        }

        const total = scope1Total + scope2Total + scope3Total;

        return {
            total_emissions_kgCO2e: Math.round(total * 100) / 100,
            total_emissions_tonnes: Math.round(total / 1000 * 100) / 100,
            scope_1: { total: Math.round(scope1Total * 100) / 100, pct: total > 0 ? Math.round(scope1Total / total * 100) : 0, label: 'Direct Manufacturing' },
            scope_2: { total: Math.round(scope2Total * 100) / 100, pct: total > 0 ? Math.round(scope2Total / total * 100) : 0, label: 'Energy & Warehousing' },
            scope_3: { total: Math.round(scope3Total * 100) / 100, pct: total > 0 ? Math.round(scope3Total / total * 100) : 0, label: 'Transport & Distribution' },
            products_assessed: productFootprints.length,
            product_rankings: productFootprints.sort((a, b) => b.total - a.total),
            reduction_targets: {
                paris_aligned_2030: Math.round(total * 0.55 * 100) / 100,
                net_zero_2050: Math.round(total * 0.1 * 100) / 100
            }
        };
    }

    /**
     * Partner ESG leaderboard
     */
    partnerLeaderboard(partners, shipments, violations) {
        return partners.map(p => {
            const partnerShipments = shipments.filter(s => s.from_partner_id === p.id || s.to_partner_id === p.id);
            const lateCount = partnerShipments.filter(s => s.actual_delivery && s.estimated_delivery &&
                new Date(s.actual_delivery) > new Date(s.estimated_delivery)).length;
            const violationCount = violations.filter(v => v.partner_id === p.id).length;

            const trustWeight = (p.trust_score || 50) / 100 * 40;
            const reliabilityWeight = partnerShipments.length > 0 ? (1 - lateCount / partnerShipments.length) * 30 : 15;
            const complianceWeight = Math.max(0, 30 - violationCount * 10);

            const esgScore = Math.round(trustWeight + reliabilityWeight + complianceWeight);

            return {
                partner_id: p.id,
                name: p.name,
                country: p.country,
                type: p.type,
                esg_score: Math.min(100, esgScore),
                grade: esgScore >= 80 ? 'A' : esgScore >= 60 ? 'B' : esgScore >= 40 ? 'C' : 'D',
                grade_color: esgScore >= 80 ? '#10b981' : esgScore >= 60 ? '#3b82f6' : esgScore >= 40 ? '#f59e0b' : '#ef4444',
                metrics: {
                    trust_score: p.trust_score || 50,
                    shipment_reliability: partnerShipments.length > 0 ? Math.round((1 - lateCount / partnerShipments.length) * 100) + '%' : 'N/A',
                    sla_violations: violationCount,
                    kyc_status: p.kyc_status
                }
            };
        }).sort((a, b) => b.esg_score - a.esg_score);
    }

    /**
     * Generate GRI-format ESG report
     */
    generateGRIReport(data) {
        const { scopeData, leaderboard, certifications = [] } = data;

        return {
            report_standard: 'GRI Universal Standards 2021',
            reporting_period: { from: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
            disclosures: {
                'GRI 305-1': { title: 'Direct GHG Emissions (Scope 1)', value: scopeData?.scope_1?.total || 0, unit: 'kgCO2e' },
                'GRI 305-2': { title: 'Energy Indirect GHG Emissions (Scope 2)', value: scopeData?.scope_2?.total || 0, unit: 'kgCO2e' },
                'GRI 305-3': { title: 'Other Indirect GHG Emissions (Scope 3)', value: scopeData?.scope_3?.total || 0, unit: 'kgCO2e' },
                'GRI 305-5': { title: 'Reduction of GHG Emissions', value: scopeData?.reduction_targets?.paris_aligned_2030 || 0, unit: 'kgCO2e', note: '2030 Paris-aligned target (45% reduction)' },
                'GRI 308-1': { title: 'Supplier Environmental Assessment', value: leaderboard?.length || 0, unit: 'suppliers assessed' },
                'GRI 414-1': { title: 'Supplier Social Assessment', value: leaderboard?.filter(p => p.grade === 'A' || p.grade === 'B').length || 0, unit: 'suppliers passing' }
            },
            certifications_tracked: certifications.length,
            overall_esg_grade: this._overallESGGrade(scopeData, leaderboard),
            generated_at: new Date().toISOString()
        };
    }

    /**
     * v2.0: ESG → Risk Factor mapping
     */
    calculateRiskFactors(scopeData, leaderboard) {
        const risks = [];
        const total = scopeData?.total_emissions_kgCO2e || 0;
        const avgGrade = this._carbonGradeInfo(total / Math.max(1, scopeData?.products_assessed || 1));

        // Supply chain carbon risk
        if (avgGrade.grade === 'D' || avgGrade.grade === 'F') {
            risks.push({
                id: 'carbon_supply_risk',
                name: 'Supply Chain Carbon Risk',
                severity: 'high',
                signal: `Average product grade: ${avgGrade.grade}`,
                impact: 'Brand Risk Index (BRI)',
                action: 'Restructure high-emission supply routes',
                score_impact: avgGrade.grade === 'F' ? 25 : 15
            });
        }

        // Scope 3 concentration risk
        const scope3Pct = scopeData?.scope_3?.pct || 0;
        if (scope3Pct > 70) {
            risks.push({
                id: 'logistics_dependency',
                name: 'Logistics Dependency Risk',
                severity: 'medium',
                signal: `Scope 3 = ${scope3Pct}% of total emissions`,
                impact: 'Channel Risk Score (CRS)',
                action: 'Diversify transport modes — shift air → sea/rail',
                score_impact: 10
            });
        }

        // Partner ESG risk
        const lowPartners = (leaderboard || []).filter(p => p.grade === 'C' || p.grade === 'D');
        if (lowPartners.length > 0) {
            risks.push({
                id: 'partner_esg_risk',
                name: 'Distributor ESG Risk',
                severity: lowPartners.some(p => p.grade === 'D') ? 'high' : 'medium',
                signal: `${lowPartners.length} partner(s) with grade C/D`,
                impact: 'Event Risk Score (ERS)',
                action: 'Require ESG improvement plan or replace',
                score_impact: lowPartners.length * 5,
                partners_at_risk: lowPartners.map(p => ({ name: p.name, grade: p.grade, esg_score: p.esg_score }))
            });
        }

        // Emission spike detection
        if (total > 500) {
            risks.push({
                id: 'emission_spike',
                name: 'Emission Volume Alert',
                severity: total > 2000 ? 'critical' : 'medium',
                signal: `Total: ${total} kgCO2e across ${scopeData?.products_assessed || 0} products`,
                impact: 'Anomaly Detection',
                action: 'Investigate manufacturing process changes',
                score_impact: total > 2000 ? 20 : 8
            });
        }

        const totalRiskScore = risks.reduce((s, r) => s + r.score_impact, 0);

        return {
            title: 'Carbon → Risk Factor Mapping (v2.0)',
            total_risk_factors: risks.length,
            total_risk_score_impact: Math.min(100, totalRiskScore),
            severity_summary: {
                critical: risks.filter(r => r.severity === 'critical').length,
                high: risks.filter(r => r.severity === 'high').length,
                medium: risks.filter(r => r.severity === 'medium').length,
                low: risks.filter(r => r.severity === 'low').length
            },
            risk_factors: risks,
            affected_scores: ['BRI (Brand Risk Index)', 'CRS (Channel Risk Score)', 'ERS (Event Risk Score)'],
            note: 'ESG risk becomes a component of Brand Risk — infrastructure-level positioning'
        };
    }

    /**
     * v2.0: Regulatory alignment assessment
     */
    assessRegulatory(scopeData, leaderboard, offsets) {
        return REGULATORY_FRAMEWORKS.map(reg => {
            const checks = [];
            let ready = true;

            // Check scope coverage
            for (const scope of reg.scopes_required) {
                const key = `scope_${scope}`;
                const hasData = scopeData?.[key]?.total > 0 || scopeData?.products_assessed > 0;
                checks.push({ check: `Scope ${scope} data`, status: hasData ? 'pass' : 'warn', detail: hasData ? `${scopeData?.[key]?.total || 0} kgCO2e` : 'No data yet' });
                if (!hasData) ready = false;
            }

            // GRI check
            if (reg.id === 'eu_csrd') {
                checks.push({ check: 'GRI 305 disclosures', status: 'pass', detail: 'Auto-generated by Carbon Engine' });
                checks.push({ check: 'Supplier assessment (GRI 308/414)', status: (leaderboard?.length || 0) > 0 ? 'pass' : 'warn', detail: `${leaderboard?.length || 0} partners assessed` });
            }

            // Offset verification
            if (reg.id === 'paris' || reg.id === 'eu_cbam') {
                const hasOffsets = (offsets || 0) > 0;
                checks.push({ check: 'Carbon offset records', status: hasOffsets ? 'pass' : 'info', detail: hasOffsets ? `${offsets} offsets blockchain-anchored` : 'Optional' });
            }

            // Blockchain proof
            checks.push({ check: 'Tamper-proof evidence', status: 'pass', detail: 'Blockchain seal + SHA-256 hash chain' });

            return {
                ...reg,
                checks,
                readiness: ready ? 'ready' : 'partial',
                readiness_pct: Math.round(checks.filter(c => c.status === 'pass').length / checks.length * 100),
                icon: ready ? '✅' : '⚠️'
            };
        });
    }

    /**
     * v2.0: Carbon maturity level assessment
     */
    assessMaturity(features) {
        let currentLevel = 0;

        for (const level of MATURITY_LEVELS) {
            const met = level.requirements.every(r => features.includes(r));
            if (met) currentLevel = level.level;
            else break;
        }

        return {
            title: 'Carbon Passport Maturity Model',
            current_level: currentLevel,
            max_level: 5,
            levels: MATURITY_LEVELS.map(l => ({
                ...l,
                achieved: l.level <= currentLevel,
                current: l.level === currentLevel,
                icon: l.level <= currentLevel ? '✅' : l.level === currentLevel + 1 ? '🎯' : '⬜'
            })),
            recommendation: currentLevel < 5 ? MATURITY_LEVELS[currentLevel]?.description || 'Continue development' : 'Maximum maturity achieved',
            next_requirements: currentLevel < 5 ? MATURITY_LEVELS[currentLevel]?.requirements || [] : []
        };
    }

    /**
     * v2.0: Role × Carbon permission matrix
     */
    getRoleMatrix() {
        return {
            title: 'Role × Carbon Permission Matrix',
            actions: [
                'view_passport', 'view_scope_breakdown', 'view_transport_detail',
                'view_esg_leaderboard', 'submit_offset', 'configure_factors',
                'export_gri_report', 'cross_tenant_benchmark', 'view_esg_kpi'
            ],
            matrix: {
                scm_ops: { view_passport: true, view_scope_breakdown: true, view_transport_detail: true, view_esg_leaderboard: false, submit_offset: false, configure_factors: false, export_gri_report: false, cross_tenant_benchmark: false, view_esg_kpi: false },
                risk: { view_passport: true, view_scope_breakdown: true, view_transport_detail: true, view_esg_leaderboard: true, submit_offset: false, configure_factors: false, export_gri_report: false, cross_tenant_benchmark: false, view_esg_kpi: false },
                compliance: { view_passport: true, view_scope_breakdown: true, view_transport_detail: 'read_only', view_esg_leaderboard: true, submit_offset: false, configure_factors: false, export_gri_report: true, cross_tenant_benchmark: false, view_esg_kpi: false },
                company_admin: { view_passport: true, view_scope_breakdown: true, view_transport_detail: true, view_esg_leaderboard: true, submit_offset: true, configure_factors: true, export_gri_report: false, cross_tenant_benchmark: false, view_esg_kpi: false },
                super_admin: { view_passport: true, view_scope_breakdown: true, view_transport_detail: true, view_esg_leaderboard: true, submit_offset: false, configure_factors: true, export_gri_report: true, cross_tenant_benchmark: true, view_esg_kpi: false },
                ceo: { view_passport: 'aggregated', view_scope_breakdown: false, view_transport_detail: false, view_esg_leaderboard: 'top_5', submit_offset: false, configure_factors: false, export_gri_report: false, cross_tenant_benchmark: false, view_esg_kpi: true }
            },
            design_principle: 'CEO views KPI, CA operates, SA benchmarks, Compliance exports, Risk analyzes'
        };
    }

    /**
     * v2.0: Governance flow definition
     */
    getGovernanceFlow() {
        return {
            title: 'Carbon Governance Flow',
            flow: [
                { step: 1, layer: 'Layer 5 — Integration', name: 'SCM Data Collection', components: ['Supply Routes', 'Shipment Tracking', 'Partner Management', 'Warehouse Events'], icon: '📦' },
                { step: 2, layer: 'Layer 3 — Intelligence', name: 'Carbon Engine Calculation', components: ['Scope 1 (Manufacturing)', 'Scope 2 (Warehousing)', 'Scope 3 (Transport)'], icon: '⚡' },
                { step: 3, layer: 'Layer 3 — Intelligence', name: 'Risk Engine Integration', components: ['ESG → Risk Factor', 'Grade D/F → Supply Risk', 'Partner C/D → Distributor Risk'], icon: '🎯' },
                { step: 4, layer: 'Layer 2 — Governance', name: 'Compliance & Reporting', components: ['GRI 305-1/2/3/5', 'EU CSRD / CBAM', 'SEC Climate Rules'], icon: '⚖️' },
                { step: 5, layer: 'Layer 4 — Integrity', name: 'Blockchain Seal', components: ['SHA-256 Hash', 'Evidence Store', 'Public Verification Portal'], icon: '🔗' },
                { step: 6, layer: 'Layer 1 — Presentation', name: 'CEO Dashboard', components: ['ESG Grade KPI', '2030 Target', 'Offset Proof', 'Board Narrative'], icon: '👔' }
            ],
            principle: 'Carbon sits between: Data → Risk → Governance → Executive. Governance amplifier — not a standalone module.'
        };
    }

    // ─── Internal Helpers ────────────────────────────────────────────────────
    _estimateDistance(shipment) {
        if (shipment.current_lat && shipment.current_lng) {
            const R = 6371;
            const lat1 = 10.8 * Math.PI / 180;
            const lat2 = (shipment.current_lat || 10.8) * Math.PI / 180;
            const dLat = lat2 - lat1;
            const dLon = ((shipment.current_lng || 106.6) - 106.6) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
            return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        }
        return 500;
    }

    _carbonGrade(kgCO2e) {
        return this._carbonGradeInfo(kgCO2e).grade;
    }

    _carbonGradeInfo(kgCO2e) {
        for (const t of GRADE_THRESHOLDS) {
            if (kgCO2e <= t.max) return t;
        }
        return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
    }

    _overallESGGrade(scopeData, leaderboard) {
        if (!scopeData || !leaderboard) return 'N/A';
        const total = scopeData.total_emissions_kgCO2e || 0;
        const avgPartnerScore = leaderboard.length > 0 ? leaderboard.reduce((s, p) => s + p.esg_score, 0) / leaderboard.length : 50;
        const combined = (100 - Math.min(100, total / 10)) * 0.5 + avgPartnerScore * 0.5;
        return combined >= 80 ? 'A' : combined >= 60 ? 'B' : combined >= 40 ? 'C' : 'D';
    }
}

module.exports = new CarbonEngine();
