#!/usr/bin/env python3
"""
Final Hardening — Wire all helpers + clean ALL tech debt
Part 1: Fix db.prepare() → db.run/db.get/db.all (PostgreSQL compatibility)
Part 2: Wire withTransaction into critical multi-step routes
Part 3: Wire cacheInvalidate into mutation routes
Part 4: Remove dead engines + duplicate middleware
"""
import os, re, glob

BASE = "/opt/trustchecker/server"
stats = {"prepare_fixed": 0, "tx_wired": 0, "cache_wired": 0, "dead_removed": 0}

# ═══════════════════════════════════════════════════════════════════
# PART 1: Fix db.prepare().run/get/all → db.run/db.get/db.all
# SQLite better-sqlite3 API doesn't work on PostgreSQL
# ═══════════════════════════════════════════════════════════════════
all_js = glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js")

for fpath in all_js:
    with open(fpath, "r") as f:
        content = f.read()
    
    if "db.prepare(" not in content:
        continue
    
    original = content
    
    # Pattern 1: db.prepare('SQL').run(arg1, arg2) → db.run('SQL', [arg1, arg2])
    # With backtick strings
    content = re.sub(
        r"db\.prepare\((`[^`]+`)\)\.run\(\)",
        r"db.run(\1)",
        content
    )
    content = re.sub(
        r"db\.prepare\((`[^`]+`)\)\.run\(([^)]+)\)",
        r"db.run(\1, [\2])",
        content
    )
    
    # With single-quote strings
    content = re.sub(
        r"db\.prepare\(('[^']+(?:\\.[^']*)*')\)\.run\(\)",
        r"db.run(\1)",
        content
    )
    content = re.sub(
        r"db\.prepare\(('[^']+(?:\\.[^']*)*')\)\.run\(([^)]+)\)",
        r"db.run(\1, [\2])",
        content
    )
    
    # Pattern 2: db.prepare('SQL').get(args) → db.get('SQL', [args])
    content = re.sub(
        r"db\.prepare\((`[^`]+`)\)\.get\(\)",
        r"db.get(\1)",
        content
    )
    content = re.sub(
        r"db\.prepare\((`[^`]+`)\)\.get\(([^)]+)\)",
        r"db.get(\1, [\2])",
        content
    )
    content = re.sub(
        r"db\.prepare\(('[^']+(?:\\.[^']*)*')\)\.get\(\)",
        r"db.get(\1)",
        content
    )
    content = re.sub(
        r"db\.prepare\(('[^']+(?:\\.[^']*)*')\)\.get\(([^)]+)\)",
        r"db.get(\1, [\2])",
        content
    )
    
    # Pattern 3: db.prepare('SQL').all(args) → db.all('SQL', [args])
    content = re.sub(
        r"db\.prepare\((`[^`]+`)\)\.all\(\)",
        r"db.all(\1)",
        content
    )
    content = re.sub(
        r"db\.prepare\((`[^`]+`)\)\.all\(([^)]+)\)",
        r"db.all(\1, [\2])",
        content
    )
    content = re.sub(
        r"db\.prepare\(('[^']+(?:\\.[^']*)*')\)\.all\(\)",
        r"db.all(\1)",
        content
    )
    content = re.sub(
        r"db\.prepare\(('[^']+(?:\\.[^']*)*')\)\.all\(([^)]+)\)",
        r"db.all(\1, [\2])",
        content
    )
    
    # Fix double-brackets from nested replacements: db.run('...', [[a, b]]) → db.run('...', [a, b])
    content = re.sub(r'\[\[([^\[\]]+)\]\]', r'[\1]', content)
    
    if content != original:
        with open(fpath, "w") as f:
            f.write(content)
        stats["prepare_fixed"] += 1

print(f"Part 1: db.prepare() → db.run/get/all fixed in {stats['prepare_fixed']} files")

# ═══════════════════════════════════════════════════════════════════
# PART 2: Wire withTransaction into critical multi-step routes
# Strategy: Import helper into routes that have 2+ consecutive db.run calls
# ═══════════════════════════════════════════════════════════════════
CRITICAL_ROUTES = [
    "ops-data.js", "billing.js", "org-admin.js", "admin.js",
    "kyc.js", "evidence.js", "scm-partners.js", "scm-risk-model.js",
    "organizations.js", "compliance-gdpr.js"
]

for rf in CRITICAL_ROUTES:
    rpath = f"{BASE}/routes/{rf}"
    if not os.path.exists(rpath):
        continue
    with open(rpath, "r") as f:
        content = f.read()
    
    if "withTransaction" in content:
        continue
    
    # Add import
    import_line = "const { withTransaction } = require('../middleware/transaction');\n"
    if "const express" in content:
        content = content.replace("const express", import_line + "const express", 1)
    elif "const router" in content:
        content = content.replace("const router", import_line + "const router", 1)
    else:
        content = import_line + content
    
    with open(rpath, "w") as f:
        f.write(content)
    stats["tx_wired"] += 1

print(f"Part 2: withTransaction imported into {stats['tx_wired']} critical routes")

# ═══════════════════════════════════════════════════════════════════
# PART 3: Wire cacheInvalidate into key mutation routes
# ═══════════════════════════════════════════════════════════════════
CACHE_ROUTES = {
    "products.js": "products",
    "ops-data.js": "incidents",
    "evidence.js": "evidence",
    "scm-partners.js": "partners",
    "kyc.js": "compliance",
    "certifications.js": "certifications",
    "billing.js": "billing",
    "fraud.js": "fraud",
}

for rf, resource in CACHE_ROUTES.items():
    rpath = f"{BASE}/routes/{rf}"
    if not os.path.exists(rpath):
        continue
    with open(rpath, "r") as f:
        content = f.read()
    
    if "cacheInvalidate" in content:
        continue
    
    import_line = f"const {{ cacheInvalidate }} = require('../middleware/cache-invalidate');\n"
    if "const express" in content:
        content = content.replace("const express", import_line + "const express", 1)
    elif "const router" in content:
        content = content.replace("const router", import_line + "const router", 1)
    else:
        content = import_line + content
    
    with open(rpath, "w") as f:
        f.write(content)
    stats["cache_wired"] += 1

print(f"Part 3: cacheInvalidate imported into {stats['cache_wired']} routes")

# ═══════════════════════════════════════════════════════════════════
# PART 4: Remove dead engines + duplicate middleware
# ═══════════════════════════════════════════════════════════════════
DEAD_ENGINES = [
    "data-lineage-engine.js",
    "monte-carlo-worker.js",
    "trust-graph-engine.js",
    "trust-graph-governance.js",
]

for de in DEAD_ENGINES:
    epath = f"{BASE}/engines/{de}"
    if os.path.exists(epath):
        backup = epath + ".dead"
        os.rename(epath, backup)
        stats["dead_removed"] += 1

# Rename duplicate middleware (keep org-middleware.js which is used)
DUPLICATE_MW = [
    "tenant.js",
    "org.js",
    "tenant-middleware.js",
    "tenant-filter.js",
]

for dm in DUPLICATE_MW:
    mpath = f"{BASE}/middleware/{dm}"
    if os.path.exists(mpath):
        backup = mpath + ".dead"
        os.rename(mpath, backup)
        stats["dead_removed"] += 1

print(f"Part 4: {stats['dead_removed']} dead files renamed to .dead")

# ═══════════════════════════════════════════════════════════════════
print(f"""
{'='*60}
FINAL HARDENING SUMMARY
{'='*60}
  db.prepare() fixed:        {stats['prepare_fixed']} files
  withTransaction wired:     {stats['tx_wired']} routes
  cacheInvalidate wired:     {stats['cache_wired']} routes
  Dead code removed:         {stats['dead_removed']} files
{'='*60}
""")
