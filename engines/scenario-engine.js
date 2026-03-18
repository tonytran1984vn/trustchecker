/**
 * Scenario Engine — JSON-defined supply chain flow runner
 * Usage: node engines/scenario-engine.js [scenario.json]
 * 
 * Scenarios can be:
 * 1. Loaded from JSON files
 * 2. Auto-generated for stress/fuzz testing
 * 3. Used as E2E test definitions
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../server/db');
const { validateTransition, checkDuplicateReceive, validatePartner, validateBatchQuantity } = require('../server/middleware/scm-state-machine');

// ─── Scenario Schema ────────────────────────────────────────────
/*
{
  "name": "Normal Distribution Flow",
  "description": "Factory → Warehouse → Distributor → Retailer",
  "actors": {
    "factory": { "partner_id": "auto", "type": "factory" },
    "warehouse": { "partner_id": "auto", "type": "warehouse" },
    "distributor": { "partner_id": "auto", "type": "distributor" },
    "retailer": { "partner_id": "auto", "type": "retailer" }
  },
  "steps": [
    { "event": "commission", "actor": "factory", "delay_hours": 0 },
    { "event": "pack", "actor": "factory", "delay_hours": 2 },
    { "event": "ship", "actor": "factory", "to": "warehouse", "delay_hours": 4 },
    { "event": "receive", "actor": "warehouse", "delay_hours": 24 },
    { "event": "ship", "actor": "warehouse", "to": "distributor", "delay_hours": 12 },
    { "event": "receive", "actor": "distributor", "delay_hours": 48 },
    { "event": "sell", "actor": "retailer", "delay_hours": 72 },
    { "action": "scan", "result": "valid", "delay_hours": 96 }
  ],
  "assertions": [
    { "check": "event_count", "expected": 7 },
    { "check": "final_state", "expected": "sell" },
    { "check": "no_anomalies", "expected": true }
  ]
}
*/

// ─── Built-in Scenario Templates ─────────────────────────────────
const SCENARIOS = {
    normal_flow: {
        name: "Normal Distribution Flow",
        steps: [
            { event: 'commission', actor: 'factory' },
            { event: 'pack', actor: 'factory', delay_hours: 2 },
            { event: 'ship', actor: 'factory', delay_hours: 4 },
            { event: 'receive', actor: 'warehouse', delay_hours: 24 },
            { event: 'ship', actor: 'warehouse', delay_hours: 12 },
            { event: 'receive', actor: 'distributor', delay_hours: 48 },
            { event: 'sell', actor: 'retailer', delay_hours: 72 },
        ],
        assertions: [
            { check: 'event_count', expected: 7 },
            { check: 'final_state', expected: 'sell' },
        ]
    },

    skip_warehouse: {
        name: "Direct Factory to Distributor (Skip Warehouse)",
        steps: [
            { event: 'commission', actor: 'factory' },
            { event: 'pack', actor: 'factory', delay_hours: 2 },
            { event: 'ship', actor: 'factory', delay_hours: 4 },
            { event: 'receive', actor: 'distributor', delay_hours: 48 },
            { event: 'sell', actor: 'retailer', delay_hours: 72 },
        ],
        assertions: [
            { check: 'event_count', expected: 5 },
            { check: 'skipped_steps', expected: ['warehouse'] },
        ]
    },

    recall_flow: {
        name: "Production + Recall",
        steps: [
            { event: 'commission', actor: 'factory' },
            { event: 'pack', actor: 'factory', delay_hours: 2 },
            { event: 'ship', actor: 'factory', delay_hours: 4 },
            { event: 'receive', actor: 'warehouse', delay_hours: 24 },
            { event: 'return', actor: 'quality', delay_hours: 48 },
        ],
        assertions: [
            { check: 'final_state', expected: 'return' },
        ]
    },

    double_ship_attack: {
        name: "⚠️ Attack: Ship product to 2 locations simultaneously",
        steps: [
            { event: 'commission', actor: 'factory' },
            { event: 'ship', actor: 'factory', delay_hours: 1 },
            { event: 'ship', actor: 'factory', delay_hours: 1, expect_fail: true },
        ],
        assertions: [
            { check: 'blocked_at_step', expected: 2 },
        ]
    },

    scan_before_ship: {
        name: "⚠️ Attack: Scan product before shipment",
        steps: [
            { event: 'commission', actor: 'factory' },
            { action: 'scan', expect_warning: 'not yet in distribution' },
        ],
        assertions: [
            { check: 'scan_has_warning', expected: true },
        ]
    }
};

// ─── Scenario Runner ─────────────────────────────────────────────
class ScenarioEngine {
    constructor(orgId) {
        this.orgId = orgId;
        this.results = [];
        this.partners = {};
    }

    async loadPartners() {
        const types = ['factory', 'warehouse', 'distributor', 'retailer'];
        for (const t of types) {
            const p = await db.get('SELECT id, name FROM partners WHERE type = $1 AND org_id = $2 AND status = $3 LIMIT 1', [t, this.orgId, 'active']);
            this.partners[t] = p || { id: uuidv4(), name: 'Auto-' + t };
        }
        this.partners.quality = this.partners.factory; // Quality uses factory partner
    }

    async createProduct() {
        const id = uuidv4();
        const sku = 'SCN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        await db.run(
            "INSERT INTO products (id, name, sku, category, manufacturer, origin_country, status, org_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,NOW())",
            [id, 'Scenario Product ' + sku, sku, 'Test', 'ScenarioEngine', 'VN', this.orgId]
        );
        
        const qrId = uuidv4();
        const qrData = sku + '-' + crypto.randomBytes(8).toString('hex');
        await db.run(
            "INSERT INTO qr_codes (id, product_id, qr_data, org_id, status, generated_by, generated_at) VALUES ($1,$2,$3,$4,'active','scenario-engine',NOW())",
            [qrId, id, qrData, this.orgId]
        );
        return { id, sku, qrId, qrData };
    }

    async runScenario(scenario) {
        const result = { name: scenario.name, steps: [], passed: true, errors: [], warnings: [] };
        const product = await this.createProduct();
        result.product = product;

        let timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - 30);

        for (let i = 0; i < scenario.steps.length; i++) {
            const step = scenario.steps[i];
            const stepResult = { index: i, ...step, status: 'pending' };
            
            if (step.delay_hours) {
                timestamp = new Date(timestamp.getTime() + step.delay_hours * 3600000);
            }

            try {
                if (step.action === 'scan') {
                    // Simulate QR scan
                    const lastEvt = await db.get('SELECT event_type FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1', [product.id]);
                    stepResult.last_event = lastEvt?.event_type || 'none';
                    stepResult.status = 'scanned';
                    
                    if (step.expect_warning && (!lastEvt || ['commission', 'pack'].includes(lastEvt.event_type))) {
                        stepResult.warning = 'Product not yet in distribution';
                        result.warnings.push('Step ' + i + ': ' + stepResult.warning);
                    }
                } else {
                    // SCM event
                    const partner = this.partners[step.actor] || this.partners.factory;
                    
                    // Run through state machine
                    const transition = await validateTransition(product.id, null, step.event);
                    
                    if (!transition.valid) {
                        if (step.expect_fail) {
                            stepResult.status = 'blocked_as_expected';
                            stepResult.reason = transition.error;
                        } else {
                            stepResult.status = 'FAILED';
                            stepResult.reason = transition.error;
                            result.errors.push('Step ' + i + ' (' + step.event + '): ' + transition.error);
                            result.passed = false;
                        }
                    } else {
                        // Insert event
                        const eventId = uuidv4();
                        await db.run(
                            "INSERT INTO supply_chain_events (id, event_type, product_id, partner_id, location, actor, org_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                            [eventId, step.event, product.id, partner.id, partner.name, 'scenario-engine', this.orgId, timestamp.toISOString()]
                        );
                        stepResult.status = 'ok';
                        stepResult.event_id = eventId;
                        
                        if (transition.skippedSteps && transition.skippedSteps.length > 0) {
                            stepResult.skipped = transition.skippedSteps;
                            result.warnings.push('Step ' + i + ': Skipped ' + transition.skippedSteps.join(', '));
                        }
                    }
                }
            } catch(e) {
                stepResult.status = 'error';
                stepResult.error = e.message;
                result.errors.push('Step ' + i + ': ' + e.message);
            }
            
            result.steps.push(stepResult);
        }

        // Run assertions
        if (scenario.assertions) {
            for (const a of scenario.assertions) {
                if (a.check === 'event_count') {
                    const cnt = await db.get('SELECT COUNT(*) as c FROM supply_chain_events WHERE product_id = $1', [product.id]);
                    if (cnt.c !== a.expected) {
                        result.errors.push('Assertion failed: event_count=' + cnt.c + ' expected=' + a.expected);
                        result.passed = false;
                    }
                }
                if (a.check === 'final_state') {
                    const last = await db.get('SELECT event_type FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1', [product.id]);
                    if (last?.event_type !== a.expected) {
                        result.errors.push('Assertion failed: final_state=' + (last?.event_type || 'null') + ' expected=' + a.expected);
                        result.passed = false;
                    }
                }
                if (a.check === 'blocked_at_step') {
                    const blocked = result.steps.find(s => s.status === 'blocked_as_expected');
                    if (!blocked) {
                        result.errors.push('Assertion failed: expected attack to be blocked');
                        result.passed = false;
                    }
                }
                if (a.check === 'scan_has_warning') {
                    if (result.warnings.length === 0) {
                        result.errors.push('Assertion failed: expected scan warning');
                        result.passed = false;
                    }
                }
            }
        }

        this.results.push(result);
        return result;
    }

    async runAll() {
        await this.loadPartners();
        for (const [key, scenario] of Object.entries(SCENARIOS)) {
            const r = await this.runScenario(scenario);
            const icon = r.passed ? '✅' : '❌';
            console.log(icon + ' ' + r.name);
            if (r.errors.length) r.errors.forEach(e => console.log('  ❌ ' + e));
            if (r.warnings.length) r.warnings.forEach(w => console.log('  ⚠️  ' + w));
        }
        
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        console.log('\n' + passed + '/' + total + ' scenarios passed');
        return this.results;
    }
}

// ─── AI Scenario Generator ──────────────────────────────────────
function generateRandomScenario() {
    const events = ['commission', 'pack', 'ship', 'receive', 'ship', 'receive', 'sell'];
    const actors = ['factory', 'factory', 'factory', 'warehouse', 'warehouse', 'distributor', 'retailer'];
    
    // Randomly mutate
    const mutations = ['skip', 'duplicate', 'reverse', 'inject_ghost', 'none'];
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    
    const steps = [];
    for (let i = 0; i < events.length; i++) {
        if (mutation === 'skip' && i === Math.floor(Math.random() * events.length)) continue;
        if (mutation === 'duplicate' && i === 3) {
            steps.push({ event: events[i], actor: actors[i], delay_hours: Math.random() * 48 });
        }
        if (mutation === 'reverse' && i >= 3 && i <= 4) {
            steps.push({ event: events[i+1] || events[i], actor: actors[i], delay_hours: Math.random() * 48 });
            steps.push({ event: events[i], actor: actors[i], delay_hours: Math.random() * 48 });
            i++;
            continue;
        }
        steps.push({ event: events[i], actor: actors[i], delay_hours: Math.random() * 48 });
    }

    return {
        name: 'Auto-generated (' + mutation + ')',
        steps,
        assertions: []
    };
}

module.exports = { ScenarioEngine, SCENARIOS, generateRandomScenario };

// CLI mode
if (require.main === module) {
    (async () => {
        const org = await db.get('SELECT id FROM organizations LIMIT 1');
        if (!org) { console.error('No org!'); process.exit(1); }
        
        console.log('╔═══════════════════════════════════════════╗');
        console.log('║       Scenario Engine — Running All       ║');
        console.log('╚═══════════════════════════════════════════╝\n');

        const engine = new ScenarioEngine(org.id);
        await engine.runAll();

        // Run 5 random scenarios
        console.log('\n── Random Scenarios ──\n');
        await engine.loadPartners();
        for (let i = 0; i < 5; i++) {
            const scenario = generateRandomScenario();
            const r = await engine.runScenario(scenario);
            console.log((r.passed ? '✅' : '⚠️ ') + ' ' + r.name + (r.errors.length ? ' — ' + r.errors[0] : ''));
        }

        process.exit(0);
    })();
}
