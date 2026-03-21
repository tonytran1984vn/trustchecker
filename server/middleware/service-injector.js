/**
 * Service Injector Middleware
 *
 * Makes all services available via req.services.
 * Old routes can gradually migrate from db.* to req.services.*.
 *
 * Usage in routes:
 *   const products = req.services.product.list(orgId);
 *   const trust = req.services.trust.getDashboard(orgId);
 */
const services = {};

// Lazy-load services on first access
const serviceMap = {
    auth: '../services/auth.service',
    product: '../services/product.service',
    trust: '../services/trust.service',
    org: '../services/org.service',
    verification: '../services/verification.service',
    risk: '../services/risk.service',
    compliance: '../services/compliance.service',
    notification: '../services/notification.service',
    supplyChain: '../services/supply-chain.service',
    platform: '../services/platform.service',
    rbac: '../services/rbac.service',
};

const handler = {
    get(target, prop) {
        if (!target[prop] && serviceMap[prop]) {
            try {
                target[prop] = require(serviceMap[prop]);
            } catch (e) {
                console.warn('[svc-inject] Failed:', prop, e.message);
                target[prop] = {};
            }
        }
        return target[prop] || {};
    },
};

const serviceProxy = new Proxy(services, handler);

function serviceInjector(req, res, next) {
    req.services = serviceProxy;
    next();
}

module.exports = serviceInjector;
