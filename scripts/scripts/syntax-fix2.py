#!/usr/bin/env python3
"""
Fix all syntax errors caused by db.prepare() regex replacement.
The pattern is: function_call(]) → function_call()
The regex incorrectly moved ] into function call parentheses.
"""
import os, re, glob, subprocess

BASE = "/opt/trustchecker/server"
fixed = []

# All broken patterns found:
# uuidv4(]) → uuidv4()
# Date.now(]) → Date.now()  
# JSON.stringify(obj]) → JSON.stringify(obj)
# Math.round(x]) → Math.round(x)
# new Date(]) → new Date()
# req.get('header']) → req.get('header')
# .includes(x]) → .includes(x)
# Number(limit]) → Number(limit)
# .substring(0, 6]) → .substring(0, 6)

all_js = glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js")

for fpath in all_js:
    if fpath.endswith(".unused"):
        continue
    
    with open(fpath, "r") as f:
        content = f.read()
    
    original = content
    
    # Fix pattern: any function call where ] appears right before the closing )
    # This covers uuidv4(]), Date.now(]), etc.
    
    # Pattern 1: word(]) → word()  (empty function calls with stray ])
    content = re.sub(r'(\w+)\(\]\)', r'\1()', content)
    
    # Pattern 2: word(args]) → word(args)  (function calls with args + stray ])
    # JSON.stringify(weights || {}]) → JSON.stringify(weights || {})
    # This is trickier — need to find ] that's incorrectly placed before )
    
    # Strategy: Find lines with db.run/db.get/db.all that have ]) patterns
    # where the ] is NOT part of an array access
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Fix specific patterns we found:
        
        # req.get('xxx']) → req.get('xxx')
        line = re.sub(r"req\.get\('([^']+)'\]\)", r"req.get('\1')", line)
        
        # JSON.stringify(expr]) → JSON.stringify(expr)
        line = re.sub(r'JSON\.stringify\(([^)]*)\]\)', r'JSON.stringify(\1)', line)
        
        # Math.round(expr]) → Math.round(expr)
        line = re.sub(r'Math\.round\(([^)]*)\]\)', r'Math.round(\1)', line)
        line = re.sub(r'Math\.min\(([^)]+)\]\)', r'Math.min(\1)', line)
        
        # Number(expr]) → Number(expr)
        line = re.sub(r'Number\(([^)]*)\]\)', r'Number(\1)', line)
        
        # String(expr]) → String(expr)
        line = re.sub(r'String\(([^)]*)\]\)', r'String(\1)', line)
        
        # .substring(x, y]) → .substring(x, y)
        line = re.sub(r'\.substring\(([^)]*)\]\)', r'.substring(\1)', line)
        
        # .includes(expr]) → .includes(expr)
        line = re.sub(r'\.includes\(([^)]*)\]\)', r'.includes(\1)', line)
        
        # new Date(]) → new Date()
        line = re.sub(r'new Date\(\]\)', 'new Date()', line)
        
        # parseInt(expr]) → parseInt(expr) 
        line = re.sub(r'parseInt\(([^)]*)\]\)', r'parseInt(\1)', line)
        
        # uuidv4(]) → uuidv4() (already handled by pattern 1)
        
        lines[i] = line
    
    content = '\n'.join(lines)
    
    if content != original:
        with open(fpath, "w") as f:
            f.write(content)
        
        # Verify syntax
        result = subprocess.run(
            ["node", "--check", fpath],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            fixed.append(f"✅ {os.path.basename(fpath)}")
        else:
            # Still broken — try more aggressive fix
            err = result.stderr
            match = re.search(r':(\d+)', err)
            linenum = int(match.group(1)) if match else 0
            fixed.append(f"❌ {os.path.basename(fpath)}:{linenum}")
            
            if linenum:
                with open(fpath, "r") as f:
                    lines = f.readlines()
                start = max(0, linenum-2)
                end = min(len(lines), linenum+2)
                print(f"\nStill broken: {os.path.basename(fpath)}:{linenum}")
                for j in range(start, end):
                    prefix = ">>>" if j+1 == linenum else "   "
                    print(f"{prefix} {j+1}: {lines[j].rstrip()}")
    else:
        # Check if it was broken to begin with
        result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
        if result.returncode != 0:
            match = re.search(r':(\d+)', result.stderr)
            linenum = int(match.group(1)) if match else 0
            fixed.append(f"❌ UNCHANGED {os.path.basename(fpath)}:{linenum}")

ok_count = sum(1 for f in fixed if "✅" in f)
fail_count = sum(1 for f in fixed if "❌" in f)
print(f"\n{'='*60}")
print(f"SYNTAX FIX: {ok_count} fixed, {fail_count} remaining")
for f in fixed:
    print(f"  {f}")
print(f"{'='*60}")
