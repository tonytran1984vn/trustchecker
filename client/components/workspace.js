/**
 * Workspace Component — Generic tabbed workspace for SA domains
 * Usage: renderWorkspace({ domain, title, subtitle, icon, tabs, activeTab })
 */

import { State, render } from '../core/state.js';
import { injectMyActionsWidget } from './my-actions-widget.js';

/**
 * Render a domain workspace with tab navigation
 * @param {Object} config
 * @param {string} config.domain    - Domain key (e.g. 'risk')
 * @param {string} config.title     - Workspace title
 * @param {string} config.subtitle  - Description line
 * @param {string} config.icon      - SVG icon HTML
 * @param {Array}  config.tabs      - Array of { id, label, icon, render }
 * @param {string} [config.activeTab] - Currently active tab id
 */
export function renderWorkspace({ domain, title, subtitle, icon, tabs, activeTab }) {
  // Determine which tab is active
  const currentTab = activeTab || State._wsTab?.[domain] || tabs[0]?.id;

  // Find active tab config
  const active = tabs.find(t => t.id === currentTab) || tabs[0];

  // Render tab content
  let tabContent = '';
  if (active && typeof active.render === 'function') {
    tabContent = active.render();
  } else {
    tabContent = `<div class="ws-loading">Loading…</div>`;
  }

  // Inject My Actions widget after DOM renders
  setTimeout(() => injectMyActionsWidget('my-actions-widget'), 200);

  return `
    <div class="sa-page ws-page" data-ws-domain="${domain}">
      <div class="ws-header">
        <div class="ws-header-left">
          <span class="ws-icon">${icon || ''}</span>
          <div>
            <h1 class="ws-title">${title}</h1>
            <p class="ws-subtitle">${subtitle}</p>
          </div>
        </div>
      </div>
      <div class="ws-tab-bar">
        ${tabs.map(t => `
          <button class="ws-tab ${t.id === currentTab ? 'active' : ''}"
                  onclick="window._wsSwitch('${domain}','${t.id}')"
                  data-tab="${t.id}">
            ${t.icon || ''}
            <span>${t.label}</span>
          </button>
        `).join('')}
      </div>
      <div id="my-actions-widget" style="display:none"></div>
      <div class="ws-content">
        ${tabContent}
      </div>
    </div>
  `;
}

/**
 * Switch workspace tab — called from onclick
 */
window._wsSwitch = function (domain, tabId) {
  if (!State._wsTab) State._wsTab = {};
  State._wsTab[domain] = tabId;
  render();
};
