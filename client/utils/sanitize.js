/**
 * TrustChecker – HTML Sanitization Utilities
 * Prevents XSS by escaping user/server data before DOM insertion.
 */

/**
 * Escape HTML special characters to prevent XSS when inserting into innerHTML.
 * Converts: & < > " ' to their HTML entity equivalents.
 * @param {*} str - Value to escape (coerced to string)
 * @returns {string} Escaped HTML string
 */
export function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sanitize a URL — only allow http:, https:, mailto:, and relative paths.
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 * @param {string} url - URL to validate
 * @returns {string} Sanitized URL or empty string if dangerous
 */
export function sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    // Allow relative URLs
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) {
        return trimmed;
    }
    // Allow safe protocols only
    try {
        const parsed = new URL(trimmed, window.location.origin);
        if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
            return trimmed;
        }
    } catch {
        // Invalid URL
    }
    return '';
}

window.escapeHTML = escapeHTML;
window.sanitizeURL = sanitizeURL;
