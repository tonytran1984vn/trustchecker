/**
 * server/services/compliance-engine/dsl-compiler.js
 * Lõi Trí Tuệ: Biên dịch JSON Policy -> Hàm Logic (Closure Callable).
 * Cảnh giới Tối Đa: Chống D.O.S Attack bằng Limits và Implicit Fail.
 */

const MAX_NODE_COUNT = 100;

function evaluatePath(obj, path) {
    return path.split('.').reduce((acc, part) => (acc === undefined || acc === null ? undefined : acc[part]), obj);
}

/**
 * Phân Tích Điều kiện Rễ (Root Condition)
 */
function compileCondition(conditionNode, state = { count: 0 }) {
    if (!conditionNode) return () => true;

    state.count++;
    if (state.count > MAX_NODE_COUNT) {
        throw new Error(`DSL Compilation Aborted: Complexity exceeded ${MAX_NODE_COUNT} nodes.`);
    }

    // Leaf Operators
    if ('field' in conditionNode) {
        const fieldData = conditionNode;
        const targetPath = fieldData.field;
        const operator = fieldData.operator;
        const targetValue = fieldData.value;

        return (context, trace) => {
            const runtimeValue = evaluatePath(context, targetPath);

            if (operator === 'EXISTS') {
                return runtimeValue !== undefined && runtimeValue !== null;
            }

            if (runtimeValue === undefined || runtimeValue === null) {
                trace.missing_fields.push(targetPath);
                return 'MISSING';
            }

            if (operator === 'LT_NOW' || operator === 'GT_NOW') {
                const clock = new Date((context.event && context.event.timestamp) || Date.now()).getTime();
                const v = new Date(runtimeValue).getTime();
                if (isNaN(v)) return false;

                if (operator === 'LT_NOW') return v < clock;
                if (operator === 'GT_NOW') return v > clock;
            }

            if (operator === 'EQ') return runtimeValue === targetValue;
            if (operator === 'GT') return runtimeValue > targetValue;
            if (operator === 'LT') return runtimeValue < targetValue;
            if (operator === 'BETWEEN' && Array.isArray(targetValue)) {
                return runtimeValue >= targetValue[0] && runtimeValue <= targetValue[1];
            }

            return false;
        };
    }

    const keys = Object.keys(conditionNode);
    if (keys.length !== 1) {
        throw new Error('Logical DSL Node must have exactly ONE root operator (e.g. AND, OR, NOT)');
    }

    const op = keys[0];

    // Logical Operators
    if (op === 'AND') {
        const compiledChildren = conditionNode.AND.map(child => compileCondition(child, state));
        return (context, trace) => {
            for (const childFn of compiledChildren) {
                const res = childFn(context, trace);
                if (res !== true) return res; // Short-circuit (False hoặc 'MISSING')
            }
            return true;
        };
    }

    if (op === 'OR') {
        const compiledChildren = conditionNode.OR.map(child => compileCondition(child, state));
        return (context, trace) => {
            let hasMissing = false;
            for (const childFn of compiledChildren) {
                const res = childFn(context, trace);
                if (res === true) return true;
                if (res === 'MISSING') hasMissing = true;
            }
            return hasMissing ? 'MISSING' : false;
        };
    }

    if (op === 'NOT') {
        const compiledChild = compileCondition(conditionNode.NOT, state);
        return (context, trace) => {
            const res = compiledChild(context, trace);
            if (res === 'MISSING') return 'MISSING';
            return !res;
        };
    }

    throw new Error(`Unknown Logical DSL root operator: ${op}`);
}

/**
 * Public Interface: Compile Mảng Rules.
 * Trả Hàm Evaluate Toàn Bộ.
 */
function buildEngine(rules) {
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority); // Highest Priority First
    const compiled = sortedRules.map(r => ({
        id: r.rule_id,
        effect: r.effect,
        rejection_reason: r.message,
        evaluate: compileCondition(r.condition),
    }));

    return context => {
        const traceNode = { missing_fields: [], checks: [] };

        for (const rule of compiled) {
            const res = rule.evaluate(context, traceNode);

            if (res === 'MISSING') {
                return {
                    is_allowed: false,
                    rejection_reason: `System Halt: Missing implicit data context [${traceNode.missing_fields.join(',')}]`,
                    violated_rule_ids: [rule.id],
                    trace_log: traceNode,
                };
            }

            if (res === true && rule.effect === 'DENY') {
                // Rớt Do Luật Deny Match
                return {
                    is_allowed: false,
                    rejection_reason: rule.rejection_reason,
                    violated_rule_ids: [rule.id],
                    trace_log: traceNode,
                };
            }
        }

        // Vượt qua Mọi Cửa Ngõ
        return {
            is_allowed: true,
            violated_rule_ids: [],
            trace_log: traceNode,
        };
    };
}

module.exports = {
    buildEngine,
};
