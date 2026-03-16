#!/usr/bin/env python3
"""
Fix remaining 10 files — all have multi-line db.run/get/all where
the parameter array [... spans multiple lines and is missing the closing ]

Strategy: Find lines ending with ); where there's an unbalanced [ from
a db.run/get/all call above. Add ] before );
"""
import os, re, glob, subprocess

BASE = "/opt/trustchecker/server"
fixed = []

all_js = glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js")

for fpath in all_js:
    if fpath.endswith(".unused"):
        continue
    
    result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
    if result.returncode == 0:
        continue
    
    with open(fpath, "r") as f:
        content = f.read()
    
    original = content
    
    # Strategy: Find all db.run/get/all calls that span multiple lines
    # and fix the bracket balance
    
    # Find patterns like: db.run(`SQL`, [params\n  more_params);
    # And change the ); to ]);
    
    # Multi-line fix: Track bracket depth through db.run calls
    lines = content.split('\n')
    in_db_call = False
    bracket_depth = 0
    db_call_start = -1
    
    for i, line in enumerate(lines):
        # Detect start of db.run/get/all with [
        if re.search(r'(?:await\s+)?db\.(run|get|all)\(', line) and not in_db_call:
            # Count brackets on this line
            for ch in line:
                if ch == '[': bracket_depth += 1
                elif ch == ']': bracket_depth -= 1
            
            if bracket_depth > 0:
                in_db_call = True
                db_call_start = i
            else:
                bracket_depth = 0
            
            # Check if line ends with ); while brackets unbalanced
            stripped = line.rstrip()
            if stripped.endswith(');') and bracket_depth > 0:
                lines[i] = line.rstrip('\n').rstrip()
                lines[i] = lines[i][:-2] + ']);\n'
                bracket_depth -= 1
                in_db_call = False
            continue
        
        if in_db_call:
            # Count brackets
            for ch in line:
                if ch == '[': bracket_depth += 1
                elif ch == ']': bracket_depth -= 1
            
            stripped = line.rstrip()
            
            # End of call: line ends with ); 
            if stripped.endswith(');') and bracket_depth > 0:
                lines[i] = line.rstrip('\n').rstrip()
                lines[i] = lines[i][:-2] + ']);\n'
                bracket_depth -= 1
                in_db_call = False
            elif stripped.endswith('));') and bracket_depth > 0:
                lines[i] = line.rstrip('\n').rstrip()
                lines[i] = lines[i][:-3] + ']));\n'
                bracket_depth -= 1
                in_db_call = False
            elif bracket_depth <= 0:
                in_db_call = False
                bracket_depth = 0
    
    # Also fix specific remaining patterns
    content_new = '\n'.join(lines)
    
    # Fix: JSON.stringify(settings)]]) → JSON.stringify(settings)])
    content_new = content_new.replace(']])', '])')
    
    # Fix: Math.round(losses[losses.length - 1) → Math.round(losses[losses.length - 1])
    content_new = re.sub(r'losses\[losses\.length\s*-\s*1\)', 'losses[losses.length - 1])', content_new)
    
    if content_new != original:
        with open(fpath, "w") as f:
            f.write(content_new)
        
        result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
        if result.returncode == 0:
            fixed.append(f"✅ {os.path.basename(fpath)}")
        else:
            match = re.search(r':(\d+)', result.stderr)
            linenum = int(match.group(1)) if match else 0
            fixed.append(f"❌ {os.path.basename(fpath)}:{linenum}")
            if linenum:
                with open(fpath, "r") as ff:
                    ls = ff.readlines()
                st = max(0, linenum-2)
                print(f"\n{os.path.basename(fpath)}:{linenum}")
                for k in range(st, min(len(ls), linenum+1)):
                    pfx = ">>>" if k+1 == linenum else "   "
                    print(f"{pfx} {k+1}: {ls[k].rstrip()}")

ok = sum(1 for f in fixed if "✅" in f)
fail = sum(1 for f in fixed if "❌" in f)
print(f"\n{'='*60}")
print(f"FINAL FIX: {ok} fixed, {fail} remaining")
for f in fixed:
    print(f"  {f}")
print(f"{'='*60}")

if fail > 0:
    # List all still-broken files
    print("\nAll still-broken files:")
    for fpath in all_js:
        if fpath.endswith(".unused"):
            continue
        result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
        if result.returncode != 0:
            match = re.search(r':(\d+)', result.stderr)
            linenum = int(match.group(1)) if match else 0
            print(f"  {os.path.basename(fpath)}:{linenum}")
