#!/bin/bash
# Direct per-file fixes for each broken line
# Pattern: every line ending with ); that should end with ]);

# The fix is simple: on each specific line, replace ); with ]);
# These line numbers came from our syntax checker

# anomaly.js:50 - ends with ]);  needs: already has JSON.stringify...));
# All of these end with ); and need ]); added

FILES_AND_LINES=(
    "/opt/trustchecker/server/routes/anomaly.js:50"
    "/opt/trustchecker/server/routes/scm-carbon-credit.js:172"
    "/opt/trustchecker/server/routes/scm-carbon.js:1010"
    "/opt/trustchecker/server/routes/qr.js:344"
    "/opt/trustchecker/server/routes/scm-ml-engine.js:46"
    "/opt/trustchecker/server/routes/scm-tracking.js:35"
    "/opt/trustchecker/server/routes/scm-risk-model.js:55"
    "/opt/trustchecker/server/routes/public.js:470"
    "/opt/trustchecker/server/routes/identity.js:38"
    "/opt/trustchecker/server/routes/products.js:145"
    "/opt/trustchecker/server/routes/stakeholder.js:130"
    "/opt/trustchecker/server/routes/kyc.js:99"
    "/opt/trustchecker/server/routes/scm-forensic.js:90"
    "/opt/trustchecker/server/routes/scm-leaks.js:42"
    "/opt/trustchecker/server/routes/scm-supply-routes.js:52"
    "/opt/trustchecker/server/routes/sustainability.js:51"
    "/opt/trustchecker/server/routes/support.js:29"
    "/opt/trustchecker/server/routes/evidence.js:355"
    "/opt/trustchecker/server/routes/scm-logistics.js:29"
    "/opt/trustchecker/server/routes/billing.js:49"
    "/opt/trustchecker/server/routes/fraud.js:71"
    "/opt/trustchecker/server/engines/lrgf-engine.js:185"
    "/opt/trustchecker/server/engines/trust.js:101"
    "/opt/trustchecker/server/routes/scm-integrity.js:534"
)

FIXED=0
for entry in "${FILES_AND_LINES[@]}"; do
    FILE="${entry%%:*}"
    LINE="${entry##*:}"
    
    if [ ! -f "$FILE" ]; then
        echo "SKIP: $FILE not found"
        continue
    fi
    
    # Get the line content
    LINE_CONTENT=$(sed -n "${LINE}p" "$FILE")
    
    # Check if this line ends with ); (possibly with whitespace)
    if echo "$LINE_CONTENT" | grep -q ');$\|);[[:space:]]*$'; then
        # Replace the LAST ); with ]); on this specific line
        sed -i "${LINE}s/);$/]);/" "$FILE"
        FIXED=$((FIXED + 1))
    elif echo "$LINE_CONTENT" | grep -q '));$\|));[[:space:]]*$'; then
        # Replace )); with ])); on this line
        sed -i "${LINE}s/));$/]));/" "$FILE"
        FIXED=$((FIXED + 1))
    else
        echo "SKIP: $FILE:$LINE - doesn't end with ); or ));"
        echo "  Content: $LINE_CONTENT"
    fi
done

echo ""
echo "Fixed $FIXED lines"

# Now check for any additional broken lines in the same files
echo ""
echo "=== SYNTAX CHECK ==="
STILL_BROKEN=0
for entry in "${FILES_AND_LINES[@]}"; do
    FILE="${entry%%:*}"
    if [ ! -f "$FILE" ]; then continue; fi
    if ! node --check "$FILE" 2>/dev/null; then
        STILL_BROKEN=$((STILL_BROKEN + 1))
        # Get the new error line
        NODE_ERR=$(node --check "$FILE" 2>&1 | grep -oP ':\K\d+' | head -1)
        echo "❌ $(basename $FILE):$NODE_ERR"
    else
        echo "✅ $(basename $FILE)"
    fi
done

echo ""
echo "Still broken: $STILL_BROKEN"
