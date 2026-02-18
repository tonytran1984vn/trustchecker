/**
 * TrustChecker Carbon & ESG Engine
 * Scope 1/2/3 emissions calculation, carbon passport, GRI reporting
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
    'F&B': 2.5,
    'Electronics': 15.0,
    'Fashion': 8.0,
    'Healthcare': 5.0,
    'Industrial': 20.0,
    'Agriculture': 1.8,
    'Energy': 25.0
};

class CarbonEngine {
    /**
     * Calculate product carbon footprint (cradle-to-gate)
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
        const storageDays = events.filter(e => e.event_type === 'store' || e.event_type === 'receive').length * 3; // est 3 days per event
        warehouseEmissions = WAREHOUSE_FACTORS[warehouseType] * storageDays * 0.5; // 0.5 sq.m per unit

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

            const distance = this._estimateDistance(s);
            const weight = 0.05; // 50kg per unit estimated
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

        return {
            product_id: product.id,
            product_name: product.name,
            total_footprint_kgCO2e: Math.round(totalFootprint * 100) / 100,
            grade: this._carbonGrade(totalFootprint),
            scopes: [scope1, scope2, scope3],
            scope_breakdown: {
                scope_1_pct: totalFootprint > 0 ? Math.round(scope1.value / totalFootprint * 100) : 0,
                scope_2_pct: totalFootprint > 0 ? Math.round(scope2.value / totalFootprint * 100) : 0,
                scope_3_pct: totalFootprint > 0 ? Math.round(scope3.value / totalFootprint * 100) : 0
            },
            equivalent: {
                trees_needed: Math.round(totalFootprint / 22 * 10) / 10, // 1 tree absorbs ~22kg/year
                driving_km: Math.round(totalFootprint / 0.192 * 10) / 10, // avg car 0.192 kg/km
                smartphone_charges: Math.round(totalFootprint / 0.008) // 8g per charge
            },
            methodology: 'GHG Protocol Corporate Standard + DEFRA 2025 Factors',
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
            const productShipments = shipments.filter(s => {
                const batch = events.find(e => e.product_id === product.id && e.batch_id);
                return batch ? s.batch_id === batch.batch_id : false;
            });
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
                grade: fp.grade
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
                paris_aligned_2030: Math.round(total * 0.55 * 100) / 100, // 45% reduction target
                net_zero_2050: Math.round(total * 0.1 * 100) / 100 // 90% reduction
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

            // Composite ESG score
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

    // ─── Internal Helpers ────────────────────────────────────────────────────
    _estimateDistance(shipment) {
        // Rough distance estimation using lat/lng if available
        if (shipment.current_lat && shipment.current_lng) {
            // Haversine approximation from origin (HCMC: 10.8, 106.6) to destination
            const R = 6371; // Earth radius km
            const lat1 = 10.8 * Math.PI / 180;
            const lat2 = (shipment.current_lat || 10.8) * Math.PI / 180;
            const dLat = lat2 - lat1;
            const dLon = ((shipment.current_lng || 106.6) - 106.6) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
            return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        }
        return 500; // Default 500km
    }

    _carbonGrade(kgCO2e) {
        if (kgCO2e <= 5) return 'A+';
        if (kgCO2e <= 10) return 'A';
        if (kgCO2e <= 20) return 'B';
        if (kgCO2e <= 40) return 'C';
        if (kgCO2e <= 70) return 'D';
        return 'F';
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
