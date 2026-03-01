/**
 * Carbon / CIE Workspace — SA Domain
 * Tabs: Carbon Footprint | Carbon Passport | Green Finance | Sustainability | Carbon Registry
 *
 * PERF: Prefetches ALL tab APIs in parallel on workspace entry.
 * All tabs use window._saCarbonCache for instant rendering.
 */
import { renderWorkspace } from '../../components/workspace.js';
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';
import { renderPage as renderCarbon } from '../scm/carbon.js?v=3.5';
import { renderPage as renderCarbonCredit } from '../scm/carbon-credit.js?v=3.5';
import { renderPage as renderGreenFinance } from '../infra/green-finance.js?v=3.5';
import { renderPage as renderSustainability } from '../sustainability.js?v=3.5';
import { renderPage as renderCarbonRegistry } from '../infra/carbon-registry.js?v=3.5';

// Prefetch ALL Carbon APIs in parallel on workspace entry
if (!window._saCarbonCache) window._saCarbonCache = {};
const cache = window._saCarbonCache;
if (!cache._loading && (!cache._loadedAt || Date.now() - cache._loadedAt > 60000)) {
    cache._loading = true;
    // Store promise so tabs can await it
    window._saCarbonReady = Promise.allSettled([
        // Tab 1: Carbon Footprint (1 API)
        API.get('/scm/carbon/bundle').catch(() => null),
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
        // Tab 5: Registry (7 APIs)
        API.get('/hardening/carbon-registry/jurisdictions').catch(() => ({})),
        API.get('/hardening/carbon-registry/protocol').catch(() => ({})),
        API.get('/hardening/carbon-registry/compliance-matrix').catch(() => ({})),
        API.get('/hardening/carbon-registry/fee-model').catch(() => ({})),
        API.get('/hardening/carbon-registry/revenue-projection').catch(() => ({})),
        API.get('/hardening/carbon-registry/defensibility').catch(() => ({})),
        API.get('/hardening/carbon-registry/stats').catch(() => ({})),
    ]).then(results => {
        const v = results.map(r => r.value);
        cache.carbonBundle = v[0];
        cache.carbonCredit = { summary: v[1], passports: v[2], benchmarks: v[3], ingestion: v[4] };
        cache.greenFinance = { score: v[5], collateral: v[6], instruments: v[7], dashboard: v[8] };
        cache.sustainability = { stats: v[9] || {}, scores: v[10]?.leaderboard || [] };
        cache.registry = { jur: v[11], proto: v[12], cm: v[13], fee: v[14], rev: v[15], def: v[16], stats: v[17] };
        cache._loadedAt = Date.now();
        cache._loading = false;
        console.log('[SA Carbon] All 18 APIs prefetched ✓');
        return cache;
    });
} else if (cache._loadedAt) {
    // Already loaded, resolve immediately
    window._saCarbonReady = Promise.resolve(cache);
}

export function renderPage() {
    return renderWorkspace({
        domain: 'carbon',
        title: 'Carbon / CIE',
        subtitle: 'Carbon Integrity Engine · Emissions · Passports · ESG',
        icon: icon('globe', 24),
        tabs: [
            { id: 'footprint', label: 'Carbon Footprint', icon: icon('globe', 14), render: renderCarbon },
            { id: 'passport', label: 'Carbon Passport', icon: icon('tag', 14), render: renderCarbonCredit },
            { id: 'green-finance', label: 'Green Finance', icon: icon('barChart', 14), render: renderGreenFinance },
            { id: 'sustainability', label: 'Sustainability', icon: icon('check', 14), render: renderSustainability },
            { id: 'registry', label: 'Registry', icon: icon('scroll', 14), render: renderCarbonRegistry },
        ],
    });
}

