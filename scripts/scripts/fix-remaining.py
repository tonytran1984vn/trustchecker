#!/usr/bin/env python3
"""Fix remaining SQLite interval syntax and scheduler BATCH_SIZE"""
import os, re, glob

BASE = "/opt/trustchecker/server"
fixed_files = []

# Pattern: datetime('now', '-N days/hours/minutes')
# PostgreSQL: NOW() - INTERVAL 'N days/hours/minutes'
def fix_sqlite_interval(content):
    # datetime('now', '-30 days') → NOW() - INTERVAL '30 days'
    content = re.sub(
        r"datetime\('now',\s*'(-?\d+)\s*(days?|hours?|minutes?|months?)'\)",
        lambda m: f"NOW() - INTERVAL '{abs(int(m.group(1)))} {m.group(2)}'",
        content
    )
    # datetime('now', '-${var} days') → NOW() - INTERVAL '${var} days' (template literals)
    content = re.sub(
        r"datetime\('now',\s*'-\$\{(.*?)\}\s*(days?|hours?|minutes?)'\)",
        r"NOW() - CAST('\1 \2' AS INTERVAL)",
        content
    )
    # Handle the template literal pattern with parseInt: datetime('now', '-${parseInt(days)} days')
    content = re.sub(
        r"datetime\('now',\s*'-\$\{parseInt\((.*?)\)\}\s*(days?)'\)",
        r"NOW() - CAST(parseInt(\1) || ' \2' AS INTERVAL)",
        content
    )
    # Simpler fix for remaining template literals
    content = re.sub(
        r"datetime\('now',\s*['\"]-(.*?)\s+(days?|hours?|minutes?)['\"]?\)",
        lambda m: f"NOW() - INTERVAL '{m.group(1)} {m.group(2)}'",
        content
    )
    # datetime('now', ?) with parameterized input
    content = re.sub(
        r"datetime\('now',\s*\?\)",
        "NOW() + CAST(? AS INTERVAL)",
        content
    )
    # datetime('now', '-1 hours') style
    content = re.sub(
        r"datetime\('now',\s*'(-\d+)\s+(hours?)'\)",
        lambda m: f"NOW() - INTERVAL '{abs(int(m.group(1)))} {m.group(2)}'",
        content
    )
    return content

for fpath in glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js"):
    with open(fpath, "r") as f:
        content = f.read()
    
    if "datetime(" not in content:
        continue
    
    original = content
    content = fix_sqlite_interval(content)
    
    if content != original:
        with open(fpath, "w") as f:
            f.write(content)
        fixed_files.append(os.path.basename(fpath))

print(f"SQLite intervals fixed in {len(fixed_files)} files: {', '.join(fixed_files)}")

# Fix scheduler _perOrg to include batch throttling
sched = f"{BASE}/engines/scheduler.js"
with open(sched, "r") as f:
    content = f.read()

if "BATCH_SIZE" not in content:
    # The _perOrg function exists — add batch processing inside it
    old_fn = "    async _perOrg(taskName, fn) {"
    if old_fn in content:
        # Find the for loop inside _perOrg and add batch throttling
        old_loop = "            for (const org of orgs) {"
        new_loop = """            const BATCH_SIZE = 50;
            for (let _i = 0; _i < orgs.length; _i++) {
                const org = orgs[_i];
                if (_i > 0 && _i % BATCH_SIZE === 0) {
                    await new Promise(r => setTimeout(r, 100)); // Yield event loop
                }"""
        if old_loop in content:
            content = content.replace(old_loop, new_loop, 1)
            with open(sched, "w") as f:
                f.write(content)
            print("Scheduler BATCH_SIZE throttle added to _perOrg")
        else:
            print("Could not find for loop in _perOrg")
    else:
        print("_perOrg not found")
else:
    print("BATCH_SIZE already present")

# Count remaining datetime calls
remaining = 0
for fpath in glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js"):
    with open(fpath, "r") as f:
        content = f.read()
    remaining += content.count("datetime(")
print(f"Remaining datetime() calls: {remaining}")
