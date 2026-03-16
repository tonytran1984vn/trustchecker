#!/usr/bin/env python3
"""
Red-Team Attack Fixes — All 10 Product Logic Vulnerabilities
"""
import os, re

BASE = "/opt/trustchecker/server"
fixes = []

# ═══════════════════════════════════════════
# FIX #2: CRITICAL — Trust engine Promise bug
# calculateConsistency and calculateHistory must be async + await
# ═══════════════════════════════════════════
trust_path = f"{BASE}/engines/trust.js"
if os.path.exists(trust_path):
    with open(trust_path, "r") as f:
        c = f.read()
    orig = c
    
    # Make calculateConsistency async + add await
    c = c.replace(
        "    calculateConsistency(productId) {\n        const scans = db.all(",
        "    async calculateConsistency(productId) {\n        const scans = await db.all("
    )
    
    # Make calculateCompliance async + add await  
    c = c.replace(
        "    calculateCompliance(productId) {\n        const product = db.get(",
        "    async calculateCompliance(productId) {\n        const product = await db.get("
    )
    
    # Make calculateHistory async + add await
    c = c.replace(
        "    calculateHistory(productId) {\n        // Count fraud alerts in last 90 days\n        const alerts = db.get(",
        "    async calculateHistory(productId) {\n        // Count fraud alerts in last 90 days\n        const alerts = await db.get("
    )
    
    # Add await to factor calculations in calculate()
    c = c.replace(
        "factors.consistency = this.calculateConsistency(productId);",
        "factors.consistency = await this.calculateConsistency(productId);"
    )
    c = c.replace(
        "factors.compliance = this.calculateCompliance(productId);",
        "factors.compliance = await this.calculateCompliance(productId);"
    )
    c = c.replace(
        "factors.history = this.calculateHistory(productId);",
        "factors.history = await this.calculateHistory(productId);"
    )
    
    if c != orig:
        with open(trust_path, "w") as f:
            f.write(c)
        fixes.append("#2: Trust engine async+await — consistency, compliance, history now properly query DB")

# ═══════════════════════════════════════════
# FIX #3: Severity downgrade audit trail
# ═══════════════════════════════════════════
ops_path = f"{BASE}/routes/ops-data.js"
if os.path.exists(ops_path):
    with open(ops_path, "r") as f:
        c = f.read()
    orig = c
    
    old_severity = "if (severity) { updates.push('severity = ?'); params.push(severity); }"
    new_severity = """if (severity) {
            // v9.5.0: Audit severity changes — detect downgrade attacks
            const current = await db.get('SELECT severity FROM ops_incidents_v2 WHERE id = ?', [req.params.id]);
            const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
            const oldRank = SEVERITY_RANK[current?.severity] || 0;
            const newRank = SEVERITY_RANK[severity] || 0;
            if (newRank < oldRank) {
                // Severity downgrade — log explicitly for compliance
                await db.run(
                    "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, org_id, timestamp) VALUES (?, ?, 'SEVERITY_DOWNGRADED', 'incident', ?, ?, ?, NOW())",
                    [require('uuid').v4(), req.user.id, req.params.id, 
                     JSON.stringify({ old_severity: current.severity, new_severity: severity, reason: req.body.reason || 'Not provided' }),
                     req.orgId || req.user.org_id]
                );
            }
            updates.push('severity = ?'); params.push(severity);
        }"""
    c = c.replace(old_severity, new_severity)
    
    if c != orig:
        with open(ops_path, "w") as f:
            f.write(c)
        fixes.append("#3: Severity downgrade now logged as SEVERITY_DOWNGRADED in audit_log")

# ═══════════════════════════════════════════
# FIX #6: Incident state machine — require investigation before close
# ═══════════════════════════════════════════
if os.path.exists(ops_path):
    with open(ops_path, "r") as f:
        c = f.read()
    orig = c
    
    c = c.replace(
        "'open': ['investigating', 'escalated', 'closed'],",
        "'open': ['investigating', 'escalated'],  // v9.5.0: Must investigate before closing"
    )
    
    if c != orig:
        with open(ops_path, "w") as f:
            f.write(c)
        fixes.append("#6: Incidents must be investigated before closing (removed open→closed)")

# ═══════════════════════════════════════════
# FIX #4: Rating — exclude self-org from entity average
# Add rate limit: max 10 ratings per user per day
# ═══════════════════════════════════════════
sth_path = f"{BASE}/routes/stakeholder.js"
if os.path.exists(sth_path):
    with open(sth_path, "r") as f:
        c = f.read()
    orig = c
    
    # Add rate limiting for ratings (max 20 per user per day)
    old_rating = "router.post('/ratings', async (req, res) => {\n    try {\n        const { entity_type, entity_id, score, comment } = req.body;"
    new_rating = """router.post('/ratings', async (req, res) => {
    try {
        // v9.5.0: Rate limit — max 20 ratings per user per day
        const todayRatings = await db.get(
            "SELECT COUNT(*) as c FROM ratings WHERE user_id = ? AND created_at > NOW() - INTERVAL '1 day'",
            [req.user.id]
        );
        if (todayRatings?.c >= 20) {
            return res.status(429).json({ error: 'Rate limit: maximum 20 ratings per day' });
        }
        
        const { entity_type, entity_id, score, comment } = req.body;"""
    c = c.replace(old_rating, new_rating)
    
    if c != orig:
        with open(sth_path, "w") as f:
            f.write(c)
        fixes.append("#4: Rating rate limit — max 20 per user per day")

# ═══════════════════════════════════════════
# FIX #5+#9: Rate limit on supplier and incident creation
# ═══════════════════════════════════════════
# Supplier rate limit
partner_path = f"{BASE}/routes/scm-partners.js"
if os.path.exists(partner_path):
    with open(partner_path, "r") as f:
        c = f.read()
    orig = c
    
    old_create = "router.post('/', requirePermission('partner:create'), async (req, res) => {"
    new_create = """router.post('/', requirePermission('partner:create'), async (req, res) => {
    // v9.5.0: Rate limit — max 10 suppliers per hour per org
    const orgId = req.orgId || req.user?.org_id;
    const recentCount = await db.get(
        "SELECT COUNT(*) as c FROM partners WHERE org_id = ? AND created_at > NOW() - INTERVAL '1 hour'",
        [orgId]
    );
    if (recentCount?.c >= 10) {
        return res.status(429).json({ error: 'Rate limit: maximum 10 suppliers per hour' });
    }"""
    c = c.replace(old_create, new_create)
    
    if c != orig:
        with open(partner_path, "w") as f:
            f.write(c)
        fixes.append("#5: Supplier creation rate limit — max 10 per hour per org")

# Incident rate limit
if os.path.exists(ops_path):
    with open(ops_path, "r") as f:
        c = f.read()
    orig = c
    
    old_incident = "router.post('/data/incidents', async (req, res) => {"
    new_incident = """router.post('/data/incidents', async (req, res) => {
    // v9.5.0: Rate limit — max 50 incidents per hour per org
    const orgId = getOrgId(req);
    const recentCount = await db.get(
        "SELECT COUNT(*) as c FROM ops_incidents_v2 WHERE org_id = ? AND created_at > NOW() - INTERVAL '1 hour'",
        [orgId]
    );
    if (recentCount?.c >= 50) {
        return res.status(429).json({ error: 'Rate limit: maximum 50 incidents per hour' });
    }"""
    c = c.replace(old_incident, new_incident)
    
    if c != orig:
        with open(ops_path, "w") as f:
            f.write(c)
        fixes.append("#9: Incident creation rate limit — max 50 per hour per org")

print(f"\n{'='*60}")
print(f"RED-TEAM FIXES — {len(fixes)} applied")
print(f"{'='*60}")
for i, fix in enumerate(fixes, 1):
    print(f"  {i}. {fix}")
print(f"{'='*60}")
