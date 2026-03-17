/**
 * Service Layer — Barrel Export
 * Import: const { authService, productService } = require('./services');
 */
module.exports = {
    authService: require('./auth.service'),
    verificationService: require('./verification.service'),
    trustService: require('./trust.service'),
    productService: require('./product.service'),
    supplyChainService: require('./supply-chain.service'),
    riskService: require('./risk.service'),
    complianceService: require('./compliance.service'),
    orgService: require('./org.service'),
    notificationService: require('./notification.service'),
    platformService: require('./platform.service'),
    rbacService: require('./rbac.service'),
};
