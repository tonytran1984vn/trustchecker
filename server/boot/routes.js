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
    const scmDigitalTwinRoutes = require('../routes/scm-digital-twin');

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
        ['/scm/twin', scmDigitalTwinRoutes],
    ];

    // Mount on /api and /api/v1 (versioned alias)
    for (const [subPath, ...handlers] of API_ROUTES) {
        app.use(`/api${subPath}`, ...handlers);
        app.use(`/api/v1${subPath}`, ...handlers);
    }

    // Admin-only integration settings
    const { authMiddleware, requireRole } = require('../auth');
    const db = require('../db');
    app.use('/api/integrations', authMiddleware, requireRole('admin'), integrationsRouteFactory(db));

    // API version info
    const { versionInfoHandler } = require('../middleware/api-version');
    app.get('/api/version', versionInfoHandler);
    app.get('/api/v1/version', versionInfoHandler);
}

module.exports = { setupRoutes };
