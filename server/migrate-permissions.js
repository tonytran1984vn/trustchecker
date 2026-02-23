/**
 * Phase 4 Migration Script — requireRole → requirePermission
 * Run: node server/migrate-permissions.js
 *
 * This applies a rules-based replacement across all route files.
 */
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'routes');

// ═══════════════════════════════════════════════════════════════
// MIGRATION RULES
// Maps: requireRole('role') → requirePermission('resource:action')
// For each route file, we define what permission replaces what role.
// ═══════════════════════════════════════════════════════════════

const FILE_RULES = {
    // ─── admin.js ─────────────────────────────────────────────
    'admin.js': {
        importReplace: true, // replace requireRole import with requirePermission
        globalGuard: 'requirePermission(\'tenant:user_create\')', // router.use() guard
        lineRules: [], // all routes already guarded by router.use
    },

    // ─── products.js ──────────────────────────────────────────
    'products.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('product:create')", context: "router.post('/'," },
            { from: "requireRole('operator')", to: "requirePermission('product:update')", context: "router.put('/:id'" },
            { from: "requireRole('operator')", to: "requirePermission('product:create')", context: "generate-code" },
            { from: "requireRole('admin')", to: "requirePermission('product:delete')", context: "router.delete" },
            { from: "requireRole('admin')", to: "requirePermission('product:view')", context: "deletion-history" },
        ],
    },

    // ─── evidence.js ──────────────────────────────────────────
    'evidence.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('evidence:upload')" },
            { from: "requireRole('operator')", to: "requirePermission('evidence:verify')", context: "batch-verify" },
        ],
    },

    // ─── reports.js ───────────────────────────────────────────
    'reports.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('report:view')", context: "scan-report" },
            { from: "requireRole('manager')", to: "requirePermission('report:view')", context: "fraud-report" },
            { from: "requireRole('manager')", to: "requirePermission('report:view')", context: "product-report" },
            { from: "requireRole('admin')", to: "requirePermission('report:export')", context: "compliance-report" },
            { from: "requireRole('manager')", to: "requirePermission('report:view')", context: "supply-chain-report" },
            { from: "requireRole('admin')", to: "requirePermission('report:export')", context: "financial-report" },
            { from: "requireRole('manager')", to: "requirePermission('report:export')", context: "export/:entity" },
        ],
    },

    // ─── organizations.js ─────────────────────────────────────
    'organizations.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('tenant:settings_update')", context: "router.put('/'," },
            { from: "requireRole('admin')", to: "requirePermission('tenant:user_create')", context: "/invite" },
            { from: "requireRole('admin')", to: "requirePermission('tenant:user_delete')", context: "router.delete" },
            { from: "requireRole('admin')", to: "requirePermission('tenant:settings_update')", context: "/provision" },
        ],
    },

    // ─── anomaly.js ───────────────────────────────────────────
    'anomaly.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('anomaly:create')", context: "/scan" },
            { from: "requireRole('manager')", to: "requirePermission('anomaly:resolve')", context: "/resolve" },
            { from: "requireRole('manager')", to: "requirePermission('anomaly:view')", context: "/stats" },
        ],
    },

    // ─── compliance-gdpr.js ───────────────────────────────────
    'compliance-gdpr.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('compliance:manage')" },
        ],
    },

    // ─── email.js ─────────────────────────────────────────────
    'email.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('notification:manage')" },
        ],
    },

    // ─── notifications.js ─────────────────────────────────────
    'notifications.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('notification:manage')" },
        ],
    },

    // ─── stakeholder.js ───────────────────────────────────────
    'stakeholder.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('stakeholder:manage')" },
        ],
    },

    // ─── scm-partners.js ─────────────────────────────────────
    'scm-partners.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('partner:create')" },
            { from: "requireRole('manager')", to: "requirePermission('partner:verify')", context: "/verify" },
        ],
    },

    // ─── scm-inventory.js ─────────────────────────────────────
    'scm-inventory.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('inventory:create')" },
            { from: "requireRole('manager')", to: "requirePermission('inventory:update')", context: "status" },
        ],
    },

    // ─── scm-leaks.js ─────────────────────────────────────────
    'scm-leaks.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('leak_monitor:create')" },
            { from: "requireRole('operator')", to: "requirePermission('leak_monitor:view')" },
        ],
    },

    // ─── scm-tracking.js ─────────────────────────────────────
    'scm-tracking.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('supply_chain:create')" },
        ],
    },

    // ─── scm-logistics.js ─────────────────────────────────────
    'scm-logistics.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('logistics:create')" },
            { from: "requireRole('manager')", to: "requirePermission('logistics:manage')" },
        ],
    },

    // ─── scm-trustgraph.js ────────────────────────────────────
    'scm-trustgraph.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('trustgraph:generate')" },
        ],
    },

    // ─── scm-risk-radar.js ────────────────────────────────────
    'scm-risk-radar.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('risk_radar:view')" },
            { from: "requireRole('operator')", to: "requirePermission('risk_radar:view')" },
        ],
    },

    // ─── scm-carbon.js ────────────────────────────────────────
    'scm-carbon.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('esg:create')" },
            { from: "requireRole('manager')", to: "requirePermission('esg:manage')" },
        ],
    },

    // ─── scm-digital-twin.js ──────────────────────────────────
    'scm-digital-twin.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('digital_twin:create')" },
            { from: "requireRole('manager')", to: "requirePermission('digital_twin:simulate')" },
        ],
    },

    // ─── scm-epcis.js ─────────────────────────────────────────
    'scm-epcis.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('epcis:create')" },
        ],
    },

    // ─── scm-advanced-ai.js ───────────────────────────────────
    'scm-advanced-ai.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('ai_analytics:view')" },
        ],
    },

    // ─── sustainability.js ────────────────────────────────────
    'sustainability.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('sustainability:create')" },
            { from: "requireRole('manager')", to: "requirePermission('sustainability:manage')" },
        ],
    },

    // ─── billing.js ───────────────────────────────────────────
    'billing.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('billing:manage')" },
        ],
    },

    // ─── branding.js ──────────────────────────────────────────
    'branding.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('settings:update')" },
        ],
    },

    // ─── wallet-payment.js ────────────────────────────────────
    'wallet-payment.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('wallet:manage')" },
        ],
    },

    // ─── webhooks.js ──────────────────────────────────────────
    'webhooks.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('webhook:manage')" },
        ],
    },

    // ─── support.js ───────────────────────────────────────────
    'support.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('tenant:user_create')" },
        ],
    },

    // ─── nft.js ───────────────────────────────────────────────
    'nft.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('operator')", to: "requirePermission('nft:mint')" },
        ],
    },

    // ─── kyc.js ───────────────────────────────────────────────
    'kyc.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('manager')", to: "requirePermission('kyc:verify')" },
            { from: "requireRole('operator')", to: "requirePermission('kyc:create')" },
        ],
    },

    // ─── system.js ────────────────────────────────────────────
    'system.js': {
        importReplace: true,
        lineRules: [
            { from: "requireRole('admin')", to: "requirePermission('settings:update')" },
        ],
    },
};

// ═══════════════════════════════════════════════════════════════
// MIGRATION ENGINE
// ═══════════════════════════════════════════════════════════════

let totalFiles = 0;
let totalReplacements = 0;

for (const [fileName, rules] of Object.entries(FILE_RULES)) {
    const filePath = path.join(ROUTES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skip: ${fileName} not found`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;

    // 1. Replace import line: add requirePermission alongside requireRole
    if (rules.importReplace) {
        // Pattern: { authMiddleware, requireRole } = require('../auth')
        // Replace with: { authMiddleware, requireRole, requirePermission } = require('../auth')
        const importRegex = /\{\s*(.*?)\brequireRole\b(.*?)\}\s*=\s*require\(['"]\.\.\/auth['"]\)/;
        const match = content.match(importRegex);
        if (match) {
            const before = match[1];
            const after = match[2];
            // Check if requirePermission already present
            if (!content.includes('requirePermission')) {
                const newImport = `{ ${before}requireRole, requirePermission${after}} = require('../auth')`;
                content = content.replace(match[0], newImport);
                changes++;
            }
        }
    }

    // 2. Replace router.use() global guard
    if (rules.globalGuard) {
        const guardRegex = /router\.use\(requireRole\(['"]admin['"]\)\);/;
        if (guardRegex.test(content)) {
            content = content.replace(guardRegex, `router.use(${rules.globalGuard});`);
            changes++;
        }
    }

    // 3. Apply line-level rules
    const lines = content.split('\n');
    for (const rule of (rules.lineRules || [])) {
        let applied = false;
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].includes(rule.from)) continue;
            // If context is specified, only match lines that also contain the context
            if (rule.context && !lines[i].includes(rule.context)) continue;
            lines[i] = lines[i].replace(rule.from, rule.to);
            changes++;
            applied = true;
            if (!rule.context) break; // Without context, apply to first match only if AllowMultiple not set
        }
        if (!applied && rule.context) {
            // Try fuzzy: look at surrounding context (± 3 lines)
            for (let i = 0; i < lines.length; i++) {
                if (!lines[i].includes(rule.from)) continue;
                const nearby = lines.slice(Math.max(0, i - 3), i + 4).join(' ');
                if (nearby.includes(rule.context)) {
                    lines[i] = lines[i].replace(rule.from, rule.to);
                    changes++;
                    applied = true;
                    break;
                }
            }
        }
    }

    if (changes > 0) {
        content = lines.join('\n');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${fileName}: ${changes} changes`);
        totalFiles++;
        totalReplacements += changes;
    } else {
        console.log(`⏭️  ${fileName}: no changes needed`);
    }
}

console.log(`\n═══════════════════════════════════════════`);
console.log(`  Migration complete: ${totalFiles} files, ${totalReplacements} replacements`);
console.log(`═══════════════════════════════════════════`);
