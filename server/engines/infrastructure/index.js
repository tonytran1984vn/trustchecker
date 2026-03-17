/**
 * Infrastructure Engines — Barrel Export (Phase 7 expanded)
 */
module.exports = {
    AIAssistant: require('./ai-assistant'),
    BlockchainEngine: require('./blockchain'),
    CIERoleEngine: require('./cie-role-engine'),
    EmailTemplates: require('./emailTemplates'),
    EngineClient: require('./engine-client'),
    IdentityEngine: require('./identity-engine'),
    IntegrationLocking: require('./integration-locking-engine'),
    KillSwitchEngine: require('./kill-switch-engine'),
    PricingEngine: require('./pricing-engine'),
    SAConstraints: require('./sa-constraints'),
    Scheduler: require('./scheduler'),
    WebhookEngine: require('./webhookEngine'),
};
