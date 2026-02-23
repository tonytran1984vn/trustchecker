/**
 * Green Finance Routes — Carbon-Backed Financing, Credit Scoring
 * Endpoints: 5 | Mount: /api/green-finance
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const greenFinance = require('../engines/green-finance-engine');
const { cacheMiddleware } = require('../cache');
router.use(authMiddleware);

// GET /credit-score — Green credit score
router.get('/credit-score', cacheMiddleware(120), async (req, res) => {
    try {
        const credits = await db.prepare('SELECT * FROM carbon_credits').all().catch(() => []);
        const activeTCO2 = credits.filter(c => c.status === 'active' || c.status === 'minted').reduce((s, c) => s + (c.quantity_tCO2e || 0), 0);
        const retiredTCO2 = credits.filter(c => c.status === 'retired').reduce((s, c) => s + (c.quantity_tCO2e || 0), 0);
        res.json(greenFinance.calculateGreenCreditScore({ esg_score: 68, carbon_grade: 'B', compliance_pct: 72, partner_trust_avg: 65, credit_history_score: 70, total_emissions_tCO2e: 650, active_credits_tCO2e: activeTCO2, retired_credits_tCO2e: retiredTCO2, revenue_usd: 5000000 }));
    } catch (err) { res.status(500).json({ error: 'Credit score failed' }); }
});

// GET /collateral — Carbon-backed collateral valuation
router.get('/collateral', cacheMiddleware(120), async (req, res) => {
    try {
        const credits = await db.prepare('SELECT * FROM carbon_credits').all().catch(() => []);
        res.json(greenFinance.valueCarbonCollateral(credits));
    } catch (err) { res.status(500).json({ error: 'Collateral valuation failed' }); }
});

// POST /receivable — Structure tokenized receivable
router.post('/receivable', async (req, res) => {
    try { res.json(greenFinance.structureTokenizedReceivable({ ...req.body, tenant_id: req.user?.org_id })); }
    catch (err) { res.status(500).json({ error: 'Receivable structuring failed' }); }
});

// GET /dashboard — Finance overview
router.get('/dashboard', cacheMiddleware(120), async (req, res) => {
    try {
        const credits = await db.prepare('SELECT * FROM carbon_credits').all().catch(() => []);
        const score = greenFinance.calculateGreenCreditScore({ esg_score: 68, carbon_grade: 'B', compliance_pct: 72, partner_trust_avg: 65, credit_history_score: 70 });
        const collateral = greenFinance.valueCarbonCollateral(credits);
        res.json({ title: 'Green Finance Dashboard', credit_score: score, collateral, total_credits: credits.length });
    } catch (err) { res.status(500).json({ error: 'Dashboard failed' }); }
});

// GET /instruments — Available green finance instruments
router.get('/instruments', (req, res) => {
    res.json({
        instruments: [
            { name: 'Green Bond', min_score: 60, description: 'Fixed income backed by ESG assets' },
            { name: 'Sustainability-Linked Loan', min_score: 60, description: 'Rate tied to ESG KPIs' },
            { name: 'Carbon Repo', min_score: 70, description: 'Short-term borrowing against carbon credits' },
            { name: 'Green Revolving Credit', min_score: 60, description: 'Flexible credit with ESG discount' },
            { name: 'Carbon Futures', min_score: 80, description: 'Forward contracts on carbon credits' }
        ]
    });
});

module.exports = router;
