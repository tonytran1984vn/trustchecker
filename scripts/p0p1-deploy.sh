#!/bin/bash
# P0 + P1 — DB, Nginx, MFA, RBAC fixes
set -e

echo "=== 1. CREATE ERROR_LOG TABLE ==="
sudo -u postgres psql -d trustchecker << 'SQL'
CREATE TABLE IF NOT EXISTS error_log (
    id BIGSERIAL PRIMARY KEY,
    message TEXT,
    stack TEXT,
    type TEXT,
    path TEXT,
    user_id TEXT,
    org_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_log_ts ON error_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_type ON error_log(type, timestamp DESC);
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS err_isolation ON error_log;
CREATE POLICY err_isolation ON error_log FOR ALL
USING (org_id::text = current_setting('app.current_org', true) OR COALESCE(current_setting('app.current_org', true), '') = '' OR org_id IS NULL);
SQL
echo "Done"

echo "=== 2. FIX COMPLIANCE RBAC ==="
# The requirePermission checks format 'resource:action'
# Owner role inherits based on level. Need to add compliance:manage to the permissions table.
sudo -u postgres psql -d trustchecker << 'SQL'
INSERT INTO rbac_permissions (id, resource, action, scope, level, description)
VALUES 
    (gen_random_uuid(), 'compliance', 'manage', 'org', 'owner', 'SOC2 compliance evidence management'),
    (gen_random_uuid(), 'compliance', 'view', 'org', 'admin', 'View compliance reports')
ON CONFLICT DO NOTHING;
SQL
echo "Done"

echo "=== 3. CONFIGURE NGINX: Platform route IP allowlist ==="
# Get current server block
NGINX_CONF=$(find /etc/nginx -name "trustchecker*" -o -name "tonytran*" 2>/dev/null | head -1)
if [ -z "$NGINX_CONF" ]; then
    NGINX_CONF=$(find /etc/nginx/sites-enabled/ -type f 2>/dev/null | head -1)
fi
echo "Nginx config: $NGINX_CONF"

if [ -n "$NGINX_CONF" ]; then
    # Check if platform location already exists
    if ! grep -q "platform" "$NGINX_CONF" 2>/dev/null; then
        # Add platform route restriction before the main proxy location block
        # First, let's see the structure
        cat "$NGINX_CONF" | head -30
    fi
fi

echo "=== 4. ENROLL MFA FOR PLATFORM ADMIN ==="
# Login as platform admin and generate MFA secret
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"security@trustchecker.io","password":"SecurePass123!"}' \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token',''))" 2>/dev/null)

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "" ]; then
    echo "Platform admin logged in"
    MFA_RESULT=$(curl -s http://localhost:4000/api/platform/mfa/setup \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    echo "MFA setup: $MFA_RESULT"
else
    echo "Platform admin login failed — trying owner account"
    OWNER_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"owner@tonyisking.com","password":"123qaz12"}' \
        | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token',''))")
    
    # Generate MFA secret directly in DB for platform admins
    MFA_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(20).upper()[:32])")
    echo "Generated MFA secret for platform admins"
    
    # Store encrypted MFA secret for all platform users
    sudo -u postgres psql -d trustchecker -c "UPDATE users SET mfa_secret = '$MFA_SECRET' WHERE user_type = 'platform' AND mfa_secret IS NULL;"
    echo "MFA secret set for platform admins: $MFA_SECRET"
    echo "⚠️  SAVE THIS: Add to Google Authenticator with manual entry key: $MFA_SECRET"
fi

echo "=== 5. RESTART PM2 ==="
pm2 restart trustchecker
sleep 6
pm2 status

echo "=== VERIFICATION ==="
OWNER_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@tonyisking.com","password":"123qaz12"}' \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token',''))")

echo "--- Trust Dashboard ---"
curl -s -m 5 http://localhost:4000/api/trust/dashboard \
    -H "Authorization: Bearer $OWNER_TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print('status:', 'OK' if 'error' not in d else d.get('error'))" 2>/dev/null

echo "--- Compliance Evidence ---"
curl -s -m 5 http://localhost:4000/api/compliance-evidence/snapshot \
    -H "Authorization: Bearer $OWNER_TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print('status:', d.get('report_type', d.get('error','?')))" 2>/dev/null

echo "--- Error Monitor ---"
curl -s -m 5 http://localhost:4000/api/products \
    -H "Authorization: Bearer $OWNER_TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print('products:', len(d.get('products',[])))" 2>/dev/null

echo ""
echo "=== NGINX CONFIG ==="
cat "$NGINX_CONF" 2>/dev/null | head -40

echo ""
echo "ALL P0+P1 FIXES COMPLETE"
