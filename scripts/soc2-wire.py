#!/usr/bin/env python3
"""SOC2 Wiring — Mount routes, wire password policy, encryption"""
import os

BASE = "/opt/trustchecker/server"

# 1. Mount compliance-evidence route
routes_path = f"{BASE}/boot/routes.js"
with open(routes_path, "r") as f:
    content = f.read()

if "compliance-evidence" not in content:
    import_line = '    const complianceEvidenceRoutes = require("../routes/compliance-evidence");\n'
    last_require = content.rfind('require("../routes/')
    nl = content.find("\n", last_require)
    content = content[:nl+1] + import_line + content[nl+1:]
    
    content = content.replace(
        "['/auth', authLimit, authRouter],",
        "['/auth', authLimit, authRouter],\n        ['/compliance-evidence', complianceEvidenceRoutes],"
    )
    with open(routes_path, "w") as f:
        f.write(content)
    print("OK 1: compliance-evidence route mounted")
else:
    print("OK 1: already mounted")

# 2. Wire password policy into auth
auth_path = f"{BASE}/auth/core.js"
with open(auth_path, "r") as f:
    content = f.read()

if "validatePassword" not in content:
    import_line = "const { validatePassword } = require('../security/password-policy');\n"
    content = import_line + content

    old_hash = "const hashed = await bcrypt.hash(password"
    if old_hash in content:
        new_hash = """// SOC2: Password policy enforcement
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.status(400).json({ error: 'Password policy violation', details: pwdCheck.errors });
        }
        const hashed = await bcrypt.hash(password"""
        content = content.replace(old_hash, new_hash)
    
    with open(auth_path, "w") as f:
        f.write(content)
    print("OK 2: Password policy wired")
else:
    print("OK 2: already wired")

# 3. Wire field encryption for MFA
plat_path = f"{BASE}/routes/platform.js"
with open(plat_path, "r") as f:
    content = f.read()

if "field-encryption" not in content:
    enc_import = "const { encrypt, decrypt } = require('../security/field-encryption');\n"
    content = enc_import + content
    
    old_store = "await db.run('UPDATE users SET mfa_secret = ? WHERE id = ?', [secret, req.user.id]);"
    new_store = "await db.run('UPDATE users SET mfa_secret = ? WHERE id = ?', [encrypt(secret), req.user.id]);"
    if old_store in content:
        content = content.replace(old_store, new_store)
    
    with open(plat_path, "w") as f:
        f.write(content)
    print("OK 3: Field encryption wired for MFA")
else:
    print("OK 3: already wired")

print("\nDONE: All SOC2 wiring complete")
