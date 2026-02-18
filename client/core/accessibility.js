/**
 * TrustChecker v9.5 — Accessibility Module
 * 
 * WCAG 2.1 AA compliance for enterprise users.
 * Focus management, keyboard navigation, screen reader support,
 * skip navigation, ARIA live regions, high contrast mode.
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const FOCUSABLE_SELECTORS = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])', '[contenteditable]',
].join(', ');

// ═══════════════════════════════════════════════════════════════════
// SKIP NAVIGATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Inject "Skip to main content" link at top of page.
 * Only visible on keyboard focus (hidden visually by default).
 */
export function injectSkipNav() {
    if (document.getElementById('tc-skip-nav')) return;

    const skip = document.createElement('a');
    skip.id = 'tc-skip-nav';
    skip.href = '#main-content';
    skip.className = 'skip-nav';
    skip.textContent = 'Skip to main content';
    skip.addEventListener('click', (e) => {
        e.preventDefault();
        const main = document.querySelector('.page-body') || document.querySelector('.main-content');
        if (main) {
            main.setAttribute('tabindex', '-1');
            main.focus();
            main.removeAttribute('tabindex');
        }
    });

    document.body.insertBefore(skip, document.body.firstChild);
}

// ═══════════════════════════════════════════════════════════════════
// FOCUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

let _activeTrap = null;

/**
 * Trap keyboard focus within a container (for modals/dialogs).
 * Tab and Shift+Tab cycle through focusable elements inside the container.
 * 
 * @param {HTMLElement} container — the modal/dialog element
 * @returns {Function} release — call to remove the trap
 */
export function trapFocus(container) {
    if (!container) return () => { };

    // Store previously focused element to restore later
    const previousFocus = document.activeElement;

    const focusableElements = () => {
        return [...container.querySelectorAll(FOCUSABLE_SELECTORS)]
            .filter(el => el.offsetParent !== null); // visible only
    };

    // Focus first element
    const elements = focusableElements();
    if (elements.length > 0) {
        elements[0].focus();
    }

    function handleKeyDown(e) {
        if (e.key !== 'Tab') return;

        const els = focusableElements();
        if (els.length === 0) return;

        const first = els[0];
        const last = els[els.length - 1];

        if (e.shiftKey) {
            // Shift+Tab on first → go to last
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            // Tab on last → go to first
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    container.addEventListener('keydown', handleKeyDown);
    _activeTrap = { container, handler: handleKeyDown, previousFocus };

    return () => {
        container.removeEventListener('keydown', handleKeyDown);
        _activeTrap = null;
        // Restore previous focus
        if (previousFocus && previousFocus.focus) {
            previousFocus.focus();
        }
    };
}

// ═══════════════════════════════════════════════════════════════════
// ARIA LIVE REGIONS
// ═══════════════════════════════════════════════════════════════════

let _liveRegion = null;

function ensureLiveRegion() {
    if (_liveRegion) return _liveRegion;

    _liveRegion = document.createElement('div');
    _liveRegion.id = 'tc-aria-live';
    _liveRegion.setAttribute('aria-live', 'polite');
    _liveRegion.setAttribute('aria-atomic', 'true');
    _liveRegion.setAttribute('role', 'status');
    _liveRegion.className = 'sr-only';
    document.body.appendChild(_liveRegion);

    return _liveRegion;
}

/**
 * Announce a message to screen readers via ARIA live region.
 * 
 * @param {string} message — human-readable text
 * @param {'polite'|'assertive'} priority — urgency level
 */
export function announce(message, priority = 'polite') {
    const region = ensureLiveRegion();
    region.setAttribute('aria-live', priority);

    // Clear then set (forces re-announce even if same text)
    region.textContent = '';
    requestAnimationFrame(() => {
        region.textContent = message;
    });

    // Auto-clear after 5 seconds
    setTimeout(() => {
        if (region.textContent === message) {
            region.textContent = '';
        }
    }, 5000);
}

// ═══════════════════════════════════════════════════════════════════
// KEYBOARD NAVIGATION
// ═══════════════════════════════════════════════════════════════════

let _keyboardListenerInstalled = false;

/**
 * Install global keyboard navigation handlers.
 * - Escape: close modals
 * - Arrow keys: navigate sidebar items
 * - /: focus search
 * - ?: show keyboard shortcuts
 */
export function installKeyboardNav() {
    if (_keyboardListenerInstalled) return;
    _keyboardListenerInstalled = true;

    document.addEventListener('keydown', (e) => {
        // Don't interfere with input fields
        const tag = e.target.tagName;
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

        // Escape — close modals
        if (e.key === 'Escape') {
            // Close modal
            if (window.State?.modal) {
                window.State.modal = null;
                if (window.render) window.render();
                announce('Modal closed');
                return;
            }
            // Close search
            if (window.State?.searchOpen) {
                window.State.searchOpen = false;
                if (window.render) window.render();
                announce('Search closed');
                return;
            }
            // Close notification panel
            if (window.State?.notifOpen) {
                window.State.notifOpen = false;
                if (window.render) window.render();
                announce('Notifications closed');
                return;
            }
        }

        if (isInput) return;

        // "/" — focus search
        if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const searchInput = document.querySelector('.search-modal input, .search-input');
            if (searchInput) {
                searchInput.focus();
            } else if (window.toggleSearch) {
                window.toggleSearch();
            }
            announce('Search opened');
        }

        // Arrow keys — sidebar navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar || !sidebar.contains(document.activeElement)) return;

            const items = [...sidebar.querySelectorAll('.nav-item:not(.nav-locked)')];
            const current = items.indexOf(document.activeElement);

            if (current === -1) return;
            e.preventDefault();

            const next = e.key === 'ArrowDown'
                ? (current + 1) % items.length
                : (current - 1 + items.length) % items.length;

            items[next].focus();
        }

        // "?" — show keyboard shortcuts help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            showShortcutHelp();
        }
    });
}

function showShortcutHelp() {
    const shortcuts = [
        { key: '/', desc: 'Open search' },
        { key: 'Esc', desc: 'Close modal / search / notifications' },
        { key: '↑↓', desc: 'Navigate sidebar items' },
        { key: 'Tab', desc: 'Move to next interactive element' },
        { key: 'Shift+Tab', desc: 'Move to previous element' },
        { key: '?', desc: 'Show this help' },
    ];

    const html = `
        <div class="keyboard-help" role="dialog" aria-label="Keyboard shortcuts">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <table class="shortcut-table">
                ${shortcuts.map(s => `
                    <tr>
                        <td><kbd>${s.key}</kbd></td>
                        <td>${s.desc}</td>
                    </tr>
                `).join('')}
            </table>
            <button onclick="State.modal=null;render()" class="btn btn-secondary" style="margin-top:12px">Close</button>
        </div>
    `;

    if (window.State && window.render) {
        window.State.modal = html;
        window.render();
    }

    announce('Keyboard shortcuts dialog opened');
}

// ═══════════════════════════════════════════════════════════════════
// REDUCED MOTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Apply reduced motion preferences — disables animations.
 */
export function applyMotionPreferences() {
    if (prefersReducedMotion()) {
        document.documentElement.classList.add('reduced-motion');
    }

    // Listen for changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        document.documentElement.classList.toggle('reduced-motion', e.matches);
    });
}

// ═══════════════════════════════════════════════════════════════════
// HIGH CONTRAST MODE
// ═══════════════════════════════════════════════════════════════════

let _highContrast = localStorage.getItem('tc_high_contrast') === 'true';

export function isHighContrast() {
    return _highContrast;
}

export function toggleHighContrast() {
    _highContrast = !_highContrast;
    localStorage.setItem('tc_high_contrast', _highContrast);
    document.documentElement.classList.toggle('high-contrast', _highContrast);
    announce(_highContrast ? 'High contrast mode enabled' : 'High contrast mode disabled');
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize all accessibility features.
 */
export function initAccessibility() {
    injectSkipNav();
    installKeyboardNav();
    applyMotionPreferences();
    ensureLiveRegion();

    // Restore high contrast
    if (_highContrast) {
        document.documentElement.classList.add('high-contrast');
    }

    // Detect keyboard vs mouse user
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-user');
        }
    });
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-user');
    });

    console.log('[Accessibility] Initialized (WCAG 2.1 AA)');
}

// ═══════════════════════════════════════════════════════════════════
// CSS (injected once)
// ═══════════════════════════════════════════════════════════════════

const a11yCSS = `
/* Skip Navigation */
.skip-nav {
    position: fixed;
    top: -100px;
    left: 16px;
    padding: 10px 20px;
    background: var(--primary, #6c5ce7);
    color: #fff;
    border-radius: 0 0 8px 8px;
    z-index: 99999;
    font-weight: 600;
    transition: top 0.2s;
    text-decoration: none;
}
.skip-nav:focus {
    top: 0;
    outline: 3px solid var(--primary, #6c5ce7);
    outline-offset: 2px;
}

/* Screen reader only */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* Focus styles — only for keyboard users */
.keyboard-user *:focus {
    outline: 2px solid var(--primary, #6c5ce7);
    outline-offset: 2px;
}
body:not(.keyboard-user) *:focus {
    outline: none;
}

/* Reduced motion */
.reduced-motion *,
.reduced-motion *::before,
.reduced-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
}

/* High contrast overrides */
.high-contrast {
    --bg: #000;
    --card-bg: #111;
    --text: #fff;
    --text-muted: #ccc;
    --border: #666;
    --primary: #5dade2;
    --success: #58d68d;
    --danger: #ec7063;
    --warning: #f9e79f;
}
.high-contrast .card,
.high-contrast .stat-card,
.high-contrast .nav-item {
    border-width: 2px;
}

/* Keyboard shortcuts help */
.keyboard-help {
    padding: 24px;
    max-width: 400px;
    margin: 0 auto;
}
.keyboard-help h3 { margin: 0 0 16px; color: var(--text, #e0e0e0); }
.shortcut-table {
    width: 100%;
    border-collapse: collapse;
}
.shortcut-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border, #333);
    color: var(--text-muted, #888);
}
.shortcut-table td:first-child { width: 80px; }
kbd {
    background: var(--card-bg, #1a1a2e);
    border: 1px solid var(--border, #444);
    border-radius: 4px;
    padding: 2px 8px;
    font-family: monospace;
    font-size: 12px;
    color: var(--text, #e0e0e0);
    box-shadow: 0 1px 0 var(--border, #444);
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = a11yCSS;
    document.head.appendChild(style);
}

// Expose for settings page
if (typeof window !== 'undefined') {
    window.__TC_A11Y__ = {
        announce,
        toggleHighContrast,
        isHighContrast,
        prefersReducedMotion,
        trapFocus,
    };
}
