/**
 * TrustChecker – i18n Service (v9.2)
 * Internationalization: English (default) + Vietnamese.
 */

let locale = localStorage.getItem('tc_locale') || 'en';
let translations = {};
let _loaded = false;

/**
 * Initialize i18n — loads the JSON file for the current locale.
 */
export async function initI18n() {
    try {
        const res = await fetch(`./i18n/${locale}.json`);
        if (res.ok) {
            translations = await res.json();
            _loaded = true;
        }
    } catch (e) {
        console.warn('[i18n] Could not load locale:', locale, e.message);
        translations = {};
    }
}

/**
 * Translate a key. Supports {{param}} interpolation.
 * Falls back to key itself if not found.
 * 
 * Usage: t('nav.dashboard') → "Dashboard" or "Bảng điều khiển"
 *        t('upgrade.plan_needed', { plan: 'Pro' }) → "This feature requires the Pro plan."
 */
export function t(key, params = {}) {
    let str = translations[key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{{${k}}}`, v);
    }
    return str;
}

/**
 * Get current locale
 */
export function getLocale() {
    return locale;
}

/**
 * Switch locale and reload translations.
 */
export async function setLocale(lang) {
    locale = lang;
    localStorage.setItem('tc_locale', lang);
    await initI18n();
    // Re-render after locale change
    const { render } = await import('../core/state.js');
    render();
}

/**
 * Check if i18n is loaded
 */
export function isI18nLoaded() {
    return _loaded;
}

window.t = t;
window.setLocale = setLocale;
