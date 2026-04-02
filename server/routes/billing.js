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
                orgData = await db.get('SELECT plan, name, feature_flags, settings FROM organizations WHERE id = $1', [
                    orgId,
                ]);
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
        const orgId = req.orgId || req.user?.org_id;
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
        const orgId = req.orgId || req.user?.org_id;

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
                current_plan: orgInfo?.current_plan || 'free',
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
 * Endpoint: POST /api/v1/billing/upgrade
 * 1-Click Zero-Downtime SaaS Upgrade Flow. Swaps the Base recurring plan and creates Stripe Prorations.
 */
router.post('/upgrade', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id;
        const { targetPriceId, targetPlanName } = req.body;

        if (!targetPriceId || !targetPlanName) {
            return res.status(400).json({ error: 'Missing targetPriceId or targetPlanName' });
        }

        // Fetch Subscription Identity
        const mapping = await db.get('SELECT stripe_subscription_id FROM stripe_mappings WHERE org_id = $1', [orgId]);

        if (!mapping || !mapping.stripe_subscription_id) {
            return res
                .status(400)
                .json({ error: 'Org has no active subscription. Use /subscribe to create a new one.' });
        }

        const subId = mapping.stripe_subscription_id;

        // 1. Retrieve Current Subscription Details
        const subDetails = await stripe.subscriptions.retrieve(subId);

        // 2. Locate the existing Base Plan Item (The one that is NOT metered)
        const oldBaseItem = subDetails.items.data.find(i => i.price?.recurring?.usage_type !== 'metered');

        if (!oldBaseItem) {
            return res.status(500).json({ error: 'Could not resolve existing Base Plan item for Proration.' });
        }

        // 3. Command Stripe to Perform Atomic Proration Swap
        const updatedSub = await stripe.subscriptions.update(subId, {
            items: [
                {
                    id: oldBaseItem.id, // The item to edit
                    price: targetPriceId, // The new Price to apply
                },
            ],
            proration_behavior: 'create_prorations',
            metadata: {
                ...subDetails.metadata,
                internal_plan_code: targetPlanName,
            },
        });

        // 4. Prioritize Upgrade Over Downgrade (Guard rails)
        if (subDetails.schedule) {
            await stripe.subscriptionSchedules.cancel(subDetails.schedule);
            console.log(`🧹 Canceled existing Downgrade Schedule on Org ${orgId} during Upgrade.`);
        }

        // 5. Synchronous Core State Mutation & Cache Flush
        await db.run(
            `UPDATE organizations 
             SET current_plan = $1, billing_updated_at = NOW(), pending_downgrade_plan = NULL, downgrade_at = NULL
             WHERE id = $2`,
            [targetPlanName, orgId]
        );

        const { EntitlementService } = require('../services/entitlement.service');
        await EntitlementService.refreshCache(orgId);

        console.log(`🚀 Successfully Upgraded Org ${orgId} to ${targetPlanName} with Prorations.`);

        res.json({
            success: true,
            message: `Successfully upgraded to ${targetPlanName}`,
            subscription: updatedSub.id,
        });
    } catch (e) {
        console.error('Upgrade Endpoint Error:', e.message);
        res.status(500).json({ error: 'Failed to process plan switch request.' });
    }
});

/**
 * Endpoint: POST /api/v1/billing/downgrade
 * Safe Downgrade Flow. Schedules plan transitions strictly at period_end.
 */
router.post('/downgrade', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id;
        const { targetPlanName, targetPriceId } = req.body; // e.g., 'free' or 'pro'

        if (!targetPlanName) {
            return res.status(400).json({ error: 'Missing targetPlanName' });
        }

        const mapping = await db.get('SELECT stripe_subscription_id FROM stripe_mappings WHERE org_id = $1', [orgId]);

        if (!mapping || !mapping.stripe_subscription_id) {
            return res.status(400).json({ error: 'Org has no active subscription to downgrade.' });
        }

        const subId = mapping.stripe_subscription_id;
        const subDetails = await stripe.subscriptions.retrieve(subId);

        const endDate = new Date(subDetails.current_period_end * 1000);

        if (targetPlanName === 'free') {
            // Cancel at period end gracefully
            await stripe.subscriptions.update(subId, {
                cancel_at_period_end: true,
            });
        } else {
            // Tiered Downgrade (Enterprise -> Pro) using Stripe Schedules
            if (!targetPriceId) return res.status(400).json({ error: 'Missing targetPriceId' });

            // 1. Convert sub to Schedule
            let scheduleId = subDetails.schedule;
            if (!scheduleId) {
                const schedule = await stripe.subscriptionSchedules.create({
                    from_subscription: subId,
                });
                scheduleId = schedule.id;
            }

            const scheduleDetail = await stripe.subscriptionSchedules.retrieve(scheduleId);
            const currentPhase = scheduleDetail.phases[0];

            // Filter out old base plan, inject new
            const newItems = currentPhase.items.map(item => {
                const priceType = item.price?.recurring?.usage_type; // 'metered' vs 'licensed'
                if (priceType !== 'metered') {
                    return { price: targetPriceId, quantity: 1 };
                }
                return { price: item.price, quantity: 1 }; // Might need tweaking based on dynamic stripe payload
            });

            // 2. Queue Phase 2 at end of Phase 1
            await stripe.subscriptionSchedules.update(scheduleId, {
                phases: [
                    {
                        start_date: currentPhase.start_date,
                        end_date: currentPhase.end_date,
                        items: currentPhase.items,
                    },
                    {
                        start_date: currentPhase.end_date,
                        items: newItems,
                        metadata: { internal_plan_code: targetPlanName },
                    },
                ],
            });
        }

        // 3. Mark DB for Native Tracker
        await db.run(
            `UPDATE organizations 
             SET pending_downgrade_plan = $1, downgrade_at = $2
             WHERE id = $3`,
            [targetPlanName, endDate.toISOString(), orgId]
        );

        console.log(`📉 Org ${orgId} Scheduled to Downgrade to ${targetPlanName} firmly at ${endDate.toISOString()}`);

        res.json({
            success: true,
            message: `Your downgrade to ${targetPlanName} has been scheduled for the end of the current billing cycle (${endDate.toLocaleDateString()}).`,
        });
    } catch (e) {
        console.error('Downgrade Feature Error:', e.message);
        res.status(500).json({ error: 'Failed to execute Downgrade scheduling.' });
    }
});

/**
 * Endpoint: POST /api/v1/billing/cancel-offer
 * Churn Deflection Engine. Offers an immediate, Stripe-Native discount to retain users who intent to downgrade.
 */
router.post('/cancel-offer', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.org_id;

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
        const orgId = req.orgId || req.user?.org_id;
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
