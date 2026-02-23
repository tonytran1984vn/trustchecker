/**
 * Market Infrastructure Routes v1.0
 * Capital Architecture + Incentive Economics + Systemic Risk Lab
 * Mount: /api/capital, /api/incentive, /api/risklab
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

const capital = require('../engines/capital-liability-engine');
const incentive = require('../engines/incentive-economics-engine');
const risklab = require('../engines/systemic-risk-lab-engine');

// ═══════════════════════════════════════════════════════════════════
// CAPITAL & LIABILITY — /capital
// ═══════════════════════════════════════════════════════════════════

router.get('/capital/framework', (req, res) => { res.json(capital.getFullArchitecture()); });
router.get('/capital/adequacy', (req, res) => { res.json(capital.getCapitalFramework()); });
router.get('/capital/settlement', (req, res) => { res.json(capital.getSettlementRisk()); });
router.get('/capital/insurance', (req, res) => { res.json(capital.getInsuranceFramework()); });
router.get('/capital/counterparty', (req, res) => { res.json(capital.getCounterpartyLimits()); });
router.get('/capital/stress', (req, res) => { res.json(capital.getStressScenarios()); });

router.post('/capital/calculate', (req, res) => {
    const { monthly_volume, mix } = req.body;
    res.json(capital.calculateCapitalRequirement(monthly_volume || 1000000, mix));
});

router.post('/capital/exposure', (req, res) => {
    const { counterparty_id, exposure_usd, total_settlement_usd } = req.body;
    res.json(capital.assessCounterpartyExposure(counterparty_id, exposure_usd || 0, total_settlement_usd || 1000000));
});

router.post('/capital/stress-test', (req, res) => {
    const { scenario_id, current_capital } = req.body;
    res.json(capital.runStressTest(scenario_id || 'ST-01', current_capital || 1000000));
});

// ═══════════════════════════════════════════════════════════════════
// INCENTIVE ECONOMICS — /incentive
// ═══════════════════════════════════════════════════════════════════

router.get('/incentive/design', (req, res) => { res.json(incentive.getFullDesign()); });
router.get('/incentive/staking', (req, res) => { res.json(incentive.getStakingModel()); });
router.get('/incentive/slashing', (req, res) => { res.json(incentive.getSlashingTiers()); });
router.get('/incentive/rewards', (req, res) => { res.json(incentive.getRewardModel()); });
router.get('/incentive/game-theory', (req, res) => { res.json(incentive.getGameTheory()); });
router.get('/incentive/node-economics', (req, res) => { res.json(incentive.getNodeEconomics()); });

router.post('/incentive/calculate-slash', (req, res) => {
    const { offense, reputation, stake_usd } = req.body;
    res.json(incentive.calculateSlashing(offense || 'missed_round', reputation || 50, stake_usd || 5000));
});

router.post('/incentive/calculate-reward', (req, res) => {
    const { volume, reputation, uptime, region, pool_usd } = req.body;
    res.json(incentive.calculateReward(volume || 100, reputation || 50, uptime || 99, region || 'EU-W', pool_usd || 10000));
});

router.post('/incentive/staking-tier', (req, res) => {
    const { reputation, stake_usd } = req.body;
    res.json(incentive.getStakingTier(reputation || 50, stake_usd || 2500));
});

// ═══════════════════════════════════════════════════════════════════
// SYSTEMIC RISK LAB — /risklab
// ═══════════════════════════════════════════════════════════════════

router.get('/risklab/overview', (req, res) => { res.json(risklab.getFullLab()); });
router.get('/risklab/contagion', (req, res) => { res.json(risklab.getContagionModel()); });
router.get('/risklab/supply-chain', (req, res) => { res.json(risklab.getSupplyChainShocks()); });
router.get('/risklab/carbon-fraud', (req, res) => { res.json(risklab.getCarbonFraudCascade()); });
router.get('/risklab/node-failure', (req, res) => { res.json(risklab.getNodeFailureModel()); });

router.post('/risklab/simulate-contagion', (req, res) => {
    const { source, impact, network_size, connections } = req.body;
    res.json(risklab.simulateContagion(source || 'entity-1', impact || 1.0, network_size || 100, connections || 5));
});

router.post('/risklab/simulate-node-failure', (req, res) => {
    const { scenario_id } = req.body;
    res.json(risklab.simulateNodeFailure(scenario_id || 'NF-01'));
});

router.post('/risklab/monte-carlo', (req, res) => {
    const { portfolio_usd, simulations } = req.body;
    res.json(risklab.runMonteCarloVaR(portfolio_usd || 1000000, simulations || 10000));
});

module.exports = router;
