/**
 * TrustChecker — HTML Escape Utility
 * Prevents XSS when rendering dynamic data in template literals.
 */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ESC_MAP[c]);
}

export function escapeObj(obj, maxLen = 80) {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'object') return escapeHTML(JSON.stringify(obj).slice(0, maxLen));
    return escapeHTML(String(obj));
}
