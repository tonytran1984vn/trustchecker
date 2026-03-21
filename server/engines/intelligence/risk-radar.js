/**
 * TrustChecker Risk Radar Engine
 * Multi-dimensional supply chain risk assessment across 8 vectors
 * Aggregates partner, geographic, route, financial, compliance, cyber,
 * environmental, and supply disruption risks into unified threat index
 */

class RiskRadar {
    /**
     * Compute full risk radar — all 8 dimensions
     */
    computeRadar(data = {}) {
        const { partners = [], shipments = [], violations = [], leaks = [], alerts = [], inventory = [], certifications = [], sustainability = [] } = data;

        const vectors = {
            partner_risk: this.assessPartnerRisk(partners, violations),
            geographic_risk: this.assessGeographicRisk(partners, shipments),
            route_risk: this.assessRouteRisk(shipments),
            financial_risk: this.assessFinancialRisk(leaks, violations),
            compliance_risk: this.assessComplianceRisk(certifications),
            cyber_risk: this.assessCyberRisk(partners, alerts),
            environmental_risk: this.assessEnvironmentalRisk(sustainability),
            supply_disruption: this.assessSupplyDisruption(inventory, partners, shipments)
        };

        // Overall threat index (0-100, higher = more risky)
        const weights = { partner_risk: 0.2, geographic_risk: 0.1, route_risk: 0.15, financial_risk: 0.15, compliance_risk: 0.1, cyber_risk: 0.1, environmental_risk: 0.05, supply_disruption: 0.15 };
        let overallScore = 0;
        for (const [key, weight] of Object.entries(weights)) {
            overallScore += vectors[key].score * weight;
        }

        return {
            overall_threat_index: Math.round(overallScore * 10) / 10,
            threat_level: overallScore > 70 ? 'critical' : overallScore > 50 ? 'high' : overallScore > 30 ? 'medium' : 'low',
            vectors,
            updated_at: new Date().toISOString()
        };
    }

    // ─── Vector 1: Partner Risk ──────────────────────────────────────────────
    assessPartnerRisk(partners, violations) {
        if (partners.length === 0) return { score: 0, level: 'low', details: {} };

        const kycFailed = partners.filter(p => p.kyc_status === 'failed' || p.kyc_status === 'pending').length;
        const lowTrust = partners.filter(p => (p.trust_score || 50) < 50).length;
        const violationCount = violations.length;

        const score = Math.min(100,
            (kycFailed / partners.length * 40) +
            (lowTrust / partners.length * 30) +
            (Math.min(violationCount, 10) * 3)
        );

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                total_partners: partners.length,
                kyc_incomplete: kycFailed,
                low_trust_partners: lowTrust,
                sla_violations: violationCount,
                avg_trust_score: Math.round(partners.reduce((s, p) => s + (p.trust_score || 50), 0) / partners.length)
            }
        };
    }

    // ─── Vector 2: Geographic Risk ───────────────────────────────────────────
    assessGeographicRisk(partners, shipments) {
        const highRiskRegions = { 'CN': 35, 'RU': 45, 'IN': 20, 'KR': 10, 'TH': 15 };
        const concentrationMap = {};

        partners.forEach(p => {
            const country = p.country || 'XX';
            concentrationMap[country] = (concentrationMap[country] || 0) + 1;
        });

        // Concentration risk: Herfindahl-Hirschman Index
        const totalPartners = partners.length || 1;
        let hhi = 0;
        for (const count of Object.values(concentrationMap)) {
            const share = count / totalPartners;
            hhi += share * share;
        }
        hhi = hhi * 10000; // Normalize to 0-10000

        // Country risk
        let countryRisk = 0;
        partners.forEach(p => {
            countryRisk += highRiskRegions[p.country] || 5;
        });
        countryRisk = totalPartners > 0 ? countryRisk / totalPartners : 0;

        const score = Math.min(100, hhi / 100 + countryRisk);

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                herfindahl_index: Math.round(hhi),
                concentration_warning: hhi > 5000 ? 'High concentration — diversification needed' : 'Adequate diversification',
                country_distribution: concentrationMap,
                avg_country_risk: Math.round(countryRisk * 10) / 10
            }
        };
    }

    // ─── Vector 3: Route Risk ────────────────────────────────────────────────
    assessRouteRisk(shipments) {
        if (shipments.length === 0) return { score: 0, level: 'low', details: {} };

        const lateShipments = shipments.filter(s => {
            if (!s.actual_delivery || !s.estimated_delivery) return false;
            return new Date(s.actual_delivery) > new Date(s.estimated_delivery);
        });

        const inTransit = shipments.filter(s => s.status === 'in_transit' || s.status === 'pending');
        const lateRate = lateShipments.length / shipments.length;
        const avgDelay = lateShipments.length > 0
            ? lateShipments.reduce((s, sh) => s + (new Date(sh.actual_delivery) - new Date(sh.estimated_delivery)) / 3600000, 0) / lateShipments.length
            : 0;

        const carrierStats = {};
        shipments.forEach(s => {
            const c = s.carrier || 'Unknown';
            if (!carrierStats[c]) carrierStats[c] = { total: 0, late: 0 };
            carrierStats[c].total++;
            if (lateShipments.find(ls => ls.id === s.id)) carrierStats[c].late++;
        });

        const score = Math.min(100, lateRate * 80 + Math.min(avgDelay / 48, 1) * 20);

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                total_shipments: shipments.length,
                late_shipments: lateShipments.length,
                on_time_rate: Math.round((1 - lateRate) * 100) + '%',
                avg_delay_hours: Math.round(avgDelay * 10) / 10,
                in_transit: inTransit.length,
                carrier_performance: Object.entries(carrierStats).map(([c, s]) => ({
                    carrier: c, total: s.total, late: s.late,
                    reliability: Math.round((1 - s.late / s.total) * 100) + '%'
                }))
            }
        };
    }

    // ─── Vector 4: Financial Risk ────────────────────────────────────────────
    assessFinancialRisk(leaks, violations) {
        const leakCount = leaks.length;
        const priceDeviation = leaks.reduce((s, l) => {
            if (l.authorized_price && l.listing_price) {
                return s + Math.abs(l.listing_price - l.authorized_price) / l.authorized_price;
            }
            return s;
        }, 0);

        const penaltyTotal = violations.reduce((s, v) => s + (v.penalty_amount || 0), 0);
        const score = Math.min(100,
            Math.min(leakCount * 5, 40) +
            (leakCount > 0 ? (priceDeviation / leakCount) * 30 : 0) +
            Math.min(penaltyTotal / 1000, 30)
        );

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                leak_alerts: leakCount,
                avg_price_deviation: leakCount > 0 ? Math.round(priceDeviation / leakCount * 100) + '%' : '0%',
                total_penalties: penaltyTotal,
                gray_market_risk: leakCount > 3 ? 'elevated' : 'normal'
            }
        };
    }

    // ─── Vector 5: Compliance Risk ───────────────────────────────────────────
    assessComplianceRisk(certifications) {
        if (certifications.length === 0) return { score: 20, level: 'low', details: { message: 'No certifications tracked' } };

        const expired = certifications.filter(c => c.expiry_date && new Date(c.expiry_date) < new Date()).length;
        const expiringSoon = certifications.filter(c => {
            if (!c.expiry_date) return false;
            const diff = new Date(c.expiry_date) - new Date();
            return diff > 0 && diff < 30 * 24 * 3600 * 1000;
        }).length;

        const score = Math.min(100, (expired / certifications.length * 60) + (expiringSoon / certifications.length * 20) + 5);

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                total_certifications: certifications.length,
                expired: expired,
                expiring_30_days: expiringSoon,
                active: certifications.length - expired
            }
        };
    }

    // ─── Vector 6: Cyber Risk ────────────────────────────────────────────────
    assessCyberRisk(partners, alerts) {
        const noApiKey = partners.filter(p => !p.api_key).length;
        const fraudAlerts = alerts.filter(a => a.alert_type === 'STATISTICAL_ANOMALY' || a.severity === 'high').length;

        const score = Math.min(100,
            (noApiKey / Math.max(partners.length, 1) * 30) +
            Math.min(fraudAlerts * 8, 40) + 10
        );

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                partners_without_api_auth: noApiKey,
                anomaly_alerts: fraudAlerts,
                data_integrity: 'blockchain_sealed'
            }
        };
    }

    // ─── Vector 7: Environmental Risk ────────────────────────────────────────
    assessEnvironmentalRisk(sustainability) {
        if (sustainability.length === 0) return { score: 30, level: 'medium', details: { message: 'No ESG assessments — risk unmeasured' } };

        const avgScore = sustainability.reduce((s, ss) => s + (ss.overall_score || 50), 0) / sustainability.length;
        const lowPerformers = sustainability.filter(s => (s.overall_score || 50) < 50).length;

        const score = Math.round(Math.max(0, 100 - avgScore));

        return {
            score,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                avg_esg_score: Math.round(avgScore * 10) / 10,
                products_assessed: sustainability.length,
                low_performers: lowPerformers,
                carbon_risk: avgScore < 60 ? 'elevated' : 'acceptable'
            }
        };
    }

    // ─── Vector 8: Supply Disruption ─────────────────────────────────────────
    assessSupplyDisruption(inventory, partners, shipments) {
        // Single-source dependency check
        const supplierCount = partners.filter(p => p.type === 'oem' || p.type === 'manufacturer').length;
        const singleSourceRisk = supplierCount <= 1 ? 80 : supplierCount === 2 ? 40 : 10;

        // Inventory health
        const lowStock = inventory.filter(i => i.quantity <= (i.min_stock || 10)).length;
        const stockRatio = inventory.length > 0 ? lowStock / inventory.length : 0;

        // Pending shipments that might be stuck
        const stuckShipments = shipments.filter(s => {
            if (s.status !== 'in_transit') return false;
            const daysInTransit = (Date.now() - new Date(s.created_at).getTime()) / (24 * 3600 * 1000);
            return daysInTransit > 14;
        }).length;

        const score = Math.min(100,
            singleSourceRisk * 0.35 +
            stockRatio * 100 * 0.35 +
            Math.min(stuckShipments * 10, 30) * 0.30
        );

        return {
            score: Math.round(score * 10) / 10,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
            details: {
                supplier_diversity: supplierCount,
                single_source_dependencies: supplierCount <= 1,
                low_stock_items: lowStock,
                total_inventory_items: inventory.length,
                stuck_shipments: stuckShipments
            }
        };
    }

    /**
     * Generate risk heatmap by region
     */
    generateHeatmap(partners, shipments, leaks) {
        const regionMap = {};

        partners.forEach(p => {
            const region = p.country || p.region || 'Unknown';
            if (!regionMap[region]) regionMap[region] = { partners: 0, risk_score: 0, leaks: 0, shipments: 0 };
            regionMap[region].partners++;
            regionMap[region].risk_score += (100 - (p.trust_score || 50));
        });

        leaks.forEach(l => {
            const region = l.region_detected || 'Unknown';
            if (!regionMap[region]) regionMap[region] = { partners: 0, risk_score: 0, leaks: 0, shipments: 0 };
            regionMap[region].leaks++;
            regionMap[region].risk_score += (l.risk_score || 0.5) * 20;
        });

        return Object.entries(regionMap).map(([region, data]) => ({
            region,
            heat_score: Math.round(Math.min(100, data.risk_score / Math.max(data.partners, 1))),
            partners: data.partners,
            leak_alerts: data.leaks,
            risk_level: data.risk_score / Math.max(data.partners, 1) > 50 ? 'hot' : data.risk_score / Math.max(data.partners, 1) > 25 ? 'warm' : 'cool'
        })).sort((a, b) => b.heat_score - a.heat_score);
    }
}

module.exports = new RiskRadar();
