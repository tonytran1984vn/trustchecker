/**
 * Safe HTML Helper — XSS Prevention
 * Use safeHTML() to sanitize user-generated content before inserting into DOM.
 * For static templates, innerHTML is fine. For dynamic data, always use this.
 * 
 * Usage:
 *   import { safeHTML, createSafeElement } from '../core/safe-html.js';
 *   el.innerHTML = `<span>${safeHTML(userName)}</span>`;
 *   // or:
 *   const el = createSafeElement('span', userInput);
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - Untrusted user input
 * @returns {string} HTML-safe string
 */
export function safeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Create a DOM element with safely set text content
 * @param {string} tag - HTML tag name
 * @param {string} text - Untrusted text content
 * @param {Object} attrs - Optional attributes
 * @returns {HTMLElement}
 */
export function createSafeElement(tag, text, attrs = {}) {
    const el = document.createElement(tag);
    el.textContent = text; // textContent is always safe
    for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v);
    }
    return el;
}

/**
 * Sanitize a URL — only allow http/https/mailto protocols
 * Prevents javascript: and data: URI attacks
 */
export function safeURL(url) {
    if (!url) return '#';
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')) {
        return url;
    }
    return '#';
}
