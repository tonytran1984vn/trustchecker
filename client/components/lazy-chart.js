/**
 * TrustChecker v9.4 — Lazy Chart Component
 * 
 * Intersection Observer-based lazy rendering for Chart.js instances.
 * Only initializes chart when visible in viewport, destroys on scroll out.
 * Debounced resize, loading placeholder.
 */

const CHART_INSTANCES = new Map();
let _observer = null;
const RESIZE_DEBOUNCE_MS = 200;

/**
 * Initialize the lazy chart observer (call once on app boot).
 */
export function initLazyChartObserver() {
    if (_observer) return;

    _observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const el = entry.target;
            const chartId = el.dataset.lazyChart;
            if (!chartId) continue;

            if (entry.isIntersecting) {
                // Entered viewport — initialize chart
                _initializeChart(el, chartId);
            } else {
                // Left viewport — destroy to free memory
                _destroyChart(chartId);
            }
        }
    }, {
        root: null,
        rootMargin: '100px', // Pre-load 100px before visible
        threshold: 0.01,
    });
}

/**
 * Register a lazy chart.
 * @param {string} containerId - Container element ID
 * @param {Object} chartConfig - Chart.js configuration
 * @param {Object} [options]
 * @param {string} [options.loadingText] - Placeholder text while loading
 * @param {string} [options.height] - Chart height (default '300px')
 */
export function registerLazyChart(containerId, chartConfig, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { loadingText = 'Loading chart...', height = '300px' } = options;
    const chartId = `lazy_${containerId}_${Date.now()}`;

    // Set up container with placeholder
    container.style.minHeight = height;
    container.style.position = 'relative';
    container.dataset.lazyChart = chartId;

    // Loading placeholder
    container.innerHTML = `
        <div class="lazy-chart-placeholder" style="
            display:flex;align-items:center;justify-content:center;
            height:${height};background:var(--bg-card,#1a1a2e);border-radius:12px;
            border:1px dashed var(--border,rgba(255,255,255,0.1));color:var(--text-muted,#666);font-size:13px;">
            <div style="text-align:center;">
                <div style="font-size:24px;margin-bottom:8px;opacity:0.3;">📊</div>
                <div>${loadingText}</div>
            </div>
        </div>
    `;

    // Store config for lazy init
    CHART_INSTANCES.set(chartId, {
        containerId,
        config: chartConfig,
        height,
        instance: null,
        initialized: false,
    });

    // Observe
    if (!_observer) initLazyChartObserver();
    _observer.observe(container);

    return chartId;
}

/**
 * Initialize a chart when it enters the viewport.
 */
function _initializeChart(container, chartId) {
    const entry = CHART_INSTANCES.get(chartId);
    if (!entry || entry.initialized) return;

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('[LazyChart] Chart.js not loaded');
        return;
    }

    // Replace placeholder with canvas
    container.innerHTML = `<canvas id="canvas_${chartId}" style="width:100%;height:${entry.height};"></canvas>`;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    try {
        entry.instance = new Chart(canvas.getContext('2d'), {
            ...entry.config,
            options: {
                ...entry.config.options,
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 600,
                    easing: 'easeOutQuart',
                    ...(entry.config.options?.animation || {}),
                },
            },
        });
        entry.initialized = true;
    } catch (err) {
        console.error(`[LazyChart] Failed to init ${chartId}:`, err);
        container.innerHTML = `<div style="padding:20px;color:var(--text-muted,#666);text-align:center;">Chart unavailable</div>`;
    }
}

/**
 * Destroy a chart when it leaves the viewport (memory management).
 */
function _destroyChart(chartId) {
    const entry = CHART_INSTANCES.get(chartId);
    if (!entry || !entry.instance) return;

    try {
        entry.instance.destroy();
    } catch (e) { /* ignore */ }
    entry.instance = null;
    entry.initialized = false;

    // Restore placeholder
    const container = document.getElementById(entry.containerId);
    if (container) {
        container.innerHTML = `
            <div class="lazy-chart-placeholder" style="
                display:flex;align-items:center;justify-content:center;
                height:${entry.height};background:var(--bg-card,#1a1a2e);border-radius:12px;
                border:1px dashed var(--border,rgba(255,255,255,0.1));color:var(--text-muted,#666);font-size:13px;">
                <div style="text-align:center;">
                    <div style="font-size:24px;margin-bottom:8px;opacity:0.3;">📊</div>
                    <div>Scroll to view</div>
                </div>
            </div>
        `;
    }
}

/**
 * Update chart data without full re-initialization.
 */
export function updateChartData(chartId, newData) {
    const entry = CHART_INSTANCES.get(chartId);
    if (!entry || !entry.instance) return false;

    try {
        entry.instance.data = newData;
        entry.instance.update('none');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Force destroy all lazy charts (cleanup on page navigation).
 */
export function destroyAllLazyCharts() {
    for (const [id] of CHART_INSTANCES) {
        _destroyChart(id);
    }
    CHART_INSTANCES.clear();
}

/**
 * Get stats for monitoring.
 */
export function getLazyChartStats() {
    let initialized = 0, total = 0;
    for (const entry of CHART_INSTANCES.values()) {
        total++;
        if (entry.initialized) initialized++;
    }
    return { total, initialized, destroyed: total - initialized };
}

// ─── Debounced Resize Handler ───────────────────────────────────
let _resizeTimeout = null;
if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
        clearTimeout(_resizeTimeout);
        _resizeTimeout = setTimeout(() => {
            for (const entry of CHART_INSTANCES.values()) {
                if (entry.instance) {
                    try { entry.instance.resize(); } catch (e) { /* ignore */ }
                }
            }
        }, RESIZE_DEBOUNCE_MS);
    });
}
