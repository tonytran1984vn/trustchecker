/**
 * Carbon Officer Dashboard Routes
 * Aggregated endpoint for Carbon Officer workspace.
 *
 * GET /api/carbon-officer/dashboard — KPIs + recent activity
 */
const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const carbonEngine = require('../engines/carbon-engine');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /dashboard — Carbon Officer Overview KPIs ──────────────────────────
router.get('/dashboard', cacheMiddleware(60), async (req, res) => {
    try {
        const orgId = req.tenantId || req.user?.orgId || req.user?.org_id || null;

        // ── Scope breakdown ─────────────────────────────────────────
        let products = [], shipments = [], events = [];
        try {
            const pq = orgId
                ? await db.prepare('SELECT * FROM products WHERE org_id = ?').all(orgId)
                : await db.prepare('SELECT * FROM products').all();
            products = pq || [];
        } catch (_) { }

        try {
            const sq = orgId
                ? await db.prepare('SELECT * FROM shipments WHERE org_id = ?').all(orgId)
                : await db.prepare('SELECT * FROM shipments').all();
            shipments = sq || [];
        } catch (_) { }

        try {
            const eq = orgId
                ? await db.prepare("SELECT * FROM scan_events WHERE org_id = ? ORDER BY created_at DESC LIMIT 200").all(orgId)
                : await db.prepare("SELECT * FROM scan_events ORDER BY created_at DESC LIMIT 200").all();
            events = eq || [];
        } catch (_) { }

        const scopeData = carbonEngine.aggregateByScope(products, shipments, events);

        // ── Credits summary ─────────────────────────────────────────
        let credits_minted = 0, credits_pending = 0, credits_retired = 0, total_tCO2e = 0;
        try {
            const creditStats = orgId
                ? await db.prepare(`SELECT status, COUNT(*) as cnt, COALESCE(SUM(quantity_tCO2e),0) as total
                    FROM carbon_credits WHERE tenant_id = ? GROUP BY status`).all(orgId)
                : await db.prepare(`SELECT status, COUNT(*) as cnt, COALESCE(SUM(quantity_tCO2e),0) as total
                    FROM carbon_credits GROUP BY status`).all();
            for (const row of (creditStats || [])) {
                if (row.status === 'minted' || row.status === 'active') { credits_minted += row.cnt; total_tCO2e += row.total; }
                else if (row.status === 'pending') credits_pending += row.cnt;
                else if (row.status === 'retired') credits_retired += row.cnt;
            }
        } catch (_) { }

        // ── Simulations summary ─────────────────────────────────────
        let simulations_total = 0, simulations_eligible = 0;
        try {
            const simStats = orgId
                ? await db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN credit_eligible = 1 THEN 1 ELSE 0 END) as eligible
                    FROM carbon_simulations WHERE simulated_by IN (SELECT id FROM users WHERE org_id = ?)`).get(orgId)
                : await db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN credit_eligible = 1 THEN 1 ELSE 0 END) as eligible
                    FROM carbon_simulations`).get();
            simulations_total = simStats?.total || 0;
            simulations_eligible = simStats?.eligible || 0;
        } catch (_) { }

        // ── Maturity assessment ──────────────────────────────────────
        const features = [];
        if (products.length > 0) features.push('scope_calculation');
        if (shipments.length > 0) features.push('supply_chain_mapping');
        if (credits_minted > 0) features.push('credit_issuance');
        if (simulations_total > 0) features.push('simulation_engine');
        const maturity = carbonEngine.assessMaturity(features);

        // ── Recent carbon activity (audit log) ──────────────────────
        let recent_activity = [];
        try {
            const q = orgId
                ? `SELECT al.*, u.email as actor_email FROM audit_log al
                   LEFT JOIN users u ON al.actor_id = u.id
                   WHERE (al.action LIKE '%carbon%' OR al.action LIKE '%CARBON%' OR al.action LIKE '%emission%' OR al.action LIKE '%CIP%' OR al.entity_type = 'carbon_credit')
                   AND u.org_id = ?
                   ORDER BY al.timestamp DESC LIMIT 15`
                : `SELECT al.*, u.email as actor_email FROM audit_log al
                   LEFT JOIN users u ON al.actor_id = u.id
                   WHERE al.action LIKE '%carbon%' OR al.action LIKE '%CARBON%' OR al.action LIKE '%emission%' OR al.action LIKE '%CIP%' OR al.entity_type = 'carbon_credit'
                   ORDER BY al.timestamp DESC LIMIT 15`;
            recent_activity = orgId
                ? await db.prepare(q).all(orgId)
                : await db.prepare(q).all();
            recent_activity = recent_activity || [];
        } catch (_) { }

        // ── Regulatory status ───────────────────────────────────────
        let regulatory = {};
        try {
            regulatory = carbonEngine.assessRegulatory(scopeData, [], []);
        } catch (_) { }

        // ── Carbon intensity (per product average) ──────────────────
        const total_emissions = scopeData?.total_emissions_kgCO2e || 0;
        const carbon_intensity = products.length > 0
            ? (total_emissions / products.length).toFixed(2)
            : 0;

        // Map scope_1/scope_2/scope_3 from engine to consistent client format
        const s1 = scopeData?.scope_1 || {};
        const s2 = scopeData?.scope_2 || {};
        const s3 = scopeData?.scope_3 || {};

        // Determine ESG grade from product rankings
        const rankings = scopeData?.product_rankings || [];
        const avgGrade = rankings.length > 0 ? rankings[0].grade : null;
        const esgGrade = total_emissions === 0 ? 'N/A'
            : total_emissions < 1000 ? 'A' : total_emissions < 5000 ? 'B'
                : total_emissions < 20000 ? 'C' : total_emissions < 50000 ? 'D' : 'F';

        res.json({
            // KPIs
            total_emissions_kgCO2e: total_emissions,
            total_emissions_tCO2e: (total_emissions / 1000).toFixed(3),
            carbon_intensity_per_product: parseFloat(carbon_intensity),
            scope_breakdown: {
                scope1: { kgCO2e: s1.total || 0, percentage: s1.pct || 0, label: s1.label || 'Direct Manufacturing' },
                scope2: { kgCO2e: s2.total || 0, percentage: s2.pct || 0, label: s2.label || 'Energy & Warehousing' },
                scope3: { kgCO2e: s3.total || 0, percentage: s3.pct || 0, label: s3.label || 'Transport & Distribution' },
            },
            esg_grade: esgGrade,

            // Credits
            credits_minted,
            credits_pending,
            credits_retired,
            credits_total_tCO2e: parseFloat(total_tCO2e.toFixed(3)),

            // Simulations
            simulations_total,
            simulations_eligible,

            // Maturity
            maturity_level: maturity.current?.level || 0,
            maturity_name: maturity.current?.name || 'Not Assessed',
            maturity_next: maturity.next?.name || null,

            // Regulatory
            regulatory_frameworks: regulatory.frameworks || [],
            regulatory_compliant: (regulatory.frameworks || []).filter(f => f.status === 'compliant').length,
            regulatory_total: (regulatory.frameworks || []).length,

            // Activity
            recent_activity,

            // Counts
            products_tracked: products.length,
            shipments_tracked: shipments.length,
        });
    } catch (err) {
        console.error('[carbon-officer] Dashboard error:', err);
        res.status(500).json({ error: 'Carbon dashboard failed' });
    }
});

module.exports = router;
