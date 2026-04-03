/**
 * Stripe Webhook Consumer (BullMQ Edition)
 * Controls SaaS Billing State Machine reacting to Stripe Webhooks.
 */

const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const db = require('../db');
const { EntitlementService } = require('../services/entitlement.service');

function getBullMQConnection() {
    return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
}

const QUEUE_NAME = 'stripe_webhook_queue';
const connection = getBullMQConnection();

// Export queue for the API Express router
const billingQueue = new Queue(QUEUE_NAME, { connection });

class StripeWebhookWorker {
    static start() {
        console.log(`👷 BullMQ StripeWebhookWorker starting... Listening on: ${QUEUE_NAME}`);

        this.worker = new Worker(
            QUEUE_NAME,
            async job => {
                await this.processStripeEvent(job.data);
            },
            {
                connection,
                concurrency: 5, // Low concurrency ensures we don't stampede the DB with heavy updates
            }
        );

        this.worker.on('failed', (job, err) => {
            console.error(`❌ Webhook Job ${job.id} failed after retries: ${err.message}`);
        });
    }

    static async stop() {
        if (this.worker) {
            console.log('🚧 BullMQ StripeWebhookWorker shutting down gracefully...');
            await this.worker.close();
        }
    }

    static async processStripeEvent(event) {
        // Extract timestamps safely
        const eventTimeText = new Date(event.created * 1000).toISOString();
        const nowText = new Date().toISOString();

        // 1. Guard Idempotency Log via Unique Constraint DB
        try {
            await db.run(
                `INSERT INTO stripe_events (event_id, type, created_at, processed_at) VALUES ($1, $2, CAST($3 AS TIMESTAMP), CAST($4 AS TIMESTAMP))`,
                [event.id, event.type, eventTimeText, nowText]
            );
        } catch (err) {
            if (err.message.includes('unique constraint') || String(err.code) === '23505') {
                console.log(`✅ [Stripe Worker] Ignore Duplicate Event: ${event.id}`);
                return; // Safe return
            }
            throw err;
        }

        console.log(`📦 [Stripe Worker] Processing Event: ${event.type}`);

        // Extract Customer ID to find OrgId
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer || invoice.id;

        // Resolve internal OrgId
        const mapping = await db.get('SELECT org_id FROM stripe_mappings WHERE stripe_customer_id = $1', [
            stripeCustomerId,
        ]);

        if (!mapping) {
            console.warn(`⚠️ [Stripe Worker] Event for unmapped Customer ${stripeCustomerId}. Ignored.`);
            return;
        }

        const orgId = mapping.org_id;

        // 2. Ordering Guard (Avoid Out-of-Order Webhook Race Conditions)
        const orgData = await db.get('SELECT updated_at FROM organizations WHERE id = $1', [orgId]);
        if (orgData && orgData.updated_at) {
            const orgUpdated = new Date(orgData.updated_at);
            const evtTime = new Date(event.created * 1000);
            if (evtTime < orgUpdated) {
                console.log(
                    `⏳ [Stripe Worker] Skipped OUT-OF-ORDER event: ${event.id}. (EventTime: ${evtTime.toISOString()} < OrgUpdated: ${orgUpdated.toISOString()})`
                );
                return;
            }
        }

        // 3. Control Machine Flow Logic
        switch (event.type) {
            case 'invoice.paid':
                // Reset Past Due flags to Active
                await db.run(
                    `UPDATE organizations 
                     SET billing_status = 'ACTIVE', grace_period_until = NULL, updated_at = CAST($1 AS TIMESTAMP)
                     WHERE id = $2`,
                    [eventTimeText, orgId]
                );
                await EntitlementService.refreshCache(orgId);
                console.log(`💰 Payment Success -> Enabled Entitlements Org ${orgId}`);
                break;

            case 'invoice.payment_failed':
                // Mark Past Due + Allow 7 days grace time
                await db.run(
                    `UPDATE organizations 
                     SET billing_status = 'PAST_DUE', 
                         grace_period_until = NOW() + INTERVAL '7 days',
                         updated_at = CAST($1 AS TIMESTAMP)
                     WHERE id = $2 AND billing_status != 'PAST_DUE'`,
                    [eventTimeText, orgId]
                );
                // We keep entitlements ON until grace_period passes natively inside FeatureGate!
                console.log(`⚠️ Payment Failed -> Grace Period 7 Days Org ${orgId}`);
                break;

            case 'customer.subscription.deleted':
                await db.run(
                    `UPDATE organizations 
                     SET billing_status = 'CANCELED', current_plan = 'free', grace_period_until = NULL,
                         pending_downgrade_plan = NULL, downgrade_at = NULL, updated_at = CAST($1 AS TIMESTAMP)
                     WHERE id = $2`,
                    [eventTimeText, orgId]
                );
                await EntitlementService.refreshCache(orgId);
                console.log(`🛑 Sub Canceled -> Downgraded Org ${orgId}`);
                break;

            case 'customer.subscription.updated':
                const subscriptionObject = event.data.object;
                const targetPlan = subscriptionObject.metadata?.internal_plan_code || 'pro';
                await db.run(
                    `UPDATE organizations 
                     SET current_plan = $1, 
                         pending_downgrade_plan = NULL, downgrade_at = NULL, 
                         updated_at = CAST($2 AS TIMESTAMP)
                     WHERE id = $3`,
                    [targetPlan, eventTimeText, orgId]
                );
                await EntitlementService.refreshCache(orgId);
                console.log(`🔄 Plan Scheduled/Updated -> Switched Org ${orgId} to ${targetPlan}`);
                break;

            case 'checkout.session.completed':
                const sessionObj = event.data.object;
                const sessionMetadata = sessionObj.metadata || {};
                const subId = sessionObj.subscription;

                // ═══ Handle proration payments (one-time) ═══
                if (sessionMetadata.type === 'plan_upgrade' || sessionMetadata.type === 'addon_toggle') {
                    const checkoutSessionId = sessionObj.id;
                    try {
                        // Find the pending billing invoice
                        const invoice = await db.get(
                            `SELECT id, metadata FROM billing_invoices WHERE stripe_checkout_session_id = $1 AND status = 'pending'`,
                            [checkoutSessionId]
                        );

                        if (invoice) {
                            const meta =
                                typeof invoice.metadata === 'string' ? JSON.parse(invoice.metadata) : invoice.metadata;

                            if (sessionMetadata.type === 'plan_upgrade') {
                                // Apply the plan upgrade
                                const newPlan = sessionMetadata.to_plan;
                                const newFlags = sessionMetadata.new_flags ? JSON.parse(sessionMetadata.new_flags) : {};
                                const creditUsed = parseInt(sessionMetadata.credit_used || '0', 10);

                                await db.run(
                                    `UPDATE organizations SET plan = $1, feature_flags = $2, billing_cycle_anchor = COALESCE(billing_cycle_anchor, NOW()), credit_balance_cents = GREATEST(0, COALESCE(credit_balance_cents, 0) - $3) WHERE id = $4`,
                                    [newPlan, JSON.stringify(newFlags), creditUsed, orgId]
                                );

                                console.log(
                                    `🚀 [Webhook] Proration payment confirmed → Org ${orgId}: ${sessionMetadata.from_plan} → ${newPlan}`
                                );
                            } else if (sessionMetadata.type === 'addon_toggle') {
                                // Apply the addon change
                                const newPlan = sessionMetadata.new_plan;
                                const newFlags = sessionMetadata.new_flags ? JSON.parse(sessionMetadata.new_flags) : {};
                                const planUpgraded = sessionMetadata.plan_upgraded === '1';
                                const creditUsed = parseInt(sessionMetadata.credit_used || '0', 10);

                                if (planUpgraded) {
                                    await db.run(
                                        `UPDATE organizations SET plan = $1, feature_flags = $2, billing_cycle_anchor = COALESCE(billing_cycle_anchor, NOW()), credit_balance_cents = GREATEST(0, COALESCE(credit_balance_cents, 0) - $3) WHERE id = $4`,
                                        [newPlan, JSON.stringify(newFlags), creditUsed, orgId]
                                    );
                                } else {
                                    await db.run(
                                        `UPDATE organizations SET feature_flags = $1, credit_balance_cents = GREATEST(0, COALESCE(credit_balance_cents, 0) - $2) WHERE id = $3`,
                                        [JSON.stringify(newFlags), creditUsed, orgId]
                                    );
                                }

                                console.log(
                                    `💳 [Webhook] Addon payment confirmed → Org ${orgId}: feature=${sessionMetadata.feature_id}, plan=${newPlan}`
                                );
                            }

                            // Mark invoice as paid
                            await db.run(`UPDATE billing_invoices SET status = 'paid', paid_at = NOW() WHERE id = $1`, [
                                invoice.id,
                            ]);
                        } else {
                            console.warn(
                                `[Webhook] No pending billing_invoice found for checkout session ${checkoutSessionId}`
                            );
                        }
                    } catch (prorationErr) {
                        console.error(
                            `[Webhook] Proration checkout processing failed for Org ${orgId}:`,
                            prorationErr.message
                        );
                    }
                    break;
                }

                // ═══ Handle subscription checkout (existing logic) ═══
                if (!subId) break;

                const Stripe = require('stripe');
                const stripeApi = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

                try {
                    const subDetails = await stripeApi.subscriptions.retrieve(subId);

                    // Preload reverse-map of PriceId -> FeatureName
                    const priceMappings = await db.all('SELECT feature, stripe_price_id FROM stripe_feature_prices');
                    const mapPriceToFeature = pid => {
                        const match = priceMappings.find(m => m.stripe_price_id === pid);
                        return match ? match.feature : null;
                    };

                    for (const item of subDetails.items.data) {
                        const boundFeature = mapPriceToFeature(item.price.id);
                        if (!boundFeature) continue;

                        await db.run(
                            `INSERT INTO stripe_subscription_items 
                             (id, org_id, feature, stripe_subscription_id, subscription_item_id)
                             VALUES ($1, $2, $3, $4, $5)
                             ON CONFLICT (org_id, feature) 
                             DO UPDATE SET subscription_item_id = EXCLUDED.subscription_item_id, stripe_subscription_id = EXCLUDED.stripe_subscription_id`,
                            [require('crypto').randomUUID(), orgId, boundFeature, subId, item.id]
                        );
                    }

                    // 👉 FREEZE PRICING SNAPSHOT
                    const baseItem = subDetails.items.data.find(i => i.price?.recurring?.usage_type !== 'metered');
                    if (baseItem) {
                        const orgInfo = await db.get('SELECT experiment_cohort FROM organizations WHERE id = $1', [
                            orgId,
                        ]);
                        const cohort = orgInfo?.experiment_cohort || 'A_CONTROL';
                        const featurePriceMap = subDetails.items.data.reduce((acc, item) => {
                            const feat = mapPriceToFeature(item.price.id);
                            if (feat) acc[feat] = item.price.id;
                            return acc;
                        }, {});

                        await db.run(
                            `INSERT INTO organization_pricing_snapshots (org_id, base_price_id, feature_price_map, cohort, created_at)
                             VALUES ($1, $2, $3, $4, NOW())
                             ON CONFLICT (org_id) DO UPDATE SET 
                                base_price_id = EXCLUDED.base_price_id, feature_price_map = EXCLUDED.feature_price_map, cohort = EXCLUDED.cohort`,
                            [orgId, baseItem.price.id, JSON.stringify(featurePriceMap), cohort]
                        );
                        console.log(`🔒 FROZEN PRICING SNAPSHOT FOR ORG ${orgId} COMPLETED.`);
                    }

                    console.log(`🔗 Successfully Extracted Subscription Items for Org ${orgId}`);
                } catch (apiErr) {
                    console.error(`⚠️ Failed to parse Checkout Session Items for Org ${orgId}: ${apiErr.message}`);
                }
                break;

            default:
                // Unhandled events drop out gracefully
                break;
        }
    }
}

module.exports = { StripeWebhookWorker, billingQueue };
