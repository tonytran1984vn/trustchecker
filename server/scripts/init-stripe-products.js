/**
 * initialization Script: Stripe SaaS Product & Pricing Generator
 * Generates the Hybrid Model (Tiered + Metered + Recurring) directly onto Stripe 
 * mapping natively to TrustChecker DB Schemas.
 */

require('dotenv').config();
const Stripe = require('stripe');

// Failsafe: Use your live/test key appropriately (.env)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

async function initStripeSchema() {
    console.log('🚀 Initializing TrustChecker SaaS Billing Schema on Stripe...');

    try {
        // ==========================================================
        // 1. BASE SUBSCRIPTION PLANS (Recurring Flat Fees)
        // ==========================================================

        console.log('\\n[1/3] Generating Base Product Plans...');

        // 1.1 PRO PLAN
        const proProduct = await stripe.products.create({
            name: 'TrustChecker Pro',
            description: 'Professional Multi-Tenant Risk Intelligence Access',
            metadata: { type: 'base_plan', internal_plan_code: 'pro' }
        });
        const proPrice = await stripe.prices.create({
            product: proProduct.id,
            unit_amount: 4900, // $49.00
            currency: 'usd',
            recurring: { interval: 'month' },
            metadata: { internal_plan_code: 'pro' }
        });
        console.log(`✅ Pro Plan Created: ${proProduct.id} -> Price: ${proPrice.id}`);

        // 1.2 ENTERPRISE PLAN (Custom Contact-Sales placeholder)
        const enterpriseProduct = await stripe.products.create({
            name: 'TrustChecker Enterprise',
            description: 'Custom SLA Enterprise Deployment',
            metadata: { type: 'base_plan', internal_plan_code: 'enterprise' }
        });
        // We do not create a standard public Price for Enterprise (Negotiated Contracts).
        console.log(`✅ Enterprise Product Created: ${enterpriseProduct.id}`);

        // ==========================================================
        // 2. METERED ADD-ON FEATURES (Tiered Usage-Based)
        // ==========================================================
        console.log('\\n[2/3] Generating Metered Feature Add-ons...');

        // 2.1 QR SCAN (Feature Key: 'qr')
        const qrProduct = await stripe.products.create({
            name: 'Feature: Global QR Scans',
            description: 'Billed periodically based on total Anti-Counterfeit Scans executed by end consumers.',
            metadata: { type: 'feature', feature_key: 'qr' }
        });

        const qrPrice = await stripe.prices.create({
            product: qrProduct.id,
            currency: 'usd',
            billing_scheme: 'tiered',
            recurring: {
                interval: 'month',
                usage_type: 'metered' // CRITICAL: This allows us to push usage records
            },
            tiers_mode: 'graduated',
            tiers: [
                { up_to: 10000, unit_amount: 2 },        // $0.02 cents per scan early
                { up_to: 100000, unit_amount: 1 },       // $0.01 cents scaling
                { up_to: 'inf', unit_amount_decimal: '0.5' } // $0.005 hyper scale
            ],
            expand: ['tiers']
        });
        console.log(`✅ Feature [qr] Metered Price Generated: ${qrPrice.id}`);

        // 2.2 CARBON TRACE (Feature Key: 'carbon')
        const carbonProduct = await stripe.products.create({
            name: 'Feature: Scope 3 Carbon Trace',
            description: 'Billed periodically based on total environmental transactions appended.',
            metadata: { type: 'feature', feature_key: 'carbon' }
        });

        const carbonPrice = await stripe.prices.create({
            product: carbonProduct.id,
            currency: 'usd',
            billing_scheme: 'tiered',
            recurring: {
                interval: 'month',
                usage_type: 'metered'
            },
            tiers_mode: 'graduated',
            tiers: [
                { up_to: 5000, unit_amount: 5 },       // $0.05
                { up_to: 'inf', unit_amount: 2 }       // $0.02
            ],
            expand: ['tiers']
        });
        console.log(`✅ Feature [carbon] Metered Price Generated: ${carbonPrice.id}`);

        // ==========================================================
        // 3. FINAL SUMMARY TO POPULATE DB
        // ==========================================================
        
        console.log('\n[3/3] Stripe Operations Complete. Use these mappings inside your internal Database:\n');

        console.log(`[Base Plans]`);
        console.log(`PRO_PRICE_ID = ${proPrice.id}`);

        console.log(`\n[Feature Add-Ons]`);
        console.log(`INSERT INTO stripe_feature_prices (feature, stripe_price_id) VALUES ('qr', '${qrPrice.id}');`);
        console.log(`INSERT INTO stripe_feature_prices (feature, stripe_price_id) VALUES ('carbon', '${carbonPrice.id}');`);

        console.log('\n🎉 Schema generation completed successfully!');
        
    } catch (e) {
        console.error('❌ Failed to construct Stripe Schema:', e.message);
    }
}

// Ensure execution when strictly called
if (require.main === module) {
    initStripeSchema().then(() => process.exit(0));
}
