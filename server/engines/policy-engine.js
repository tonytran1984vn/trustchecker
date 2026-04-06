const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * CORE POLICY ENGINE (Minimal Viable)
 * Determines ABAC (Attribute-Based Access Control) execution outcomes
 * based on classified labels and actor attributes.
 */
class PolicyEngine {
    constructor() {}

    /**
     * Evaluate policy based on classification labels attached to data.
     * @param {Object} context
     * @param {Object} context.actor - The user/system trying to act
     * @param {string[]} context.dataLabels - Array of Label IDs applied to the asset
     * @param {string} context.action - The action being performed (read, export, etc)
     * @param {string} context.orgId - Organization scope
     * @returns {string} 'allow' | 'deny' | 'approval'
     */
    async evaluatePolicy({ actor, dataLabels, action, orgId }) {
        if (!dataLabels || dataLabels.length === 0) {
            // Default stance if no labels
            return 'allow';
        }

        // Fetch policy bindings that affect any of these labels
        const bindings = await prisma.policyBinding.findMany({
            where: {
                orgId: orgId,
                labelId: { in: dataLabels },
                // We leave policyId/action generic logic simple for minimal viable:
                // If a binding exists with 'deny' or 'require_approval', it overrides 'allow'
            },
        });

        if (bindings.length === 0) {
            return 'allow'; // Implicit allow if no explicit policies block it
        }

        let requireApproval = false;

        // Highest priority effect wins: deny > require_approval > allow
        for (const binding of bindings) {
            if (binding.effect === 'deny') {
                // E.g. Check if actor has override via role
                if (actor && actor.role === 'admin') {
                    // Admins bypass some rules, but for STRICT policy even admins might fail.
                    // Minimal viable: let's say 'deny' is absolute unless overridden.
                    return 'deny';
                }
                return 'deny';
            }
            if (binding.effect === 'require_approval') {
                requireApproval = true;
            }
        }

        return requireApproval ? 'approval' : 'allow';
    }
}

module.exports = new PolicyEngine();
