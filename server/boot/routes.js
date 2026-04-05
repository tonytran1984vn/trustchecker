/**
 * Boot: Route Mounting
 * Declarative route table mounted on /api and /api/v1 automatically.
 */

function setupRoutes(app) {
    const { apiLimit, authLimit, scanLimit, exportLimit, uploadLimit } = require('../middleware/rateLimiter');
    const { requireFeature } = require('../middleware/featureGate');

    // Public routes (no auth)
    const publicRoutes = require('../routes/public');
    const apiDocsRoutes = require('../routes/api-docs');
    const complianceEvidenceRoutes = require('../routes/compliance-evidence'); // M-5 FIX: moved from after module.exports
    // A-11: Deep health check
    try {
        app.use('/healthz', require('../routes/health'));
    } catch (e) {}

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
    const scmCatalogRoutes = require('../routes/scm-catalog');
    const scmOfferingsRoutes = require('../routes/scm-offerings');
    const scmTrustEngineRoutes = require('../routes/scm-trust-engine');
    const scmCanonicalRoutes = require('../routes/scm-canonical');
    const scmNetworkPosRoutes = require('../routes/scm-network-pos');
    // ARCHIVED: const scmDigitalTwinRoutes = require('../routes/scm-digital-twin');
    const scmSupplyRoutes = require('../routes/scm-supply-routes');
    const scmRiskModelRoutes = require('../routes/scm-risk-model');
    const scmForensicRoutes = require('../routes/scm-forensic');
    const scmClassificationRoutes = require('../routes/scm-classification');
    const scmMlEngineRoutes = require('../routes/scm-ml-engine');
    const scmCodeGovRoutes = require('../routes/scm-code-governance');
    const scmIntegrityRoutes = require('../routes/scm-integrity');
    const scmTraceRoutes = require('../routes/scm-trace');
    const platformRoutes = require('../routes/platform');
    const orgAdminRoutes = require('../routes/org-admin');
    const identityRoutes = require('../routes/identity');
    const riskGraphRoutes = require('../routes/risk-graph');
    const complianceRegtechRoutes = require('../routes/compliance-regtech');
    // ARCHIVED: const apiEconomyRoutes = require('../routes/api-economy');
    const greenFinanceRoutes = require('../routes/green-finance');
    const reputationRoutes = require('../routes/reputation');
    const governanceRoutes = require('../routes/governance');
    const opsMonitoringRoutes = require('../routes/ops-monitoring');
    const opsDataRoutes = require('../routes/ops-data');
    const infraCustodyRoutes = require('../routes/infra-custody');
    const hardeningRoutes = require('../routes/hardening');
    const auditLogRoutes = require('../routes/audit-log');
    const sodWaiverRoutes = require('../routes/sod-waiver');
    const crisisRoutes = require('../routes/crisis');
    const networkTopologyRoutes = require('../routes/network-topology');
    const feeDistributionRoutes = require('../routes/fee-distribution');
    const infraMaturityRoutes = require('../routes/infra-maturity');
    // ARCHIVED: const charterRoutes = require('../routes/charter');
    // ARCHIVED: const marketInfraRoutes = require('../routes/market-infra');
    const ipoGradeRoutes = require('../routes/ipo-grade');
    const criticalInfraRoutes = require('../routes/critical-infra');
    const legitimacyRoutes = require('../routes/legitimacy');
    // ARCHIVED: const coherenceRoutes = require('../routes/coherence');
    const infrastructureRoutes = require('../routes/infrastructure');
    const gapCoverageRoutes = require('../routes/gap-coverage');
    const cieRoutes = require('../routes/cie');
    const carbonOfficerRoutes = require('../routes/carbon-officer');
    const carbonActionsRoutes = require('../routes/carbon-actions');
    const orgIntegrationsFactory = require('../routes/org-integrations');
    const auditChainRoutes = require('../routes/audit');
    const developersRoutes = require('../routes/developers');

    // Declarative route table — each route is mounted on both /api and /api/v1
    const API_ROUTES = [
        ['/auth', authLimit, authRouter],
        ['/compliance-evidence', complianceEvidenceRoutes],
        ['/products', productRoutes],
        ['/qr', scanLimit, requireFeature('qr'), qrRoutes],
        ['/scm', scmTrackingRoutes],
        ['/scm/inventory', requireFeature('inventory'), scmInventoryRoutes],
        ['/scm', scmLogisticsRoutes],
        ['/scm/partners', requireFeature('partners'), scmPartnerRoutes],
        ['/scm/leaks', requireFeature('leaks'), scmLeakRoutes],
        ['/scm/graph', requireFeature('trust_graph'), scmTrustGraphRoutes],
        ['/kyc', requireFeature('kyc'), kycRoutes],
        ['/evidence', requireFeature('evidence'), evidenceRoutes],
        ['/trust', stakeholderRoutes],
        ['/billing', billingRoutes],
        ['/support', supportRoutes],
        ['/nft', requireFeature('nft'), nftRoutes],
        ['/sustainability', require('../auth').authMiddleware, requireFeature('sustainability'), sustainabilityRoutes],
        ['/compliance', require('../auth').authMiddleware, requireFeature('compliance'), complianceRoutes],
        ['/anomaly', require('../auth').authMiddleware, requireFeature('anomaly'), anomalyRoutes],
        ['/assistant', aiChatRoutes],
        ['/branding', require('../auth').authMiddleware, requireFeature('branding'), brandingRoutes],
        ['/wallet', require('../auth').authMiddleware, requireFeature('wallet'), walletPaymentRoutes],
        ['/notifications', notificationRoutes],
        ['/admin', adminRoutes],
        ['/reports', exportLimit, requireFeature('reports'), reportRoutes],
        ['/webhooks', webhookRoutes],
        ['/email', emailRoutes],
        ['/system', systemRoutes],
        ['/org', orgRoutes],
        ['/license', licenseRoutes],
        ['/scm/epcis', requireFeature('epcis'), scmEpcisRoutes],
        ['/scm/ai', requireFeature('ai_forecast'), scmAdvancedAIRoutes],
        ['/scm/risk', requireFeature('risk_radar'), scmRiskRadarRoutes],
        ['/scm/carbon', requireFeature('carbon'), scmCarbonRoutes],
        ['/scm/carbon-credit', requireFeature('carbon'), scmCarbonCreditRoutes],
        ['/scm/catalog', scmCatalogRoutes],
        ['/scm/offerings', scmOfferingsRoutes],
        ['/scm/trust-engine', scmTrustEngineRoutes],
        ['/scm/canonical', scmCanonicalRoutes],
        ['/scm/network/pos', scmNetworkPosRoutes],
        // ARCHIVED: ['/scm/twin', scmDigitalTwinRoutes],
        ['/scm/supply', scmSupplyRoutes],
        ['/scm/risk-model', scmRiskModelRoutes],
        ['/scm/forensic', scmForensicRoutes],
        ['/scm/classify', scmClassificationRoutes],
        ['/scm/ml', scmMlEngineRoutes],
        ['/scm/code-gov', scmCodeGovRoutes],
        ['/scm/integrity', scmIntegrityRoutes],
        ['/scm/trace', scmTraceRoutes],
        ['/platform', platformRoutes],
        ['/org-admin', orgAdminRoutes],
        ['/identity', identityRoutes],
        ['/risk-graph', riskGraphRoutes],
        ['/compliance-regtech', complianceRegtechRoutes],
        // ARCHIVED: ['/api-economy', apiEconomyRoutes],
        ['/green-finance', greenFinanceRoutes],
        ['/reputation', reputationRoutes],
        ['/governance', governanceRoutes],
        ['/ops', opsMonitoringRoutes],
        ['/ops/data', opsDataRoutes],
        ['/ops-intelligence', require('../routes/ops-intelligence')], // Predictive Ops Cockpit
        ['/infra-custody', infraCustodyRoutes],
        ['/hardening', hardeningRoutes],
        ['/audit-log', auditLogRoutes],
        ['/sod', sodWaiverRoutes],
        ['/crisis', crisisRoutes],
        ['/network', networkTopologyRoutes],
        ['/distribution', feeDistributionRoutes],
        ['', infraMaturityRoutes], // mounts /economics, /reserves, /sovereignty, /regulatory, /sla
        // ARCHIVED: ['/charter', charterRoutes],
        // ARCHIVED: ['', marketInfraRoutes],    // mounts /capital, /incentive, /risklab
        ['', ipoGradeRoutes], // mounts /oversight, /car, /decentralization, /legal, /finance, /treasury, /regscenario, /narrative
        ['', apiLimit, criticalInfraRoutes], // mounts /revenue-gov, /jurisdiction, /killswitch, /superadmin, /model-risk, /integration, /stress, /econrisk, /contagion
        ['', apiLimit, legitimacyRoutes], // mounts /economic-logic, /forensic, /jurisdiction-logic
        // ARCHIVED: ['', apiLimit, coherenceRoutes],       // mounts /coherence, /playbook, /human-gov
        ['', apiLimit, infrastructureRoutes], // mounts /incentive-arch, /entity, /crypto-gov
        ['', apiLimit, gapCoverageRoutes], // mounts /data-ownership, /infra-metrics, /upgrade-gov
        ['/cie', cieRoutes], // CIE v2.0 — Carbon Integrity Engine API
        ['/carbon-officer', carbonOfficerRoutes], // Carbon Officer workspace dashboard
        ['/carbon-actions', carbonActionsRoutes], // Carbon Action Items bridge
        ['/audit', auditChainRoutes], // Audit hash chain verification
        ['/dual-approval', require('../routes/dual-approval')], // Dual-approval for GDPR/constitutional
        ['/record-governance', require('../routes/record-governance')], // P3: Immutable record proposals + version history
        ['/developers', developersRoutes],
        ['/v5/observability', require('../routes/observability')], // V5 Temporal Engine
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
    app.use('/api/org-integrations', authMiddleware, orgIntegrationsFactory(db));

    // API version info
    const { versionInfoHandler } = require('../middleware/api-version');
    app.get('/api/version', versionInfoHandler);
    app.get('/api/v1/version', versionInfoHandler);

    // Phase 3: V1 Domain Controllers (service-backed)
    try {
        const v1Controllers = require('../controllers/v1');
        app.use('/api/v1', authMiddleware, v1Controllers);
        console.log('[boot] V1 controllers mounted at /api/v1');
    } catch (e) {
        console.warn('[boot] V1 controllers not loaded:', e.message);
    }

    // v9.5.0: Enterprise features
    app.use('/api/score-validation', require('../routes/score-validation'));
    app.use('/api/sso', require('../routes/sso'));
    app.use('/api/network', require('../routes/network-intelligence'));
    app.use('/api/supplier-portal', require('../routes/supplier-portal'));

    // GDPR routes
    const { dataExportHandler, dataDeleteHandler } = require('../middleware/gdpr');
    app.post('/api/gdpr/export', require('../auth').authMiddleware, dataExportHandler);
    app.post('/api/gdpr/delete', require('../auth').authMiddleware, dataDeleteHandler);
}

module.exports = { setupRoutes };
