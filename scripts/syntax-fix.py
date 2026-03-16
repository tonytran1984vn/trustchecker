#!/usr/bin/env python3
"""
Fix all db.prepare() regex corruption by checking syntax validity
with Node.js --check and fixing known patterns
"""
import os, re, glob, subprocess

BASE = "/opt/trustchecker/server"
fixed = []

# Walk all routes + engines and syntax-check each
all_js = sorted(glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js"))

for fpath in all_js:
    if fpath.endswith(".unused") or fpath.endswith(".dead"):
        continue
    
    # Quick syntax check
    result = subprocess.run(
        ["node", "--check", fpath],
        capture_output=True, text=True
    )
    
    if result.returncode != 0:
        # File has syntax error — try to fix common patterns
        with open(fpath, "r") as f:
            content = f.read()
        
        original = content
        
        # Fix 1: `, [arg1, arg2, req.get('header']) || ''])` → `, [arg1, arg2, req.get('header') || ''])`
        # The regex added ] inside .get() call creating broken brackets
        # Pattern: wrapped array broke nested function calls
        # Find all `, [` ... `])` blocks and check for unbalanced brackets
        
        # More targeted: find lines with db.run/db.get that have mismatched brackets
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if ('db.run(' in line or 'db.get(' in line or 'db.all(' in line):
                # Count brackets
                opens = line.count('(') + line.count('[')
                closes = line.count(')') + line.count(']')
                if opens != closes:
                    # Try common fix patterns
                    
                    # Pattern: req.get('header']) → req.get('header')
                    line = re.sub(r"req\.get\('([^']+)'\]\)", r"req.get('\1')", line)
                    
                    # Pattern: double closing ]]) → ])
                    line = line.replace("]])", "])")
                    
                    lines[i] = line
        
        content = '\n'.join(lines)
        
        # More aggressive fix: remove the wrapping [] from .run() calls 
        # where the original args already had complex expressions
        # Pattern: db.run('SQL', [arg1, arg2, expr || 'val'])
        # Sometimes the regex double-brackets: db.run('SQL', [[arg1, arg2]])
        content = re.sub(r'\[\[([^\[\]]*)\]\]', r'[\1]', content)
        
        # Fix: `], [` inside a single db.run call → just `, `
        
        if content != original:
            with open(fpath, "w") as f:
                f.write(content)
            
            # Re-check syntax
            result2 = subprocess.run(
                ["node", "--check", fpath],
                capture_output=True, text=True
            )
            if result2.returncode == 0:
                fixed.append(f"FIXED: {os.path.basename(fpath)}")
            else:
                # Extract the specific error line
                err = result2.stderr
                match = re.search(r':(\d+)', err)
                if match:
                    linenum = int(match.group(1))
                    with open(fpath, "r") as f:
                        lines = f.readlines()
                    context = ''.join(lines[max(0,linenum-3):linenum+2])
                    fixed.append(f"STILL_BROKEN: {os.path.basename(fpath)} line {linenum}")
                    print(f"STILL BROKEN: {fpath}:{linenum}")
                    print(context)
                else:
                    fixed.append(f"STILL_BROKEN: {os.path.basename(fpath)}")
        else:
            # Content unchanged but still broken — need manual fix
            err = result.stderr
            match = re.search(r':(\d+)', err)
            linenum = int(match.group(1)) if match else 0
            fixed.append(f"NEEDS_MANUAL: {os.path.basename(fpath)} line {linenum}")
            if linenum:
                with open(fpath, "r") as f:
                    lines = f.readlines()
                start = max(0, linenum-3)
                end = min(len(lines), linenum+2)
                print(f"\nBROKEN: {fpath}:{linenum}")
                for j in range(start, end):
                    prefix = ">>>" if j+1 == linenum else "   "
                    print(f"{prefix} {j+1}: {lines[j].rstrip()}")

total_broken = sum(1 for f in fixed if "BROKEN" in f or "MANUAL" in f)
total_fixed = sum(1 for f in fixed if "FIXED" in f)
print(f"\n{'='*60}")
print(f"Syntax check: {len(fixed)} files had issues")
print(f"  Auto-fixed: {total_fixed}")
print(f"  Still broken: {total_broken}")
for f in fixed:
    print(f"  {f}")
print(f"{'='*60}")
