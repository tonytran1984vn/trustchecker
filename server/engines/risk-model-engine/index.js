/**
 * Risk Model Engine (consolidated)
 * Merges: risk-model-governance, model-risk-tiering, risk-reserve, mrmf
 */
module.exports = {
  governance: require("./governance"),
  tiering: require("./tiering"),
  reserve: require("./reserve"),
  mrmf: require("./mrmf"),
};
