/**
 * Green Finance Routes
 * Provides green credit scoring, collateral valuation, and financing instruments.
 *
 * GET /api/green-finance/credit-score
 * GET /api/green-finance/collateral
 * GET /api/green-finance/instruments
 * GET /api/green-finance/dashboard
 */
const router = require('express').Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /credit-score — Green Credit Score & Factors ────────────────
router.get('/credit-score', cacheMiddleware(120), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id || null;

        // Compute green score from real data
        let products = [],
            credits = [];
        try {
            products = orgId
                ? await db.all('SELECT * FROM products WHERE org_id = ?', [orgId])
                : await db.all('SELECT * FROM products LIMIT 500');
        } catch (_) {
            products = [];
        }

        try {
            credits = orgId
                ? await db.all('SELECT * FROM carbon_credits WHERE org_id = ? LIMIT 200', [orgId])
                : await db.all('SELECT * FROM carbon_credits LIMIT 200');
        } catch (_) {
            credits = [];
        }

        const totalProducts = products.length || 1;
        const verified = products.filter(p => p.verified || p.blockchain_hash).length;
        const activeCredits = credits.filter(c => c.status === 'active' || c.status === 'minted').length;

        // Score factors
        const verificationRate = Math.round((verified / totalProducts) * 100);
        const creditCoverage = Math.min(100, Math.round((activeCredits / Math.max(totalProducts, 1)) * 100));
        const supplyChainScore = Math.min(100, 40 + Math.round(verified * 3));
        const complianceScore = Math.min(100, 50 + Math.round(activeCredits * 5));

        const factors = [
            { factor: 'Verification Rate', value: verificationRate },
            { factor: 'Credit Coverage', value: creditCoverage },
            { factor: 'Supply Chain', value: supplyChainScore },
            { factor: 'Compliance', value: complianceScore },
            { factor: 'Data Quality', value: Math.min(100, 45 + Math.round(totalProducts * 2)) },
        ];

        const green_score = Math.round(factors.reduce((s, f) => s + f.value, 0) / factors.length);
        const green_grade = green_score >= 80 ? 'A' : green_score >= 60 ? 'B' : green_score >= 40 ? 'C' : 'D';

        // Financing rates based on score
        const base_rate = 8.5;
        const discount = green_score >= 80 ? -2.5 : green_score >= 60 ? -1.5 : green_score >= 40 ? -0.5 : 0;

        res.json({
            green_score,
            green_grade,
            factors,
            financing: {
                base_rate_pct: base_rate,
                green_discount_pct: discount,
                effective_rate_pct: +(base_rate + discount).toFixed(1),
            },
        });
    } catch (err) {
        console.error('[green-finance] credit-score error:', err.message);
        res.json({
            green_score: 0,
            green_grade: 'D',
            factors: [
                { factor: 'Verification Rate', value: 0 },
                { factor: 'Credit Coverage', value: 0 },
                { factor: 'Supply Chain', value: 0 },
                { factor: 'Compliance', value: 0 },
                { factor: 'Data Quality', value: 0 },
            ],
            financing: { base_rate_pct: 8.5, green_discount_pct: 0, effective_rate_pct: 8.5 },
        });
    }
});

// ─── GET /collateral — Carbon Credit Collateral Valuation ─────────────
router.get('/collateral', cacheMiddleware(120), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id || null;

        let credits = [];
        try {
            credits = orgId
                ? await db.all(`SELECT * FROM carbon_credits WHERE org_id = ? AND status IN ('active','minted')`, [
                      orgId,
                  ])
                : await db.all(`SELECT * FROM carbon_credits WHERE status IN ('active','minted') LIMIT 500`);
        } catch (_) {
            credits = [];
        }

        const total_tCO2e = credits.reduce((s, c) => s + (c.quantity_tCO2e || 0), 0);
        const spot_price = 25; // USD per tCO2e
        const haircut = 30; // 30% haircut for collateral
        const collateral_value = Math.round(total_tCO2e * spot_price * (1 - haircut / 100));
        const max_borrowing = Math.round(collateral_value * 0.7);

        res.json({
            title: 'Carbon Credit Collateral',
            total_tCO2e: Math.round(total_tCO2e),
            total_credits: credits.length,
            spot_price_usd: spot_price,
            haircut_pct: haircut,
            collateral_value_usd: collateral_value,
            max_borrowing_usd: max_borrowing,
        });
    } catch (err) {
        console.error('[green-finance] collateral error:', err.message);
        res.json({
            title: 'Carbon Credit Collateral',
            total_tCO2e: 0,
            total_credits: 0,
            spot_price_usd: 25,
            haircut_pct: 30,
            collateral_value_usd: 0,
            max_borrowing_usd: 0,
        });
    }
});

// ─── GET /instruments — Green Finance Instruments ──────────────────────
router.get('/instruments', cacheMiddleware(300), async (_req, res) => {
    res.json({
        instruments: [
            { name: 'Green Bond', description: 'Fixed income tied to carbon reduction', min_score: 60 },
            { name: 'Carbon Forward', description: 'Future carbon credit delivery', min_score: 40 },
            { name: 'Sustainability Loan', description: 'Discounted rate for green ops', min_score: 50 },
            { name: 'ESG Token', description: 'Tokenized ESG performance', min_score: 70 },
            { name: 'Carbon ETF', description: 'Diversified carbon portfolio', min_score: 30 },
        ],
    });
});

// ─── GET /dashboard — Green Finance Dashboard Summary ─────────────────
router.get('/dashboard', cacheMiddleware(120), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id || null;

        let creditCount = 0,
            totalValue = 0;
        try {
            const stats = orgId
                ? await db.get(
                      `SELECT COUNT(*) as cnt, COALESCE(SUM(quantity_tCO2e),0) as total FROM carbon_credits WHERE org_id = ?`,
                      [orgId]
                  )
                : await db.get(`SELECT COUNT(*) as cnt, COALESCE(SUM(quantity_tCO2e),0) as total FROM carbon_credits`);
            creditCount = stats?.cnt || 0;
            totalValue = stats?.total || 0;
        } catch (_) {}

        res.json({
            total_credits: creditCount,
            total_tCO2e: Math.round(totalValue),
            estimated_value_usd: Math.round(totalValue * 25),
            active_instruments: 3,
            avg_green_score: 62,
        });
    } catch (err) {
        console.error('[green-finance] dashboard error:', err.message);
        res.json({
            total_credits: 0,
            total_tCO2e: 0,
            estimated_value_usd: 0,
            active_instruments: 0,
            avg_green_score: 0,
        });
    }
});

module.exports = router;
