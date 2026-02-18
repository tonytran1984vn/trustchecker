// ─── API Documentation Endpoint ──────────────────────────────────────────────
// No authentication required – returns structured API spec
const express = require('express');
const router = express.Router();

const API_SPEC = {
    openapi: '3.0.0',
    info: {
        title: 'TrustChecker API',
        version: '8.8.6',
        description: 'Digital Trust Infrastructure – Anti-counterfeiting, supply chain integrity, and product verification platform',
        contact: { name: 'TrustChecker Team' }
    },
    servers: [{ url: '/api', description: 'Main API Server' }],
    paths: {
        // ─── Auth ───
        '/auth/login': {
            post: { tags: ['Auth'], summary: 'Login with email/password', description: 'Returns JWT access + refresh tokens' }
        },
        '/auth/register': {
            post: { tags: ['Auth'], summary: 'Register new user', description: 'Create account with role assignment' }
        },
        '/auth/refresh': {
            post: { tags: ['Auth'], summary: 'Refresh access token', description: 'Exchange refresh token for new access token' }
        },
        '/auth/mfa/setup': {
            post: { tags: ['Auth'], summary: 'Setup MFA (TOTP)', description: 'Generate TOTP secret and QR code' }
        },
        '/auth/mfa/verify': {
            post: { tags: ['Auth'], summary: 'Verify MFA code', description: 'Verify TOTP code to complete MFA setup' }
        },
        '/auth/sessions': {
            get: { tags: ['Auth'], summary: 'List active sessions', description: 'Get all active sessions for current user' }
        },
        '/auth/users': {
            get: { tags: ['Auth'], summary: 'List all users (admin)', description: 'Admin-only: list all registered users' }
        },

        // ─── Products ───
        '/products': {
            get: { tags: ['Products'], summary: 'List all products', description: 'Returns paginated product list with trust scores' },
            post: { tags: ['Products'], summary: 'Create product', description: 'Register new product with auto-generated QR code' }
        },
        '/products/:id': {
            get: { tags: ['Products'], summary: 'Get product detail', description: 'Full product info with trust score and blockchain seal' }
        },
        '/products/stats': {
            get: { tags: ['Products'], summary: 'Dashboard statistics', description: 'Aggregate counts, recent activity, scan distribution' }
        },

        // ─── QR ───
        '/qr/verify': {
            post: { tags: ['QR'], summary: 'Verify QR code', description: 'Full verification pipeline: decode → DB lookup → fraud check → trust score → blockchain seal' }
        },
        '/qr/scan-history': {
            get: { tags: ['QR'], summary: 'Scan history', description: 'Paginated scan event log with filters' }
        },
        '/qr/fraud-alerts': {
            get: { tags: ['QR'], summary: 'Fraud alerts', description: 'Active fraud alerts with severity levels' }
        },
        '/qr/blockchain': {
            get: { tags: ['QR'], summary: 'Blockchain seals', description: 'All blockchain verification seals' }
        },

        // ─── SCM ───
        '/scm/events': {
            get: { tags: ['Supply Chain'], summary: 'SCM events', description: 'EPCIS event tracking with batch trace' }
        },
        '/scm/batches': {
            get: { tags: ['Supply Chain'], summary: 'Batch management', description: 'Batch list with trace capability' }
        },
        '/scm/inventory': {
            get: { tags: ['Supply Chain'], summary: 'Inventory', description: 'Stock levels with AI demand forecasting' }
        },
        '/scm/shipments': {
            get: { tags: ['Supply Chain'], summary: 'Logistics', description: 'Shipment tracking with GPS and IoT readings' }
        },
        '/scm/partners': {
            get: { tags: ['Supply Chain'], summary: 'Partners', description: 'Partner directory with trust scoring' }
        },
        '/scm/leaks': {
            get: { tags: ['Supply Chain'], summary: 'Leak monitoring', description: 'Marketplace scan alerts and distributor risk' }
        },
        '/scm/graph': {
            get: { tags: ['Supply Chain'], summary: 'Trust graph', description: 'Network analysis with PageRank and toxic node detection' }
        },

        // ─── KYC ───
        '/kyc/businesses': {
            get: { tags: ['KYC'], summary: 'List businesses', description: 'KYC-registered businesses with risk scoring' },
            post: { tags: ['KYC'], summary: 'Register business', description: 'Submit business for KYC verification' }
        },
        '/kyc/businesses/:id/approve': {
            post: { tags: ['KYC'], summary: 'Approve business', description: 'Mark business verification as approved' }
        },
        '/kyc/businesses/:id/reject': {
            post: { tags: ['KYC'], summary: 'Reject business', description: 'Reject business verification' }
        },
        '/kyc/sanction-check': {
            post: { tags: ['KYC'], summary: 'Sanction check', description: 'Screen entity against OFAC/EU/UN lists' }
        },

        // ─── Evidence ───
        '/evidence': {
            get: { tags: ['Evidence'], summary: 'List evidence', description: 'All evidence items with integrity status' },
            post: { tags: ['Evidence'], summary: 'Upload evidence', description: 'Upload and SHA-256 anchor new evidence' }
        },
        '/evidence/:id/verify': {
            post: { tags: ['Evidence'], summary: 'Verify integrity', description: 'Re-hash and compare against blockchain seal' }
        },
        '/evidence/:id/forensic-report': {
            get: { tags: ['Evidence'], summary: 'Forensic report', description: 'Comprehensive verification chain report' }
        },

        // ─── Trust ───
        '/trust/ratings': {
            get: { tags: ['Trust'], summary: 'Product ratings', description: 'Community ratings with star distribution' },
            post: { tags: ['Trust'], summary: 'Submit rating', description: 'Rate a product (1-5 stars)' }
        },
        '/trust/certifications': {
            get: { tags: ['Trust'], summary: 'Certifications', description: 'ISO, Fair Trade, GMP certifications' }
        },
        '/trust/compliance': {
            get: { tags: ['Trust'], summary: 'Compliance records', description: 'GDPR, SOC2, PCI-DSS compliance tracking' }
        },

        // ─── Billing ───
        '/billing/plan': {
            get: { tags: ['Billing'], summary: 'Current plan', description: 'User subscription plan and usage' }
        },
        '/billing/plans': {
            get: { tags: ['Billing'], summary: 'Available plans', description: 'All pricing tiers with feature comparison' }
        },
        '/billing/invoices': {
            get: { tags: ['Billing'], summary: 'Invoice history', description: 'Past invoices and payment status' }
        },

        // ─── Public ───
        '/public/stats': {
            get: { tags: ['Public'], summary: 'Platform stats', description: 'Aggregate platform statistics (no auth)' }
        },
        '/public/scan-trends': {
            get: { tags: ['Public'], summary: 'Scan trends', description: '7-day scan volume trend (no auth)' }
        },
        '/public/trust-distribution': {
            get: { tags: ['Public'], summary: 'Trust distribution', description: 'Trust score histogram (no auth)' }
        },

        // ─── Support ───
        '/support/tickets': {
            get: { tags: ['Support'], summary: 'List tickets', description: 'User support tickets with status filtering' },
            post: { tags: ['Support'], summary: 'Create ticket', description: 'Submit new support ticket' }
        },
        '/support/tickets/:id/reply': {
            post: { tags: ['Support'], summary: 'Reply to ticket', description: 'Add message to ticket thread' }
        },
        '/support/tickets/:id/resolve': {
            post: { tags: ['Support'], summary: 'Resolve ticket', description: 'Mark ticket as resolved with resolution text' }
        },

        // ─── NFT ───
        '/nft/mint': {
            post: { tags: ['NFT'], summary: 'Mint certificate', description: 'Create NFT certificate for product authenticity' }
        },
        '/nft/:id/verify': {
            get: { tags: ['NFT'], summary: 'Verify NFT', description: 'Verify NFT certificate on blockchain' }
        },
        '/nft/:id/transfer': {
            post: { tags: ['NFT'], summary: 'Transfer NFT', description: 'Transfer certificate ownership' }
        },

        // ─── Sustainability ───
        '/sustainability/:productId/score': {
            get: { tags: ['Sustainability'], summary: 'Get score', description: '6-factor sustainability scoring' },
            post: { tags: ['Sustainability'], summary: 'Submit assessment', description: 'Submit sustainability assessment' }
        },
        '/sustainability/leaderboard': {
            get: { tags: ['Sustainability'], summary: 'Leaderboard', description: 'Top products by sustainability score' }
        },

        // ─── GDPR Compliance ───
        '/compliance/retention-policies': {
            get: { tags: ['Compliance'], summary: 'Retention policies', description: 'Data retention policy management' }
        },
        '/compliance/gdpr/export/:userId': {
            get: { tags: ['Compliance'], summary: 'GDPR export', description: 'Export all user data (GDPR right to portability)' }
        },
        '/compliance/gdpr/delete/:userId': {
            post: { tags: ['Compliance'], summary: 'GDPR delete', description: 'Anonymize user data (GDPR right to erasure)' }
        },

        // ─── Anomaly ───
        '/anomaly/detect': {
            post: { tags: ['Anomaly'], summary: 'Run detection', description: '4-algorithm anomaly detection (z-score, IQR, pattern, temporal)' }
        },
        '/anomaly/history': {
            get: { tags: ['Anomaly'], summary: 'Detection history', description: 'Past anomaly detection results' }
        },

        // ─── AI Assistant ───
        '/assistant/chat': {
            post: { tags: ['AI'], summary: 'Chat with AI', description: 'Rule-based chatbot with 25+ FAQ topics' }
        },
        '/assistant/live-chat': {
            post: { tags: ['AI'], summary: 'Start live chat', description: 'Initiate live support session with auto-escalation' }
        },
        '/assistant/history': {
            get: { tags: ['AI'], summary: 'Chat history', description: 'User conversation history' }
        },

        // ─── Branding ───
        '/branding/config': {
            get: { tags: ['Branding'], summary: 'Get theme', description: 'Current white-label branding configuration' },
            put: { tags: ['Branding'], summary: 'Update theme', description: 'Update branding colors, logo, and CSS variables' }
        },
        '/branding/presets': {
            get: { tags: ['Branding'], summary: 'Theme presets', description: '6 built-in theme presets (default, ocean, forest, sunset, midnight, corporate)' }
        },

        // ─── Wallet & Payment ───
        '/wallet/ssi/did': {
            post: { tags: ['Wallet'], summary: 'Create DID', description: 'Generate decentralized identity (DID:key method)' }
        },
        '/wallet/ssi/credential': {
            post: { tags: ['Wallet'], summary: 'Issue credential', description: 'Issue verifiable credential (W3C VC format)' }
        },
        '/wallet/payment/checkout': {
            post: { tags: ['Payment'], summary: 'Create checkout', description: 'Initiate payment with simulated gateway' }
        },
        '/wallet/payment/history': {
            get: { tags: ['Payment'], summary: 'Payment history', description: 'Transaction history with receipts' }
        },
        '/wallet/ipfs/costs': {
            get: { tags: ['IPFS'], summary: 'IPFS costs', description: 'Storage cost monitoring and pin management' }
        },

        // ─── Notifications ───
        '/notifications': {
            get: { tags: ['Notifications'], summary: 'List notifications', description: 'User notifications with read/unread status' }
        },
        '/notifications/broadcast': {
            post: { tags: ['Notifications'], summary: 'Broadcast', description: 'Admin: send notification to all users' }
        },
        '/notifications/preferences': {
            get: { tags: ['Notifications'], summary: 'Preferences', description: 'Email/push/in-app notification preferences' },
            put: { tags: ['Notifications'], summary: 'Update preferences', description: 'Configure notification channels' }
        },

        // ─── Admin ───
        '/admin/overview': {
            get: { tags: ['Admin'], summary: 'Dashboard overview', description: 'System-wide stats, trends, and health' }
        },
        '/admin/users': {
            get: { tags: ['Admin'], summary: 'User management', description: 'List/search users with role and status management' }
        },
        '/admin/audit': {
            get: { tags: ['Admin'], summary: 'Audit log', description: 'Full audit trail with filters' }
        },
        '/admin/metrics': {
            get: { tags: ['Admin'], summary: 'Performance metrics', description: 'Memory, DB size, response times, request distribution' }
        },

        // ─── Reports ───
        '/reports/scan': {
            get: { tags: ['Reports'], summary: 'Scan report', description: 'Scan volume analytics with trends' }
        },
        '/reports/fraud': {
            get: { tags: ['Reports'], summary: 'Fraud report', description: 'Fraud detection summary with severity breakdown' }
        },
        '/reports/export/:entity': {
            get: { tags: ['Reports'], summary: 'Export data', description: 'CSV/JSON export for 11 entity types' }
        },

        // ─── Webhooks ───
        '/webhooks': {
            get: { tags: ['Webhooks'], summary: 'List subscriptions', description: 'All webhook subscriptions with stats' },
            post: { tags: ['Webhooks'], summary: 'Subscribe', description: 'Register webhook for 20+ event types' }
        },
        '/webhooks/test': {
            post: { tags: ['Webhooks'], summary: 'Test delivery', description: 'Send test webhook to URL' }
        },
        '/webhooks/deliveries': {
            get: { tags: ['Webhooks'], summary: 'Delivery log', description: 'Webhook delivery history with status' }
        },

        // ─── Email ───
        '/email/templates': {
            get: { tags: ['Email'], summary: 'List templates', description: '7 HTML email templates available' }
        },
        '/email/templates/:name/preview': {
            get: { tags: ['Email'], summary: 'Preview template', description: 'Render email template with sample data (?render=true for HTML)' }
        },
        '/email/send': {
            post: { tags: ['Email'], summary: 'Send email', description: 'Send transactional email (simulated)' }
        },

        // ─── System ───
        '/system/info': {
            get: { tags: ['System'], summary: 'System info', description: 'Server info, memory, all tables with row counts' }
        },
        '/system/seed': {
            post: { tags: ['System'], summary: 'Seed demo data', description: 'Populate demo products, partners, and businesses (idempotent)' }
        },
        '/system/backup': {
            post: { tags: ['System'], summary: 'Backup', description: 'Export full database snapshot as JSON' }
        },
        '/system/restore': {
            post: { tags: ['System'], summary: 'Restore', description: 'Restore database from backup JSON' }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
    },
    tags: [
        { name: 'Auth', description: 'Authentication, MFA, OAuth, Passkeys' },
        { name: 'Products', description: 'Product registration and trust scoring' },
        { name: 'QR', description: 'QR validation, scan history, fraud alerts' },
        { name: 'Supply Chain', description: 'SCM tracking, logistics, partners, leak detection' },
        { name: 'KYC', description: 'Business verification and sanctions screening' },
        { name: 'Evidence', description: 'SHA-256 evidence vault with blockchain sealing' },
        { name: 'Trust', description: 'Ratings, certifications, compliance records' },
        { name: 'Billing', description: 'Plans, usage metering, invoicing' },
        { name: 'Public', description: 'Open data endpoints (no auth)' },
        { name: 'Support', description: 'Support ticket system' },
        { name: 'NFT', description: 'NFT certificate minting and verification' },
        { name: 'Sustainability', description: 'Environmental sustainability scoring' },
        { name: 'Compliance', description: 'GDPR compliance and data retention' },
        { name: 'Anomaly', description: 'Anomaly detection engine' },
        { name: 'AI', description: 'AI assistant and live chat' },
        { name: 'Branding', description: 'White-label theming' },
        { name: 'Wallet', description: 'SSI wallet and DID management' },
        { name: 'Payment', description: 'Payment gateway (simulated)' },
        { name: 'IPFS', description: 'IPFS cost monitoring' },
        { name: 'Notifications', description: 'In-app notification system' },
        { name: 'Admin', description: 'Admin dashboard and user management' },
        { name: 'Reports', description: 'Reports and data export' },
        { name: 'Webhooks', description: 'Outbound webhook management' },
        { name: 'Email', description: 'Email templates and delivery' },
        { name: 'System', description: 'System maintenance and backup' },
    ],
    security: [{ bearerAuth: [] }]
};

router.get('/', async (req, res) => {
    res.json(API_SPEC);
});

// Human-readable docs page
router.get('/html', async (req, res) => {
    const tags = {};
    for (const [path, methods] of Object.entries(API_SPEC.paths)) {
        for (const [method, info] of Object.entries(methods)) {
            const tag = (info.tags || ['Other'])[0];
            if (!tags[tag]) tags[tag] = [];
            tags[tag].push({ method: method.toUpperCase(), path, ...info });
        }
    }

    const html = `<!DOCTYPE html>
<html><head>
<title>TrustChecker API Documentation</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:#0a0e1a; color:#c8d6e5; line-height:1.6; }
  .container { max-width:1000px; margin:0 auto; padding:40px 20px; }
  h1 { font-size:2rem; color:#00d2ff; margin-bottom:8px; }
  .subtitle { color:#636e7b; margin-bottom:40px; }
  .tag-group { margin-bottom:32px; }
  .tag-title { font-size:1.1rem; font-weight:700; color:#e8ecf1; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .endpoint { display:flex; align-items:center; gap:12px; padding:10px 16px; margin-bottom:4px; border-radius:8px; background:rgba(255,255,255,0.03); }
  .endpoint:hover { background:rgba(0,210,255,0.05); }
  .method { font-family:'JetBrains Mono',monospace; font-size:0.75rem; font-weight:600; padding:3px 8px; border-radius:4px; min-width:50px; text-align:center; }
  .method.GET { background:rgba(0,210,100,0.15); color:#00d264; }
  .method.POST { background:rgba(0,150,255,0.15); color:#0096ff; }
  .method.PUT { background:rgba(255,165,0,0.15); color:#ffa500; }
  .method.DELETE { background:rgba(255,50,50,0.15); color:#ff3232; }
  .path { font-family:'JetBrains Mono',monospace; font-size:0.85rem; color:#e8ecf1; min-width:240px; }
  .desc { font-size:0.85rem; color:#636e7b; }
  .badge { display:inline-block; font-size:0.7rem; padding:2px 8px; border-radius:10px; background:rgba(255,255,255,0.06); color:#636e7b; margin-left:auto; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:40px; }
  .stat { background:rgba(255,255,255,0.03); padding:16px; border-radius:10px; text-align:center; border:1px solid rgba(255,255,255,0.06); }
  .stat-num { font-size:1.5rem; font-weight:700; color:#00d2ff; }
  .stat-label { font-size:0.75rem; color:#636e7b; }
</style>
</head><body>
<div class="container">
  <h1>🛡️ TrustChecker API v${API_SPEC.info.version}</h1>
  <p class="subtitle">${API_SPEC.info.description}</p>
  <div class="stats">
    <div class="stat"><div class="stat-num">${Object.keys(API_SPEC.paths).length}</div><div class="stat-label">Endpoints</div></div>
    <div class="stat"><div class="stat-num">${Object.keys(tags).length}</div><div class="stat-label">Modules</div></div>
    <div class="stat"><div class="stat-num">JWT</div><div class="stat-label">Auth</div></div>
    <div class="stat"><div class="stat-num">REST</div><div class="stat-label">Protocol</div></div>
  </div>
  ${Object.entries(tags).map(([tag, endpoints]) => `
    <div class="tag-group">
      <div class="tag-title">${tag} (${endpoints.length})</div>
      ${endpoints.map(e => `
        <div class="endpoint">
          <span class="method ${e.method}">${e.method}</span>
          <span class="path">/api${e.path}</span>
          <span class="desc">${e.description || e.summary}</span>
        </div>
      `).join('')}
    </div>
  `).join('')}
</div>
</body></html>`;
    res.send(html);
});

module.exports = router;
