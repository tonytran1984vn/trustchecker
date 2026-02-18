/**
 * Billing & Pricing Routes v2.0
 * Hybrid pricing: Core Subscription + Usage-Based Add-ons + Freemium
 * 5-tier plans, metered overages, enterprise quotes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const pricing = require('../engines/pricing-engine');
const { getDetailedUsage, getOverageCharges } = require('../middleware/usage-meter');

// ─── POST /webhook — Webhook receiver with signature verification ────
router.post('/webhook', async (req, res) => {
    try {
        // Verify webhook signature (Fix: was completely unauthenticated)
        const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
        const signature = req.headers['x-webhook-signature'] || req.headers['stripe-signature'];

        if (WEBHOOK_SECRET) {
            if (!signature) {
                return res.status(401).json({ error: 'Missing webhook signature' });
            }
            const crypto = require('crypto');
            const expectedSig = crypto.createHmac('sha256', WEBHOOK_SECRET)
                .update(JSON.stringify(req.body))
                .digest('hex');
            if (signature !== `sha256=${expectedSig}` && signature !== expectedSig) {
                return res.status(403).json({ error: 'Invalid webhook signature' });
            }
        } else if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({ error: 'Webhook secret not configured' });
        } else {
            console.warn('⚠️  WEBHOOK_SECRET not set — accepting unsigned webhook in dev mode');
        }

        const { event_type, data } = req.body;
        if (!event_type) return res.status(400).json({ error: 'event_type required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO webhook_events (id, event_type, source, payload, status, processed_at)
      VALUES (?, ?, ?, ?, 'processed', datetime('now'))
    `).run(id, event_type, data?.source || 'stripe', JSON.stringify(req.body));

        let action = 'logged';
        if (event_type === 'payment.succeeded') action = 'payment_confirmed';
        else if (event_type === 'subscription.cancelled') action = 'subscription_cancelled';
        else if (event_type === 'invoice.payment_failed') action = 'payment_failed_alert';

        res.json({ received: true, event_id: id, action });
    } catch (e) {
        console.error('Webhook error:', e);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ─── GET /pricing — Public pricing page data (no auth) ──────────
router.get('/pricing', (req, res) => {
    res.json(pricing.getPublicPricing());
});

router.use(authMiddleware);

const PLANS = pricing.PLANS;

// ─── GET /plan ──────────────────────────────────────────────
router.get('/plan', async (req, res) => {
    try {
        let plan = await db.get("SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);

        if (!plan) {
            // Create default free plan
            const id = uuidv4();
            const p = PLANS.free;
            await db.prepare(`
        INSERT INTO billing_plans (id, user_id, plan_name, scan_limit, api_limit, storage_mb, price_monthly)
        VALUES (?, ?, 'free', ?, ?, ?, ?)
      `).run(id, req.user.id, p.scan_limit, p.api_limit, p.storage_mb, p.price);
            plan = await db.get('SELECT * FROM billing_plans WHERE id = ?', [id]);
        }

        const planDef = PLANS[plan?.plan_name || 'free'];
        res.json({
            plan,
            plan_details: planDef,
            available_plans: pricing.getPublicPricing().plans,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /upgrade ──────────────────────────────────────────
router.post('/upgrade', requireRole('admin'), async (req, res) => {
    try {
        const { plan_name, billing_cycle } = req.body;
        if (!PLANS[plan_name]) return res.status(400).json({ error: 'Invalid plan. Choose: free, starter, pro, business, enterprise' });

        const p = PLANS[plan_name];
        const isAnnual = billing_cycle === 'annual';
        const amount = isAnnual ? (p.price_annual || 0) : (p.price_monthly || 0);
        const savingsPercent = p.price_monthly > 0 ? Math.round((1 - (p.price_annual || 0) / (p.price_monthly * 12)) * 100) : 0;

        // Deactivate current plan
        await db.prepare("UPDATE billing_plans SET status = 'inactive' WHERE user_id = ? AND status = 'active'").run(req.user.id);

        // Create new plan
        const id = uuidv4();
        await db.prepare(`
      INSERT INTO billing_plans (id, user_id, plan_name, scan_limit, api_limit, storage_mb, price_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, plan_name, p.limits.scans, p.limits.api_calls, p.limits.storage_mb, isAnnual ? Math.round((p.price_annual || 0) / 12) : (p.price_monthly || 0));

        // Generate invoice
        const invoiceId = uuidv4();
        const now = new Date();
        const periodEnd = new Date(now);
        if (isAnnual) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        else periodEnd.setMonth(periodEnd.getMonth() + 1);

        await db.prepare(`
      INSERT INTO invoices (id, user_id, plan_name, amount, status, period_start, period_end)
      VALUES (?, ?, ?, ?, 'paid', ?, ?)
    `).run(invoiceId, req.user.id, plan_name, amount, now.toISOString(), periodEnd.toISOString());

        // Plan comparison for the response
        const comparison = pricing.comparePlans(
            (await db.get("SELECT plan_name FROM billing_plans WHERE user_id = ? AND status = 'inactive' ORDER BY started_at DESC LIMIT 1", [req.user.id]))?.plan_name || 'free',
            plan_name
        );

        res.json({
            plan_name, billing_cycle: isAnnual ? 'annual' : 'monthly',
            amount, invoice_id: invoiceId,
            savings: isAnnual ? { percent: savingsPercent, saved: ((p.price_monthly || 0) * 12) - (p.price_annual || 0) } : null,
            new_limits: p.limits,
            new_features: comparison?.new_features || [],
            sla: p.sla,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /usage ─────────────────────────────────────────────
router.get('/usage', async (req, res) => {
    try {
        const plan = await db.get("SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);

        // Calculate real usage from existing tables
        const period = new Date().toISOString().substring(0, 7); // YYYY-MM
        const scans = await db.get(
            "SELECT COUNT(*) as count FROM scan_events WHERE scanned_at >= date('now', 'start of month')"
        ) || { count: 0 };

        const evidenceSize = await db.get(
            'SELECT COALESCE(SUM(file_size), 0) as size FROM evidence_items'
        ) || { size: 0 };

        const apiCalls = await db.get(
            "SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= date('now', 'start of month')"
        ) || { count: 0 };

        const usage = {
            scans: { used: scans.count, limit: plan?.scan_limit || 100, percent: plan?.scan_limit > 0 ? Math.round((scans.count / plan.scan_limit) * 100) : 0 },
            api_calls: { used: apiCalls.count, limit: plan?.api_limit || 500, percent: plan?.api_limit > 0 ? Math.round((apiCalls.count / plan.api_limit) * 100) : 0 },
            storage_mb: {
                used: Math.round(evidenceSize.size / (1024 * 1024) * 100) / 100,
                limit: plan?.storage_mb || 50,
                percent: plan?.storage_mb > 0 ? Math.round((evidenceSize.size / (1024 * 1024) / plan.storage_mb) * 100) : 0
            }
        };

        // Unlimited for enterprise
        if (plan?.plan_name === 'enterprise') {
            usage.scans.limit = '∞';
            usage.scans.percent = 0;
            usage.api_calls.limit = '∞';
            usage.api_calls.percent = 0;
            usage.storage_mb.limit = '∞';
            usage.storage_mb.percent = 0;
        }

        res.json({ period, plan_name: plan?.plan_name || 'free', usage });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /usage/detailed — Full usage breakdown with overage costs ──
router.get('/usage/detailed', async (req, res) => {
    try {
        const detailed = await getDetailedUsage(req.user.id);
        res.json(detailed);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /estimate — Project next invoice (base + overages) ─────────
router.get('/estimate', async (req, res) => {
    try {
        const plan = await db.get(
            "SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'",
            [req.user.id]
        );
        const planName = plan?.plan_name || 'free';
        const detailed = await getDetailedUsage(req.user.id);

        const estimate = pricing.estimateInvoice(
            planName,
            req.query.cycle || 'monthly',
            {
                scans: detailed.usage.scans?.used || 0,
                nft_mints: detailed.usage.nft_mints?.used || 0,
                carbon_calcs: detailed.usage.carbon_calcs?.used || 0,
                api_calls: detailed.usage.api_calls?.used || 0,
            }
        );

        res.json({
            ...estimate,
            period: detailed.period,
            usage_snapshot: detailed.usage,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /overage — Current overage charges ─────────────────────────
router.get('/overage', async (req, res) => {
    try {
        const charges = await getOverageCharges(req.user.id);
        res.json(charges);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /enterprise/request — Enterprise quote request ────────────
router.post('/enterprise/request', async (req, res) => {
    try {
        const { estimated_scans, estimated_api_calls, requirements } = req.body;

        const quote = pricing.generateEnterpriseQuote(
            {
                scans: estimated_scans || 100000,
                api_calls: estimated_api_calls || 500000,
            },
            requirements || {}
        );

        // Log the enterprise request
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
            VALUES (?, ?, 'ENTERPRISE_QUOTE_REQUEST', 'billing', ?, ?)
        `).run(id, req.user.id, id, JSON.stringify({
            estimated_scans, estimated_api_calls, requirements, quote,
        }));

        res.json({
            quote,
            request_id: id,
            message: 'Our enterprise team will reach out within 48 hours.',
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /compare — Compare plans ───────────────────────────────────
router.get('/compare', async (req, res) => {
    try {
        const plan = await db.get(
            "SELECT plan_name FROM billing_plans WHERE user_id = ? AND status = 'active'",
            [req.user.id]
        );
        const currentPlan = plan?.plan_name || 'free';
        const { to } = req.query;

        if (to) {
            const comparison = pricing.comparePlans(currentPlan, to);
            if (!comparison) return res.status(400).json({ error: 'Invalid target plan' });
            return res.json(comparison);
        }

        // Compare all plans
        const comparisons = {};
        for (const slug of Object.keys(PLANS)) {
            if (slug !== currentPlan) {
                comparisons[slug] = pricing.comparePlans(currentPlan, slug);
            }
        }
        res.json({ current_plan: currentPlan, comparisons });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /invoices ──────────────────────────────────────────
router.get('/invoices', async (req, res) => {
    try {
        const invoices = await db.all('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json({ invoices });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /limits ────────────────────────────────────────────
router.get('/limits', async (req, res) => {
    try {
        const plan = await db.get("SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);
        const planDetails = PLANS[plan?.plan_name || 'free'];

        res.json({
            current_plan: plan?.plan_name || 'free',
            limits: planDetails,
            all_plans: PLANS
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /webhook/events — View webhook event log (admin) ───
router.get('/webhook/events', requireRole('admin'), async (req, res) => {
    try {
        const events = await db.all('SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 50');
        res.json({ events });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /downgrade ────────────────────────────────────────
router.post('/downgrade', requireRole('admin'), async (req, res) => {
    try {
        const { plan_name } = req.body;
        if (!plan_name || !PLANS[plan_name]) return res.status(400).json({ error: 'Invalid plan' });

        const current = await db.get("SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);
        const currentPlan = current?.plan_name || 'free';
        const planOrder = ['free', 'starter', 'pro', 'enterprise'];
        if (planOrder.indexOf(plan_name) >= planOrder.indexOf(currentPlan)) {
            return res.status(400).json({ error: 'Can only downgrade to a lower tier. Use /upgrade for upgrades.' });
        }

        if (current) {
            await db.prepare("UPDATE billing_plans SET status = 'cancelled', expires_at = datetime('now') WHERE id = ?").run(current.id);
        }

        const newId = uuidv4();
        const p = PLANS[plan_name];
        await db.prepare(`INSERT INTO billing_plans (id, user_id, plan_name, scan_limit, api_limit, storage_mb, price_monthly) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(newId, req.user.id, plan_name, p.scan_limit, p.api_limit, p.storage_mb, p.price);

        // Generate prorated refund notice
        res.json({
            downgraded_to: plan_name,
            previous_plan: currentPlan,
            new_limits: p,
            effective_immediately: true,
            note: 'Prorated refund will be applied to your next billing cycle'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /usage/alerts ──────────────────────────────────────
router.get('/usage/alerts', async (req, res) => {
    try {
        const plan = await db.get("SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'", [req.user.id]);
        const planLimits = PLANS[plan?.plan_name || 'free'];
        const period = new Date().toISOString().substring(0, 7);

        const scanCount = (await db.get("SELECT COUNT(*) as c FROM scan_events WHERE strftime('%Y-%m', scanned_at) = ?", [period]))?.c || 0;
        const apiCount = (await db.get("SELECT COUNT(*) as c FROM audit_log WHERE strftime('%Y-%m', created_at) = ?", [period]))?.c || 0;
        const storageSize = (await db.get("SELECT COALESCE(SUM(file_size), 0) as s FROM evidence_items"))?.s || 0;
        const storageMB = storageSize / (1024 * 1024);

        const alerts = [];
        const scanPct = planLimits.scan_limit > 0 ? (scanCount / planLimits.scan_limit) * 100 : 0;
        const apiPct = planLimits.api_limit > 0 ? (apiCount / planLimits.api_limit) * 100 : 0;
        const storagePct = planLimits.storage_mb > 0 ? (storageMB / planLimits.storage_mb) * 100 : 0;

        if (scanPct >= 90) alerts.push({ type: 'scans', level: 'critical', message: `Scan usage at ${Math.round(scanPct)}% (${scanCount}/${planLimits.scan_limit})` });
        else if (scanPct >= 75) alerts.push({ type: 'scans', level: 'warning', message: `Scan usage at ${Math.round(scanPct)}%` });

        if (apiPct >= 90) alerts.push({ type: 'api', level: 'critical', message: `API usage at ${Math.round(apiPct)}%` });
        else if (apiPct >= 75) alerts.push({ type: 'api', level: 'warning', message: `API usage at ${Math.round(apiPct)}%` });

        if (storagePct >= 90) alerts.push({ type: 'storage', level: 'critical', message: `Storage at ${Math.round(storagePct)}%` });
        else if (storagePct >= 75) alerts.push({ type: 'storage', level: 'warning', message: `Storage at ${Math.round(storagePct)}%` });

        res.json({
            plan: plan?.plan_name || 'free',
            period,
            alerts,
            has_alerts: alerts.length > 0,
            usage_summary: { scans: scanPct.toFixed(1) + '%', api: apiPct.toFixed(1) + '%', storage: storagePct.toFixed(1) + '%' }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /sdk/api-key — Generate API key ───────────────────
router.post('/sdk/api-key', requireRole('admin'), async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const crypto = require('crypto');
        const apiKey = 'tc_' + crypto.randomBytes(24).toString('hex');
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const id = uuidv4();

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, req.user.id, 'API_KEY_CREATED', 'api_key', id,
                JSON.stringify({ name: name || 'Default', key_hash: keyHash, permissions: permissions || ['read'], created_at: new Date().toISOString() }));

        res.json({
            api_key: apiKey,
            key_id: id,
            name: name || 'Default',
            permissions: permissions || ['read'],
            note: 'Store this key securely. It will not be shown again.'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /sdk/api-keys — List API keys ──────────────────────
router.get('/sdk/api-keys', requireRole('admin'), async (req, res) => {
    try {
        const keys = await db.all("SELECT id, details, created_at FROM audit_log WHERE actor_id = ? AND action = 'API_KEY_CREATED' ORDER BY created_at DESC", [req.user.id]);
        const parsed = keys.map(k => {
            const d = JSON.parse(k.details || '{}');
            return { id: k.id, name: d.name, permissions: d.permissions, created_at: d.created_at || k.created_at, revoked: !!d.revoked };
        });
        res.json({ api_keys: parsed.filter(k => !k.revoked) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── DELETE /sdk/api-key/:id — Revoke API key ───────────────
router.delete('/sdk/api-key/:id', requireRole('admin'), async (req, res) => {
    try {
        const key = await db.get("SELECT * FROM audit_log WHERE id = ? AND action = 'API_KEY_CREATED'", [req.params.id]);
        if (!key) return res.status(404).json({ error: 'API key not found' });

        const details = JSON.parse(key.details || '{}');
        details.revoked = true;
        details.revoked_at = new Date().toISOString();
        await db.prepare('UPDATE audit_log SET details = ? WHERE id = ?').run(JSON.stringify(details), req.params.id);

        res.json({ revoked: true, key_id: req.params.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /sdk/snippet — Generate SDK code snippet ───────────
router.get('/sdk/snippet', async (req, res) => {
    try {
        const { language = 'javascript' } = req.query;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const snippets = {
            javascript: `// TrustChecker SDK — JavaScript
const TRUSTCHECKER_API = '${baseUrl}/api';
const API_KEY = 'tc_YOUR_API_KEY';

async function verifyProduct(productId) {
  const res = await fetch(\`\${TRUSTCHECKER_API}/public/api/v1/products/\${productId}/trust\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return res.json();
}

async function submitScan(productId, scanData) {
  const res = await fetch(\`\${TRUSTCHECKER_API}/qr/verify\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
    body: JSON.stringify({ product_id: productId, ...scanData })
  });
  return res.json();
}`,
            python: `# TrustChecker SDK — Python
import requests

TRUSTCHECKER_API = '${baseUrl}/api'
API_KEY = 'tc_YOUR_API_KEY'

def verify_product(product_id):
    resp = requests.get(f'{TRUSTCHECKER_API}/public/api/v1/products/{product_id}/trust',
                        headers={'X-API-Key': API_KEY})
    return resp.json()

def submit_scan(product_id, scan_data):
    resp = requests.post(f'{TRUSTCHECKER_API}/qr/verify',
                         headers={'Authorization': f'Bearer {API_KEY}'},
                         json={'product_id': product_id, **scan_data})
    return resp.json()`,
            curl: `# TrustChecker SDK — cURL
# Verify product trust score
curl -s '${baseUrl}/api/public/api/v1/products/PRODUCT_ID/trust' \\
  -H 'X-API-Key: tc_YOUR_API_KEY' | jq .

# Submit scan
curl -s -X POST '${baseUrl}/api/qr/verify' \\
  -H 'Authorization: Bearer tc_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"product_id":"PRODUCT_ID"}' | jq .`
        };

        res.json({ language, snippet: snippets[language] || snippets.javascript, available_languages: Object.keys(snippets) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

