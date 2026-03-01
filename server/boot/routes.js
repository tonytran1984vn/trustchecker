/**
 * Boot: Route Mounting
 * Declarative route table mounted on /api and /api/v1 automatically.
 */

function setupRoutes(app) {
    const { apiLimit, authLimit, scanLimit, exportLimit, uploadLimit } = require('../middleware/rateLimiter');

    // Public routes (no auth)
    const publicRoutes = require('../routes/public');
    const apiDocsRoutes = require('../routes/api-docs');
    app.use('/api/public', scanLimit, publicRoutes);
    app.use('/api/docs', apiDocsRoutes);

    // Route imports
    const { router: authRouter } = require('../auth');
    const productRoutes = require('../routes/products');
    const qrRoutes = require('../routes/qr');
    const scmTrackingRoutes = require('../routes/scm-tracking');
    const scmInventoryRoutes = require('../routes/scm-inventory');
    const scmLogisticsRoutes = require('../routes/scm-logistics');
    const scmPartnerRoutes = require('../routes/scm-partners');
    const scmLeakRoutes = require('../routes/scm-leaks');
    const scmTrustGraphRoutes = require('../routes/scm-trustgraph');
    const kycRoutes = require('../routes/kyc');
    const evidenceRoutes = require('../routes/evidence');
    const stakeholderRoutes = require('../routes/stakeholder');
    const billingRoutes = require('../routes/billing');
    const integrationsRouteFactory = require('../routes/integrations');
    const supportRoutes = require('../routes/support');
    const nftRoutes = require('../routes/nft');
    const sustainabilityRoutes = require('../routes/sustainability');
    const complianceRoutes = require('../routes/compliance-gdpr');
    const anomalyRoutes = require('../routes/anomaly');
    const aiChatRoutes = require('../routes/ai-chat');
    const brandingRoutes = require('../routes/branding');
    const walletPaymentRoutes = require('../routes/wallet-payment');
    const notificationRoutes = require('../routes/notifications');
    const adminRoutes = require('../routes/admin');
    const reportRoutes = require('../routes/reports');
    const webhookRoutes = require('../routes/webhooks');
    const emailRoutes = require('../routes/email');
    const systemRoutes = require('../routes/system');
    const orgRoutes = require('../routes/organizations');
    const licenseRoutes = require('../routes/license');
    const scmEpcisRoutes = require('../routes/scm-epcis');
    const scmAdvancedAIRoutes = require('../routes/scm-advanced-ai');
    const scmRiskRadarRoutes = require('../routes/scm-risk-radar');
    const scmCarbonRoutes = require('../routes/scm-carbon');
    const scmCarbonCreditRoutes = require('../routes/scm-carbon-credit');
    const scmDigitalTwinRoutes = require('../routes/scm-digital-twin');
    const scmSupplyRoutes = require('../routes/scm-supply-routes');
    const scmRiskModelRoutes = require('../routes/scm-risk-model');
    const scmForensicRoutes = require('../routes/scm-forensic');
    const scmClassificationRoutes = require('../routes/scm-classification');
    const scmMlEngineRoutes = require('../routes/scm-ml-engine');
    const scmCodeGovRoutes = require('../routes/scm-code-governance');
    const scmIntegrityRoutes = require('../routes/scm-integrity');
    const platformRoutes = require('../routes/platform');
    const tenantAdminRoutes = require('../routes/tenant-admin');
    const identityRoutes = require('../routes/identity');
    const riskGraphRoutes = require('../routes/risk-graph');
    const complianceRegtechRoutes = require('../routes/compliance-regtech');
    const apiEconomyRoutes = require('../routes/api-economy');
    const greenFinanceRoutes = require('../routes/green-finance');
    const reputationRoutes = require('../routes/reputation');
    const governanceRoutes = require('../routes/governance');
    const opsMonitoringRoutes = require('../routes/ops-monitoring');
    const infraCustodyRoutes = require('../routes/infra-custody');
    const hardeningRoutes = require('../routes/hardening');
    const auditLogRoutes = require('../routes/audit-log');
    const sodWaiverRoutes = require('../routes/sod-waiver');
    const crisisRoutes = require('../routes/crisis');
    const networkTopologyRoutes = require('../routes/network-topology');
    const feeDistributionRoutes = require('../routes/fee-distribution');
    const infraMaturityRoutes = require('../routes/infra-maturity');
    const charterRoutes = require('../routes/charter');
    const marketInfraRoutes = require('../routes/market-infra');
    const ipoGradeRoutes = require('../routes/ipo-grade');
    const criticalInfraRoutes = require('../routes/critical-infra');
    const legitimacyRoutes = require('../routes/legitimacy');
    const coherenceRoutes = require('../routes/coherence');
    const infrastructureRoutes = require('../routes/infrastructure');
    const gapCoverageRoutes = require('../routes/gap-coverage');
    const cieRoutes = require('../routes/cie');
    const carbonOfficerRoutes = require('../routes/carbon-officer');
    const carbonActionsRoutes = require('../routes/carbon-actions');
    const tenantIntegrationsFactory = require('../routes/tenant-integrations');

    // Declarative route table — each route is mounted on both /api and /api/v1
    const API_ROUTES = [
        ['/auth', authLimit, authRouter],
        ['/products', productRoutes],
        ['/qr', scanLimit, qrRoutes],
        ['/scm', scmTrackingRoutes],
        ['/scm/inventory', scmInventoryRoutes],
        ['/scm', scmLogisticsRoutes],
        ['/scm/partners', scmPartnerRoutes],
        ['/scm/leaks', scmLeakRoutes],
        ['/scm/graph', scmTrustGraphRoutes],
        ['/kyc', kycRoutes],
        ['/evidence', evidenceRoutes],
        ['/trust', stakeholderRoutes],
        ['/billing', billingRoutes],
        ['/support', supportRoutes],
        ['/nft', nftRoutes],
        ['/sustainability', sustainabilityRoutes],
        ['/compliance', complianceRoutes],
        ['/anomaly', anomalyRoutes],
        ['/assistant', aiChatRoutes],
        ['/branding', brandingRoutes],
        ['/wallet', walletPaymentRoutes],
        ['/notifications', notificationRoutes],
        ['/admin', adminRoutes],
        ['/reports', exportLimit, reportRoutes],
        ['/webhooks', webhookRoutes],
        ['/email', emailRoutes],
        ['/system', systemRoutes],
        ['/org', orgRoutes],
        ['/license', licenseRoutes],
        ['/scm/epcis', scmEpcisRoutes],
        ['/scm/ai', scmAdvancedAIRoutes],
        ['/scm/risk', scmRiskRadarRoutes],
        ['/scm/carbon', scmCarbonRoutes],
        ['/scm/carbon-credit', scmCarbonCreditRoutes],
        ['/scm/twin', scmDigitalTwinRoutes],
        ['/scm/supply', scmSupplyRoutes],
        ['/scm/model', scmRiskModelRoutes],
        ['/scm/forensic', scmForensicRoutes],
        ['/scm/classify', scmClassificationRoutes],
        ['/scm/ml', scmMlEngineRoutes],
        ['/scm/code-gov', scmCodeGovRoutes],
        ['/scm/integrity', scmIntegrityRoutes],
        ['/platform', platformRoutes],
        ['/tenant', tenantAdminRoutes],
        ['/identity', identityRoutes],
        ['/risk-graph', riskGraphRoutes],
        ['/compliance-regtech', complianceRegtechRoutes],
        ['/api-economy', apiEconomyRoutes],
        ['/green-finance', greenFinanceRoutes],
        ['/reputation', reputationRoutes],
        ['/governance', governanceRoutes],
        ['/ops', opsMonitoringRoutes],
        ['/infra-custody', infraCustodyRoutes],
        ['/hardening', hardeningRoutes],
        ['/audit-log', auditLogRoutes],
        ['/sod', sodWaiverRoutes],
        ['/crisis', crisisRoutes],
        ['/network', networkTopologyRoutes],
        ['/distribution', feeDistributionRoutes],
        ['', infraMaturityRoutes],   // mounts /economics, /reserves, /sovereignty, /regulatory, /sla
        ['/charter', charterRoutes],
        ['', marketInfraRoutes],    // mounts /capital, /incentive, /risklab
        ['', ipoGradeRoutes],       // mounts /oversight, /car, /decentralization, /legal, /finance, /treasury, /regscenario, /narrative
        ['', apiLimit, criticalInfraRoutes],  // mounts /revenue-gov, /jurisdiction, /killswitch, /superadmin, /model-risk, /integration, /stress, /econrisk, /contagion
        ['', apiLimit, legitimacyRoutes],     // mounts /economic-logic, /forensic, /jurisdiction-logic
        ['', apiLimit, coherenceRoutes],       // mounts /coherence, /playbook, /human-gov
        ['', apiLimit, infrastructureRoutes],  // mounts /incentive-arch, /entity, /crypto-gov
        ['', apiLimit, gapCoverageRoutes],     // mounts /data-ownership, /infra-metrics, /upgrade-gov
        ['/cie', cieRoutes],                     // CIE v2.0 — Carbon Integrity Engine API
        ['/carbon-officer', carbonOfficerRoutes], // Carbon Officer workspace dashboard
        ['/carbon-actions', carbonActionsRoutes],   // Carbon Action Items bridge
    ];

    // Mount on /api and /api/v1 (versioned alias)
    for (const [subPath, ...handlers] of API_ROUTES) {
        app.use(`/api${subPath}`, ...handlers);
        app.use(`/api/v1${subPath}`, ...handlers);
    }

    // Admin-only integration settings
    const { authMiddleware, requirePermission } = require('../auth');
    const db = require('../db');
    app.use('/api/integrations', authMiddleware, requirePermission('settings:update'), integrationsRouteFactory(db));
    app.use('/api/tenant-integrations', authMiddleware, tenantIntegrationsFactory(db));

    // API version info
    const { versionInfoHandler } = require('../middleware/api-version');
    app.get('/api/version', versionInfoHandler);
    app.get('/api/v1/version', versionInfoHandler);
}

module.exports = { setupRoutes };
