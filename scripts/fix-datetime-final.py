#!/usr/bin/env python3
"""Fix remaining 17 SQLite datetime calls with escaped quotes and template literals"""
import os, re, glob

BASE = "/opt/trustchecker/server"
fixed_files = []

for fpath in glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js"):
    with open(fpath, "r") as f:
        content = f.read()
    
    if "datetime(" not in content:
        continue
    
    original = content
    
    # Pattern 1: datetime(\\'now\\', ?) → NOW() + CAST(? AS INTERVAL)
    content = content.replace("datetime(\\'now\\', ?)", "NOW() + CAST(? AS INTERVAL)")
    
    # Pattern 2: datetime(\\'now\\') → NOW()
    content = content.replace("datetime(\\'now\\')", "NOW()")
    
    # Pattern 3: datetime(?) → NOW() (for verified_at = datetime(?))
    content = content.replace("datetime(?)", "NOW()")
    
    # Pattern 4: datetime('now', '-${period}') in template literals
    content = re.sub(
        r"datetime\('now',\s*'-\$\{period\}'\)",
        "NOW() - CAST(period || ' days' AS INTERVAL)",
        content
    )
    content = re.sub(
        r"datetime\('now',\s*'-\$\{(.*?)\}'\)",
        r"NOW() - CAST(\1 || ' days' AS INTERVAL)",
        content
    )
    
    if content != original:
        with open(fpath, "w") as f:
            f.write(content)
        fixed_files.append(os.path.basename(fpath))

print(f"Fixed {len(fixed_files)} files: {', '.join(fixed_files)}")

# Final count
remaining = 0
for fpath in glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js"):
    with open(fpath, "r") as f:
        content = f.read()
    c = content.count("datetime(")
    if c > 0:
        remaining += c
        print(f"  {os.path.basename(fpath)}: {c} remaining")
print(f"Total remaining: {remaining}")
