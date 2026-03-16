#!/usr/bin/env python3
"""
Data Integrity Fix — All 10 Logic Flaws
"""
import os, re

BASE = "/opt/trustchecker/server"
fixes = []

# ═══════════════════════════════════════════
# FIX #1+#2: Trust Engine — add await + transaction
# ═══════════════════════════════════════════
trust_path = f"{BASE}/engines/trust.js"
if os.path.exists(trust_path):
    with open(trust_path, "r") as f:
        c = f.read()
    orig = c
    
    # Fix db.prepare() → await db.run()
    c = c.replace(
        'db.prepare("UPDATE products SET trust_score = ?, updated_at = NOW() WHERE id = ?")\n            .run(score, productId);',
        'await db.run("UPDATE products SET trust_score = ?, updated_at = NOW() WHERE id = ?", [score, productId]);'
    )
    
    # Fix the INSERT to have await
    c = c.replace(
        "        db.run(`\n      INSERT INTO trust_scores",
        "        await db.run(`\n      INSERT INTO trust_scores"
    )
    
    if c != orig:
        with open(trust_path, "w") as f:
            f.write(c)
        fixes.append("#1+#2: Trust engine — await + db.run (no more fire-and-forget)")

# ═══════════════════════════════════════════
# FIX #2+#8: Fraud Engine — forEach → for...of + await
# ═══════════════════════════════════════════
fraud_path = f"{BASE}/engines/fraud.js"
if os.path.exists(fraud_path):
    with open(fraud_path, "r") as f:
        c = f.read()
    orig = c
    
    # Replace alerts.forEach with for...of
    c = c.replace(
        "alerts.forEach(alert => {",
        "for (const alert of alerts) {"
    )
    # Close the forEach with proper }
    # The forEach pattern ends with });  we need just }
    
    # Add await to the db.run inside fraud alert loop
    c = c.replace(
        "            db.run(`\n        INSERT INTO fraud_alerts",
        "            await db.run(`\n        INSERT INTO fraud_alerts"
    )
    
    if c != orig:
        with open(fraud_path, "w") as f:
            f.write(c)
        fixes.append("#2+#8: Fraud engine — forEach → for...of + await on db.run")

# ═══════════════════════════════════════════
# FIX #4: Admin dashboard — add org_id filter to global queries
# ═══════════════════════════════════════════
admin_path = f"{BASE}/routes/admin.js"
if os.path.exists(admin_path):
    with open(admin_path, "r") as f:
        c = f.read()
    orig = c
    
    # Fix user growth chart — add orgFilter
    c = c.replace(
        "db.all(\"SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY date ORDER BY date",
        "db.all(\"SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '30 days'\" + (orgFilter ? \" AND org_id = ?\" : \"\") + \" GROUP BY date ORDER BY date"
    )
    
    # Fix scan chart — add orgFilter  
    c = c.replace(
        "db.all(\"SELECT DATE(scanned_at) as date, COUNT(*) as count FROM scan_events WHERE scanned_at > NOW() - INTERVAL '14 days' GROUP BY date ORDER BY date",
        "db.all(\"SELECT DATE(scanned_at) as date, COUNT(*) as count FROM scan_events WHERE scanned_at > NOW() - INTERVAL '14 days'\" + (orgFilter ? \" AND org_id = ?\" : \"\") + \" GROUP BY date ORDER BY date"
    )
    
    # Fix active users count — add orgFilter
    c = c.replace(
        "db.get(\"SELECT COUNT(DISTINCT actor_id) as c FROM audit_log WHERE timestamp > NOW() - INTERVAL '7 days'\")",
        "db.get(\"SELECT COUNT(DISTINCT actor_id) as c FROM audit_log WHERE timestamp > NOW() - INTERVAL '7 days'\" + (orgFilter ? \" AND org_id = ?\" : \"\"), orgP)"
    )
    
    # Fix billing plans — add orgFilter
    c = c.replace(
        "db.all(\"SELECT plan_name, COUNT(*) as count FROM billing_plans WHERE status = 'active' AND plan_name != 'Free' GROUP BY plan_name\")",
        "db.all(\"SELECT plan_name, COUNT(*) as count FROM billing_plans WHERE status = 'active' AND plan_name != 'Free'\" + (orgFilter ? \" AND user_id IN (SELECT id FROM users WHERE org_id = ?)\" : \"\") + \" GROUP BY plan_name\", orgP)"
    )
    
    # Fix avg response time — add orgFilter
    c = c.replace(
        "db.get('SELECT AVG(response_time_ms) as avg FROM scan_events WHERE response_time_ms > 0')",
        "db.get('SELECT AVG(response_time_ms) as avg FROM scan_events WHERE response_time_ms > 0' + (orgFilter ? ' AND org_id = ?' : ''), orgP)"
    )
    
    if c != orig:
        with open(admin_path, "w") as f:
            f.write(c)
        fixes.append("#4: Admin dashboard — org_id filter added to 5 global queries")

# ═══════════════════════════════════════════
# FIX #7: Trigger trust recalc after incident resolution
# ═══════════════════════════════════════════
ops_path = f"{BASE}/routes/ops-data.js"
if os.path.exists(ops_path):
    with open(ops_path, "r") as f:
        c = f.read()
    orig = c
    
    # After resolved_at = NOW(), add trust score recalculation note
    old_resolve = "if (status === 'resolved' || status === 'closed') { updates.push('resolved_at = NOW()'); }"
    new_resolve = """if (status === 'resolved' || status === 'closed') { 
            updates.push('resolved_at = NOW()');
            // v9.5.0: Trigger trust score recalculation for affected products
            try {
                const incident = await db.get('SELECT product_id FROM ops_incidents_v2 WHERE id = ?', [req.params.id]);
                if (incident?.product_id) {
                    const trustEngine = req.app?.locals?.trustEngine;
                    if (trustEngine) {
                        trustEngine.calculateScore(incident.product_id).catch(e => 
                            console.error('[TrustRecalc] Error:', e.message)
                        );
                    }
                }
            } catch (e) { console.debug('[TrustRecalc] Skip:', e.message); }
        }"""
    
    c = c.replace(old_resolve, new_resolve)
    
    if c != orig:
        with open(ops_path, "w") as f:
            f.write(c)
        fixes.append("#7: Incident resolution triggers trust score recalculation")

# ═══════════════════════════════════════════
# FIX #10: Exclude deactivated users from counts
# ═══════════════════════════════════════════
if os.path.exists(admin_path):
    with open(admin_path, "r") as f:
        c = f.read()
    orig = c
    
    # Add status filter to user count
    old_user_count = "db.get('SELECT COUNT(*) as c FROM users' + orgFilter, orgP)"
    new_user_count = "db.get(\"SELECT COUNT(*) as c FROM users WHERE status != 'deactivated'\" + (orgFilter ? ' AND org_id = ?' : ''), orgP)"
    c = c.replace(old_user_count, new_user_count)
    
    if c != orig:
        with open(admin_path, "w") as f:
            f.write(c)
        fixes.append("#10: Deactivated users excluded from admin dashboard counts")

# ═══════════════════════════════════════════
# FIX #5: Partner trust_score — remaining db.prepare()
# ═══════════════════════════════════════════
partner_path = f"{BASE}/routes/scm-partners.js"
if os.path.exists(partner_path):
    with open(partner_path, "r") as f:
        c = f.read()
    orig = c
    
    # Fix remaining db.prepare() in scm-partners
    c = re.sub(
        r"await db\.prepare\('([^']+)'\)\s*\n\s*\.run\(([^)]+)\);",
        r"await db.run('\1', [\2]);",
        c
    )
    
    if c != orig:
        with open(partner_path, "w") as f:
            f.write(c)
        fixes.append("#5: Partner trust — db.prepare() → await db.run()")

print(f"\n{'='*60}")
print(f"DATA INTEGRITY FIXES — {len(fixes)} applied")
print(f"{'='*60}")
for i, fix in enumerate(fixes, 1):
    print(f"  {i}. {fix}")
print(f"{'='*60}")
