/**
 * TrustChecker v9.5 — Error Boundary
 * 
 * Component-level and page-level error isolation.
 * Prevents cascade failures — a broken chart won't take down the whole page.
 * Provides graceful fallback UI with retry mechanism.
 */

// ═══════════════════════════════════════════════════════════════════
// ERROR TRACKING
// ═══════════════════════════════════════════════════════════════════

const _errors = [];
const MAX_ERRORS = 50;

function trackError(componentName, error) {
    const entry = {
        component: componentName,
        message: error.message || String(error),
        stack: error.stack || null,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
    };

    _errors.push(entry);
    if (_errors.length > MAX_ERRORS) _errors.shift();

    console.error(`[ErrorBoundary] Component "${componentName}" failed:`, error);

    // Fire custom event for external error tracking
    window.dispatchEvent(new CustomEvent('tc:component-error', { detail: entry }));
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════

/**
 * Wrap a component render function with error isolation.
 * If the render throws, shows a graceful fallback instead of blank screen.
 * 
 * @param {Function} renderFn — () => HTML string
 * @param {string} componentName — for error reporting
 * @param {Object} options — { fallback, showRetry, retryLabel }
 * @returns {string} HTML string (either from renderFn or fallback)
 */
export function withErrorBoundary(renderFn, componentName = 'Unknown', options = {}) {
    const {
        fallback = null,
        showRetry = true,
        retryLabel = 'Try Again',
        compact = false,
    } = options;

    try {
        return renderFn();
    } catch (error) {
        trackError(componentName, error);

        if (fallback) {
            return typeof fallback === 'function' ? fallback(error) : fallback;
        }

        const retryId = `eb-retry-${componentName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

        if (compact) {
            return `
                <div class="error-boundary-compact" role="alert" aria-label="Component error">
                    <span class="error-boundary-icon">⚠️</span>
                    <span class="error-boundary-msg">${componentName}: Failed to load</span>
                    ${showRetry ? `<button class="error-boundary-retry-sm" onclick="window.__retryComponent('${retryId}')" aria-label="Retry loading ${componentName}">${retryLabel}</button>` : ''}
                </div>
            `;
        }

        return `
            <div class="error-boundary" role="alert" aria-label="Component error in ${componentName}">
                <div class="error-boundary-content">
                    <div class="error-boundary-icon">⚠️</div>
                    <h3 class="error-boundary-title">Something went wrong</h3>
                    <p class="error-boundary-detail">${componentName} failed to render</p>
                    <p class="error-boundary-msg">${escapeHtml(error.message)}</p>
                    ${showRetry ? `<button class="error-boundary-retry" onclick="window.__retryComponent('${retryId}')" aria-label="Retry loading ${componentName}">${retryLabel}</button>` : ''}
                </div>
            </div>
        `;
    }
}

/**
 * Wrap a page render function with full-page error boundary.
 * Shows a more prominent error with details and navigation options.
 */
export function withPageBoundary(renderFn, pageName = 'Page') {
    try {
        return renderFn();
    } catch (error) {
        trackError(`Page:${pageName}`, error);

        return `
            <div class="error-boundary-page" role="alert" aria-label="Page error">
                <div class="error-boundary-page-content">
                    <div class="error-boundary-page-icon">🚨</div>
                    <h2>Page Error</h2>
                    <p>The <strong>${escapeHtml(pageName)}</strong> page encountered an error and could not render.</p>
                    <div class="error-boundary-detail-box">
                        <code>${escapeHtml(error.message)}</code>
                    </div>
                    <div class="error-boundary-actions">
                        <button class="btn btn-primary" onclick="window.navigate('dashboard')" aria-label="Go to dashboard">
                            ← Back to Dashboard
                        </button>
                        <button class="btn btn-secondary" onclick="location.reload()" aria-label="Reload page">
                            🔄 Reload Page
                        </button>
                    </div>
                    <p class="error-boundary-hint">If this keeps happening, please contact support.</p>
                </div>
            </div>
        `;
    }
}

// ═══════════════════════════════════════════════════════════════════
// ASYNC ERROR BOUNDARY (for async render functions)
// ═══════════════════════════════════════════════════════════════════

/**
 * Wrap an async data-loading function with error handling.
 * Returns { data, error } — never throws.
 */
export async function withAsyncBoundary(asyncFn, componentName = 'Unknown') {
    try {
        const data = await asyncFn();
        return { data, error: null };
    } catch (error) {
        trackError(`Async:${componentName}`, error);
        return { data: null, error };
    }
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Install global error handlers.
 * Catches unhandled errors and promise rejections.
 */
export function installGlobalErrorHandlers() {
    // Uncaught errors
    window.addEventListener('error', (event) => {
        trackError('Global', {
            message: event.message,
            stack: `${event.filename}:${event.lineno}:${event.colno}`,
        });

        // Don't prevent default — let the browser console still log it
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        trackError('UnhandledPromise', {
            message: error?.message || String(error),
            stack: error?.stack || null,
        });
    });

    // Retry mechanism — components register retry callbacks
    window.__retryComponent = (retryId) => {
        // Re-render the whole page (simplest approach, works with string-based rendering)
        if (window.render) window.render();
    };
}

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════════════
// ERROR BOUNDARY CSS (injected once)
// ═══════════════════════════════════════════════════════════════════

const boundaryCSS = `
.error-boundary {
    border: 1px solid var(--border, #333);
    border-radius: 12px;
    padding: 24px;
    margin: 12px 0;
    background: var(--card-bg, #1a1a2e);
    text-align: center;
}
.error-boundary-compact {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    background: var(--card-bg, #1a1a2e);
    font-size: 13px;
}
.error-boundary-icon { font-size: 24px; }
.error-boundary-compact .error-boundary-icon { font-size: 14px; }
.error-boundary-title {
    margin: 8px 0 4px;
    color: var(--text, #e0e0e0);
    font-size: 16px;
}
.error-boundary-detail {
    color: var(--text-muted, #888);
    font-size: 13px;
    margin: 4px 0;
}
.error-boundary-msg {
    color: var(--danger, #ff6b6b);
    font-family: monospace;
    font-size: 12px;
    margin: 8px 0;
    word-break: break-all;
}
.error-boundary-compact .error-boundary-msg {
    color: var(--text-muted, #888);
    margin: 0;
}
.error-boundary-retry, .error-boundary-retry-sm {
    margin-top: 12px;
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid var(--primary, #6c5ce7);
    background: transparent;
    color: var(--primary, #6c5ce7);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
}
.error-boundary-retry:hover, .error-boundary-retry-sm:hover {
    background: var(--primary, #6c5ce7);
    color: #fff;
}
.error-boundary-retry-sm {
    margin: 0;
    padding: 4px 12px;
    font-size: 12px;
}
.error-boundary-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 40px;
}
.error-boundary-page-content {
    text-align: center;
    max-width: 500px;
}
.error-boundary-page-icon { font-size: 48px; margin-bottom: 16px; }
.error-boundary-page-content h2 {
    color: var(--text, #e0e0e0);
    margin: 0 0 12px;
}
.error-boundary-page-content p {
    color: var(--text-muted, #888);
    margin: 8px 0;
}
.error-boundary-detail-box {
    background: rgba(255,107,107,0.1);
    border: 1px solid rgba(255,107,107,0.3);
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
}
.error-boundary-detail-box code {
    color: var(--danger, #ff6b6b);
    font-size: 13px;
    word-break: break-all;
}
.error-boundary-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin: 20px 0;
}
.error-boundary-hint {
    font-size: 12px;
    color: var(--text-muted, #666);
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = boundaryCSS;
    document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════
// DEVTOOLS
// ═══════════════════════════════════════════════════════════════════

export function getErrorLog() {
    return [..._errors];
}

export function clearErrorLog() {
    _errors.length = 0;
}

if (typeof window !== 'undefined') {
    window.__TC_ERRORS__ = {
        getErrorLog,
        clearErrorLog,
        getCount: () => _errors.length,
    };
}
