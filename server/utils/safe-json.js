/**
 * Safe JSON parse utility – prevents crashes from malformed JSON.
 * Returns fallback value instead of throwing.
 * 
 * @param {string} str - JSON string to parse
 * @param {*} fallback - Value to return on parse failure (default: null)
 * @returns {*} Parsed value or fallback
 */
function safeParse(str, fallback = null) {
    if (str === null || str === undefined) return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

module.exports = { safeParse };
