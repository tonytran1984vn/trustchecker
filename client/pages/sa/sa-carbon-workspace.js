/**
 * Carbon / CIE Workspace — SA Domain (v4.0 Optimized)
 * Tabs: Carbon Footprint | Carbon Passport | Green Finance | Sustainability | Carbon Registry
 *
 * PERF OPTIMIZATIONS:
 * 1. Dynamic imports: Only Tab 1 code loaded eagerly, tabs 2-5 lazy-loaded on click
 * 2. Phased API loading: Tab 1 bundle fires immediately, 17 other APIs delayed 500ms
 * 3. Unified interface: window._saCarbonReady still resolves with full cache
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

// Tab 1 is the default — load eagerly (only ~27KB)
import { renderPage as renderCarbon } from '../scm/carbon.js?v=4.0';

// Tabs 2-5 — lazy load via dynamic import (only fetched when tab is clicked)
const lazyTab = (loader) => () => loader().then(m => m.renderPage());

// ─── Phased API Prefetch ─────────────────────────────────────
// Phase 1: Critical path (Tab 1 bundle) — fires IMMEDIATELY
// Phase 2: Background (17 APIs for tabs 2-5) — delayed 500ms to yield main thread
if (!window._saCarbonCache) window._saCarbonCache = {};
const cache = window._saCarbonCache;
const _hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));

if (_hasToken && !cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 60000)) {
    cache._loading = true;

    // ── PHASE 1: Critical path — Tab 1 bundle (immediate) ──
    const bundlePromise = API.get('/scm/carbon/bundle').catch(() => null);

    // ── PHASE 2: Background APIs — delayed 500ms ──
    const bgPromise = new Promise(resolve => {
        setTimeout(() => {
            Promise.allSettled([
                // Tab 2: Carbon Passport (4 APIs)
                API.get('/scm/carbon-credit/balance').catch(() => null),
                API.get('/scm/carbon-credit/registry?limit=20').catch(() => null),
                API.get('/scm/carbon-credit/risk-score').catch(() => null),
                API.get('/scm/carbon-credit/market-stats').catch(() => null),
                // Tab 3: Green Finance (4 APIs)
                API.get('/green-finance/credit-score').catch(() => ({})),
                API.get('/green-finance/collateral').catch(() => ({})),
                API.get('/green-finance/instruments').catch(() => ({})),
                API.get('/green-finance/dashboard').catch(() => ({})),
                // Tab 4: Sustainability (2 APIs)
                API.get('/sustainability/stats').catch(() => null),
                API.get('/sustainability/leaderboard').catch(() => null),
                // Tab 5: Registry — single BFF endpoint if available, fallback to 7 calls
                API.get('/hardening/carbon-registry/workspace-init').catch(() => null),
            ]).then(results => {
                const v = results.map(r => r.value);
                cache.carbonCredit = { summary: v[0], passports: v[1], benchmarks: v[2], ingestion: v[3] };
                cache.greenFinance = { score: v[4], collateral: v[5], instruments: v[6], dashboard: v[7] };
                cache.sustainability = { stats: v[8] || {}, scores: v[9]?.leaderboard || [] };
                // BFF returns combined payload, or null if endpoint doesn't exist yet
                if (v[10] && v[10].jurisdictions) {
                    cache.registry = {
                        jur: v[10].jurisdictions, proto: v[10].protocol,
                        cm: v[10].compliance_matrix, fee: v[10].fee_model,
                        rev: v[10].revenue_projection, def: v[10].defensibility,
                        stats: v[10].stats,
                    };
                }
                console.log('[SA Carbon] Phase 2: 11 background APIs loaded ✓');
                resolve();
            });
        }, 500); // ← Yield 500ms to main thread for rendering
    });

    // Unified interface — resolves when ALL phases complete
    window._saCarbonReady = Promise.all([bundlePromise, bgPromise]).then(([bundleData]) => {
        cache.carbonBundle = (bundleData && bundleData.scope && !bundleData.error) ? bundleData : null;
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[SA Carbon] All phases complete ✓ (bundle + background)');
        return cache;
    });
} else if (cache._loadedAt) {
    window._saCarbonReady = Promise.resolve(cache);
}

// ─── Render ──────────────────────────────────────────────────
export function renderPage() {
    return renderWorkspace({
        domain: 'carbon',
        title: 'Carbon / CIE',
        subtitle: 'Carbon Integrity Engine · Emissions · Passports · ESG',
        icon: icon('globe', 24),
        tabs: [
            // Tab 1: Loaded eagerly (sync render)
            { id: 'footprint', label: 'Carbon Footprint', icon: icon('globe', 14), render: renderCarbon },
            // Tabs 2-5: Lazy-loaded (async render — workspace.js handles Promise)
            { id: 'passport', label: 'Carbon Passport', icon: icon('tag', 14),
              render: lazyTab(() => import('../scm/carbon-credit.js?v=4.0')) },
            { id: 'green-finance', label: 'Green Finance', icon: icon('barChart', 14),
              render: lazyTab(() => import('../infra/green-finance.js?v=4.0')) },
            { id: 'sustainability', label: 'Sustainability', icon: icon('check', 14),
              render: lazyTab(() => import('../sustainability.js?v=4.0')) },
            { id: 'registry', label: 'Registry', icon: icon('scroll', 14),
              render: lazyTab(() => import('../infra/carbon-registry.js?v=4.0')) },
        ],
    });
}
