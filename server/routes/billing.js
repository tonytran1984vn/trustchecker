/**
 * Stripe Billing & Webhook API
 */

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { billingQueue } = require('../workers/stripe-webhook.worker');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth/core');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
const STRIPE_LIVE = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder');

// Base plan → Stripe Price ID mapping
const STRIPE_PLAN_PRICES = {
    core: 'price_1THuXEEhFiD9tEdmObyDhMLD',
    pro: 'price_1THuYPEhFiD9tEdmlAKw1bsZ',
    enterprise: 'price_1THuYvEhFiD9tEdmkgmhdLLX',
};

/**
 * Endpoint: POST /api/v1/billing/webhook
 * Receives Webhook from Stripe servers.
 * Verifies validity via signature, then enqueues to Worker to avoid Timeout drops safely.
 */
router.post('/webhook', async (req, res) => {
    // 1. Recover the rawBody previously buffered by express.json verification hook
    const rawBody = req.rawBody;
    const signature = req.headers['stripe-signature'];

    if (!rawBody || !signature) {
        return res.status(400).send('Webhook Error: Missing signature or body');
    }

    let event;

    // 2. Cryptographic Protocol Verification
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 3. Accepted Signature -> Enqueue Event logic into BullMQ Queue
    // We immediately drop connection returning HTTP 200 so Stripe doesn't classify as timeout
    try {
        await billingQueue.add('stripe_invoice_event', event, {
            jobId: event.id, // Absolute StripeId Idempotency constraint guarantees 1 run
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
        });

        res.json({ received: true });
    } catch (queueErr) {
        console.error('Failed to queue Stripe Webhook Event:', queueErr.message);
        // By returning 500, Stripe will attempt to retry the webhook payload later
        res.status(500).send('Internal Queue Error');
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// Dynamic Pricing Engine — mirrors client/pages/sa/orgs.js exactly
// Formula: Total MRR = Base_Price[plan] + Σ(addon.price for features NOT in PLAN_DEFAULTS)
// ══════════════════════════════════════════════════════════════════════════════

const PLAN_BASE_PRICES = { core: 0, pro: 299, enterprise: 5000 };

const PLAN_DEFAULTS = {
    core: ['qr', 'products'],
    pro: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'carbon', 'inventory'],
    enterprise: [
        'qr',
        'products',
        'scm_tracking',
        'support',
        'partners',
        'carbon',
        'inventory',
        'risk_radar',
        'ai_forecast',
        'digital_twin',
        'blockchain',
        'kyc',
        'overclaim',
        'exec_dashboard',
    ],
};

const FEATURE_LIST = [
    // Core Platform
    { id: 'qr', label: 'QR Traceability', icon: '📱', price: 0, minTier: 'core' },
    { id: 'products', label: 'Product Catalog', icon: '📦', price: 0, minTier: 'core' },
    { id: 'scm_tracking', label: 'Supply Chain Tracking', icon: '🚚', price: 99, minTier: 'core' },
    { id: 'inventory', label: 'Inventory Management', icon: '🏭', price: 49, minTier: 'core' },
    { id: 'support', label: 'Premium Support', icon: '🎧', price: 199, minTier: 'core' },
    { id: 'partners', label: 'Partner Portal', icon: '🤝', price: 49, minTier: 'core' },
    // Intelligence & Compliance (Requires Pro)
    { id: 'carbon', label: 'Carbon Tracking', icon: '🌱', price: 199, minTier: 'pro' },
    { id: 'risk_radar', label: 'Risk Radar', icon: '🛡', price: 299, minTier: 'pro' },
    { id: 'ai_forecast', label: 'AI Forecaster', icon: '🤖', price: 499, minTier: 'pro' },
    { id: 'digital_twin', label: 'Digital Twin', icon: '🪞', price: 149, minTier: 'pro' },
    { id: 'kyc', label: 'KYC / AML', icon: '🔍', price: 249, minTier: 'pro' },
    // Enterprise Add-ons
    { id: 'overclaim', label: 'Overclaim Detection', icon: '⚠️', price: 399, minTier: 'enterprise' },
    { id: 'lineage', label: 'Lineage Replay', icon: '⏪', price: 499, minTier: 'enterprise' },
    { id: 'governance', label: 'Advanced Governance', icon: '🏛', price: 299, minTier: 'enterprise' },
    { id: 'registry_export', label: 'Registry Export API', icon: '📤', price: 599, minTier: 'enterprise' },
    { id: 'erp_integration', label: 'ERP Integration', icon: '🔌', price: 999, minTier: 'enterprise' },
    { id: 'exec_dashboard', label: 'Exec Risk Dashboard', icon: '📈', price: 199, minTier: 'enterprise' },
    { id: 'ivu_cert', label: 'IVU Premium Audit', icon: '🏅', price: 499, minTier: 'enterprise' },
    // Distributed Ledger (Requires Pro)
    { id: 'blockchain', label: 'Blockchain Anchoring', icon: '⛓', price: 199, minTier: 'pro' },
    { id: 'nft', label: 'NFT Certificates', icon: '🎫', price: 99, minTier: 'pro' },
];

// Plan limits for usage metering
const PLAN_LIMITS = {
    core: { scans: 1000, api_calls: 2000, storage_mb: 500 },
    pro: { scans: 50000, api_calls: 100000, storage_mb: 10000 },
    enterprise: { scans: -1, api_calls: -1, storage_mb: -1 }, // unlimited
};

/**
 * Compute the dynamic MRR for an organization.
 * @param {string} planName - 'core' | 'pro' | 'enterprise'
 * @param {Object} featureFlags - { feature_id: true/false } overrides stored in DB
 * @param {Object} enterpriseConfig - optional { monthly_base } for custom enterprise pricing
 * @returns {{ basePrice, addonCost, totalMRR, addons[], planLabel }}
 */
function computeMRR(planName, featureFlags, enterpriseConfig) {
    const plan = ['core', 'pro', 'enterprise'].includes(planName) ? planName : 'core';
    const basePrice =
        plan === 'enterprise' && enterpriseConfig?.monthly_base
            ? enterpriseConfig.monthly_base
            : PLAN_BASE_PRICES[plan] || 0;
    const defaults = PLAN_DEFAULTS[plan] || [];

    // Determine which features are active = defaults + overrides
    const activeFeatures = new Set(defaults);
    if (featureFlags && typeof featureFlags === 'object') {
        for (const [id, enabled] of Object.entries(featureFlags)) {
            if (enabled) activeFeatures.add(id);
            else activeFeatures.delete(id);
        }
    }

    // Calculate addon cost = sum of prices for non-default active features
    let addonCost = 0;
    const addons = [];
    for (const id of activeFeatures) {
        if (!defaults.includes(id)) {
            const feat = FEATURE_LIST.find(f => f.id === id);
            if (feat) {
                addonCost += feat.price || 0;
                addons.push({ id: feat.id, label: feat.label, price: feat.price });
            }
        }
    }

    const totalMRR = basePrice + addonCost;
    const planLabel = addons.length > 0 ? `${plan}+` : plan;

    return { plan, basePrice, addonCost, totalMRR, addons, activeFeatures: [...activeFeatures], planLabel };
}

// ══════════════════════════════════════════════════════════════════════════════
// Proration Engine — Production-Grade SaaS Billing
// Strategy: Upgrade=proration+pay now, Downgrade=schedule at period end
// ══════════════════════════════════════════════════════════════════════════════

const BILLING_CYCLE_DAYS = 30; // Monthly billing cycle

/**
 * Compute proration charge/credit for plan changes.
 * @param {number} currentMRR - Current monthly recurring revenue in dollars
 * @param {number} newMRR - New monthly recurring revenue in dollars
 * @param {Date|string|null} cycleAnchor - When the current billing cycle started
 * @returns {{ charge_cents, credit_cents, days_remaining, days_total, daily_old, daily_new }}
 */
function computeProration(currentMRR, newMRR, cycleAnchor) {
    const now = new Date();
    let daysRemaining = BILLING_CYCLE_DAYS;
    let daysUsed = 0;

    if (cycleAnchor) {
        const anchor = new Date(cycleAnchor);
        daysUsed = Math.floor((now - anchor) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(1, BILLING_CYCLE_DAYS - daysUsed);
    }

    const dailyOld = currentMRR / BILLING_CYCLE_DAYS;
    const dailyNew = newMRR / BILLING_CYCLE_DAYS;
    const delta = (newMRR - currentMRR) * (daysRemaining / BILLING_CYCLE_DAYS);

    if (delta > 0) {
        // Upgrade: user pays the difference for remaining days
        return {
            charge_cents: Math.round(delta * 100),
            credit_cents: 0,
            days_remaining: daysRemaining,
            days_total: BILLING_CYCLE_DAYS,
            days_used: daysUsed,
            daily_old: Math.round(dailyOld * 100) / 100,
            daily_new: Math.round(dailyNew * 100) / 100,
        };
    } else {
        // Downgrade: user gets credit for the difference
        return {
            charge_cents: 0,
            credit_cents: Math.round(Math.abs(delta) * 100),
            days_remaining: daysRemaining,
            days_total: BILLING_CYCLE_DAYS,
            days_used: daysUsed,
            daily_old: Math.round(dailyOld * 100) / 100,
            daily_new: Math.round(dailyNew * 100) / 100,
        };
    }
}

// ─── GET /plan — Current plan + available plans + dynamic MRR ────────────────
router.get('/plan', authMiddleware, async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        let currentPlanName = 'core';
        let orgData = null;
        let featureFlags = {};
        let enterpriseConfig = null;

        if (orgId) {
            try {
                orgData = await db.get(
                    'SELECT plan, name, feature_flags, settings, billing_cycle_anchor, credit_balance_cents, pending_downgrade_plan, downgrade_at FROM organizations WHERE id = $1',
                    [orgId]
                );
                if (orgData?.plan) currentPlanName = orgData.plan;
                if (orgData?.feature_flags) {
                    featureFlags =
                        typeof orgData.feature_flags === 'string'
                            ? JSON.parse(orgData.feature_flags)
                            : orgData.feature_flags;
                }
                if (orgData?.settings) {
                    const settings =
                        typeof orgData.settings === 'string' ? JSON.parse(orgData.settings) : orgData.settings;
                    enterpriseConfig = settings?.enterprise_config || null;
                }
            } catch (_) {}
        }

        const mrr = computeMRR(currentPlanName, featureFlags, enterpriseConfig);

        // Billing cycle info
        const cycleAnchor = orgData?.billing_cycle_anchor || null;
        const creditBalanceCents = orgData?.credit_balance_cents || 0;
        const pendingDowngrade = orgData?.pending_downgrade_plan || null;
        const downgradeAt = orgData?.downgrade_at || null;

        // Build plan object for frontend
        const plan = {
            plan_name: mrr.planLabel,
            name: mrr.planLabel.charAt(0).toUpperCase() + mrr.planLabel.slice(1),
            slug: mrr.plan,
            price_monthly: mrr.totalMRR,
            base_price: mrr.basePrice,
            addon_cost: mrr.addonCost,
            addons: mrr.addons,
            active_features: mrr.activeFeatures,
            org_name: orgData?.name || null,
            limits: PLAN_LIMITS[mrr.plan] || PLAN_LIMITS.core,
            scan_limit: (PLAN_LIMITS[mrr.plan] || PLAN_LIMITS.core).scans,
            api_limit: (PLAN_LIMITS[mrr.plan] || PLAN_LIMITS.core).api_calls,
            storage_mb: (PLAN_LIMITS[mrr.plan] || PLAN_LIMITS.core).storage_mb,
            // Billing cycle metadata
            billing_cycle_anchor: cycleAnchor,
            credit_balance_cents: creditBalanceCents,
            credit_balance: Math.round((creditBalanceCents / 100) * 100) / 100,
            pending_downgrade: pendingDowngrade,
            downgrade_at: downgradeAt,
        };

        // Available plans with base prices
        const available_plans = ['core', 'pro', 'enterprise'].map(slug => ({
            name: slug.charAt(0).toUpperCase() + slug.slice(1),
            slug,
            price_monthly: PLAN_BASE_PRICES[slug],
            limits: PLAN_LIMITS[slug],
            scan_limit: PLAN_LIMITS[slug].scans,
            api_limit: PLAN_LIMITS[slug].api_calls,
            storage_mb: PLAN_LIMITS[slug].storage_mb,
        }));

        res.json({ plan, available_plans });
    } catch (err) {
        console.error('GET /billing/plan error:', err);
        const fallback = computeMRR('core', {});
        res.json({
            plan: { plan_name: 'core', slug: 'core', price_monthly: 0, limits: PLAN_LIMITS.core },
            available_plans: ['core', 'pro', 'enterprise'].map(s => ({
                name: s.charAt(0).toUpperCase() + s.slice(1),
                slug: s,
                price_monthly: PLAN_BASE_PRICES[s],
                limits: PLAN_LIMITS[s],
            })),
        });
    }
});

// ─── GET /usage — Current billing period usage ──────────────────────────────
router.get('/usage', authMiddleware, async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Determine plan limits
        let planName = 'core';
        if (orgId) {
            try {
                const org = await db.get('SELECT plan FROM organizations WHERE id = $1', [orgId]);
                if (org?.plan) planName = org.plan;
            } catch (_) {}
        }
        const limits = PLAN_LIMITS[planName] || PLAN_LIMITS.core;

        let scansUsed = 0,
            productsUsed = 0;
        if (orgId) {
            try {
                const sc = await db.get(
                    `SELECT COUNT(*) as c FROM scan_events WHERE org_id = $1 AND scanned_at >= $2`,
                    [orgId, periodStart]
                );
                const pc = await db.get(`SELECT COUNT(*) as c FROM products WHERE org_id = $1`, [orgId]);
                scansUsed = sc?.c || 0;
                productsUsed = pc?.c || 0;
            } catch (_) {}
        } else {
            try {
                const sc = await db.get(`SELECT COUNT(*) as c FROM scan_events WHERE scanned_at >= $1`, [periodStart]);
                const pc = await db.get(`SELECT COUNT(*) as c FROM products`);
                scansUsed = sc?.c || 0;
                productsUsed = pc?.c || 0;
            } catch (_) {}
        }

        res.json({
            period: periodLabel,
            usage: {
                scans: { used: scansUsed, limit: limits.scans },
                api_calls: { used: 0, limit: limits.api_calls },
                storage_mb: { used: productsUsed, limit: limits.storage_mb },
            },
        });
    } catch (err) {
        console.error('GET /billing/usage error:', err);
        res.json({ period: null, usage: {} });
    }
});

// ─── GET /invoices — Invoice history ─────────────────────────────────────────
router.get('/invoices', authMiddleware, async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        let invoices = [];

        if (orgId) {
            try {
                const mapping = await db.get('SELECT stripe_customer_id FROM stripe_mappings WHERE org_id = $1', [
                    orgId,
                ]);
                if (mapping?.stripe_customer_id) {
                    const stripeInvoices = await stripe.invoices.list({
                        customer: mapping.stripe_customer_id,
                        limit: 20,
                    });
                    invoices = stripeInvoices.data.map(inv => ({
                        id: inv.id,
                        number: inv.number,
                        amount: (inv.amount_due || 0) / 100,
                        currency: inv.currency,
                        status: inv.status,
                        created: new Date(inv.created * 1000).toISOString(),
                        paid_at: inv.status_transitions?.paid_at
                            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
                            : null,
                        pdf_url: inv.invoice_pdf,
                    }));
                }
            } catch (stripeErr) {
                console.warn('[billing/invoices] Stripe fetch failed:', stripeErr.message);
            }
        }

        res.json({ invoices });
    } catch (err) {
        console.error('GET /billing/invoices error:', err);
        res.json({ invoices: [] });
    }
});

/**
 * Endpoint: POST /api/v1/billing/subscribe
 * Creates a Stripe Checkout session combining the Base Plan with Metered Addons.
 */
router.post('/subscribe', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const { planId } = req.body; // e.g., 'price_1QxYzZ...' (The Pro base plan)

        if (!planId) {
            return res.status(400).json({ error: 'Missing planId parameters' });
        }

        let customerId;
        // Check if Org already has a Stripe Customer ID
        const org = await db.get('SELECT current_plan FROM organizations WHERE id = $1', [orgId]);
        const mapping = await db.get('SELECT stripe_customer_id FROM stripe_mappings WHERE org_id = $1', [orgId]);

        if (mapping && mapping.stripe_customer_id) {
            customerId = mapping.stripe_customer_id;
        } else {
            // Lazy load Customer onto Stripe
            const orgTitle = await db.get('SELECT name FROM organizations WHERE id = $1', [orgId]);
            const customer = await stripe.customers.create({
                name: orgTitle?.name || 'TrustChecker Customer',
                metadata: { org_id: orgId },
            });
            customerId = customer.id;

            // Persist the CustomerId securely
            await db.run('INSERT INTO stripe_mappings (org_id, stripe_customer_id) VALUES ($1, $2)', [
                orgId,
                customerId,
            ]);
        }

        // Fetch DB cached Pricing IDs for the metered features natively created from script
        const meteredFeatures = await db.all('SELECT feature, stripe_price_id FROM stripe_feature_prices');

        // Assemble Line Items (1 Recurring Base + N Metered Addons)
        const lineItems = [
            {
                price: planId, // The Base Pro/Premium Plan Recurring Price
                quantity: 1,
            },
        ];

        for (const meta of meteredFeatures) {
            lineItems.push({
                price: meta.stripe_price_id,
                // Metered items explicitly do not declare quantity upfront.
            });
        }

        // Initialize Checkout
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: lineItems,
            subscription_data: {
                description: 'TrustChecker Master Platform SaaS',
                metadata: {
                    org_id: orgId,
                    internal_plan_code: 'pro',
                },
            },
            success_url: process.env.CLIENT_URL
                ? `${process.env.CLIENT_URL}/settings/billing?success=true`
                : 'https://trustchecker.tech/settings/billing?success=true',
            cancel_url: process.env.CLIENT_URL
                ? `${process.env.CLIENT_URL}/settings/billing?canceled=true`
                : 'https://trustchecker.tech/settings/billing?canceled=true',
        });

        res.json({ checkoutUrl: session.url });
    } catch (e) {
        console.error('Failed to create Checkout Session:', e.message);
        res.status(500).json({ error: 'Checkout Session Initialization failed.' });
    }
});

/**
 * Endpoint: GET /api/v1/billing/preview
 * Analyzes upcoming charges and calculates behavioral Upsell mechanics natively.
 */
router.get('/preview', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;

        // Fetch DB mappings
        const mapping = await db.get(
            'SELECT stripe_customer_id, stripe_subscription_id FROM stripe_mappings WHERE org_id = $1',
            [orgId]
        );
        const orgInfo = await db.get('SELECT current_plan FROM organizations WHERE id = $1', [orgId]);

        if (!mapping || !mapping.stripe_customer_id || !mapping.stripe_subscription_id) {
            return res.json({
                current_usage_cost: 0,
                projected_end_month: 0,
                current_plan: orgInfo?.current_plan || 'core',
                suggested_plan: 'pro',
                suggestion_reason: 'Pro unlocks advanced feature scaling and removes basic quota limiters.',
            });
        }

        const upcoming = await stripe.invoices.retrieveUpcoming({
            customer: mapping.stripe_customer_id,
            subscription: mapping.stripe_subscription_id,
        });

        // Sum lines
        let flatFees = 0;
        let meteredFees = 0;

        for (const line of upcoming.lines.data) {
            const amount = line.amount / 100.0; // Stripe uses Cents
            if (line.price?.recurring?.usage_type === 'metered') {
                meteredFees += amount;
            } else {
                flatFees += amount;
            }
        }

        const totalCost = (upcoming.amount_due || upcoming.total) / 100.0;
        let suggestion = null;
        let reason = null;

        // Fetch the Locked Pricing Matrix (Frozen Architecture to prevent Price-Drift)
        const pricingSnapshot = await db.get(
            'SELECT cohort, feature_price_map FROM organization_pricing_snapshots WHERE org_id = $1',
            [orgId]
        );
        const activeCohort = pricingSnapshot?.cohort || 'A_CONTROL';

        // Behavioral Upgrade Engine (Stripe / Snowflake Tier Threshold Analysis)
        if (orgInfo.current_plan === 'pro') {
            if (activeCohort === 'A_CONTROL') {
                // Heuristic A: Upsale explicitly on high overages
                if (meteredFees > 49.0) {
                    suggestion = 'enterprise';
                    reason = `You are paying $${meteredFees.toFixed(2)} in usage overages. Upgrade to Enterprise to consolidate your bill with custom unlimited tiers.`;
                }
            } else if (activeCohort === 'B_OFFER_DISCOUNT') {
                // Heuristic B: Discount focused
                if (meteredFees > 30.0) {
                    suggestion = 'enterprise';
                    reason = `Your overages are rising. Secure an immediate 30% Lifetime discount by switching to the Enterprise Plan now!`;
                }
            }
        }

        // Emit Exposure Signal - Securing Snowflake Analytics Logging Principles
        const { RetentionService } = require('../services/retention.service');
        await RetentionService.trackExposure(orgId, 'UPSELL_NUDGING_V1', activeCohort);

        res.json({
            flat_cost: flatFees,
            metered_overage_cost: meteredFees,
            projected_end_month: totalCost,
            currency: upcoming.currency,
            current_plan: orgInfo.current_plan,
            suggested_plan: suggestion,
            suggestion_reason: reason,
        });
    } catch (e) {
        console.error('Invoice Preview Error:', e.message);
        // If the org has no upcoming invoice (canceled, etc)
        if (e.message.includes('No upcoming invoices for customer')) {
            return res.json({
                current_usage_cost: 0,
                projected_end_month: 0,
                current_plan: 'canceled',
                suggested_plan: 'pro',
            });
        }
        res.status(500).json({ error: 'Failed to preview billing usage.' });
    }
});

/**
 * Endpoint: GET /api/v1/billing/proration-preview
 * Calculate what the proration would be for a plan switch WITHOUT executing it.
 * Frontend uses this to show the proration modal before the user commits.
 */
router.get('/proration-preview', authMiddleware, async (req, res) => {
    const TIER_RANK = { core: 1, pro: 2, enterprise: 3 };
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const { target_plan, feature_id, keep_addons } = req.query;

        const org = await db.get(
            'SELECT plan, feature_flags, billing_cycle_anchor, credit_balance_cents FROM organizations WHERE id = $1',
            [orgId]
        );
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        const currentPlan = org.plan || 'core';
        let flags = {};
        if (org.feature_flags) {
            flags = typeof org.feature_flags === 'string' ? JSON.parse(org.feature_flags) : org.feature_flags;
        }

        const currentMRR = computeMRR(currentPlan, flags);
        const currentDefaults = PLAN_DEFAULTS[currentPlan] || [];

        // Determine new MRR based on what's being changed
        let newPlanName = target_plan || currentPlan;
        const newDefaults = PLAN_DEFAULTS[newPlanName] || [];
        let newFlags = {};
        const isUpgrade = target_plan ? TIER_RANK[target_plan] > TIER_RANK[currentPlan] : false;
        const isDowngrade = target_plan ? TIER_RANK[target_plan] < TIER_RANK[currentPlan] : false;

        // ═══ Addon Analysis for Upgrades ═══
        // Categorize each current addon as: absorbed (free in new plan), extra (costs $ to keep), or dropped
        const addonAnalysis = { absorbed: [], extra: [], dropped: [] };

        if (feature_id) {
            // Adding a single feature — may trigger auto-upgrade
            const feature = FEATURE_LIST.find(f => f.id === feature_id);
            if (!feature) return res.status(400).json({ error: 'Unknown feature_id' });
            if (feature.minTier && TIER_RANK[feature.minTier] > TIER_RANK[newPlanName]) {
                newPlanName = feature.minTier;
            }
            newFlags = { ...flags };
            newFlags[feature_id] = true;
        } else if (isUpgrade) {
            // ═══ UPGRADE: Smart addon comparison ═══
            // Find all currently active non-default addons
            const activeAddonIds = Object.entries(flags)
                .filter(([id, enabled]) => enabled === true && !currentDefaults.includes(id))
                .map(([id]) => id);

            for (const addonId of activeAddonIds) {
                const feat = FEATURE_LIST.find(f => f.id === addonId);
                if (!feat) continue;
                const addonInfo = {
                    id: addonId,
                    label: feat.label,
                    icon: feat.icon,
                    price: feat.price,
                    minTier: feat.minTier,
                };

                if (newDefaults.includes(addonId)) {
                    // This addon is included in the new plan for FREE
                    addonAnalysis.absorbed.push(addonInfo);
                } else if (feat.minTier && TIER_RANK[feat.minTier] > TIER_RANK[newPlanName]) {
                    // This addon is incompatible with the new plan tier
                    // (shouldn't really happen in an upgrade, but be safe)
                    addonAnalysis.dropped.push(addonInfo);
                } else {
                    // This addon costs extra — user can choose to keep or drop
                    addonAnalysis.extra.push(addonInfo);
                }
            }

            // Parse keep_addons if provided (comma-separated ids from frontend toggle)
            let keptAddonIds = [];
            if (keep_addons) {
                keptAddonIds = keep_addons.split(',').filter(Boolean);
            }

            // Build newFlags: only include addons the user explicitly chose to keep
            for (const addonId of keptAddonIds) {
                if (!newDefaults.includes(addonId)) {
                    newFlags[addonId] = true;
                }
            }
        } else if (isDowngrade) {
            // Downgrade: wipe incompatible addons
            newFlags = {};
        }

        // Clean up flags for new plan defaults
        const cleanDefaults = PLAN_DEFAULTS[newPlanName] || [];
        for (const id of Object.keys(newFlags)) {
            if (newFlags[id] === true && cleanDefaults.includes(id)) delete newFlags[id];
        }

        const newMRR = computeMRR(newPlanName, newFlags);
        const proration = computeProration(currentMRR.totalMRR, newMRR.totalMRR, org.billing_cycle_anchor);

        // Calculate stripped features for downgrades
        const strippedFeatures = [];
        if (isDowngrade) {
            const activeFeatures = new Set(currentDefaults);
            for (const [id, enabled] of Object.entries(flags)) {
                if (enabled) activeFeatures.add(id);
                else activeFeatures.delete(id);
            }
            for (const fid of activeFeatures) {
                const feat = FEATURE_LIST.find(f => f.id === fid);
                if (feat && feat.minTier && TIER_RANK[feat.minTier] > TIER_RANK[newPlanName]) {
                    strippedFeatures.push({
                        id: fid,
                        label: feat.label,
                        icon: feat.icon,
                        minTier: feat.minTier,
                        price: feat.price,
                    });
                }
            }
        }

        // Calculate period end date
        let periodEndDate = null;
        if (org.billing_cycle_anchor) {
            const anchor = new Date(org.billing_cycle_anchor);
            periodEndDate = new Date(anchor.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        } else {
            const now = new Date();
            periodEndDate = new Date(now.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        }

        // ═══ Enterprise default features list (for comparison display) ═══
        const targetDefaultFeatures = cleanDefaults
            .map(id => {
                const feat = FEATURE_LIST.find(f => f.id === id);
                return feat ? { id, label: feat.label, icon: feat.icon, price: feat.price } : null;
            })
            .filter(Boolean);

        res.json({
            current_plan: currentPlan,
            target_plan: newPlanName,
            current_mrr: currentMRR.totalMRR,
            new_mrr: newMRR.totalMRR,
            new_base_price: newMRR.basePrice,
            new_addon_cost: newMRR.addonCost,
            new_addons: newMRR.addons,
            is_downgrade: isDowngrade,
            is_upgrade: isUpgrade,
            addon_analysis: addonAnalysis,
            target_default_features: targetDefaultFeatures,
            proration: {
                charge_cents: proration.charge_cents,
                credit_cents: proration.credit_cents,
                charge_dollars: Math.round(proration.charge_cents) / 100,
                credit_dollars: Math.round(proration.credit_cents) / 100,
                days_remaining: proration.days_remaining,
                days_total: proration.days_total,
                days_used: proration.days_used,
                daily_old: proration.daily_old,
                daily_new: proration.daily_new,
            },
            credit_balance_cents: org.credit_balance_cents || 0,
            credit_balance_dollars: Math.round(org.credit_balance_cents || 0) / 100,
            period_end_date: periodEndDate,
            stripped_features: strippedFeatures,
            feature_id: feature_id || null,
        });
    } catch (e) {
        console.error('Proration Preview Error:', e.message);
        res.status(500).json({ error: 'Failed to compute proration preview.' });
    }
});

/**
 * Endpoint: POST /api/v1/billing/upgrade
 * Production SaaS plan switch.
 * UPGRADE: Computes proration → Creates Stripe Checkout session for payment → Activates on payment confirmation
 * DOWNGRADE: Schedules at period end → User keeps current plan until cycle ends → Credit calculated
 */
router.post('/upgrade', authMiddleware, requireRole('admin'), async (req, res) => {
    const TIER_RANK = { core: 1, pro: 2, enterprise: 3 };

    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const { targetPlanName, keepAddonIds } = req.body;

        if (!targetPlanName || !PLAN_BASE_PRICES.hasOwnProperty(targetPlanName)) {
            return res
                .status(400)
                .json({ error: 'Invalid or missing targetPlanName. Must be core, pro, or enterprise.' });
        }

        const org = await db.get(
            'SELECT plan, feature_flags, billing_cycle_anchor, credit_balance_cents FROM organizations WHERE id = $1',
            [orgId]
        );
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const currentPlan = org.plan || 'core';
        if (currentPlan === targetPlanName) {
            return res.status(400).json({ error: `Organization is already on the ${targetPlanName} plan.` });
        }

        let flags = {};
        if (org.feature_flags) {
            flags = typeof org.feature_flags === 'string' ? JSON.parse(org.feature_flags) : { ...org.feature_flags };
        }

        const isDowngrade = TIER_RANK[targetPlanName] < TIER_RANK[currentPlan];
        const targetDefaults = PLAN_DEFAULTS[targetPlanName] || [];
        const currentDefaults = PLAN_DEFAULTS[currentPlan] || [];
        const currentMRR = computeMRR(currentPlan, flags);

        // ═══════════════════════════════════════════════════════════════
        // DOWNGRADE: Apply immediately + credit for unused days
        // ═══════════════════════════════════════════════════════════════
        if (isDowngrade) {
            // Calculate what features will be stripped
            const strippedFeatures = [];
            const activeFeatures = new Set(currentDefaults);
            for (const [id, enabled] of Object.entries(flags)) {
                if (enabled) activeFeatures.add(id);
                else activeFeatures.delete(id);
            }
            for (const featureId of activeFeatures) {
                const feat = FEATURE_LIST.find(f => f.id === featureId);
                if (feat && feat.minTier && TIER_RANK[feat.minTier] > TIER_RANK[targetPlanName]) {
                    strippedFeatures.push({
                        id: featureId,
                        label: feat.label,
                        minTier: feat.minTier,
                        price: feat.price,
                    });
                }
            }

            // Build new flags — keep only features compatible with the target plan
            const newFlags = {};
            for (const [id, value] of Object.entries(flags)) {
                const feat = FEATURE_LIST.find(f => f.id === id);
                if (!feat) continue;
                if (feat.minTier && TIER_RANK[feat.minTier] > TIER_RANK[targetPlanName]) continue;
                if (value === true && targetDefaults.includes(id)) continue;
                if (value === false && !targetDefaults.includes(id)) continue;
                newFlags[id] = value;
            }
            // Carry forward features from old plan defaults that aren't in new plan defaults
            for (const featureId of currentDefaults) {
                const feat = FEATURE_LIST.find(f => f.id === featureId);
                if (!feat) continue;
                if (feat.minTier && TIER_RANK[feat.minTier] > TIER_RANK[targetPlanName]) continue;
                if (targetDefaults.includes(featureId)) continue;
                if (flags.hasOwnProperty(featureId)) continue;
                newFlags[featureId] = true;
            }

            const newMRR = computeMRR(targetPlanName, newFlags);
            const proration = computeProration(currentMRR.totalMRR, newMRR.totalMRR, org.billing_cycle_anchor);

            // ═══ IMMEDIATE DOWNGRADE — Apply now + credit ═══
            await db.run(
                `UPDATE organizations 
                 SET plan = $1, 
                     feature_flags = $2, 
                     credit_balance_cents = COALESCE(credit_balance_cents, 0) + $3,
                     billing_cycle_anchor = NOW(),
                     pending_downgrade_plan = NULL,
                     downgrade_at = NULL
                 WHERE id = $4`,
                [targetPlanName, JSON.stringify(newFlags), proration.credit_cents, orgId]
            );

            // Log to billing_invoices
            await db.run(
                `INSERT INTO billing_invoices (org_id, type, description, amount_cents, status, metadata) VALUES ($1, 'credit', $2, $3, 'applied', $4)`,
                [
                    orgId,
                    `Downgrade credit: ${currentPlan} → ${targetPlanName} (${proration.days_remaining} days remaining)`,
                    proration.credit_cents,
                    JSON.stringify({
                        from_plan: currentPlan,
                        to_plan: targetPlanName,
                        days_remaining: proration.days_remaining,
                        stripped_features: strippedFeatures.map(f => f.id),
                    }),
                ]
            );

            console.log(
                `📉 Org ${orgId}: Downgrade applied ${currentPlan} → ${targetPlanName} | Credit: $${(proration.credit_cents / 100).toFixed(2)} | Stripped: ${strippedFeatures.map(f => f.id).join(', ')}`
            );

            return res.json({
                success: true,
                action: 'downgrade_applied',
                message: `Downgraded to ${targetPlanName}. Credit of $${(proration.credit_cents / 100).toFixed(2)} added to your balance.`,
                previous_plan: currentPlan,
                new_plan: targetPlanName,
                is_downgrade: true,
                new_mrr: newMRR.totalMRR,
                credit_cents: proration.credit_cents,
                credit_dollars: Math.round(proration.credit_cents) / 100,
                stripped_features: strippedFeatures,
                days_remaining: proration.days_remaining,
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // UPGRADE: Compute proration → Create Checkout/Payment → Activate
        // ═══════════════════════════════════════════════════════════════

        // Clean up flags for the new plan
        // Only keep addons the user explicitly selected in the upgrade modal
        const newFlags = {};
        if (Array.isArray(keepAddonIds) && keepAddonIds.length > 0) {
            for (const addonId of keepAddonIds) {
                if (!targetDefaults.includes(addonId)) {
                    newFlags[addonId] = true;
                }
            }
        }

        const newMRR = computeMRR(targetPlanName, newFlags);
        const proration = computeProration(currentMRR.totalMRR, newMRR.totalMRR, org.billing_cycle_anchor);

        // Apply any existing credit balance
        const creditBalance = org.credit_balance_cents || 0;
        const netChargeCents = Math.max(0, proration.charge_cents - creditBalance);
        const creditUsed = Math.min(creditBalance, proration.charge_cents);

        if (netChargeCents > 0 && STRIPE_LIVE) {
            // ═══ Create Stripe Checkout Session for proration payment ═══
            try {
                const baseUrl = process.env.CLIENT_URL || 'https://tonytran.work/trustchecker';

                // Find or create Stripe customer
                const mapping = await db.get('SELECT stripe_customer_id FROM stripe_mappings WHERE org_id = $1', [orgId]);
                let customerId = mapping?.stripe_customer_id;
                if (!customerId) {
                    const customer = await stripe.customers.create({
                        metadata: { org_id: orgId, internal_plan: targetPlanName },
                    });
                    customerId = customer.id;
                    await db.run(
                        `INSERT INTO stripe_mappings (org_id, stripe_customer_id) VALUES ($1, $2) ON CONFLICT (org_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id`,
                        [orgId, customerId]
                    );
                }

                const session = await stripe.checkout.sessions.create({
                    customer: customerId,
                    mode: 'payment',
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                unit_amount: netChargeCents,
                                product_data: {
                                    name: `Upgrade: ${currentPlan} → ${targetPlanName}`,
                                    description: `Proration for ${proration.days_remaining} remaining days (MRR $${currentMRR.totalMRR} → $${newMRR.totalMRR})`,
                                },
                            },
                            quantity: 1,
                        },
                    ],
                    metadata: {
                        type: 'plan_upgrade',
                        org_id: orgId,
                        from_plan: currentPlan,
                        to_plan: targetPlanName,
                        new_flags: JSON.stringify(newFlags),
                        credit_used: creditUsed,
                    },
                    success_url: `${baseUrl}/ca-settings?upgrade_success=true&plan=${targetPlanName}`,
                    cancel_url: `${baseUrl}/ca-settings?upgrade_canceled=true`,
                });

                // Record pending invoice
                await db.run(
                    `INSERT INTO billing_invoices (org_id, type, description, amount_cents, stripe_checkout_session_id, status, metadata) VALUES ($1, 'proration', $2, $3, $4, 'pending', $5)`,
                    [
                        orgId,
                        `Upgrade proration: ${currentPlan} → ${targetPlanName}`,
                        netChargeCents,
                        session.id,
                        JSON.stringify({
                            from_plan: currentPlan,
                            to_plan: targetPlanName,
                            new_flags: newFlags,
                            credit_used: creditUsed,
                            days_remaining: proration.days_remaining,
                        }),
                    ]
                );

                console.log(
                    `🚀 Org ${orgId}: Upgrade ${currentPlan} → ${targetPlanName} | Proration: $${(netChargeCents / 100).toFixed(2)} | Checkout: ${session.id}`
                );

                return res.json({
                    success: true,
                    action: 'checkout_required',
                    checkout_url: session.url,
                    proration_charge_cents: netChargeCents,
                    proration_charge_dollars: Math.round(netChargeCents) / 100,
                    credit_used_cents: creditUsed,
                    days_remaining: proration.days_remaining,
                    new_mrr: newMRR.totalMRR,
                });
            } catch (stripeErr) {
                console.warn(
                    '[Stripe] Checkout creation failed, falling back to direct activation:',
                    stripeErr.message
                );
                // Fall through to direct activation if Stripe fails
            }
        }

        // ═══ Direct activation (free upgrade, or Stripe not live, or no charge) ═══
        await db.run(
            `UPDATE organizations SET plan = $1, feature_flags = $2, billing_cycle_anchor = COALESCE(billing_cycle_anchor, NOW()), credit_balance_cents = GREATEST(0, COALESCE(credit_balance_cents, 0) - $3) WHERE id = $4`,
            [targetPlanName, JSON.stringify(newFlags), creditUsed, orgId]
        );

        // Stripe sync for direct activation
        if (STRIPE_LIVE) {
            try {
                const mapping = await db.get('SELECT stripe_subscription_id FROM stripe_mappings WHERE org_id = $1', [
                    orgId,
                ]);
                if (mapping?.stripe_subscription_id) {
                    const subDetails = await stripe.subscriptions.retrieve(mapping.stripe_subscription_id);
                    const oldBaseItem = subDetails.items.data.find(i => i.price?.recurring?.usage_type !== 'metered');
                    if (oldBaseItem && STRIPE_PLAN_PRICES[targetPlanName]) {
                        await stripe.subscriptions.update(mapping.stripe_subscription_id, {
                            items: [{ id: oldBaseItem.id, price: STRIPE_PLAN_PRICES[targetPlanName] }],
                            proration_behavior: 'create_prorations',
                            metadata: { internal_plan_code: targetPlanName },
                        });
                    }
                }
            } catch (stripeErr) {
                console.warn('[Stripe] Plan sync failed (DB updated OK):', stripeErr.message);
            }
        }

        const mrr = computeMRR(targetPlanName, newFlags);
        console.log(`🚀 Org ${orgId}: Direct upgrade ${currentPlan} → ${targetPlanName} | MRR: $${mrr.totalMRR}`);

        res.json({
            success: true,
            action: 'activated',
            message: `Successfully upgraded to ${targetPlanName}`,
            previous_plan: currentPlan,
            new_plan: targetPlanName,
            is_downgrade: false,
            new_mrr: mrr.totalMRR,
            base_price: mrr.basePrice,
            addon_cost: mrr.addonCost,
            active_features: mrr.activeFeatures,
        });
    } catch (e) {
        console.error('Plan Switch Error:', e.message);
        res.status(500).json({ error: 'Failed to process plan switch: ' + e.message });
    }
});

/**
 * Endpoint: POST /api/v1/billing/cancel-downgrade
 * Cancel a previously scheduled downgrade.
 */
router.post('/cancel-downgrade', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const org = await db.get(
            'SELECT pending_downgrade_plan, credit_balance_cents FROM organizations WHERE id = $1',
            [orgId]
        );

        if (!org?.pending_downgrade_plan) {
            return res.status(400).json({ error: 'No pending downgrade to cancel.' });
        }

        // Find the credit invoice for this downgrade and reclaim it
        const creditInvoice = await db.get(
            `SELECT amount_cents FROM billing_invoices WHERE org_id = $1 AND type = 'credit' AND status = 'applied' ORDER BY created_at DESC LIMIT 1`,
            [orgId]
        );
        const creditToReclaim = creditInvoice?.amount_cents || 0;

        await db.run(
            `UPDATE organizations SET pending_downgrade_plan = NULL, downgrade_at = NULL, credit_balance_cents = GREATEST(0, COALESCE(credit_balance_cents, 0) - $1) WHERE id = $2`,
            [creditToReclaim, orgId]
        );

        // Void the credit invoice
        if (creditInvoice) {
            await db.run(
                `UPDATE billing_invoices SET status = 'void' WHERE org_id = $1 AND type = 'credit' AND status = 'applied' ORDER BY created_at DESC LIMIT 1`,
                [orgId]
            );
        }

        console.log(`↩ Org ${orgId}: Cancelled pending downgrade to ${org.pending_downgrade_plan}`);

        res.json({
            success: true,
            message: 'Downgrade cancelled. You will remain on your current plan.',
            credit_reclaimed_cents: creditToReclaim,
        });
    } catch (e) {
        console.error('Cancel Downgrade Error:', e.message);
        res.status(500).json({ error: 'Failed to cancel downgrade.' });
    }
});

/**
 * Endpoint: POST /api/v1/billing/addon/toggle
 * Modifies an org's feature_flags to dynamically add or remove self-serve add-ons.
 * Adding: computes proration and returns checkout_url if STRIPE_LIVE and charge > 0
 * Removing: immediate removal + credit calculation
 * Auto-upgrades plan chassis if the feature requires a higher tier.
 */
router.post('/addon/toggle', authMiddleware, requireRole('admin'), async (req, res) => {
    const TIER_RANK = { core: 1, pro: 2, enterprise: 3 };

    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const { feature_id } = req.body;

        if (!feature_id) {
            return res.status(400).json({ error: 'Missing feature_id parameter' });
        }

        const feature = FEATURE_LIST.find(f => f.id === feature_id);
        if (!feature) {
            return res.status(400).json({ error: 'Unknown feature_id: ' + feature_id });
        }

        const org = await db.get(
            'SELECT plan, feature_flags, billing_cycle_anchor, credit_balance_cents FROM organizations WHERE id = $1',
            [orgId]
        );
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        let flags = {};
        if (org.feature_flags) {
            flags = typeof org.feature_flags === 'string' ? JSON.parse(org.feature_flags) : org.feature_flags;
        }

        let planName = org.plan || 'core';
        let defaults = PLAN_DEFAULTS[planName] || [];
        let planUpgraded = false;
        let newPlan = planName;

        const isDefault = defaults.includes(feature_id);
        const isCurrentlyActive = isDefault ? flags[feature_id] !== false : !!flags[feature_id];
        const targetState = !isCurrentlyActive;

        // Compute current MRR before change
        const currentMRR = computeMRR(planName, flags);

        // ═══ Auto-Upgrade Chassis Logic ═══
        if (targetState && feature.minTier && TIER_RANK[feature.minTier] > TIER_RANK[planName]) {
            const activeFeatures = new Set(defaults);
            for (const [id, enabled] of Object.entries(flags)) {
                if (enabled) activeFeatures.add(id);
                else activeFeatures.delete(id);
            }
            activeFeatures.add(feature_id);

            let requiredTier = planName;
            for (const id of activeFeatures) {
                const feat = FEATURE_LIST.find(f => f.id === id);
                if (feat && feat.minTier && TIER_RANK[feat.minTier] > TIER_RANK[requiredTier]) {
                    requiredTier = feat.minTier;
                }
            }

            let bestPlan = requiredTier;
            let bestCost = Infinity;
            ['core', 'pro', 'enterprise'].forEach(p => {
                if (TIER_RANK[p] < TIER_RANK[requiredTier]) return;
                const pDefaults = PLAN_DEFAULTS[p] || [];
                const basePrice = PLAN_BASE_PRICES[p] || 0;
                let addonCost = 0;
                activeFeatures.forEach(id => {
                    if (!pDefaults.includes(id)) {
                        const feat = FEATURE_LIST.find(f => f.id === id);
                        if (feat) addonCost += feat.price || 0;
                    }
                });
                const totalCost = basePrice + addonCost;
                if (totalCost < bestCost || (totalCost === bestCost && basePrice > (PLAN_BASE_PRICES[bestPlan] || 0))) {
                    bestCost = totalCost;
                    bestPlan = p;
                }
            });

            newPlan = bestPlan;
            planUpgraded = newPlan !== planName;
            if (planUpgraded) {
                planName = newPlan;
                defaults = PLAN_DEFAULTS[planName] || [];
            }
        }

        // Compute new flags
        const isNewDefault = defaults.includes(feature_id);
        if (targetState) {
            if (isNewDefault) delete flags[feature_id];
            else flags[feature_id] = true;
        } else {
            if (isNewDefault) flags[feature_id] = false;
            else delete flags[feature_id];
        }

        // Compute new MRR after change
        const newMRR = computeMRR(planName, flags);
        const proration = computeProration(currentMRR.totalMRR, newMRR.totalMRR, org.billing_cycle_anchor);

        // ═══ If ADDING and there's a charge, require payment ═══
        if (targetState && proration.charge_cents > 0 && STRIPE_LIVE) {
            const creditBalance = org.credit_balance_cents || 0;
            const netChargeCents = Math.max(0, proration.charge_cents - creditBalance);
            const creditUsed = Math.min(creditBalance, proration.charge_cents);

            if (netChargeCents > 0) {
                try {
                    const baseUrl = process.env.CLIENT_URL || 'https://tonytran.work/trustchecker';
                    const mapping = await db.get('SELECT stripe_customer_id FROM stripe_mappings WHERE org_id = $1', [
                        orgId,
                    ]);
                    let customerId = mapping?.stripe_customer_id;
                    if (!customerId) {
                        const customer = await stripe.customers.create({ metadata: { org_id: orgId } });
                        customerId = customer.id;
                        await db.run(
                            `INSERT INTO stripe_mappings (org_id, stripe_customer_id) VALUES ($1, $2) ON CONFLICT (org_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id`,
                            [orgId, customerId]
                        );
                    }

                    const desc = planUpgraded
                        ? `Upgrade to ${planName} + add ${feature.label}`
                        : `Add ${feature.label}`;

                    const session = await stripe.checkout.sessions.create({
                        customer: customerId,
                        mode: 'payment',
                        payment_method_types: ['card'],
                        line_items: [
                            {
                                price_data: {
                                    currency: 'usd',
                                    unit_amount: netChargeCents,
                                    product_data: {
                                        name: desc,
                                        description: `Proration for ${proration.days_remaining} remaining days`,
                                    },
                                },
                                quantity: 1,
                            },
                        ],
                        metadata: {
                            type: 'addon_toggle',
                            org_id: orgId,
                            feature_id: feature_id,
                            new_plan: planName,
                            new_flags: JSON.stringify(flags),
                            plan_upgraded: planUpgraded ? '1' : '0',
                            credit_used: creditUsed,
                        },
                        success_url: `${baseUrl}/ca-settings?addon_success=true&feature=${feature_id}`,
                        cancel_url: `${baseUrl}/ca-settings?addon_canceled=true`,
                    });

                    await db.run(
                        `INSERT INTO billing_invoices (org_id, type, description, amount_cents, stripe_checkout_session_id, status, metadata) VALUES ($1, 'proration', $2, $3, $4, 'pending', $5)`,
                        [
                            orgId,
                            desc,
                            netChargeCents,
                            session.id,
                            JSON.stringify({
                                feature_id,
                                new_plan: planName,
                                new_flags: flags,
                                plan_upgraded: planUpgraded,
                                credit_used: creditUsed,
                            }),
                        ]
                    );

                    console.log(
                        `💳 Org ${orgId}: Addon ${feature_id} pending payment | Charge: $${(netChargeCents / 100).toFixed(2)} | Checkout: ${session.id}`
                    );

                    return res.json({
                        success: true,
                        action: 'checkout_required',
                        checkout_url: session.url,
                        proration_charge_cents: netChargeCents,
                        proration_charge_dollars: Math.round(netChargeCents) / 100,
                        credit_used_cents: creditUsed,
                        feature_id,
                        new_mrr: newMRR.totalMRR,
                    });
                } catch (stripeErr) {
                    console.warn(
                        '[Stripe] Addon checkout failed, falling through to direct activation:',
                        stripeErr.message
                    );
                }
            }
        }

        // ═══ Direct activation (free change, removal, or Stripe not live) ═══
        if (planUpgraded) {
            await db.run(
                'UPDATE organizations SET plan = $1, feature_flags = $2, billing_cycle_anchor = COALESCE(billing_cycle_anchor, NOW()) WHERE id = $3',
                [newPlan, JSON.stringify(flags), orgId]
            );
        } else {
            await db.run('UPDATE organizations SET feature_flags = $1 WHERE id = $2', [JSON.stringify(flags), orgId]);
        }

        // If removing, calculate credit
        if (!targetState && proration.credit_cents > 0) {
            await db.run(
                `UPDATE organizations SET credit_balance_cents = COALESCE(credit_balance_cents, 0) + $1 WHERE id = $2`,
                [proration.credit_cents, orgId]
            );
            await db.run(
                `INSERT INTO billing_invoices (org_id, type, description, amount_cents, status, metadata) VALUES ($1, 'credit', $2, $3, 'applied', $4)`,
                [
                    orgId,
                    `Credit for removing ${feature.label}`,
                    proration.credit_cents,
                    JSON.stringify({ feature_id, days_remaining: proration.days_remaining }),
                ]
            );
        }

        // Stripe sync for direct activation
        if (STRIPE_LIVE) {
            try {
                const mapping = await db.get('SELECT stripe_subscription_id FROM stripe_mappings WHERE org_id = $1', [
                    orgId,
                ]);
                if (mapping?.stripe_subscription_id) {
                    if (planUpgraded) {
                        const subDetails = await stripe.subscriptions.retrieve(mapping.stripe_subscription_id);
                        const oldBaseItem = subDetails.items.data.find(
                            i => i.price?.recurring?.usage_type !== 'metered'
                        );
                        if (oldBaseItem && STRIPE_PLAN_PRICES[newPlan]) {
                            await stripe.subscriptions.update(mapping.stripe_subscription_id, {
                                items: [{ id: oldBaseItem.id, price: STRIPE_PLAN_PRICES[newPlan] }],
                                proration_behavior: 'create_prorations',
                                metadata: { internal_plan_code: newPlan },
                            });
                        }
                    }

                    const featurePrice = await db.get(
                        'SELECT stripe_price_id FROM stripe_feature_prices WHERE feature = $1',
                        [feature_id]
                    );
                    if (featurePrice?.stripe_price_id) {
                        if (targetState) {
                            const si = await stripe.subscriptionItems.create({
                                subscription: mapping.stripe_subscription_id,
                                price: featurePrice.stripe_price_id,
                                quantity: 1,
                            });
                            await db.run(
                                `INSERT INTO stripe_subscription_items (id, org_id, feature, stripe_subscription_id, subscription_item_id)
                                 VALUES ($1, $2, $3, $4, $5)
                                 ON CONFLICT (org_id, feature) DO UPDATE SET subscription_item_id = EXCLUDED.subscription_item_id`,
                                [
                                    require('crypto').randomUUID(),
                                    orgId,
                                    feature_id,
                                    mapping.stripe_subscription_id,
                                    si.id,
                                ]
                            );
                        } else {
                            const existingItem = await db.get(
                                'SELECT subscription_item_id FROM stripe_subscription_items WHERE org_id = $1 AND feature = $2',
                                [orgId, feature_id]
                            );
                            if (existingItem?.subscription_item_id) {
                                await stripe.subscriptionItems.del(existingItem.subscription_item_id);
                                await db.run(
                                    'DELETE FROM stripe_subscription_items WHERE org_id = $1 AND feature = $2',
                                    [orgId, feature_id]
                                );
                            }
                        }
                    }
                }
            } catch (stripeErr) {
                console.warn('[Stripe] Addon sync failed (DB updated OK):', stripeErr.message);
            }
        }

        const mrr = computeMRR(newPlan, flags);

        res.json({
            success: true,
            action: 'activated',
            feature_id,
            active: targetState,
            plan_upgraded: planUpgraded,
            new_plan: newPlan,
            new_mrr: mrr.totalMRR,
            base_price: mrr.basePrice,
            addon_cost: mrr.addonCost,
            proration_credit_cents: !targetState ? proration.credit_cents : 0,
        });
    } catch (e) {
        console.error('Addon Toggle Error:', e.message);
        res.status(500).json({ error: 'Failed to toggle add-on.' });
    }
});

/**
 * Endpoint: POST /api/v1/billing/cancel-offer
 * Churn Deflection Engine. Offers an immediate, Stripe-Native discount to retain users who intent to downgrade.
 */
router.post('/cancel-offer', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;

        const mapping = await db.get('SELECT stripe_subscription_id FROM stripe_mappings WHERE org_id = $1', [orgId]);

        if (!mapping || !mapping.stripe_subscription_id) {
            return res.status(400).json({ error: 'Org has no active subscription to rescue.' });
        }

        const subId = mapping.stripe_subscription_id;

        // Note: You must manually create a Promo Code named 'SAVE30' inside your Stripe Dashboard that offers e.g. 30% off for 3 months.
        const COUPO_CODE = 'SAVE30';

        try {
            await stripe.subscriptions.update(subId, {
                coupon: COUPO_CODE,
            });
            console.log(`🛡️ Churn Deflected: Applied 30% retention discount to Org ${orgId}`);
        } catch (couponErr) {
            console.warn(`[Churn Deflection] Promo Code SAVE30 might not exist on Stripe: ${couponErr.message}`);
            return res.status(400).json({ error: 'Retention offer expired or invalid.' });
        }

        res.json({
            success: true,
            message: `Retention offer successfully applied! You now have a 30% discount on your current Subscription.`,
        });
    } catch (e) {
        console.error('Cancel-Offer Error:', e.message);
        res.status(500).json({ error: 'Failed to process retention offer.' });
    }
});

/**
 * Endpoint: POST /api/v1/billing/retention-event
 * Analytics Collector for Experimentation Engine A/B Testing.
 */
router.post('/retention-event', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        const { actionType, triggerReason, outcome } = req.body;

        if (!actionType || !triggerReason || !outcome) {
            return res.status(400).json({ error: 'Missing retention event data.' });
        }

        const { AnalyticsService } = require('../services/analytics.service');
        await AnalyticsService.publishEvent('RETENTION_ACCEPTED', 1, orgId, {
            action_type: actionType,
            trigger_reason: triggerReason,
            outcome: outcome,
        });

        res.json({ success: true, message: 'Retention analytic queued for DW extraction.' });
    } catch (e) {
        console.error('Retention Log Error:', e.message);
        res.status(500).json({ error: 'Failed to record retention analytic.' });
    }
});

module.exports = router;
