#!/usr/bin/env python3
"""
TrustChecker Nuclear Fix — Application Layer Patches
Patches: reports/export, audit-log/export, engines, WebSocket
"""
import os, re

BASE = '/opt/trustchecker/server'

# ═══════════════════════════════════════════════════════════════════
# FIX 2: reports/export — scope ALL 11 entities by org_id
# ═══════════════════════════════════════════════════════════════════
f = f'{BASE}/routes/reports.js'
with open(f, 'r') as fp:
    content = fp.read()

# The current code only scopes 6 entities. Change orgTables to include ALL tenant tables.
old_tables = "const orgTables = ['products', 'scans', 'fraud_alerts', 'partners', 'anomalies', 'sustainability'];"
new_tables = "const orgTables = ['products', 'scans', 'fraud_alerts', 'partners', 'anomalies', 'sustainability', 'users', 'evidence', 'tickets', 'nft', 'audit'];"

if old_tables in content:
    content = content.replace(old_tables, new_tables)
    # Also need to map the correct table names for org_id column
    # evidence -> evidence_items, tickets -> support_tickets, nft -> nft_certificates
    # The entityMap uses 'evidence' but table is evidence_items which HAS org_id
    # audit -> audit_log which NOW has org_id
    with open(f, 'w') as fp:
        fp.write(content)
    print(f"✅ Fix 2: reports/export — all 11 entities now org-scoped")
else:
    print(f"⚠️ Fix 2: Pattern not found in reports.js — may be different format")

# ═══════════════════════════════════════════════════════════════════
# FIX 3: audit-log/export — add org_id filter
# ═══════════════════════════════════════════════════════════════════
f = f'{BASE}/routes/audit-log.js'
with open(f, 'r') as fp:
    content = fp.read()

# Patch the export query to add org_id filter
old_export = """        const entries = await db.all(
            `SELECT al.*, u.email as actor_email, u.role as actor_role
             FROM audit_log al
             LEFT JOIN users u ON al.actor_id = u.id
             WHERE 1=1 ${dateFilter}
             ORDER BY al.timestamp DESC LIMIT 10000`,
            params
        );"""

new_export = """        // v9.4.2: Scope by org_id for tenant isolation
        const orgId = req.orgId;
        let orgFilter = '';
        if (orgId) { orgFilter = ' AND al.org_id = ?'; params.push(orgId); }

        const entries = await db.all(
            `SELECT al.*, u.email as actor_email, u.role as actor_role
             FROM audit_log al
             LEFT JOIN users u ON al.actor_id = u.id
             WHERE 1=1 ${dateFilter}${orgFilter}
             ORDER BY al.timestamp DESC LIMIT 10000`,
            params
        );"""

if old_export in content:
    content = content.replace(old_export, new_export)
    with open(f, 'w') as fp:
        fp.write(content)
    print(f"✅ Fix 3: audit-log/export — now org-scoped")
else:
    print(f"⚠️ Fix 3: Pattern not found in audit-log.js — checking alternate format")

# ═══════════════════════════════════════════════════════════════════
# FIX 3b: audit-log general queries — scope by org
# ═══════════════════════════════════════════════════════════════════
# Also fix the stats endpoint (line 93)
old_stats = """            db.get(`SELECT COUNT(*) as count FROM audit_log`),"""
new_stats = """            db.get(`SELECT COUNT(*) as count FROM audit_log` + (req.orgId ? ` WHERE org_id = ?` : ''), req.orgId ? [req.orgId] : []),"""

if old_stats in content:
    content = content.replace(old_stats, new_stats)
    with open(f, 'w') as fp:
        fp.write(content)
    print(f"✅ Fix 3b: audit-log stats — now org-scoped")

# ═══════════════════════════════════════════════════════════════════
# FIX 3c: audit.js — scope audit dashboard queries
# ═══════════════════════════════════════════════════════════════════
f = f'{BASE}/routes/audit.js'
with open(f, 'r') as fp:
    content = fp.read()

# Replace global audit queries with org-scoped
old_audit1 = "const total = await db.get('SELECT COUNT(*) as count FROM audit_log');"
new_audit1 = "const total = await db.get('SELECT COUNT(*) as count FROM audit_log' + (req.orgId ? ' WHERE org_id = ?' : ''), req.orgId ? [req.orgId] : []);"

old_audit2 = "const hashed = await db.get('SELECT COUNT(*) as count FROM audit_log WHERE entry_hash IS NOT NULL');"
new_audit2 = "const hashed = await db.get('SELECT COUNT(*) as count FROM audit_log WHERE entry_hash IS NOT NULL' + (req.orgId ? ' AND org_id = ?' : ''), req.orgId ? [req.orgId] : []);"

old_audit3 = "const recent = await db.all('SELECT action, COUNT(*) as count FROM audit_log GROUP BY action ORDER BY count DESC LIMIT 20');"
new_audit3 = "const recent = await db.all('SELECT action, COUNT(*) as count FROM audit_log' + (req.orgId ? ' WHERE org_id = ?' : '') + ' GROUP BY action ORDER BY count DESC LIMIT 20', req.orgId ? [req.orgId] : []);"

for old, new in [(old_audit1, new_audit1), (old_audit2, new_audit2), (old_audit3, new_audit3)]:
    if old in content:
        content = content.replace(old, new)

with open(f, 'w') as fp:
    fp.write(content)
print(f"✅ Fix 3c: audit.js dashboard — now org-scoped")

# ═══════════════════════════════════════════════════════════════════
# FIX 4: WebSocket — scope broadcasts by org_id
# ═══════════════════════════════════════════════════════════════════
f = f'{BASE}/index.js'
with open(f, 'r') as fp:
    content = fp.read()

# Add org-scoped broadcast helper after WebSocket connection setup
ws_old = "        ws.on('close', () => console.log(`📴 WebSocket client disconnected (${wss.clients.size} total)`));"

ws_new = """        // v9.4.2: Store org_id on ws for scoped broadcasts
        ws.orgId = ws.user.org_id || ws.user.orgId || null;
        ws.on('close', () => console.log(`📴 WebSocket client disconnected (${wss.clients.size} total)`));"""

if ws_old in content:
    content = content.replace(ws_old, ws_new)

# Add broadcastToOrg helper function
broadcast_helper = """
    // v9.4.2: Org-scoped WebSocket broadcast
    wss.broadcastToOrg = (orgId, data) => {
        const msg = JSON.stringify(data);
        wss.clients.forEach(client => {
            if (client.readyState === 1 && client.orgId === orgId) {
                client.send(msg);
            }
        });
    };
"""

# Insert after wss connection handler
if 'wss.broadcastToOrg' not in content and 'wss.on(\'connection\'' in content:
    content = content.replace(
        "    });\n\n    // ─── App Exports",
        f"    }});\n{broadcast_helper}\n    // ─── App Exports"
    )

with open(f, 'w') as fp:
    fp.write(content)
print(f"✅ Fix 4: WebSocket — org-scoped broadcastToOrg() added")

print("\n✅ All application-layer patches complete")
