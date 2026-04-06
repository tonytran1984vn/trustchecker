const { db } = require('../db');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

/**
 * CORE DATA CLASSIFICATION ENGINE
 * Evaluates asset payload against classification rules to derive labels.
 */
class ClassificationEngine {
    constructor() {}

    /**
     * Compute hash of a payload to detect drift
     */
    hashPayload(payload) {
        return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }

    /**
     * Internal generic matcher for rule conditions against a payload.
     * Rules use a simple DSL: { "field": "email", "regex": ".*@.*" }
     * or { "field": "amount", "gt": 10000 }
     */
    _matchCondition(condition, payload) {
        try {
            if (!condition || !payload) return false;

            // Support simple dot-notation for nested fields in payload
            const getValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

            const value = getValue(payload, condition.field);
            if (value === undefined || value === null) return false;

            if (condition.regex) {
                const regex = new RegExp(condition.regex, 'i');
                return regex.test(String(value));
            }
            if (condition.eq !== undefined) return value === condition.eq;
            if (condition.gt !== undefined) return Number(value) > Number(condition.gt);
            if (condition.lt !== undefined) return Number(value) < Number(condition.lt);
            if (condition.contains !== undefined)
                return String(value).toLowerCase().includes(String(condition.contains).toLowerCase());

            return false;
        } catch (error) {
            console.error('ClassificationEngine rule match error:', error);
            return false;
        }
    }

    /**
     * Re-evaluates an asset based on current active rules.
     * @param {string} orgId
     * @param {Object} payload
     * @returns {string[]} matched label IDs
     */
    async evaluateClassification(orgId, payload) {
        // Fetch active rules for the org
        const rules = await prisma.classificationRule.findMany({
            where: { orgId, isActive: true },
            orderBy: { priority: 'asc' },
        });

        const matchedLabels = new Set();

        for (const rule of rules) {
            if (this._matchCondition(rule.condition, payload)) {
                matchedLabels.add(rule.labelId);
            }
        }

        return Array.from(matchedLabels);
    }
}

module.exports = new ClassificationEngine();
