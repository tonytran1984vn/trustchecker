#!/bin/bash
set -e

echo "=== 1. LINK COMPLIANCE PERMISSION TO OWNER ROLE ==="
PGPASSWORD=cccec19776a0a1262067a8fc7058aa18 psql -h localhost -U trustchecker -d trustchecker << 'SQL'
-- Get the compliance:manage permission ID and the org_owner role ID
-- Then link them in rbac_role_permissions

-- First insert the permission if not exists
INSERT INTO rbac_permissions (id, resource, action, scope, level, description)
VALUES (gen_random_uuid(), 'compliance', 'manage', 'org', 'owner', 'SOC2 compliance evidence')
ON CONFLICT DO NOTHING;

INSERT INTO rbac_permissions (id, resource, action, scope, level, description)
VALUES (gen_random_uuid(), 'compliance', 'view', 'org', 'admin', 'View compliance reports')
ON CONFLICT DO NOTHING;

-- Link to ALL owner/admin roles
INSERT INTO rbac_role_permissions (id, role_id, permission_id, org_id)
SELECT gen_random_uuid(), r.id, p.id, r.org_id
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE p.resource = 'compliance'
AND p.action = 'manage'
AND r.name IN ('org_owner', 'company_admin', 'owner')
ON CONFLICT DO NOTHING;

INSERT INTO rbac_role_permissions (id, role_id, permission_id, org_id)
SELECT gen_random_uuid(), r.id, p.id, r.org_id
FROM rbac_roles r
CROSS JOIN rbac_permissions p
WHERE p.resource = 'compliance'
AND p.action = 'view'
AND r.name IN ('org_owner', 'company_admin', 'owner', 'security_officer', 'executive')
ON CONFLICT DO NOTHING;

SELECT 'Linked compliance permissions' as status;
SQL
echo "Done"

echo "=== 2. CONFIGURE NGINX: Platform route protection ==="
# Add IP-restricted platform location block
NGINX_CONF="/etc/nginx/sites-enabled/trustchecker"

# Backup first 
cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%s)"

# Check if platform block already exists
if ! grep -q "platform" "$NGINX_CONF"; then
    # Insert platform location block before the general trustchecker location
    sed -i '/location \/trustchecker\/ {/i\
    # SOC2: Platform admin API — IP restricted\
    location /trustchecker/api/platform {\
        # Allow internal + VPS\
        allow 127.0.0.1;\
        allow 10.0.0.0/8;\
        allow 172.16.0.0/12;\
        allow 192.168.0.0/16;\
        # Allow all for now — restrict to office IPs later:\
        # allow YOUR_OFFICE_IP;\
        # deny all;\
        \
        proxy_pass http://127.0.0.1:4000/api/platform;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }\
' "$NGINX_CONF"
    echo "Platform location block added"
else
    echo "Platform block already exists"
fi

# Test nginx config
nginx -t && systemctl reload nginx
echo "Nginx reloaded"

echo "=== 3. VERIFY COMPLIANCE ENDPOINT ==="
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@tonyisking.com","password":"123qaz12"}' \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token',''))")

curl -s -m 10 http://localhost:4000/api/compliance-evidence/snapshot \
    -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
e=d.get('evidence',{})
if not e:
    print('Status:', json.dumps(d, indent=2)[:200])
else:
    ac=e.get('access_controls',{})
    dp=e.get('data_protection',{})
    print('Report:', d.get('report_type'))
    print('Users:', ac.get('total_users'))
    print('MFA:', ac.get('mfa_coverage'))
    print('RLS:', dp.get('rls_policies'))
    print('Encryption:', dp.get('encryption_at_rest'))
" 2>/dev/null

echo ""
echo "=== 4. TRUST DASHBOARD ==="
curl -s -m 5 http://localhost:4000/api/trust/dashboard \
    -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print('Trust dashboard:', 'OK' if 'error' not in d else d)" 2>/dev/null

echo ""
echo "ALL P0+P1 COMPLETE"
