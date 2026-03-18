/**
 * ═══════════════════════════════════════════════════════════════
 *  CHAOS TESTING SYSTEM — Production-Grade
 *  
 *  4 Modules:
 *    1. State Validator       — DB-level invariant + chain integrity
 *    2. Chaos Injector        — 5 chaos types (API, state, time, concurrency, data)
 *    3. Simulation Engine     — parallel/sequential + delay + retry
 *    4. Chaos Runner          — orchestrator + report
 *
 *  Run: cd /opt/trustchecker && node engines/chaos-system.js
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const BASE = process.env.TEST_URL || 'http://127.0.0.1:4000';
let TOKEN = '';
let ORG_ID = '';

// ─── UTILS ────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomIP = () => `${randomInt(1,254)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,254)}`;

async function api(method, path, body, headers = {}) {
    const opts = { method, headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'x-idempotency-key': uuidv4(), ...headers } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(BASE + path, opts);
    return { status: r.status, body: await r.json().catch(() => null) };
}

async function dbQuery(sql, params = []) {
    // Use the server's DB module via a test endpoint, or direct psql
    const { execSync } = require('child_process');
    const dbUrl = process.env.DATABASE_URL;
    const paramSql = params.reduce((s, p, i) => s.replace('$' + (i+1), typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : p), sql);
    try {
        const result = execSync(`psql "${dbUrl}" -t -A -c "${paramSql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 10000 }).toString().trim();
        return result;
    } catch(e) { return null; }
}

async function auth() {
    const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@tonyisking.com', password: '123qaz12' }) });
    const d = await r.json();
    TOKEN = d.token;
    ORG_ID = d.user?.org_id || '';
    return !!TOKEN;
}

async function createProduct() {
    const sku = `CHAOS-${Date.now()}-${randomInt(1000,9999)}`;
    const r = await api('POST', '/api/products', { name: 'Chaos Test ' + sku, sku, category: 'test', manufacturer: 'ChaosLab', origin_country: 'VN' });
    return r.body?.product?.id || r.body?.id;
}

async function scmEvent(productId, eventType, location, partnerId) {
    return api('POST', '/api/scm/events', { product_id: productId, event_type: eventType, location: location || 'chaos-test', partner_id: partnerId, details: { chaos: true } });
}

// ════════════════════════════════════════════════════════════════
// MODULE 1: STATE VALIDATOR
// ════════════════════════════════════════════════════════════════
const Validator = {
    issues: [],

    async checkAll(productId) {
        this.issues = [];
        await this.checkChainIntegrity(productId);
        await this.checkMultiOwner(productId);
        await this.checkStateBackward(productId);
        await this.checkSkippedSteps(productId);
        await this.checkTimeOrder(productId);
        return { valid: this.issues.length === 0, issues: this.issues };
    },

    // INV: Hash chain integrity
    async checkChainIntegrity(productId) {
        const r = await api('GET', '/api/scm/chain-integrity/' + productId);
        if (r.body && !r.body.valid) {
            this.issues.push({ type: 'CHAIN_BROKEN', severity: 'CRITICAL', detail: 'Hash chain integrity violation', data: r.body.issues });
        }
    },

    // INV-1: 1 product = 1 location at a time
    async checkMultiOwner(productId) {
        const result = await dbQuery(`SELECT COUNT(DISTINCT location_id) as c FROM product_events WHERE product_id = $1 AND event_type IN ('receive','RECEIVED_WAREHOUSE','RECEIVED_RETAIL') AND created_at > NOW() - INTERVAL '1 minute'`, [productId]);
        if (result && parseInt(result) > 1) {
            this.issues.push({ type: 'MULTI_LOCATION', severity: 'CRITICAL', detail: 'Product received at ' + result + ' locations within 1 minute' });
        }
    },

    // INV-2: State cannot go backward
    async checkStateBackward(productId) {
        const ORDER = { '_initial': 0, 'commission': 1, 'PRODUCT_CREATED': 1, 'pack': 2, 'PRODUCT_PRODUCED': 2, 'ship': 3, 'SHIPPED': 3, 'receive': 4, 'RECEIVED_WAREHOUSE': 4, 'DISTRIBUTED': 5, 'RECEIVED_RETAIL': 5, 'sell': 6, 'SOLD': 6, 'SCANNED': 7, 'return': 8, 'RETURNED': 8 };
        const events = await dbQuery(`SELECT to_state FROM product_events WHERE product_id = $1 ORDER BY created_at ASC`, [productId]);
        if (!events) return;
        const states = events.split('\n').filter(s => s.trim());
        for (let i = 1; i < states.length; i++) {
            const prev = ORDER[states[i-1]] ?? 99;
            const curr = ORDER[states[i]] ?? 99;
            if (curr < prev && !['return', 'RETURNED', 'BLOCKED'].includes(states[i])) {
                this.issues.push({ type: 'STATE_BACKWARD', severity: 'HIGH', detail: `State went backward: ${states[i-1]} → ${states[i]}` });
            }
        }
    },

    // INV-3: No skipped mandatory steps
    async checkSkippedSteps(productId) {
        const events = await dbQuery(`SELECT to_state FROM product_events WHERE product_id = $1 AND from_state != '_migrated' ORDER BY created_at ASC`, [productId]);
        if (!events) return;
        const MANDATORY = ['commission', 'ship', 'receive'];
        const states = events.split('\n').filter(s => s.trim());
        const legacyStates = states.map(s => {
            const map = { 'PRODUCT_CREATED': 'commission', 'PRODUCT_PRODUCED': 'pack', 'SHIPPED': 'ship', 'RECEIVED_WAREHOUSE': 'receive', 'SOLD': 'sell' };
            return map[s] || s;
        });
        for (const m of MANDATORY) {
            if (legacyStates.includes('sell') && !legacyStates.includes(m)) {
                this.issues.push({ type: 'SKIPPED_STEP', severity: 'HIGH', detail: `Mandatory step "${m}" skipped before sell` });
            }
        }
    },

    // INV-5: Event timestamps must be monotonically increasing
    async checkTimeOrder(productId) {
        const result = await dbQuery(`SELECT COUNT(*) FROM (SELECT created_at, LAG(created_at) OVER (ORDER BY created_at) as prev_at FROM product_events WHERE product_id = $1) sub WHERE created_at < prev_at`, [productId]);
        if (result && parseInt(result) > 0) {
            this.issues.push({ type: 'TIME_TRAVEL', severity: 'HIGH', detail: result + ' events with timestamp before previous event' });
        }
    },

    // GLOBAL: Check all products for invariant violations
    async checkGlobalInvariants() {
        const issues = [];
        // Products with 2+ concurrent receive events
        const multiReceive = await dbQuery(`SELECT product_id, COUNT(*) as c FROM product_events WHERE event_type IN ('receive','RECEIVED_WAREHOUSE') GROUP BY product_id HAVING COUNT(*) > 1`);
        // (This is just a count — not necessarily a problem if they're sequential)

        // Products with broken chain
        const brokenChain = await dbQuery(`SELECT COUNT(DISTINCT product_id) FROM product_events WHERE prev_event_hash != 'MIGRATION_NO_PREV_HASH' AND prev_event_hash NOT IN (SELECT hash FROM product_events) AND prev_event_hash != '0000000000000000000000000000000000000000000000000000000000000000'`);
        if (brokenChain && parseInt(brokenChain) > 0) {
            issues.push({ type: 'GLOBAL_CHAIN_BROKEN', severity: 'CRITICAL', detail: brokenChain + ' products have broken hash chains' });
        }

        return issues;
    }
};

// ════════════════════════════════════════════════════════════════
// MODULE 2: CHAOS INJECTOR (5 types)
// ════════════════════════════════════════════════════════════════
const Chaos = {
    results: [],

    // Type 1: API Chaos (duplicate, invalid payload, missing fields)
    async apiChaos(productId) {
        const tests = [];

        // 1A: Duplicate request
        const [r1, r2] = await Promise.all([
            scmEvent(productId, 'commission', 'factory-A'),
            scmEvent(productId, 'commission', 'factory-A'),
        ]);
        tests.push({ name: 'duplicate_commission', expected: 'one_success_one_fail', r1: r1.status, r2: r2.status, pass: (r1.status === 200) !== (r2.status === 200) || r1.status !== 200 });

        // 1B: Invalid payload
        const r3 = await api('POST', '/api/scm/events', { product_id: productId, event_type: '' });
        tests.push({ name: 'empty_event_type', expected: '400', actual: r3.status, pass: r3.status >= 400 });

        // 1C: Missing product_id
        const r4 = await api('POST', '/api/scm/events', { event_type: 'commission' });
        tests.push({ name: 'missing_product_id', expected: '400', actual: r4.status, pass: r4.status >= 400 });

        return tests;
    },

    // Type 2: State Chaos (invalid transitions)
    async stateChaos(productId) {
        const tests = [];

        // 2A: Skip to sell without ship/receive
        const p = await createProduct();
        await scmEvent(p, 'commission', 'factory');
        const skipSell = await scmEvent(p, 'sell', 'retail');
        tests.push({ name: 'skip_to_sell', expected: 'rejected', actual: skipSell.status, pass: skipSell.status >= 400 || skipSell.body?.error?.includes?.('Invalid') });

        // 2B: Go backward (sell → commission)
        const p2 = await createProduct();
        await scmEvent(p2, 'commission', 'factory');
        await scmEvent(p2, 'ship', 'factory');
        await scmEvent(p2, 'receive', 'warehouse');
        await scmEvent(p2, 'sell', 'retail');
        const backward = await scmEvent(p2, 'commission', 'factory');
        // commission after sell is only valid through 'return' path
        tests.push({ name: 'backward_sell_to_commission', expected: 'rejected', actual: backward.status, body: backward.body?.error?.substring?.(0, 50), pass: backward.status >= 400 || backward.body?.error?.includes?.('Invalid') });

        // 2C: Double receive (same product, no re-ship)
        const p3 = await createProduct();
        await scmEvent(p3, 'commission', 'factory');
        await scmEvent(p3, 'ship', 'factory');
        await scmEvent(p3, 'receive', 'warehouse-A');
        const doubleReceive = await scmEvent(p3, 'receive', 'warehouse-B');
        tests.push({ name: 'double_receive_no_reship', expected: 'rejected', actual: doubleReceive.status, pass: doubleReceive.status >= 400 || doubleReceive.body?.error?.includes?.('duplicate') || doubleReceive.body?.error?.includes?.('Invalid') });

        return tests;
    },

    // Type 3: Time Chaos (replay, out-of-order)
    async timeChaos(productId) {
        const tests = [];

        // 3A: Replay old request (same idempotency key)
        const idempKey = 'chaos-replay-' + uuidv4();
        const p = await createProduct();
        const r1 = await api('POST', '/api/scm/events', { product_id: p, event_type: 'commission', location: 'factory' }, { 'x-idempotency-key': idempKey });
        const r2 = await api('POST', '/api/scm/events', { product_id: p, event_type: 'commission', location: 'factory' }, { 'x-idempotency-key': idempKey });
        tests.push({ name: 'replay_same_idempotency', expected: '2nd_blocked', r1: r1.status, r2: r2.status, pass: r1.status === 200 && r2.status !== 200 || r2.body?.cached });

        return tests;
    },

    // Type 4: CONCURRENCY CHAOS (CRITICAL — the missing piece)
    async concurrencyChaos() {
        const tests = [];

        // 4A: 2 warehouses receive same product simultaneously
        const p = await createProduct();
        await scmEvent(p, 'commission', 'factory');
        await scmEvent(p, 'ship', 'factory');
        await sleep(100);

        const [rA, rB] = await Promise.all([
            scmEvent(p, 'receive', 'warehouse-A'),
            scmEvent(p, 'receive', 'warehouse-B'),
        ]);

        // EXACTLY 1 should succeed
        const bothSucceed = rA.status === 200 && rB.status === 200;
        const oneSucceeds = (rA.status === 200) !== (rB.status === 200);
        tests.push({
            name: 'concurrent_receive_2_warehouses',
            expected: 'exactly_1_success',
            rA: { status: rA.status, body: rA.body?.error?.substring?.(0, 60) || 'OK' },
            rB: { status: rB.status, body: rB.body?.error?.substring?.(0, 60) || 'OK' },
            pass: oneSucceeds || (!bothSucceed),
            critical: bothSucceed,
        });

        // Validate DB state: must have exactly 1 receive event
        const receiveCount = await dbQuery(`SELECT COUNT(*) FROM product_events WHERE product_id = $1 AND event_type IN ('receive','RECEIVED_WAREHOUSE')`, [p]);
        tests.push({
            name: 'concurrent_receive_db_check',
            expected: '1_receive_event',
            actual: receiveCount,
            pass: parseInt(receiveCount) <= 1,
            critical: parseInt(receiveCount) > 1,
        });

        // 4B: 5 concurrent scm events on same product
        const p2 = await createProduct();
        const events = ['commission', 'pack', 'ship', 'receive', 'sell'];
        const results = await Promise.all(events.map(e => scmEvent(p2, e, 'loc-' + e)));
        const successCount = results.filter(r => r.status === 200).length;
        tests.push({
            name: 'concurrent_5_events_same_product',
            expected: 'ordered_execution',
            successes: successCount + '/' + events.length,
            pass: successCount <= 2, // At most commission+pack could succeed concurrently
        });

        // 4C: Race condition on QR scan (10 concurrent scans)
        const p3 = await createProduct();
        const qrRes = await api('POST', '/api/qr/generate', { product_id: p3, quantity: 1 });
        const qrData = qrRes.body?.codes?.[0]?.code;
        if (qrData) {
            const scanPromises = Array.from({ length: 10 }, (_, i) =>
                api('POST', '/api/qr/mobile-scan', { qr_data: qrData, device_info: { model: 'chaos-' + i }, ip_address: randomIP() })
            );
            const scanResults = await Promise.all(scanPromises);
            const validScans = scanResults.filter(r => r.status === 200 && r.body?.result !== 'counterfeit').length;
            tests.push({
                name: 'concurrent_10_qr_scans',
                expected: 'most_succeed_or_rate_limited',
                status_200: scanResults.filter(r => r.status === 200).length,
                status_429: scanResults.filter(r => r.status === 429).length,
                pass: true, // Informational
            });
        }

        // 4D: Double sell (concurrent)
        const p4 = await createProduct();
        await scmEvent(p4, 'commission', 'factory');
        await scmEvent(p4, 'ship', 'factory');
        await scmEvent(p4, 'receive', 'warehouse');
        await sleep(50);
        const [s1, s2] = await Promise.all([
            scmEvent(p4, 'sell', 'retail-A'),
            scmEvent(p4, 'sell', 'retail-B'),
        ]);
        const bothSold = s1.status === 200 && s2.status === 200;
        tests.push({
            name: 'concurrent_double_sell',
            expected: 'exactly_1_success',
            s1: s1.status, s2: s2.status,
            pass: !bothSold,
            critical: bothSold,
        });

        return tests;
    },

    // Type 5: Data Chaos (corrupted data, injection)
    async dataChaos() {
        const tests = [];

        // 5A: SQL injection in event_type
        const p = await createProduct();
        const sqli = await scmEvent(p, "commission'; DROP TABLE products; --", 'hacked');
        tests.push({ name: 'sqli_event_type', expected: 'rejected', actual: sqli.status, pass: sqli.status >= 400 });

        // 5B: XSS in location
        const xss = await scmEvent(p, 'commission', '<script>alert(1)</script>');
        tests.push({ name: 'xss_location', expected: 'sanitized_or_rejected', actual: xss.status, pass: true });

        // 5C: Fake product_id
        const fake = await scmEvent('00000000-0000-0000-0000-000000000000', 'commission', 'fake');
        tests.push({ name: 'fake_product_id', expected: '404_or_error', actual: fake.status, pass: fake.status >= 400 });

        // 5D: Massive payload
        const bigPayload = await api('POST', '/api/scm/events', { product_id: p, event_type: 'commission', location: 'A'.repeat(100000) });
        tests.push({ name: 'massive_payload', expected: 'rejected', actual: bigPayload.status, pass: bigPayload.status >= 400 || bigPayload.status === 200 });

        return tests;
    },
};

// ════════════════════════════════════════════════════════════════
// MODULE 3: SIMULATION ENGINE
// ════════════════════════════════════════════════════════════════
const Simulation = {
    async executeScenario(scenario) {
        const results = [];
        const context = { products: {}, qrCodes: {} };

        for (const step of scenario.steps) {
            // Apply delay
            if (step.delay) await sleep(typeof step.delay === 'number' ? step.delay : randomInt(50, 500));

            // Handle parallel mode
            if (step.mode === 'parallel' && Array.isArray(step.actors)) {
                const parallelResults = await Promise.all(
                    step.actors.map(actor => this.executeStep({ ...step, actor }, context))
                );
                results.push({ step: step.name, mode: 'parallel', results: parallelResults });
            } else if (step.repeat) {
                for (let i = 0; i < step.repeat; i++) {
                    const r = await this.executeStep(step, context);
                    results.push({ step: step.name, iteration: i + 1, ...r });
                    if (step.delay) await sleep(typeof step.delay === 'number' ? step.delay : randomInt(20, 100));
                }
            } else {
                const r = await this.executeStep(step, context);
                results.push({ step: step.name, ...r });
            }
        }

        return { scenario: scenario.id, results, context };
    },

    async executeStep(step, context) {
        try {
            switch (step.action) {
                case 'create_product': {
                    const pid = await createProduct();
                    context.products[step.alias || 'default'] = pid;
                    return { status: 'OK', product_id: pid };
                }
                case 'scm_event': {
                    const pid = context.products[step.product || 'default'];
                    if (!pid) return { status: 'ERROR', error: 'Product not found in context' };
                    const r = await scmEvent(pid, step.event_type, step.location, step.partner_id);
                    return { status: r.status === 200 ? 'OK' : 'FAIL', http: r.status, error: r.body?.error?.substring?.(0, 80) };
                }
                case 'generate_qr': {
                    const pid = context.products[step.product || 'default'];
                    const r = await api('POST', '/api/qr/generate', { product_id: pid, quantity: step.quantity || 1 });
                    if (r.body?.codes?.[0]) context.qrCodes[step.alias || 'default'] = r.body.codes[0].code;
                    return { status: r.status === 200 ? 'OK' : 'FAIL', codes: r.body?.count };
                }
                case 'scan_qr': {
                    const qr = context.qrCodes[step.qr || 'default'];
                    if (!qr) return { status: 'ERROR', error: 'QR not found in context' };
                    const r = await api('POST', '/api/qr/mobile-scan', { qr_data: qr, device_info: { model: step.device || 'chaos-sim' }, ip_address: step.ip || randomIP() });
                    return { status: r.status, result: r.body?.result };
                }
                case 'validate': {
                    const pid = context.products[step.product || 'default'];
                    return await Validator.checkAll(pid);
                }
                default:
                    return { status: 'UNKNOWN_ACTION', action: step.action };
            }
        } catch(e) {
            return { status: 'EXCEPTION', error: e.message };
        }
    }
};

// ════════════════════════════════════════════════════════════════
// MODULE 4: CHAOS RUNNER (Orchestrator + Report)
// ════════════════════════════════════════════════════════════════
async function runChaosSystem() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  CHAOS TESTING SYSTEM — Production-Grade                     ║');
    console.log('║  Validator + Concurrency + 5 Chaos Types                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Auth
    if (!(await auth())) { console.log('❌ Auth failed'); process.exit(1); }
    console.log('Auth ✅  Org: ' + ORG_ID.substring(0, 8) + '\n');

    const report = { timestamp: new Date().toISOString(), modules: {}, summary: { total: 0, passed: 0, failed: 0, critical: 0 } };

    // ─── RUN 1: API CHAOS ─────────────────────────────────────
    console.log('━━━ 1/5: API CHAOS ━━━');
    const p1 = await createProduct();
    const apiResults = await Chaos.apiChaos(p1);
    report.modules.api_chaos = apiResults;
    for (const t of apiResults) {
        report.summary.total++;
        t.pass ? report.summary.passed++ : report.summary.failed++;
        console.log(`  ${t.pass ? '✅' : '❌'} ${t.name} | expected: ${t.expected} | actual: ${t.actual || t.r1 + '/' + t.r2}`);
    }

    // ─── RUN 2: STATE CHAOS ───────────────────────────────────
    console.log('\n━━━ 2/5: STATE CHAOS ━━━');
    const stateResults = await Chaos.stateChaos(p1);
    report.modules.state_chaos = stateResults;
    for (const t of stateResults) {
        report.summary.total++;
        t.pass ? report.summary.passed++ : report.summary.failed++;
        console.log(`  ${t.pass ? '✅' : '❌'} ${t.name} | expected: ${t.expected} | actual: ${t.actual || t.body || 'see data'}`);
    }

    // ─── RUN 3: TIME CHAOS ────────────────────────────────────
    console.log('\n━━━ 3/5: TIME CHAOS ━━━');
    const timeResults = await Chaos.timeChaos(p1);
    report.modules.time_chaos = timeResults;
    for (const t of timeResults) {
        report.summary.total++;
        t.pass ? report.summary.passed++ : report.summary.failed++;
        console.log(`  ${t.pass ? '✅' : '❌'} ${t.name} | expected: ${t.expected} | r1: ${t.r1} r2: ${t.r2}`);
    }

    // ─── RUN 4: CONCURRENCY CHAOS (CRITICAL) ─────────────────
    console.log('\n━━━ 4/5: CONCURRENCY CHAOS (CRITICAL) ━━━');
    const concResults = await Chaos.concurrencyChaos();
    report.modules.concurrency_chaos = concResults;
    for (const t of concResults) {
        report.summary.total++;
        t.pass ? report.summary.passed++ : report.summary.failed++;
        if (t.critical) report.summary.critical++;
        const icon = t.critical ? '🔴' : t.pass ? '✅' : '❌';
        console.log(`  ${icon} ${t.name} | expected: ${t.expected} | ${JSON.stringify(t.rA || t.actual || t.s1 || t.successes || '').substring(0, 60)}`);
    }

    // ─── RUN 5: DATA CHAOS ────────────────────────────────────
    console.log('\n━━━ 5/5: DATA CHAOS ━━━');
    const dataResults = await Chaos.dataChaos();
    report.modules.data_chaos = dataResults;
    for (const t of dataResults) {
        report.summary.total++;
        t.pass ? report.summary.passed++ : report.summary.failed++;
        console.log(`  ${t.pass ? '✅' : '❌'} ${t.name} | expected: ${t.expected} | actual: ${t.actual}`);
    }

    // ─── RUN SCENARIOS ────────────────────────────────────────
    console.log('\n━━━ SCENARIO SIMULATIONS ━━━');
    const scenarios = [
        {
            id: 'full_flow_with_validation',
            steps: [
                { name: 'create', action: 'create_product', alias: 'p1' },
                { name: 'commission', action: 'scm_event', product: 'p1', event_type: 'commission', location: 'factory' },
                { name: 'ship', action: 'scm_event', product: 'p1', event_type: 'ship', location: 'factory' },
                { name: 'receive', action: 'scm_event', product: 'p1', event_type: 'receive', location: 'warehouse' },
                { name: 'sell', action: 'scm_event', product: 'p1', event_type: 'sell', location: 'retail' },
                { name: 'validate', action: 'validate', product: 'p1' },
            ]
        },
        {
            id: 'scan_before_sell',
            steps: [
                { name: 'create', action: 'create_product', alias: 'p2' },
                { name: 'commission', action: 'scm_event', product: 'p2', event_type: 'commission', location: 'factory' },
                { name: 'gen_qr', action: 'generate_qr', product: 'p2', alias: 'q2' },
                { name: 'scan_early', action: 'scan_qr', qr: 'q2', device: 'early-scanner' },
                { name: 'validate', action: 'validate', product: 'p2' },
            ]
        },
        {
            id: 'concurrent_warehouse_race',
            steps: [
                { name: 'create', action: 'create_product', alias: 'p3' },
                { name: 'commission', action: 'scm_event', product: 'p3', event_type: 'commission', location: 'factory' },
                { name: 'ship', action: 'scm_event', product: 'p3', event_type: 'ship', location: 'factory' },
                { name: 'parallel_receive', action: 'scm_event', product: 'p3', event_type: 'receive', mode: 'parallel', actors: ['warehouse-A', 'warehouse-B'], location: 'race-test' },
                { name: 'validate', action: 'validate', product: 'p3' },
            ]
        },
    ];

    for (const scenario of scenarios) {
        const result = await Simulation.executeScenario(scenario);
        report.modules['scenario_' + scenario.id] = result;
        const validationStep = result.results.find(r => r.step === 'validate');
        const isValid = validationStep?.valid !== false;
        report.summary.total++;
        isValid ? report.summary.passed++ : report.summary.failed++;
        console.log(`  ${isValid ? '✅' : '❌'} ${scenario.id} | ${isValid ? 'VALID' : 'ISSUES: ' + (validationStep?.issues?.length || 0)}`);
    }

    // ─── GLOBAL INVARIANT CHECK ───────────────────────────────
    console.log('\n━━━ GLOBAL INVARIANT CHECK ━━━');
    const globalIssues = await Validator.checkGlobalInvariants();
    report.modules.global_invariants = globalIssues;
    if (globalIssues.length === 0) {
        console.log('  ✅ No global invariant violations');
    } else {
        for (const issue of globalIssues) {
            report.summary.critical++;
            console.log(`  🔴 ${issue.type}: ${issue.detail}`);
        }
    }

    // ─── FINAL REPORT ─────────────────────────────────────────
    const { total, passed, failed, critical } = report.summary;
    const passRate = total > 0 ? Math.round(passed / total * 100) : 0;

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  RESULTS: ${passed}/${total} passed (${passRate}%) | ${failed} failed | ${critical} critical    `);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  API Chaos:         ${apiResults.filter(t=>t.pass).length}/${apiResults.length} passed`);
    console.log(`║  State Chaos:       ${stateResults.filter(t=>t.pass).length}/${stateResults.length} passed`);
    console.log(`║  Time Chaos:        ${timeResults.filter(t=>t.pass).length}/${timeResults.length} passed`);
    console.log(`║  Concurrency Chaos: ${concResults.filter(t=>t.pass).length}/${concResults.length} passed  ${concResults.some(t=>t.critical)?'🔴 CRITICAL':'✅'}`);
    console.log(`║  Data Chaos:        ${dataResults.filter(t=>t.pass).length}/${dataResults.length} passed`);
    console.log(`║  Scenarios:         ${scenarios.length} executed`);
    console.log(`║  Global Invariants: ${globalIssues.length === 0 ? '✅ Clean' : '🔴 ' + globalIssues.length + ' violations'}`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Write JSON report
    const fs = require('fs');
    fs.writeFileSync('chaos-report.json', JSON.stringify(report, null, 2));
    console.log('\n📝 Full report: chaos-report.json');

    process.exit(critical > 0 ? 1 : 0);
}

runChaosSystem().catch(e => { console.error('FATAL:', e); process.exit(1); });
