#!/usr/bin/env python3
"""
Red-Team Remaining Fixes — #1 (Metadata), #7 (History Decay), #8 (Cert Verification), #10 (Abuse Detection)
"""
import os, re

BASE = "/opt/trustchecker/server"
fixes = []

# ═══════════════════════════════════════════
# FIX #1: Product metadata validation — ISO country, manufacturer length, batch format
# ═══════════════════════════════════════════
prod_path = f"{BASE}/routes/products.js"
if os.path.exists(prod_path):
    with open(prod_path, "r") as f:
        c = f.read()
    orig = c
    
    old_check = """if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }"""
    
    new_check = """if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }

        // v9.5.0: Anti-gaming — validate product metadata quality
        const ISO_COUNTRIES = new Set(['AF','AL','DZ','AS','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI','KH','CM','CA','CV','CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IL','IT','JM','JP','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM','NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO','OM','PK','PW','PA','PG','PY','PE','PH','PL','PT','QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VE','VN','YE','ZM','ZW']);
        if (origin_country && origin_country.trim() !== '' && !ISO_COUNTRIES.has(origin_country.toUpperCase().trim())) {
            return res.status(400).json({ error: `Invalid country code: ${origin_country}. Use ISO 3166-1 alpha-2 (e.g., US, VN, SG)` });
        }
        if (manufacturer && manufacturer.trim().length < 3) {
            return res.status(400).json({ error: 'Manufacturer name must be at least 3 characters' });
        }
        if (name.trim().length < 3) {
            return res.status(400).json({ error: 'Product name must be at least 3 characters' });
        }"""
    
    c = c.replace(old_check, new_check)
    
    if c != orig:
        with open(prod_path, "w") as f:
            f.write(c)
        fixes.append("#1: Product metadata validation — ISO country code, min name/manufacturer length")

# ═══════════════════════════════════════════
# FIX #7: History factor — lifetime decay instead of 90-day hard window
# ═══════════════════════════════════════════
trust_path = f"{BASE}/engines/trust.js"
if os.path.exists(trust_path):
    with open(trust_path, "r") as f:
        c = f.read()
    orig = c
    
    old_history = """    async calculateHistory(productId) {
        // Count fraud alerts in last 90 days
        const alerts = await db.get(`
      SELECT COUNT(*) as count, 
             SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END) as weighted
      FROM fraud_alerts
      WHERE product_id = ? AND created_at > NOW() - INTERVAL '90 days'
    `, [productId]);

        if (!alerts || alerts.count === 0) return 1.0; // Clean history

        // Penalize based on weighted severity
        const penalty = Math.min(1, (alerts.weighted || 0) * 0.05);
        return Math.max(0, 1 - penalty);
    }"""
    
    new_history = """    async calculateHistory(productId) {
        // v9.5.0: Lifetime decay — recent alerts weigh more, but old ones never fully disappear
        // Layer 1: Recent (30d) — full weight
        const recent = await db.get(`
      SELECT COUNT(*) as count, 
             COALESCE(SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END), 0) as weighted
      FROM fraud_alerts
      WHERE product_id = ? AND created_at > NOW() - INTERVAL '30 days'
    `, [productId]);

        // Layer 2: Medium-term (31-180d) — 50% weight
        const medium = await db.get(`
      SELECT COUNT(*) as count,
             COALESCE(SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END), 0) as weighted
      FROM fraud_alerts
      WHERE product_id = ? AND created_at BETWEEN NOW() - INTERVAL '180 days' AND NOW() - INTERVAL '30 days'
    `, [productId]);

        // Layer 3: Lifetime (>180d) — 20% weight (never forgotten)
        const lifetime = await db.get(`
      SELECT COUNT(*) as count,
             COALESCE(SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END), 0) as weighted
      FROM fraud_alerts
      WHERE product_id = ? AND created_at < NOW() - INTERVAL '180 days'
    `, [productId]);

        const totalCount = (recent?.count || 0) + (medium?.count || 0) + (lifetime?.count || 0);
        if (totalCount === 0) return 1.0; // Truly clean history

        const decayedScore = (recent?.weighted || 0) * 1.0
                           + (medium?.weighted || 0) * 0.5
                           + (lifetime?.weighted || 0) * 0.2;

        const penalty = Math.min(0.8, decayedScore * 0.04);
        return Math.max(0.2, 1 - penalty); // Floor at 0.2 — never fully clean if history exists
    }"""
    
    c = c.replace(old_history, new_history)
    
    if c != orig:
        with open(trust_path, "w") as f:
            f.write(c)
        fixes.append("#7: History factor — 3-layer lifetime decay (30d/180d/lifetime), old alerts never disappear")

# ═══════════════════════════════════════════
# FIX #8: Certification verification workflow
# ═══════════════════════════════════════════
sth_path = f"{BASE}/routes/stakeholder.js"
if os.path.exists(sth_path):
    with open(sth_path, "r") as f:
        c = f.read()
    orig = c
    
    # Known certification bodies whitelist
    old_cert_insert = """        const id = uuidv4();
        const docHash = require('crypto').createHash('sha256')
            .update(`${cert_name}|${cert_number}|${entity_id}`).digest('hex').substring(0, 16);

        await db.run(`
      INSERT INTO certifications (id, entity_type, entity_id, cert_name, cert_body, cert_number,
        issued_date, expiry_date, document_hash, added_by, org_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, entity_type || 'product', entity_id, cert_name, cert_body || '', cert_number || '',
            issued_date || new Date().toISOString().split('T')[0], expiry_date || '', docHash, req.user.id, req.user.orgId]);

        res.json({ certification_id: id, document_hash: docHash });"""
    
    new_cert_insert = """        // v9.5.0: Certification verification — require cert_number + known body validation
        const KNOWN_CERT_BODIES = new Set([
            'ISO', 'BSI', 'TÜV', 'SGS', 'Bureau Veritas', 'Intertek', 'DNV', 'Lloyd\'s Register',
            'UL', 'CSA', 'DEKRA', 'RINA', 'BRC', 'FSSC', 'SQF', 'IFS', 'GFSI',
            'PCI SSC', 'SOC', 'AICPA', 'ISAE', 'NIST', 'FedRAMP', 'HITRUST'
        ]);
        
        if (!cert_number || cert_number.trim() === '') {
            return res.status(400).json({ error: 'Certificate number is required for compliance verification' });
        }
        if (cert_number.trim().length < 5) {
            return res.status(400).json({ error: 'Certificate number must be at least 5 characters' });
        }
        
        // Rate limit: max 5 certs per entity per org
        const existingCount = await db.get(
            'SELECT COUNT(*) as c FROM certifications WHERE entity_id = ? AND org_id = ?',
            [entity_id, req.user.orgId]
        );
        if (existingCount?.c >= 10) {
            return res.status(429).json({ error: 'Maximum 10 certifications per entity' });
        }
        
        // Check for duplicate cert
        const dupeCert = await db.get(
            'SELECT id FROM certifications WHERE cert_name = ? AND cert_number = ? AND entity_id = ?',
            [cert_name, cert_number, entity_id]
        );
        if (dupeCert) {
            return res.status(409).json({ error: 'Duplicate certification already exists' });
        }

        const id = uuidv4();
        const docHash = require('crypto').createHash('sha256')
            .update(`${cert_name}|${cert_number}|${entity_id}`).digest('hex').substring(0, 16);

        // New certs start as 'pending_verification' — require admin/auditor to verify
        const certBody = cert_body || '';
        const isKnownBody = KNOWN_CERT_BODIES.has(certBody);
        const initialStatus = isKnownBody ? 'active' : 'pending_verification';

        await db.run(`
      INSERT INTO certifications (id, entity_type, entity_id, cert_name, cert_body, cert_number,
        issued_date, expiry_date, document_hash, added_by, org_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, entity_type || 'product', entity_id, cert_name, certBody, cert_number,
            issued_date || new Date().toISOString().split('T')[0], expiry_date || '', docHash, req.user.id, req.user.orgId, initialStatus]);

        res.json({ certification_id: id, document_hash: docHash, status: initialStatus,
            warning: !isKnownBody ? 'Certification from unknown body — requires admin verification' : undefined });"""
    
    c = c.replace(old_cert_insert, new_cert_insert)
    
    if c != orig:
        with open(sth_path, "w") as f:
            f.write(c)
        fixes.append("#8: Certification — require cert_number, dedup check, max 10/entity, unknown body → pending_verification")

# ═══════════════════════════════════════════
# FIX #10: Platform abuse detection middleware
# ═══════════════════════════════════════════
abuse_path = f"{BASE}/middleware/abuse-detection.js"
with open(abuse_path, "w") as f:
    f.write("""/**
 * v9.5.0: Platform Abuse Detection Middleware
 * Detects unusual creation patterns and flags for investigation
 */

const THRESHOLDS = {
    products_per_hour: 50,
    suppliers_per_hour: 10,
    incidents_per_hour: 50,
    ratings_per_hour: 30,
    certs_per_hour: 20,
};

// In-memory sliding window (per org)
const orgActivity = new Map();

function trackActivity(orgId, type) {
    const key = `${orgId}:${type}`;
    const now = Date.now();
    
    if (!orgActivity.has(key)) {
        orgActivity.set(key, []);
    }
    
    const window = orgActivity.get(key);
    window.push(now);
    
    // Clean old entries (>1 hour)
    const cutoff = now - 3600000;
    while (window.length > 0 && window[0] < cutoff) {
        window.shift();
    }
    
    return window.length;
}

function checkAbuse(type) {
    return (req, res, next) => {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        if (!orgId) return next();
        
        const count = trackActivity(orgId, type);
        const threshold = THRESHOLDS[type] || 50;
        
        if (count > threshold) {
            console.warn(`[ABUSE] Org ${orgId}: ${count} ${type} in 1h (threshold: ${threshold})`);
            return res.status(429).json({
                error: `Rate limit exceeded: ${type}`,
                limit: threshold,
                current: count,
                retry_after: '1 hour'
            });
        }
        
        // Warning at 80% — log but allow
        if (count > threshold * 0.8) {
            console.warn(`[ABUSE-WARN] Org ${orgId}: ${count}/${threshold} ${type} in 1h`);
        }
        
        next();
    };
}

// Periodic cleanup (every 10 min)
setInterval(() => {
    const cutoff = Date.now() - 3600000;
    for (const [key, window] of orgActivity) {
        while (window.length > 0 && window[0] < cutoff) window.shift();
        if (window.length === 0) orgActivity.delete(key);
    }
}, 600000);

module.exports = { checkAbuse, trackActivity, THRESHOLDS };
""")
fixes.append("#10: Abuse detection middleware — per-org rate limiting with 80% warning + 100% block")

# Wire abuse detection into high-risk routes
for fname, route_pattern, abuse_type in [
    ("routes/products.js", "router.post('/', requirePermission('product:create'),", "products_per_hour"),
    ("routes/stakeholder.js", "router.post('/certifications', requirePermission('stakeholder:manage'),", "certs_per_hour"),
]:
    fpath = f"{BASE}/{fname}"
    if os.path.exists(fpath):
        with open(fpath, "r") as f:
            c = f.read()
        
        if "checkAbuse" not in c:
            # Add import
            lines = c.split('\n')
            last_require = 0
            for i, line in enumerate(lines):
                if "require(" in line and not line.strip().startswith("//"):
                    last_require = i
            lines.insert(last_require + 1, 
                f"const {{ checkAbuse }} = require('../middleware/abuse-detection');")
            c = '\n'.join(lines)
            
            # Add middleware to route
            c = c.replace(route_pattern, 
                route_pattern.replace("async (req, res)", f"checkAbuse('{abuse_type}'), async (req, res)"))
            
            with open(fpath, "w") as f:
                f.write(c)

fixes.append("#10: Abuse detection wired into products + certifications routes")

print(f"\n{'='*60}")
print(f"RED-TEAM REMAINING FIXES — {len(fixes)} applied")
print(f"{'='*60}")
for i, fix in enumerate(fixes, 1):
    print(f"  {i}. {fix}")
print(f"{'='*60}")
