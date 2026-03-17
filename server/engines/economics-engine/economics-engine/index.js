/**
 * Economics Engine (consolidated)
 * Merges: economic-logic, economic-risk, unit-economics, treasury-liquidity,
 *         revenue-governance, incentive-architecture, fee-distribution, transaction-fee
 */
module.exports = {
  economicLogic: require("./economic-logic"),
  economicRisk: require("./economic-risk"),
  unitEconomics: require("./unit-economics"),
  treasuryLiquidity: require("./treasury-liquidity"),
  revenueGovernance: require("./revenue-governance"),
  incentiveArchitecture: require("./incentive-architecture"),
  feeDistribution: require("./fee-distribution"),
  transactionFee: require("./transaction-fee"),
};
