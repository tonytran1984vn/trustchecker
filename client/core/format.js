/**
 * Shared Number & Currency Formatting Utilities
 * ═══════════════════════════════════════════════
 * System-wide standard:
 *   66596       → 66,596
 *   320000      → 320K
 *   1500000     → 1.5M
 *   1234567890  → 1.2B
 *   $4500       → $4,500
 *   $320000     → $320K
 */

/**
 * Format a number with commas or abbreviation.
 * Under 100K → comma separated (66,596)
 * 100K+      → abbreviated (320K, 1.5M, 2.3B)
 * @param {number} v
 * @returns {string}
 */
export function fmtNum(v) {
    if (v == null || isNaN(v)) return '—';
    v = Number(v);
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 100000) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    if (v >= 1000) return v.toLocaleString('en-US');
    return String(v);
}

/**
 * Format currency with $ prefix.
 * Under $100K → $66,596
 * $100K+     → $320K, $1.5M, $2.3B
 * @param {number} v
 * @returns {string}
 */
export function fmtUSD(v) {
    if (v == null || isNaN(v)) return '$0';
    v = Number(v);
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 100000) return '$' + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    if (v >= 1000) return '$' + v.toLocaleString('en-US');
    return '$' + v;
}

/**
 * Format percentage with 1 decimal if needed.
 * @param {number} v
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function fmtPct(v, decimals = 1) {
    if (v == null || isNaN(v)) return '0%';
    return Number(v).toFixed(decimals).replace(/\.0+$/, '') + '%';
}

// Global access for non-module pages
if (typeof window !== 'undefined') {
    window.fmtNum = fmtNum;
    window.fmtUSD = fmtUSD;
    window.fmtPct = fmtPct;
}
