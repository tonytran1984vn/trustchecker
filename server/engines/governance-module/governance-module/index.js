/**
 * Governance Module (consolidated)
 * Merges: governance, constitutional-rbac, upgrade-governance, cryptographic-governance, external-oversight
 */
module.exports = {
  governance: require("./governance"),
  constitutionalRbac: require("./constitutional-rbac"),
  upgradeGovernance: require("./upgrade-governance"),
  cryptographicGovernance: require("./cryptographic-governance"),
  externalOversight: require("./external-oversight"),
};
