#!/bin/bash
# Second pass — fix remaining broken lines
set -e

FILES_AND_LINES=(
    "/opt/trustchecker/server/routes/scm-carbon-credit.js:177"
    "/opt/trustchecker/server/routes/scm-carbon.js:1068"
    "/opt/trustchecker/server/routes/scm-ml-engine.js:122"
    "/opt/trustchecker/server/routes/scm-tracking.js:127"
    "/opt/trustchecker/server/routes/scm-risk-model.js:61"
    "/opt/trustchecker/server/routes/identity.js:38"
    "/opt/trustchecker/server/routes/products.js:145"
    "/opt/trustchecker/server/routes/stakeholder.js:205"
    "/opt/trustchecker/server/routes/kyc.js:111"
    "/opt/trustchecker/server/routes/scm-forensic.js:95"
    "/opt/trustchecker/server/routes/scm-supply-routes.js:93"
    "/opt/trustchecker/server/routes/scm-logistics.js:36"
    "/opt/trustchecker/server/routes/billing.js:122"
    "/opt/trustchecker/server/engines/lrgf-engine.js:247"
)

FIXED=0
for entry in "${FILES_AND_LINES[@]}"; do
    FILE="${entry%%:*}"
    LINE="${entry##*:}"
    LINE_CONTENT=$(sed -n "${LINE}p" "$FILE")
    
    if echo "$LINE_CONTENT" | grep -qE '\);[[:space:]]*$'; then
        sed -i "${LINE}s/);$/]);/" "$FILE"
        FIXED=$((FIXED + 1))
    elif echo "$LINE_CONTENT" | grep -qE '\));[[:space:]]*$'; then
        sed -i "${LINE}s/));$/]));/" "$FILE"
        FIXED=$((FIXED + 1))
    fi
done
echo "Pass 2: Fixed $FIXED lines"

# Now iteratively fix until all pass or no more progress
for PASS in 3 4 5 6 7 8; do
    STILL_BROKEN=0
    FIXED=0
    for entry in "${FILES_AND_LINES[@]}"; do
        FILE="${entry%%:*}"
        if ! node --check "$FILE" 2>/dev/null; then
            # Get error line
            ERR_LINE=$(node --check "$FILE" 2>&1 | grep -oP ':\K\d+' | head -1)
            if [ -n "$ERR_LINE" ]; then
                ERR_CONTENT=$(sed -n "${ERR_LINE}p" "$FILE")
                if echo "$ERR_CONTENT" | grep -qE '\);[[:space:]]*$'; then
                    sed -i "${ERR_LINE}s/);$/]);/" "$FILE"
                    FIXED=$((FIXED + 1))
                elif echo "$ERR_CONTENT" | grep -qE '\));[[:space:]]*$'; then
                    sed -i "${ERR_LINE}s/));$/]));/" "$FILE"
                    FIXED=$((FIXED + 1))
                fi
            fi
            STILL_BROKEN=$((STILL_BROKEN + 1))
        fi
    done
    echo "Pass $PASS: Fixed $FIXED, Still broken: $STILL_BROKEN"
    if [ $FIXED -eq 0 ]; then
        break
    fi
done

echo ""
echo "=== FINAL STATUS ==="
for entry in "${FILES_AND_LINES[@]}"; do
    FILE="${entry%%:*}"
    if node --check "$FILE" 2>/dev/null; then
        echo "✅ $(basename $FILE)"
    else
        ERR_LINE=$(node --check "$FILE" 2>&1 | grep -oP ':\K\d+' | head -1)
        echo "❌ $(basename $FILE):$ERR_LINE"
        sed -n "$((ERR_LINE-1)),$((ERR_LINE+1))p" "$FILE" | head -3
    fi
done

# Also check the originally fixed files
echo ""
echo "=== PREVIOUSLY FIXED FILES ==="
for f in anomaly.js qr.js public.js scm-leaks.js sustainability.js support.js evidence.js trust.js scm-integrity.js; do
    FF="/opt/trustchecker/server/routes/$f"
    if [ ! -f "$FF" ]; then
        FF="/opt/trustchecker/server/engines/$f"
    fi
    if [ -f "$FF" ]; then
        if node --check "$FF" 2>/dev/null; then
            echo "✅ $f"
        else
            echo "❌ $f"
        fi
    fi
done
