/**
 * Regulatory Engine (consolidated)
 * Merges: ercm, erqf, lrgf, jurisdiction-logic, jurisdictional-risk, regulatory-map, regulatory-scenario
 */
module.exports = {
  ercm: require("./ercm"),
  erqf: require("./erqf"),
  lrgf: require("./lrgf"),
  jurisdictionLogic: require("./jurisdiction-logic"),
  jurisdictionalRisk: require("./jurisdictional-risk"),
  regulatoryMap: require("./regulatory-map"),
  regulatoryScenario: require("./regulatory-scenario"),
};
