/**
 * TrustChecker – Branding Service (v9.1)
 * White-label dynamic branding management.
 */
import { State } from '../core/state.js';
import { API } from '../core/api.js';

export async function loadBranding() {
    try {
        const data = await API.get('/branding');
        if (data && data.config) {
            State.branding = data.config;
            localStorage.setItem('tc_branding', JSON.stringify(data.config));
            applyBranding(data.config);
        }
    } catch (e) {
        applyBranding(null);
    }
}

// Sanitize URL — only allow http, https, data protocols
function _safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const parsed = new URL(url, window.location.origin);
        if (['http:', 'https:', 'data:'].includes(parsed.protocol)) return parsed.href;
    } catch (_) { }
    return '';
}

export function applyBranding(config) {
    const root = document.documentElement;
    if (!config) return;

    if (config.primary_color) root.style.setProperty('--primary', config.primary_color);
    if (config.accent_color) root.style.setProperty('--accent', config.accent_color);
    if (config.bg_color) root.style.setProperty('--bg-color', config.bg_color);

    if (config.logo_url) {
        const safeLogoUrl = _safeUrl(config.logo_url);
        if (safeLogoUrl) {
            const logoEl = document.querySelector('.logo-icon');
            if (logoEl) {
                logoEl.textContent = ''; // clear existing
                const img = document.createElement('img');
                img.src = safeLogoUrl;
                img.alt = 'Logo';
                img.style.cssText = 'width:32px;height:32px;border-radius:8px';
                logoEl.appendChild(img);
            }
        }
    }

    if (config.app_name) {
        document.title = config.app_name;
        const nameEl = document.querySelector('.logo-text');
        if (nameEl) nameEl.textContent = config.app_name;
    }

    if (config.favicon_url) {
        const safeFaviconUrl = _safeUrl(config.favicon_url);
        if (safeFaviconUrl) {
            let link = document.querySelector('link[rel~="icon"]');
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = safeFaviconUrl;
        }
    }
}
