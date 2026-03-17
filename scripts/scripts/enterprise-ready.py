#!/usr/bin/env python3
"""
Enterprise Readiness — #1 Secrets, #3 Auth on org-integrations
"""
import os

BASE = "/opt/trustchecker"
fixes = []

# ═══════════════════════════════════════════
# #1: Move secrets to env vars
# ═══════════════════════════════════════════
eco_path = f"{BASE}/ecosystem.config.js"
if os.path.exists(eco_path):
    with open(eco_path, "r") as f:
        c = f.read()
    orig = c
    
    # Replace hardcoded secrets with process.env references
    c = c.replace(
        "DATABASE_URL: 'postgresql://trustchecker:TrustChecker2026@localhost:5432/trustchecker'",
        "DATABASE_URL: process.env.DATABASE_URL || 'postgresql://trustchecker:TrustChecker2026@localhost:5432/trustchecker'"
    )
    c = c.replace(
        "JWT_SECRET: 'tc-jwt-secret-2026-production-key-v9'",
        "JWT_SECRET: process.env.JWT_SECRET || 'tc-jwt-secret-2026-production-key-v9'"
    )
    c = c.replace(
        "ENCRYPTION_KEY: 'tc-encryption-key-32chars-prod-v9!!'",
        "ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'tc-encryption-key-32chars-prod-v9!!'"
    )
    
    if c != orig:
        with open(eco_path, "w") as f:
            f.write(c)
        fixes.append("#1: Secrets now use process.env with fallback (set env vars to override)")

# Create .env file for production secrets
env_path = f"{BASE}/.env"
if not os.path.exists(env_path):
    import secrets
    jwt_secret = secrets.token_urlsafe(48)
    enc_key = secrets.token_urlsafe(24)[:32]
    
    with open(env_path, "w") as f:
        f.write(f"""# TrustChecker Production Secrets
# Generated: 2026-03-14
# DO NOT COMMIT THIS FILE TO GIT

DATABASE_URL=postgresql://trustchecker:cccec19776a0a1262067a8fc7058aa18@localhost:5432/trustchecker
JWT_SECRET={jwt_secret}
ENCRYPTION_KEY={enc_key}
NODE_ENV=production
PORT=4000
SENTRY_DSN=
""")
    os.chmod(env_path, 0o600)
    fixes.append("#1: .env file created with secure random secrets (chmod 600)")

# Add .env to .gitignore
gi_path = f"{BASE}/.gitignore"
if os.path.exists(gi_path):
    with open(gi_path, "r") as f:
        gi = f.read()
    if ".env" not in gi:
        with open(gi_path, "a") as f:
            f.write("\n# Secrets\n.env\n.env.*\n")
        fixes.append("#1: .env added to .gitignore")
else:
    with open(gi_path, "w") as f:
        f.write("node_modules/\n.env\n.env.*\n*.log\n")
    fixes.append("#1: .gitignore created with .env exclusion")

# ═══════════════════════════════════════════
# #3: Add auth to org-integrations.js
# ═══════════════════════════════════════════
oi_path = f"{BASE}/server/routes/org-integrations.js"
if os.path.exists(oi_path):
    with open(oi_path, "r") as f:
        c = f.read()
    if "authMiddleware" not in c:
        # Add auth import and router.use
        lines = c.split('\n')
        last_require = 0
        for i, line in enumerate(lines):
            if "require(" in line and not line.strip().startswith("//"):
                last_require = i
        
        lines.insert(last_require + 1, "const { authMiddleware, requirePermission } = require('../auth');")
        
        # Add router.use(authMiddleware) after router creation
        for i, line in enumerate(lines):
            if "express.Router()" in line:
                lines.insert(i + 1, "router.use(authMiddleware);")
                break
        
        c = '\n'.join(lines)
        with open(oi_path, "w") as f:
            f.write(c)
        fixes.append("#3: org-integrations.js — authMiddleware added (was unprotected)")

print(f"\n{'='*60}")
print(f"ENTERPRISE READINESS — {len(fixes)} applied")
print(f"{'='*60}")
for i, fix in enumerate(fixes, 1):
    print(f"  {i}. {fix}")
print(f"{'='*60}")
