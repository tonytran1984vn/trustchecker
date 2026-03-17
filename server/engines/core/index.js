/**
 * Core Engines — Barrel Export (A-07)
 */
module.exports = {
    TrustEngine: require('./trust'),
    FraudEngine: require('./fraud-engine'),
    AnomalyEngine: require('./anomaly-engine'),
    RiskGraphEngine: require('./risk-graph-engine'),
    NetworkIntelligence: require('./network-intelligence-engine'),
    CrossTenantContagion: require('./cross-tenant-contagion-engine'),
};
