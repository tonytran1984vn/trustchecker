/**
 * TrustChecker — Green Finance Engine
 * Carbon-Backed Financing, Green Credit Scoring, Sustainable Finance Infrastructure
 */

const RISK_WEIGHTS = { esg_score: 0.30, carbon_performance: 0.25, compliance_readiness: 0.20, partner_trust: 0.15, credit_history: 0.10 };

class GreenFinanceEngine {

    /**
     * Green Credit Score — ESG-adjusted financing rate
     */
    calculateGreenCreditScore(params) {
        const {
            esg_score = 50, carbon_grade = 'C', compliance_pct = 50,
            partner_trust_avg = 50, credit_history_score = 50,
            total_emissions_tCO2e = 0, active_credits_tCO2e = 0,
            retired_credits_tCO2e = 0, revenue_usd = 1000000
        } = params;

        const carbonPerformance = carbon_grade === 'A' ? 90 : carbon_grade === 'B' ? 70 : carbon_grade === 'C' ? 50 : 30;
        const rawScore = esg_score * RISK_WEIGHTS.esg_score
            + carbonPerformance * RISK_WEIGHTS.carbon_performance
            + compliance_pct * RISK_WEIGHTS.compliance_readiness
            + partner_trust_avg * RISK_WEIGHTS.partner_trust
            + credit_history_score * RISK_WEIGHTS.credit_history;

        const greenScore = Math.min(100, Math.round(rawScore));
        const rateDiscount = greenScore >= 80 ? -1.5 : greenScore >= 60 ? -0.75 : greenScore >= 40 ? 0 : 0.5;
        const baseRate = 6.5;
        const greenRate = Math.max(2.0, baseRate + rateDiscount);
        const carbonIntensity = revenue_usd > 0 ? Math.round(total_emissions_tCO2e / (revenue_usd / 1000000) * 100) / 100 : 0;

        return {
            title: 'Green Credit Score',
            green_score: greenScore,
            green_grade: greenScore >= 80 ? 'A' : greenScore >= 60 ? 'B' : greenScore >= 40 ? 'C' : 'D',
            financing: {
                base_rate_pct: baseRate, green_discount_pct: rateDiscount, effective_rate_pct: greenRate,
                eligible_instruments: greenScore >= 60 ? ['Green Bond', 'Sustainability-Linked Loan', 'Green Revolving Credit'] : ['Standard Loan', 'Trade Finance']
            },
            factors: Object.entries(RISK_WEIGHTS).map(([k, w]) => {
                const val = k === 'esg_score' ? esg_score : k === 'carbon_performance' ? carbonPerformance : k === 'compliance_readiness' ? compliance_pct : k === 'partner_trust' ? partner_trust_avg : credit_history_score;
                return { factor: k.replace(/_/g, ' '), weight: `${Math.round(w * 100)}%`, value: val, weighted: Math.round(val * w * 10) / 10 };
            }),
            carbon_metrics: { total_emissions_tCO2e, active_credits_tCO2e, retired_credits_tCO2e, carbon_intensity: carbonIntensity, net_position: active_credits_tCO2e - total_emissions_tCO2e },
            assessed_at: new Date().toISOString()
        };
    }

    /**
     * Carbon-backed collateral valuation
     */
    valueCarbonCollateral(credits = []) {
        const active = credits.filter(c => c.status === 'active' || c.status === 'minted');
        const totalTonnes = active.reduce((s, c) => s + (c.quantity_tCO2e || 0), 0);
        const spotPrice = 45; const haircut = 0.30; // 30% haircut for carbon collateral
        const grossValue = totalTonnes * spotPrice;
        const collateralValue = grossValue * (1 - haircut);

        const vintageAnalysis = {};
        active.forEach(c => { const y = c.vintage_year || 'unknown'; if (!vintageAnalysis[y]) vintageAnalysis[y] = { count: 0, tCO2e: 0 }; vintageAnalysis[y].count++; vintageAnalysis[y].tCO2e += c.quantity_tCO2e || 0; });

        return {
            title: 'Carbon-Backed Collateral Valuation',
            total_credits: active.length, total_tCO2e: Math.round(totalTonnes * 1000) / 1000,
            spot_price_usd: spotPrice, gross_value_usd: Math.round(grossValue * 100) / 100,
            haircut_pct: haircut * 100, collateral_value_usd: Math.round(collateralValue * 100) / 100,
            max_borrowing_usd: Math.round(collateralValue * 0.7 * 100) / 100,
            by_vintage: vintageAnalysis,
            risk_factors: ['Carbon price volatility', 'Regulatory change risk', 'Credit retirement risk', 'Market liquidity'],
            eligible_for: collateralValue > 10000 ? ['Green Repo', 'Carbon Futures', 'Sustainability-Linked Bond'] : ['Internal Offset Only'],
            valued_at: new Date().toISOString()
        };
    }

    /**
     * Tokenized receivable structure
     */
    structureTokenizedReceivable(params) {
        const { future_reductions_tCO2e = 0, projection_months = 12, confidence_pct = 70, tenant_id } = params;
        const spotPrice = 45; const discountRate = 0.12;
        const projectedValue = future_reductions_tCO2e * spotPrice;
        const presentValue = projectedValue / Math.pow(1 + discountRate, projection_months / 12);

        return {
            title: 'Tokenized Carbon Receivable',
            projected_reduction_tCO2e: future_reductions_tCO2e,
            projection_months, confidence_pct,
            projected_value_usd: Math.round(projectedValue * 100) / 100,
            discount_rate_pct: discountRate * 100,
            present_value_usd: Math.round(presentValue * 100) / 100,
            token_structure: { type: 'Carbon Receivable Token (CRT)', backed_by: 'Future verified reductions', settlement: 'Upon MRV verification', risk: 'Performance risk — reduction must materialize' },
            investor_terms: { min_investment_usd: 10000, expected_yield_pct: 8, maturity_months: projection_months },
            tenant_id, structured_at: new Date().toISOString()
        };
    }
}

module.exports = new GreenFinanceEngine();
