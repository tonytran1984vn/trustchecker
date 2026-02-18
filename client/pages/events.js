/**
 * TrustChecker – Events Page
 */
import { State, render } from '../core/state.js';

export function renderPage() {
  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📡 Real-Time Event Stream</div>
        <span style="font-size:0.7rem;color:var(--text-muted)">${State.events.length} events captured</span>
      </div>
      <div class="event-feed" style="max-height:600px" id="event-feed">${renderEventFeed()}</div>
    </div>
  `;
}

// Window exports for onclick handlers

