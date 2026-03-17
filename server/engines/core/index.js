/**
 * Core Engines — Barrel Export (Phase 7 fixed)
 */
module.exports = {
    TrustEngine: require('./trust'),
    FraudEngine: require('./fraud'),
    AnomalyEngine: require('./anomaly'),
    RiskGraphEngine: require('./risk-graph-engine'),
    NetworkIntelligence: require('./network-intelligence-engine'),
    CrossTenantContagion: require('./cross-tenant-contagion-engine'),
    ComplianceEngine: require('./compliance-engine'),
    EpcisEngine: require('./epcis-engine'),
    ScmAI: require('./scm-ai'),
    ScoreValidation: require('./score-validation-engine'),
};
