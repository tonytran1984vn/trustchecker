/**
 * TrustChecker – Global Search Component
 */
import { State } from '../core/state.js';
import { API } from '../core/api.js';
import { escapeHTML } from '../utils/sanitize.js';

export function toggleSearch() {
  State.searchOpen = !State.searchOpen;
  State.notifOpen = false;
  const panel = document.getElementById('search-panel');
  if (panel) panel.style.display = State.searchOpen ? 'block' : 'none';
  const notif = document.getElementById('notif-panel');
  if (notif) notif.style.display = 'none';
  if (State.searchOpen) {
    setTimeout(() => {
      const input = document.getElementById('global-search-input');
      if (input) input.focus();
    }, 100);
  }
}

export async function globalSearch(q) {
  State.searchQuery = q;
  if (!q || q.length < 2) { State.searchResults = null; renderSearchResults(); return; }
  try {
    const [products, scans, evidence] = await Promise.all([
      API.get(`/products?search=${encodeURIComponent(q)}`),
      API.get(`/scans?limit=5`),
      API.get('/evidence')
    ]);
    State.searchResults = {
      products: (products.products || []).filter(p => (p.name + p.sku).toLowerCase().includes(q.toLowerCase())).slice(0, 5),
      scans: (scans.events || scans.scans || []).filter(s => (s.product_name || '').toLowerCase().includes(q.toLowerCase())).slice(0, 5),
      evidence: (evidence.items || []).filter(e => (e.title + e.description).toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    };
    renderSearchResults();
  } catch (e) { State.searchResults = null; renderSearchResults(); }
}

export function renderSearchResults() {
  const container = document.getElementById('search-results');
  if (!container) return;
  const r = State.searchResults;
  if (!r) { container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem">Type to search across products, scans, evidence…</div>'; return; }
  const total = (r.products?.length || 0) + (r.scans?.length || 0) + (r.evidence?.length || 0);
  container.innerHTML = `
    <div style="padding:8px 16px;font-size:0.72rem;color:var(--text-muted);border-bottom:1px solid var(--border)">${total} results for "${escapeHTML(State.searchQuery)}"</div>
    ${r.products?.length ? `
      <div style="padding:8px 16px;font-size:0.7rem;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:1px">📦 Products</div>
      ${r.products.map(p => `
        <div class="search-item" onclick="toggleSearch();navigate('products');setTimeout(()=>showProductDetail('${escapeHTML(p.id)}'),300)">
          <span style="font-weight:600">${escapeHTML(p.name)}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${escapeHTML(p.sku)}</span>
        </div>
      `).join('')}
    ` : ''}
    ${r.scans?.length ? `
      <div style="padding:8px 16px;font-size:0.7rem;font-weight:700;color:var(--emerald);text-transform:uppercase;letter-spacing:1px">🔍 Scans</div>
      ${r.scans.map(s => `
        <div class="search-item" onclick="toggleSearch();navigate('scans')">
          <span style="font-weight:600">${escapeHTML(s.product_name || 'Scan')}</span>
          <span class="badge ${escapeHTML(s.result)}" style="font-size:0.65rem">${escapeHTML(s.result)}</span>
        </div>
      `).join('')}
    ` : ''}
    ${r.evidence?.length ? `
      <div style="padding:8px 16px;font-size:0.7rem;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:1px">🔒 Evidence</div>
      ${r.evidence.map(e => `
        <div class="search-item" onclick="toggleSearch();navigate('evidence')">
          <span style="font-weight:600">${escapeHTML(e.title)}</span>
          <span style="font-size:0.72rem;color:var(--text-muted)">${escapeHTML(e.file_type)}</span>
        </div>
      `).join('')}
    ` : ''}}
    ${total === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">No results found</div>' : ''}
  `;
}

window.toggleSearch = toggleSearch;
window.globalSearch = globalSearch;
