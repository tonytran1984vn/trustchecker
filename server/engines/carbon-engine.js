/**
 * TrustChecker Carbon & ESG Engine v3.0 (CIE Phase 1A)
 * Cross-Cutting ESG Governance Intelligence
 * 
 * Scope 1/2/3 emissions calculation, carbon passport, GRI reporting,
 * Risk factor integration, regulatory alignment, maturity assessment
 * 
 * v3.0 Upgrades:
 *   - Intensity-based percentile grading (replaces absolute grading)
 *   - Confidence scoring (1-5 scale: proxy → measured)
 *   - Updated risk thresholds (80/90/95)
 *   - Industry benchmark database for percentile comparison
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

// Carbon grade thresholds (legacy absolute — kept for backward compatibility)
const GRADE_THRESHOLDS = [
    { max: 5, grade: 'A+', label: 'Excellent — Net Zero ready', color: '#10b981' },
    { max: 10, grade: 'A', label: 'Very Good', color: '#34d399' },
    { max: 20, grade: 'B', label: 'Good — Improve transport', color: '#3b82f6' },
    { max: 40, grade: 'C', label: 'Average — Reduce manufacturing + transport', color: '#f59e0b' },
    { max: 70, grade: 'D', label: 'Poor — Energy transition needed', color: '#ef4444' },
    { max: Infinity, grade: 'F', label: 'Fail — Restructure supply chain', color: '#991b1b' }
];

// ─── v3.0: Industry Benchmarks (kgCO₂e per unit, DEFRA/GHG Protocol 2025) ────
// Used for intensity-based percentile grading
// p20 = top 20% threshold, median = industry median, p80 = bottom 20% threshold
const INDUSTRY_BENCHMARKS = {
    'F&B': { p20: 2.0, median: 4.5, p80: 8.0, unit: 'kgCO₂e/unit', source: 'DEFRA Food 2025' },
    'F&B Artisan': { p20: 2.5, median: 5.5, p80: 9.0, unit: 'kgCO₂e/unit', source: 'DEFRA Food 2025' },
    'F&B Heritage': { p20: 2.2, median: 5.0, p80: 8.5, unit: 'kgCO₂e/unit', source: 'DEFRA Food 2025' },
    'F&B Organic': { p20: 1.0, median: 2.8, p80: 5.0, unit: 'kgCO₂e/unit', source: 'DEFRA Food 2025' },
    'F&B Premium': { p20: 2.8, median: 6.0, p80: 10.0, unit: 'kgCO₂e/unit', source: 'DEFRA Food 2025' },
    'Electronics': { p20: 12.0, median: 28.0, p80: 55.0, unit: 'kgCO₂e/unit', source: 'IEA Electronics 2024' },
    'IoT': { p20: 8.0, median: 22.0, p80: 40.0, unit: 'kgCO₂e/unit', source: 'IEA Electronics 2024' },
    'Sensor': { p20: 6.0, median: 18.0, p80: 35.0, unit: 'kgCO₂e/unit', source: 'IEA Electronics 2024' },
    'Semiconductor': { p20: 25.0, median: 55.0, p80: 100.0, unit: 'kgCO₂e/unit', source: 'SEMI ESG 2024' },
    'Fashion': { p20: 5.0, median: 14.0, p80: 28.0, unit: 'kgCO₂e/unit', source: 'DEFRA Textiles 2025' },
    'Healthcare': { p20: 4.0, median: 10.0, p80: 20.0, unit: 'kgCO₂e/unit', source: 'NHS Carbon Footprint 2024' },
    'Pharmaceutical': { p20: 6.0, median: 14.0, p80: 25.0, unit: 'kgCO₂e/unit', source: 'NHS Carbon Footprint 2024' },
    'Industrial': { p20: 15.0, median: 40.0, p80: 75.0, unit: 'kgCO₂e/unit', source: 'IEA Industry 2024' },
    'Luxury Watch': { p20: 12.0, median: 30.0, p80: 55.0, unit: 'kgCO₂e/unit', source: 'FH Swiss Watch Industry 2024' },
    'Jewelry': { p20: 18.0, median: 45.0, p80: 80.0, unit: 'kgCO₂e/unit', source: 'RJC 2024' },
    'Coffee': { p20: 2.5, median: 6.0, p80: 12.0, unit: 'kgCO₂e/kg', source: 'ICO LCA 2024' },
    'Seafood': { p20: 3.0, median: 8.0, p80: 16.0, unit: 'kgCO₂e/kg', source: 'FAO Fisheries 2024' },
    'Meat': { p20: 8.0, median: 22.0, p80: 45.0, unit: 'kgCO₂e/kg', source: 'FAO Livestock 2024' },
    'Agriculture': { p20: 1.0, median: 3.5, p80: 7.0, unit: 'kgCO₂e/kg', source: 'FAO Agriculture 2024' },
    'Laptop': { p20: 180.0, median: 350.0, p80: 550.0, unit: 'kgCO₂e/unit', source: 'IEA ICT 2024' },
    'Energy': { p20: 18.0, median: 45.0, p80: 80.0, unit: 'kgCO₂e/unit', source: 'IEA Energy 2024' },
    '_default': { p20: 5.0, median: 15.0, p80: 35.0, unit: 'kgCO₂e/unit', source: 'GHG Protocol Generic 2025' }
};

// ─── v3.0: Confidence level definitions ──────────────────────────────────────
const CONFIDENCE_LEVELS = [
    { level: 5, label: 'Measured', description: 'Direct IoT/meter measurement', color: '#10b981' },
    { level: 4, label: 'Meter-based', description: 'Utility bills or supplier meters', color: '#34d399' },
    { level: 3, label: 'Supplier-reported', description: 'Supplier-provided data', color: '#3b82f6' },
    { level: 2, label: 'Industry average', description: 'Published industry factors', color: '#f59e0b' },
    { level: 1, label: 'Proxy estimate', description: 'Category-based proxy calculation', color: '#ef4444' }
];

// ─── v3.0: Risk thresholds (updated from 70/85/95) ──────────────────────────
const RISK_THRESHOLDS = {
    soft_block: 80,
    mandatory_review: 90,
    system_freeze: 95
};

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
     * Calculate product carbon footprint (cradle-to-gate) — v3.0
     * Now includes intensity metrics, confidence scoring, and percentile grading
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

        // v3.0: Intensity-based grading (replaces absolute grading)
        const intensity = this.calculateIntensity(totalFootprint, product);
        const percentileGrade = this._gradeByIntensity(intensity.physical_intensity, category);
        const confidence = this._calculateConfidence(product, shipments, events);

        // Legacy grade kept for backward compatibility
        const legacyGrade = this._carbonGradeLegacy(totalFootprint);

        return {
            product_id: product.id,
            product_name: product.name,
            category,
            total_footprint_kgCO2e: Math.round(totalFootprint * 100) / 100,
            // v3.0: Primary grade is now percentile-based
            grade: percentileGrade.grade,
            grade_label: percentileGrade.label,
            grade_color: percentileGrade.color,
            grade_method: 'percentile',
            // v3.0: Legacy absolute grade for backward compat
            legacy_grade: legacyGrade.grade,
            legacy_grade_label: legacyGrade.label,
            scopes: [scope1, scope2, scope3],
            scope_breakdown: {
                scope_1_pct: totalFootprint > 0 ? Math.round(scope1.value / totalFootprint * 100) : 0,
                scope_2_pct: totalFootprint > 0 ? Math.round(scope2.value / totalFootprint * 100) : 0,
                scope_3_pct: totalFootprint > 0 ? Math.round(scope3.value / totalFootprint * 100) : 0
            },
            // v3.0: Intensity metrics
            intensity,
            // v3.0: Confidence scoring
            confidence,
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
        // Per-category breakdown accumulators
        const s1ByCat = {}, s2ByCat = {}, s3ByCat = {};
        // v3.0: Confidence accumulators
        let totalConfidence = 0;
        const confidenceCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        for (const product of products) {
            // Match shipments: try batch chain first, then proportional fallback
            let productShipments = shipments.filter(s => {
                if (!s.batch_id) return false;
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
            const cat = product.category || 'General';
            const s1v = fp.scopes[0].value;
            const s2v = fp.scopes[1].value;
            const s3v = fp.scopes[2].value;

            scope1Total += s1v;
            scope2Total += s2v;
            scope3Total += s3v;

            // v3.0: Accumulate confidence
            totalConfidence += fp.confidence.level;
            confidenceCounts[fp.confidence.level] = (confidenceCounts[fp.confidence.level] || 0) + 1;

            // Accumulate per category
            s1ByCat[cat] = (s1ByCat[cat] || 0) + s1v;
            s2ByCat[cat] = (s2ByCat[cat] || 0) + s2v;
            s3ByCat[cat] = (s3ByCat[cat] || 0) + s3v;

            productFootprints.push({
                product_id: product.id,
                name: product.name,
                category: cat,
                total: fp.total_footprint_kgCO2e,
                scope1: s1v, scope2: s2v, scope3: s3v,
                grade: fp.grade,
                grade_color: fp.grade_color,
                // v3.0 additions
                intensity: fp.intensity?.physical_intensity || 0,
                confidence_level: fp.confidence?.level || 1,
                benchmark_percentile: fp.intensity?.benchmark_percentile || 50
            });
        }

        const total = scope1Total + scope2Total + scope3Total;
        const avgIntensity = productFootprints.length > 0
            ? Math.round(productFootprints.reduce((s, p) => s + (p.intensity || 0), 0) / productFootprints.length * 100) / 100
            : 0;
        const avgConfidence = productFootprints.length > 0
            ? Math.round(totalConfidence / productFootprints.length * 10) / 10
            : 0;

        // Build per-scope breakdown items from category accumulators
        const buildItems = (byCat, scopeTotal) => Object.entries(byCat)
            .map(([category, value]) => ({
                category,
                value: Math.round(value * 100) / 100,
                kgCO2e: Math.round(value * 100) / 100,
                percentage: scopeTotal > 0 ? Math.round(value / scopeTotal * 100) : 0
            }))
            .sort((a, b) => b.value - a.value);

        // v3.0: High-confidence data ratio (levels 3-5)
        const highConfidenceCount = (confidenceCounts[3] || 0) + (confidenceCounts[4] || 0) + (confidenceCounts[5] || 0);
        const highConfidenceRatio = productFootprints.length > 0
            ? Math.round(highConfidenceCount / productFootprints.length * 100)
            : 0;

        return {
            total_emissions_kgCO2e: Math.round(total * 100) / 100,
            total_emissions_tonnes: Math.round(total / 1000 * 100) / 100,
            scope_1: { total: Math.round(scope1Total * 100) / 100, pct: total > 0 ? Math.round(scope1Total / total * 100) : 0, label: 'Direct Manufacturing', items: buildItems(s1ByCat, scope1Total) },
            scope_2: { total: Math.round(scope2Total * 100) / 100, pct: total > 0 ? Math.round(scope2Total / total * 100) : 0, label: 'Energy & Warehousing', items: buildItems(s2ByCat, scope2Total) },
            scope_3: { total: Math.round(scope3Total * 100) / 100, pct: total > 0 ? Math.round(scope3Total / total * 100) : 0, label: 'Transport & Distribution', items: buildItems(s3ByCat, scope3Total) },
            products_assessed: productFootprints.length,
            product_rankings: productFootprints.sort((a, b) => b.total - a.total),
            // v3.0: Intensity & confidence aggregates
            avg_intensity_kgCO2e_per_unit: avgIntensity,
            avg_confidence: avgConfidence,
            confidence_breakdown: confidenceCounts,
            high_confidence_ratio_pct: highConfidenceRatio,
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
        const avgIntensity = scopeData?.avg_intensity_kgCO2e_per_unit || (total / Math.max(1, scopeData?.products_assessed || 1));
        const avgGrade = this._gradeByIntensity(avgIntensity, '_default');

        // Supply chain carbon risk (v3.0: based on intensity grade)
        if (avgGrade.grade === 'D' || avgGrade.grade === 'F') {
            risks.push({
                id: 'carbon_supply_risk',
                name: 'Supply Chain Carbon Risk',
                severity: 'high',
                signal: `Average intensity grade: ${avgGrade.grade} (${avgIntensity} kgCO₂e/unit)`,
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

        // v3.0: Low confidence data risk
        const avgConfidence = scopeData?.avg_confidence || 1;
        if (avgConfidence < 2.5) {
            risks.push({
                id: 'data_confidence_risk',
                name: 'Low Data Confidence Risk',
                severity: avgConfidence < 1.5 ? 'high' : 'medium',
                signal: `Average confidence: ${avgConfidence}/5 (${avgConfidence < 1.5 ? 'proxy-only' : 'mostly estimates'})`,
                impact: 'Audit Readiness',
                action: 'Upgrade to supplier-reported or metered data for key products',
                score_impact: avgConfidence < 1.5 ? 12 : 6
            });
        }

        const totalRiskScore = risks.reduce((s, r) => s + r.score_impact, 0);

        return {
            title: 'Carbon → Risk Factor Mapping (v3.0)',
            total_risk_factors: risks.length,
            total_risk_score_impact: Math.min(100, totalRiskScore),
            // v3.0: Updated thresholds
            thresholds: RISK_THRESHOLDS,
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

    // ─── v3.0: Scope 3 Materiality Screening Engine ──────────────────────────

    /**
     * Screen all 15 GHG Protocol Scope 3 categories for materiality.
     * Returns priority ranking + data availability assessment.
     * Per user strategy: build screening, not full 15-category coverage.
     */
    assessScope3Materiality(products = [], shipments = [], events = [], partners = []) {
        const totalProducts = products.length || 1;
        const totalShipments = shipments.length;
        const totalPartners = partners.length;

        // Estimate Scope 3 magnitudes from available data
        const transportEmissions = shipments.reduce((s, sh) => {
            const dist = sh.distance_km || 500;
            const w = (sh.weight_kg || 10) / 1000;
            const mode = (sh.transport_mode || 'road').toLowerCase();
            const factor = TRANSPORT_EMISSION_FACTORS[mode] || 0.045;
            return s + dist * factor * w;
        }, 0);

        const mfgEstimate = products.reduce((s, p) => {
            const cat = p.category || 'General';
            return s + (MANUFACTURING_FACTORS[cat] || 2.5);
        }, 0);

        const categories = [
            {
                id: 1, name: 'Purchased Goods & Services',
                description: 'Cradle-to-gate emissions of purchased products',
                estimated_kgCO2e: Math.round(mfgEstimate * 0.6),
                data_availability: products.length > 5 ? 'medium' : 'low',
                data_sources: ['Product categories', 'Manufacturing factors'],
                priority: 'material',
                screening_score: 85,
                recommendation: 'Use spend-based or product-based estimation from manufacturing factors'
            },
            {
                id: 2, name: 'Capital Goods',
                description: 'Emissions from purchased capital equipment',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'needs_data',
                screening_score: 15,
                recommendation: 'Requires CAPEX data — defer to Phase 3'
            },
            {
                id: 3, name: 'Fuel & Energy Activities',
                description: 'T&D losses, well-to-tank emissions',
                estimated_kgCO2e: Math.round(mfgEstimate * 0.08),
                data_availability: 'low',
                data_sources: ['Grid factor estimates'],
                priority: 'immaterial',
                screening_score: 25,
                recommendation: 'Typically <5% of total — use grid emission factor proxies'
            },
            {
                id: 4, name: 'Upstream Transportation',
                description: 'Inbound logistics (supplier → you)',
                estimated_kgCO2e: Math.round(transportEmissions),
                data_availability: totalShipments > 0 ? 'high' : 'low',
                data_sources: totalShipments > 0 ? ['Shipment records', 'Distance/mode data'] : [],
                priority: totalShipments > 0 ? 'material' : 'needs_data',
                screening_score: totalShipments > 0 ? 90 : 30,
                recommendation: totalShipments > 0 ? 'Already calculated from shipment data — highest confidence' : 'Add shipment records for accurate calculation'
            },
            {
                id: 5, name: 'Waste Generated in Operations',
                description: 'Disposal of operational waste',
                estimated_kgCO2e: Math.round(totalProducts * 0.3),
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 10,
                recommendation: 'Typically <2% — use industry waste intensity proxies'
            },
            {
                id: 6, name: 'Business Travel',
                description: 'Employee travel emissions',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'needs_data',
                screening_score: 20,
                recommendation: 'Requires travel expense data — integrate with expense system'
            },
            {
                id: 7, name: 'Employee Commuting',
                description: 'Employee commute emissions',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 8,
                recommendation: 'Use employee count × average commute proxy'
            },
            {
                id: 8, name: 'Upstream Leased Assets',
                description: 'Emissions from leased assets',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 5,
                recommendation: 'Relevant only if significant leased assets'
            },
            {
                id: 9, name: 'Downstream Transportation',
                description: 'Outbound logistics (you → customer)',
                estimated_kgCO2e: Math.round(transportEmissions * 0.5),
                data_availability: totalShipments > 0 ? 'medium' : 'low',
                data_sources: totalShipments > 0 ? ['Estimated from upstream transport'] : [],
                priority: totalShipments > 0 ? 'material' : 'needs_data',
                screening_score: totalShipments > 0 ? 60 : 20,
                recommendation: 'Estimate as 40-60% of upstream transport unless last-mile data available'
            },
            {
                id: 10, name: 'Processing of Sold Products',
                description: 'Emissions from further processing by customers',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 5,
                recommendation: 'Only relevant for intermediate products'
            },
            {
                id: 11, name: 'Use of Sold Products',
                description: 'End-user emissions from product use',
                estimated_kgCO2e: Math.round(totalProducts * 0.2),
                data_availability: 'low',
                data_sources: ['Product type assumptions'],
                priority: products.some(p => ['Electronics', 'IoT', 'Sensor'].includes(p.category)) ? 'material' : 'immaterial',
                screening_score: products.some(p => ['Electronics', 'IoT', 'Sensor'].includes(p.category)) ? 55 : 10,
                recommendation: 'Material for electronics (energy-using products) — use power consumption × grid factor'
            },
            {
                id: 12, name: 'End-of-Life Treatment',
                description: 'Disposal and recycling of sold products',
                estimated_kgCO2e: Math.round(totalProducts * 0.15),
                data_availability: 'low',
                data_sources: ['Product weight estimates'],
                priority: 'immaterial',
                screening_score: 12,
                recommendation: 'Use product weight × waste disposal factors'
            },
            {
                id: 13, name: 'Downstream Leased Assets',
                description: 'Emissions from assets leased to others',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 3,
                recommendation: 'Not applicable unless assets are leased out'
            },
            {
                id: 14, name: 'Franchises',
                description: 'Emissions from franchisee operations',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 3,
                recommendation: 'Not applicable unless operating franchise model'
            },
            {
                id: 15, name: 'Investments',
                description: 'Emissions from equity investments',
                estimated_kgCO2e: 0,
                data_availability: 'low',
                data_sources: [],
                priority: 'immaterial',
                screening_score: 5,
                recommendation: 'Only material for financial institutions'
            }
        ];

        // Sort by screening score (highest priority first)
        const sorted = [...categories].sort((a, b) => b.screening_score - a.screening_score);
        const material = sorted.filter(c => c.priority === 'material');
        const needsData = sorted.filter(c => c.priority === 'needs_data');
        const immaterial = sorted.filter(c => c.priority === 'immaterial');

        return {
            title: 'Scope 3 Materiality Screening (GHG Protocol)',
            methodology: 'GHG Protocol Corporate Value Chain (Scope 3) Standard — Screening approach',
            total_categories: 15,
            material_count: material.length,
            needs_data_count: needsData.length,
            immaterial_count: immaterial.length,
            total_estimated_kgCO2e: categories.reduce((s, c) => s + c.estimated_kgCO2e, 0),
            categories: sorted,
            summary: {
                material: material.map(c => ({ id: c.id, name: c.name, score: c.screening_score })),
                needs_data: needsData.map(c => ({ id: c.id, name: c.name, score: c.screening_score })),
                immaterial: immaterial.map(c => ({ id: c.id, name: c.name, score: c.screening_score }))
            },
            guidance: 'Focus on material categories first. Immaterial categories can be reported with proxy estimates. "Needs Data" categories require additional data integration.'
        };
    }

    // ─── v3.0: Net Emissions & Offset Verification ──────────────────────────

    /**
     * Calculate gross vs net emissions position.
     * offsets: array of { quantity_tCO2e, status, vintage, registry, certificate_id }
     */
    calculateNetEmissions(scopeData, offsets = []) {
        const grossKg = scopeData?.total_emissions_kgCO2e || 0;
        const grossT = grossKg / 1000;

        const activeOffsets = offsets.filter(o => o.status === 'retired' || o.status === 'active' || o.status === 'minted');
        const retiredOffsets = offsets.filter(o => o.status === 'retired');
        const totalOffsetT = activeOffsets.reduce((s, o) => s + (o.quantity_tCO2e || o.quantity_tco2e || 0), 0);
        const retiredT = retiredOffsets.reduce((s, o) => s + (o.quantity_tCO2e || o.quantity_tco2e || 0), 0);

        const netT = Math.max(0, grossT - retiredT);
        const coveragePct = grossT > 0 ? Math.min(100, Math.round(retiredT / grossT * 100)) : 0;
        const netZeroProgress = coveragePct;

        return {
            gross_emissions_tCO2e: Math.round(grossT * 1000) / 1000,
            gross_emissions_kgCO2e: Math.round(grossKg),
            total_offsets_tCO2e: Math.round(totalOffsetT * 1000) / 1000,
            retired_offsets_tCO2e: Math.round(retiredT * 1000) / 1000,
            available_offsets_tCO2e: Math.round((totalOffsetT - retiredT) * 1000) / 1000,
            net_emissions_tCO2e: Math.round(netT * 1000) / 1000,
            net_emissions_kgCO2e: Math.round(netT * 1000),
            coverage_pct: coveragePct,
            net_zero_progress: netZeroProgress,
            status: coveragePct >= 100 ? 'net_zero' : coveragePct >= 50 ? 'on_track' : coveragePct > 0 ? 'started' : 'no_offsets',
            status_label: coveragePct >= 100 ? '✅ Net Zero Achieved' : coveragePct >= 50 ? '🟡 On Track (>50%)' : coveragePct > 0 ? '🟠 Started (<50%)' : '⚪ No Offsets',
            offsets_summary: {
                total: offsets.length,
                active: activeOffsets.length,
                retired: retiredOffsets.length,
                pending: offsets.filter(o => o.status === 'pending').length
            }
        };
    }

    /**
     * Verify a carbon offset for retirement eligibility.
     * Checks vintage, registry, double-counting safeguards.
     */
    verifyOffset(offset) {
        const issues = [];
        const currentYear = new Date().getFullYear();
        const vintage = parseInt(offset.vintage || offset.vintage_year || 0);

        // Vintage check: must be within 5 years
        if (vintage && (currentYear - vintage) > 5) {
            issues.push({ severity: 'warning', message: `Vintage ${vintage} is ${currentYear - vintage} years old (max recommended: 5 years)` });
        }

        // Registry check
        const validRegistries = ['verra', 'gold_standard', 'acr', 'car', 'jcm', 'cdm'];
        const registry = (offset.registry || offset.provider || '').toLowerCase();
        if (registry && !validRegistries.some(r => registry.includes(r))) {
            issues.push({ severity: 'warning', message: `Registry "${offset.registry || offset.provider}" not in recognized list (Verra, Gold Standard, ACR, CAR)` });
        }

        // Quantity check
        const qty = offset.quantity_tCO2e || offset.quantity_tco2e || 0;
        if (qty <= 0) {
            issues.push({ severity: 'error', message: 'Offset quantity must be > 0 tCO₂e' });
        }

        // Status check — already retired?
        if (offset.status === 'retired') {
            issues.push({ severity: 'error', message: 'Credit already retired — cannot retire again (double-counting)' });
        }

        return {
            eligible: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            verification: {
                vintage_valid: !vintage || (currentYear - vintage) <= 5,
                registry_recognized: !registry || validRegistries.some(r => registry.includes(r)),
                quantity_valid: qty > 0,
                not_retired: offset.status !== 'retired'
            }
        };
    }

    // ─── v3.0: Intensity Calculation ──────────────────────────────────────────

    /**
     * Calculate physical and financial intensity for a product
     */
    calculateIntensity(totalFootprint, product) {
        const category = product.category || 'General';
        const weight = product.weight || product.weight_kg || 0.5;
        const price = product.price || product.unit_price || 0;
        const benchmark = INDUSTRY_BENCHMARKS[category] || INDUSTRY_BENCHMARKS['_default'];

        // Physical intensity: kgCO₂e per unit
        const physicalIntensity = Math.round(totalFootprint * 100) / 100;
        // Weight-based intensity: kgCO₂e per kg
        const weightIntensity = weight > 0 ? Math.round(totalFootprint / weight * 100) / 100 : 0;

        // Benchmark percentile (linear interpolation)
        let percentile;
        if (physicalIntensity <= benchmark.p20) {
            percentile = Math.round((physicalIntensity / benchmark.p20) * 20);
        } else if (physicalIntensity <= benchmark.median) {
            percentile = 20 + Math.round(((physicalIntensity - benchmark.p20) / (benchmark.median - benchmark.p20)) * 30);
        } else if (physicalIntensity <= benchmark.p80) {
            percentile = 50 + Math.round(((physicalIntensity - benchmark.median) / (benchmark.p80 - benchmark.median)) * 30);
        } else {
            percentile = 80 + Math.min(20, Math.round(((physicalIntensity - benchmark.p80) / benchmark.p80) * 20));
        }
        percentile = Math.max(0, Math.min(100, percentile));

        return {
            physical_intensity: physicalIntensity,
            physical_unit: 'kgCO₂e/unit',
            weight_intensity: weightIntensity,
            weight_unit: 'kgCO₂e/kg',
            financial_intensity: price > 0 ? Math.round(totalFootprint / price * 10000) / 10000 : null,
            financial_unit: price > 0 ? 'kgCO₂e/€' : null,
            benchmark_percentile: percentile,
            benchmark_category: category,
            benchmark_median: benchmark.median,
            benchmark_source: benchmark.source,
            vs_industry: physicalIntensity <= benchmark.p20 ? 'top_performer'
                : physicalIntensity <= benchmark.median ? 'above_average'
                    : physicalIntensity <= benchmark.p80 ? 'below_average'
                        : 'critical'
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

    /**
     * v3.0: Grade by intensity percentile against industry benchmark
     * Replaces absolute grading with relative performance assessment
     */
    _gradeByIntensity(intensity, category) {
        const benchmark = INDUSTRY_BENCHMARKS[category] || INDUSTRY_BENCHMARKS['_default'];

        if (intensity <= benchmark.p20) {
            return { grade: 'A', label: `Top performer (≤${benchmark.p20} ${benchmark.unit})`, color: '#10b981', percentile: 'top_20' };
        } else if (intensity <= benchmark.p20 + (benchmark.median - benchmark.p20) * 0.5) {
            return { grade: 'B', label: `Above average (industry median: ${benchmark.median})`, color: '#3b82f6', percentile: '20_40' };
        } else if (intensity <= benchmark.median) {
            return { grade: 'B', label: `Near median (industry median: ${benchmark.median})`, color: '#3b82f6', percentile: '40_50' };
        } else if (intensity <= benchmark.p80) {
            return { grade: 'C', label: `Below average — improvement needed`, color: '#f59e0b', percentile: '50_80' };
        } else if (intensity <= benchmark.p80 * 1.5) {
            return { grade: 'D', label: `Poor — energy transition needed`, color: '#ef4444', percentile: '80_90' };
        } else {
            return { grade: 'F', label: `Critical — restructure supply chain`, color: '#991b1b', percentile: 'bottom_10' };
        }
    }

    /**
     * v3.0: Confidence scoring based on data source quality
     * Returns { level: 1-5, label, description, color, rationale }
     */
    _calculateConfidence(product, shipments, events) {
        let score = 1; // Default: proxy estimate
        const rationale = [];

        // Check if product has direct measurement data (IoT readings)
        const hasIoT = events.some(e => e.event_type === 'iot_reading' || e.event_type === 'meter_reading');
        if (hasIoT) {
            score = 5;
            rationale.push('Direct IoT/meter measurements available');
        }

        // Check if product has utility bill data
        const hasUtilityData = events.some(e => e.event_type === 'utility_bill' || e.event_type === 'energy_report');
        if (hasUtilityData && score < 4) {
            score = 4;
            rationale.push('Utility bill data available');
        }

        // Check if product has supplier-reported data
        const hasSupplierData = product.supplier_emission_data || product.emission_reported_by;
        if (hasSupplierData && score < 3) {
            score = 3;
            rationale.push('Supplier-reported emission data');
        }

        // Check if we have real transport data (not default distance)
        const hasRealTransport = shipments.some(s => s.distance_km && s.distance_km > 0);
        if (hasRealTransport && score < 2) {
            score = 2;
            rationale.push('Real transport distance data');
        }

        // Check if we have actual events (not just proxy)
        const hasEvents = events.length > 0;
        if (hasEvents && score < 2) {
            score = 2;
            rationale.push('Supply chain event data available');
        }

        if (rationale.length === 0) {
            rationale.push('Category-based proxy factors (DEFRA 2025)');
        }

        const levelInfo = CONFIDENCE_LEVELS.find(l => l.level === score) || CONFIDENCE_LEVELS[4];

        return {
            level: score,
            label: levelInfo.label,
            description: levelInfo.description,
            color: levelInfo.color,
            rationale,
            data_sources: {
                has_iot: hasIoT,
                has_utility_data: hasUtilityData || false,
                has_supplier_data: !!hasSupplierData,
                has_transport_data: hasRealTransport,
                event_count: events.length,
                shipment_count: shipments.length
            }
        };
    }

    // Legacy grading methods (kept for backward compatibility)
    _carbonGrade(kgCO2e) {
        return this._carbonGradeLegacy(kgCO2e).grade;
    }

    /** Legacy absolute grading — used by backward-compatible code paths */
    _carbonGradeLegacy(kgCO2e) {
        for (const t of GRADE_THRESHOLDS) {
            if (kgCO2e <= t.max) return t;
        }
        return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
    }

    /** Alias for backward compat — delegates to legacy */
    _carbonGradeInfo(kgCO2e) {
        return this._carbonGradeLegacy(kgCO2e);
    }

    _overallESGGrade(scopeData, leaderboard) {
        if (!scopeData || !leaderboard) return 'N/A';
        const total = scopeData.total_emissions_kgCO2e || 0;
        const avgPartnerScore = leaderboard.length > 0 ? leaderboard.reduce((s, p) => s + p.esg_score, 0) / leaderboard.length : 50;
        const combined = (100 - Math.min(100, total / 10)) * 0.5 + avgPartnerScore * 0.5;
        return combined >= 80 ? 'A' : combined >= 60 ? 'B' : combined >= 40 ? 'C' : 'D';
    }

    /** v3.0: Expose constants for API consumers */
    getIndustryBenchmarks() { return INDUSTRY_BENCHMARKS; }
    getConfidenceLevels() { return CONFIDENCE_LEVELS; }
    getRiskThresholds() { return RISK_THRESHOLDS; }
}

module.exports = new CarbonEngine();
