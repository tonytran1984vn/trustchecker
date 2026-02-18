/**
 * TrustChecker – Main Entry Point (v9.5)
 * ═══════════════════════════════════════
 * ES6 Module architecture entry point.
 * Phase 5: Error boundaries, accessibility, offline queue, API cache.
 */

// ─── Core imports ────────────────────────────────────────────
import { State, render, setRenderFn } from './core/state.js';
import { API } from './core/api.js';
import { loadFeatureFlags, showUpgradeModal } from './core/features.js';
import { connectWS } from './core/websocket.js';
import { navigate, renderPage, getPageFromURL } from './core/router.js';

// ─── Phase 5 imports ─────────────────────────────────────────
import { withPageBoundary, installGlobalErrorHandlers } from './core/error-boundary.js';
import { initAccessibility, announce } from './core/accessibility.js';
import { initOfflineQueue, getPendingCount, renderSyncBadge, onStatusChange } from './core/offline-queue.js';
import { getCacheStats } from './core/api-cache.js';

// ─── Service imports ─────────────────────────────────────────
import { renderLogin, doLogin, doMfaVerify, doLogout } from './services/auth.js';
import { loadBranding } from './services/branding.js';
import { initI18n } from './services/i18n.js';
import './services/csv-export.js';   // side-effect: registers window.export* functions

// ─── Component imports ───────────────────────────────────────
import { renderSidebar } from './components/sidebar.js';
import { renderPageHeader } from './components/header.js';
import { showToast } from './components/toast.js';
import './components/notifications.js'; // side-effect: registers window.toggle/mark* functions
import './components/search.js';        // side-effect: registers window.toggleSearch/globalSearch
import './components/skeleton.js';      // side-effect: registers window.renderSkeleton

// ─── Shimmer animation CSS injection ─────────────────────────
const shimmerCSS = document.createElement('style');
shimmerCSS.textContent = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;
document.head.appendChild(shimmerCSS);

// ─── Offline queue state (for sync badge) ────────────────────
let _pendingScans = 0;

async function updatePendingCount() {
  try { _pendingScans = await getPendingCount(); } catch { _pendingScans = 0; }
}

// Listen for queue updates
window.addEventListener('tc:queue-updated', (e) => {
  _pendingScans = e.detail?.size ?? _pendingScans;
  render();
});

// Listen for online/offline transitions
onStatusChange((isOnline) => {
  if (isOnline) {
    announce('Network connection restored');
    showToast('Connection restored — syncing pending scans…', 'success');
  } else {
    announce('Network connection lost. Scans will be queued.');
    showToast('You are offline. Scans will be saved and synced later.', 'warning');
  }
  render();
});

// ─── Main render function (with error boundary) ─────────────
function mainRender() {
  const app = document.getElementById('app');
  if (!app) return;

  if (!State.user || !API.token) {
    app.innerHTML = renderLogin();
    return;
  }

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar()}
      <div class="main-content" id="main-content">
        ${renderPageHeader(_pendingScans > 0 ? renderSyncBadge(_pendingScans) : '')}
        <div class="page-body page-enter" role="main" aria-label="${State.page || 'dashboard'} page">
          ${withPageBoundary(() => renderPage(), State.page || 'dashboard')}
        </div>
      </div>
    </div>
    ${State.modal ? `<div class="modal-overlay glass-overlay" role="dialog" aria-modal="true" onclick="if(event.target===this){State.modal=null;render()}">${State.modal}</div>` : ''}
  `;
}

// ─── Inject render function into State (avoids circular deps) ─
setRenderFn(mainRender);

// ─── Global exports for inline handlers ──────────────────────
window.navigate = navigate;
window.render = render;
window.showUpgradeModal = showUpgradeModal;
window.showToast = showToast;
window.State = State;

// ─── Application bootstrap ──────────────────────────────────
async function boot() {
  console.log('[TrustChecker] v9.5.0 — Phase 5: Frontend Architecture + DevOps + Security');
  console.log('[TrustChecker] Initializing...');

  // Phase 5: Install global error handlers FIRST
  installGlobalErrorHandlers();

  // Phase 5: Initialize accessibility (skip-nav, keyboard nav, ARIA)
  initAccessibility();

  // Phase 5: Initialize offline queue (IndexedDB, health ping)
  initOfflineQueue();
  await updatePendingCount();

  // Init i18n
  await initI18n();

  // Initial render (login screen or dashboard)
  render();

  // If already logged in, load feature flags + branding and connect WS
  if (State.user && API.token) {
    try {
      await Promise.all([loadFeatureFlags(), loadBranding()]);
      connectWS();
      navigate(getPageFromURL());
      announce('Dashboard loaded');
    } catch (e) {
      console.warn('[boot] Post-login init error:', e);
    }
  }

  // Phase 5: Log cache stats in dev
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setTimeout(() => {
      console.log('[TrustChecker] API Cache Stats:', getCacheStats());
    }, 5000);
  }

  console.log('[TrustChecker] Boot complete ✓');
}

// ─── Start ───────────────────────────────────────────────────
boot();
