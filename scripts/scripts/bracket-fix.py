#!/usr/bin/env python3
"""
Fix missing closing ] in db.run/db.get/db.all parameter arrays.
The issue: db.prepare('SQL').run(a, b, c) → db.run('SQL', [a, b, c)  (missing ])
Fix: find db.run/get/all calls with [params) and add the missing ]
"""
import os, re, glob, subprocess

BASE = "/opt/trustchecker/server"
fixed = []

all_js = glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js")

for fpath in all_js:
    if fpath.endswith(".unused"):
        continue
    
    # Check syntax first
    result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
    if result.returncode == 0:
        continue  # Already valid
    
    with open(fpath, "r") as f:
        lines = f.readlines()
    
    original_lines = lines[:]
    changed = False
    
    # Strategy: For each line in the file, look for db.run/get/all calls
    # that have an opening [ but the closing ] is missing before );
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts a db.run/get/all call with [
        if re.search(r'db\.(run|get|all)\(', line) and '[' in line:
            # Count brackets from this line forward to find the end
            bracket_count = 0
            paren_count = 0
            start_i = i
            found_open_bracket = False
            
            for j in range(i, min(i+10, len(lines))):
                for ch in lines[j]:
                    if ch == '[':
                        bracket_count += 1
                        found_open_bracket = True
                    elif ch == ']':
                        bracket_count -= 1
                
                # Check if this line ends with ); where brackets are unbalanced
                stripped = lines[j].rstrip()
                if stripped.endswith(');') and found_open_bracket and bracket_count > 0:
                    # Missing ] — add it before );
                    lines[j] = lines[j].rstrip('\n').rstrip()
                    # Replace the last ); with ]);
                    if lines[j].endswith(');'):
                        lines[j] = lines[j][:-2] + ']);\n'
                        changed = True
                        bracket_count -= 1
                    break
                elif stripped.endswith('));') and found_open_bracket and bracket_count > 0:
                    # Pattern like JSON.stringify(...))); — needs ] before ));
                    lines[j] = lines[j].rstrip('\n').rstrip()
                    lines[j] = lines[j][:-3] + ']));\n'
                    changed = True
                    bracket_count -= 1
                    break
        
        # Also fix inline patterns like: ..., [uuidv4(), key, value); }
        if re.search(r'\[.*\);\s*\}', line) and line.count('[') > line.count(']'):
            # Missing ] before );
            line_new = re.sub(r'(\);\s*\})', r']\1', line, count=1)
            if line_new != line:
                lines[i] = line_new
                changed = True
        
        # Fix: ...(violations || [).length
        if re.search(r'\|\|\s*\[(?!\])\)', lines[i]):
            lines[i] = re.sub(r'\|\|\s*\[\)', r'|| [])', lines[i])
            changed = True
        
        # Fix: currentWeights[k) → currentWeights[k]
        # Math.round(losses[idx) → Math.round(losses[idx])
        lines[i] = re.sub(r'(\w+)\[(\w+)\)', r'\1[\2])', lines[i])
        if lines[i] != original_lines[i]:
            changed = True
        
        # Fix: JSON.stringify(signals || [) → JSON.stringify(signals || [])
        lines[i] = re.sub(r'JSON\.stringify\((\w+)\s*\|\|\s*\[\)', r'JSON.stringify(\1 || [])', lines[i])
        if lines[i] != original_lines[i]:
            changed = True
            
        i += 1
    
    if changed:
        with open(fpath, "w") as f:
            f.writelines(lines)
        
        # Verify
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
print(f"BRACKET FIX: {ok} fixed, {fail} remaining")
for f in fixed:
    print(f"  {f}")
print(f"{'='*60}")
