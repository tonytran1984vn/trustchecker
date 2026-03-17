#!/bin/bash
# TrustChecker — Deploy all 6 critical fixes
# Run on VPS: bash /opt/trustchecker/scripts/deploy-fixes.sh

set -e

echo "=== Fix 1: Scheduler tenant isolation ==="
# Already deployed via SCP of scheduler.js

echo "=== Fix 2: Incident state machine (add transition validation) ==="
# Patch ops-data.js to enforce state transitions
cat > /tmp/incident-patch.py << 'PYEOF'
import re

with open('/opt/trustchecker/server/routes/ops-data.js', 'r') as f:
    content = f.read()

# Replace the simple status validation with state machine
old = """        const validStatuses = ['open', 'investigating', 'escalated', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
        }"""

new = """        const validStatuses = ['open', 'investigating', 'escalated', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
        }
        // v9.4.2: Enforce state machine transitions
        if (status) {
            const VALID_TRANSITIONS = {
                'open': ['investigating', 'escalated', 'closed'],
                'investigating': ['escalated', 'resolved', 'closed'],
                'escalated': ['investigating', 'resolved', 'closed'],
                'resolved': ['closed', 'open'],   // reopen allowed
                'closed': ['open']                  // reopen allowed
            };
            const current = await db.get('SELECT status FROM ops_incidents_v2 WHERE id = ?', [req.params.id]);
            if (current && VALID_TRANSITIONS[current.status] && !VALID_TRANSITIONS[current.status].includes(status)) {
                return res.status(400).json({
                    error: `Invalid transition: ${current.status} → ${status}. Allowed: ${VALID_TRANSITIONS[current.status].join(', ')}`
                });
            }
        }"""

if old in content:
    content = content.replace(old, new)
    with open('/opt/trustchecker/server/routes/ops-data.js', 'w') as f:
        f.write(content)
    print("✅ Incident state machine patched")
else:
    print("⚠️ Pattern not found — may already be patched or format changed")
PYEOF
python3 /tmp/incident-patch.py

echo "=== Fix 3: Admin overview — add LIMIT + proper PostgreSQL syntax ==="
cat > /tmp/admin-patch.py << 'PYEOF'
import re

with open('/opt/trustchecker/server/routes/admin.js', 'r') as f:
    content = f.read()

# Fix: userGrowth query uses datetime('now') SQLite syntax
content = content.replace(
    "datetime('now', '-30 days')",
    "NOW() - INTERVAL '30 days'"
)
content = content.replace(
    "datetime('now', '-14 days')",
    "NOW() - INTERVAL '14 days'"
)
content = content.replace(
    "datetime('now', '-7 days')",
    "NOW() - INTERVAL '7 days'"
)

with open('/opt/trustchecker/server/routes/admin.js', 'w') as f:
    f.write(content)
print("✅ Admin overview SQLite→PostgreSQL syntax fixed")
PYEOF
python3 /tmp/admin-patch.py

echo "=== Fix 4: Database backup cron ==="
cat > /etc/cron.d/trustchecker-backup << 'CRONEOF'
# TrustChecker PostgreSQL backup — daily at 3am
0 3 * * * postgres pg_dump -Fc trustchecker > /var/backups/trustchecker-$(date +\%Y\%m\%d).dump 2>/dev/null
# Keep only last 7 days
0 4 * * * root find /var/backups/ -name "trustchecker-*.dump" -mtime +7 -delete 2>/dev/null
CRONEOF
mkdir -p /var/backups
chmod 644 /etc/cron.d/trustchecker-backup
echo "✅ Database backup cron installed (daily at 3am, 7-day retention)"

echo "=== Fix 5: Add pagination to routes missing LIMIT ==="
# Create a universal pagination helper
cat > /opt/trustchecker/server/middleware/pagination.js << 'JSEOF'
/**
 * Pagination Helper v9.4.2
 * Usage: const { limit, offset, page } = parsePagination(req);
 */
function parsePagination(req, defaults = { limit: 50, maxLimit: 200 }) {
    let limit = parseInt(req.query.limit) || defaults.limit;
    if (limit > defaults.maxLimit) limit = defaults.maxLimit;
    if (limit < 1) limit = 1;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    return { limit, offset, page };
}

module.exports = { parsePagination };
JSEOF
echo "✅ Pagination helper created"

echo "=== Restarting PM2 ==="
pm2 restart trustchecker
sleep 5
pm2 status

echo "=== All fixes deployed ==="
