#!/usr/bin/env python3
"""
Direct line-specific fix for all remaining broken files.
For each file, find all db.run/get/all calls, track [ balance,
and add ] where missing before the closing );
"""
import os, re, glob, subprocess

BASE = "/opt/trustchecker/server"

all_js = glob.glob(f"{BASE}/routes/*.js") + glob.glob(f"{BASE}/engines/*.js")
fixed = 0
still_broken = 0

for fpath in all_js:
    if fpath.endswith(".unused"):
        continue
    
    result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
    if result.returncode == 0:
        continue
    
    with open(fpath, "r") as f:
        content = f.read()
    
    # Replace ALL occurrences of the broken pattern:
    # db.run(`SQL`, [param1, param2, ..., paramN); → db.run(`SQL`, [param1, param2, ..., paramN]);
    # This is a multi-line pattern so we need to work with the full content
    
    # Strategy: Find each db.run/get/all call, extract the full call region,
    # check bracket balance, fix if needed
    
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Look for db.run/get/all opening
        match = re.search(r'(?:await\s+)?db\.(run|get|all)\(', line)
        if match:
            # Scan from this line forward to find the end of the call
            # Track paren depth and bracket depth
            paren_depth = 0
            bracket_depth = 0
            start_i = i
            call_complete = False
            
            for j in range(i, min(i + 20, len(lines))):
                for k, ch in enumerate(lines[j]):
                    if ch == '(':
                        paren_depth += 1
                    elif ch == ')':
                        paren_depth -= 1
                    elif ch == '[':
                        bracket_depth += 1
                    elif ch == ']':
                        bracket_depth -= 1
                    
                    # Check if call is complete (paren_depth back to 0)
                    # BUT brackets are unbalanced
                    if paren_depth == 0 and j >= start_i:
                        if bracket_depth > 0:
                            # Missing ] — need to insert ] before this )
                            # Find the position of this closing )
                            line_content = lines[j]
                            # We need to add ] before the matched )
                            # Find the character position
                            new_line = line_content[:k] + ']' + line_content[k:]
                            lines[j] = new_line
                            bracket_depth -= 1
                        call_complete = True
                        break
                
                if call_complete:
                    i = j + 1
                    break
            else:
                i += 1
        else:
            i += 1
    
    new_content = '\n'.join(lines)
    
    if new_content != content:
        with open(fpath, "w") as f:
            f.write(new_content)
        
        result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
        if result.returncode == 0:
            fixed += 1
            print(f"✅ {os.path.basename(fpath)}")
        else:
            still_broken += 1
            match = re.search(r':(\d+)', result.stderr)
            linenum = int(match.group(1)) if match else 0
            print(f"❌ {os.path.basename(fpath)}:{linenum}")
            if linenum:
                with open(fpath, "r") as ff:
                    ls = ff.readlines()
                st = max(0, linenum-2)
                for k in range(st, min(len(ls), linenum+1)):
                    pfx = ">>>" if k+1 == linenum else "   "
                    print(f"  {pfx} {k+1}: {ls[k].rstrip()}")

print(f"\n{'='*60}")
print(f"Fixed: {fixed}, Still broken: {still_broken}")
print(f"{'='*60}")

# Final check
broken_list = []
for fpath in all_js:
    if fpath.endswith(".unused"):
        continue
    result = subprocess.run(["node", "--check", fpath], capture_output=True, text=True)
    if result.returncode != 0:
        broken_list.append(os.path.basename(fpath))
print(f"Total broken files remaining: {len(broken_list)}")
if broken_list:
    for b in broken_list:
        print(f"  {b}")
