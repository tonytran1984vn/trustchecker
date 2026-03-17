/**
 * Platform Ops Engine (consolidated)
 * Merges: observability, ops-monitoring, infrastructure-metrics, infrastructure-custody
 */
module.exports = {
  observability: require("./observability"),
  opsMonitoring: require("./ops-monitoring"),
  infrastructureMetrics: require("./infrastructure-metrics"),
  infrastructureCustody: require("./infrastructure-custody"),
};
