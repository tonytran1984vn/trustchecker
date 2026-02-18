/**
 * TrustChecker – Toast Component
 */
import { State } from '../core/state.js';
import { escapeHTML } from '../utils/sanitize.js';

export function showToast(msg, type = 'info') {
    const id = Date.now();
    State.toasts.push({ id, msg, type });
    renderToasts();
    setTimeout(() => {
        State.toasts = State.toasts.filter(t => t.id !== id);
        renderToasts();
    }, 4000);
}

export function renderToasts() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    c.innerHTML = State.toasts.map(t => `<div class="toast ${escapeHTML(t.type)}">${escapeHTML(t.msg)}</div>`).join('');
}

window.showToast = showToast;
