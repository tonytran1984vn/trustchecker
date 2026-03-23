/**
 * TrustChecker – Scans Page (Paginated + Filterable + Interdependent Filters)
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { timeAgo, scoreColor } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

// ─── Local pagination state ─────────────────────────────────
let _page = 1;
let _perPage = 20;
let _filterProduct = '';
let _filterCategory = '';
let _filterResult = '';
let _filterCity = '';
let _total = 0;
let _totalPages = 0;
let _scans = [];
let _filterMeta = { products: [], categories: [], results: [], cities: [] };
let _loading = false;

// ─── Load scans from API ────────────────────────────────────
async function loadScans() {
  _loading = true;
  render();
  try {
    const offset = (_page - 1) * _perPage;
    let url = `/qr/scan-history?limit=${_perPage}&offset=${offset}`;
    if (_filterProduct) url += `&product_id=${encodeURIComponent(_filterProduct)}`;
    if (_filterCategory) url += `&category=${encodeURIComponent(_filterCategory)}`;
    if (_filterResult) url += `&result=${encodeURIComponent(_filterResult)}`;
    if (_filterCity) url += `&city=${encodeURIComponent(_filterCity)}`;

    const res = await API.get(url);
    _scans = res.scans || [];
    _total = res.total || 0;
    _totalPages = res.total_pages || 1;
    _page = res.page || 1;
    if (res.filters) _filterMeta = res.filters;
    State.scanHistory = _scans;
  } catch (e) {
    showToast('Failed to load scans', 'error');
    _scans = [];
  }
  _loading = false;
  render();
}

// ─── Derived filter options (interdependent) ────────────────
function _getVisibleProducts() {
  if (!_filterCategory) return _filterMeta.products;
  return _filterMeta.products.filter(p => p.category === _filterCategory);
}

function _getVisibleCategories() {
  if (!_filterProduct) return _filterMeta.categories;
  const prod = _filterMeta.products.find(p => p.id === _filterProduct);
  return prod?.category ? [prod.category] : _filterMeta.categories;
}

// ─── Event handlers ─────────────────────────────────────────
function onPerPageChange(val) { _perPage = Number(val); _page = 1; loadScans(); }

function onFilterProduct(val) {
  _filterProduct = val;
  // Auto-set category when product is selected
  if (val) {
    const prod = _filterMeta.products.find(p => p.id === val);
    if (prod?.category) _filterCategory = prod.category;
  }
  _page = 1;
  loadScans();
}

function onFilterCategory(val) {
  _filterCategory = val;
  // Clear product if it doesn't belong to the new category
  if (val && _filterProduct) {
    const prod = _filterMeta.products.find(p => p.id === _filterProduct);
    if (prod && prod.category !== val) _filterProduct = '';
  }
  _page = 1;
  loadScans();
}

function onFilterResult(val) { _filterResult = val; _page = 1; loadScans(); }
function onFilterCity(val) { _filterCity = val; _page = 1; loadScans(); }
function goToPage(p) { _page = Math.max(1, Math.min(p, _totalPages)); loadScans(); }

function clearAllFilters() {
  _filterProduct = '';
  _filterCategory = '';
  _filterResult = '';
  _filterCity = '';
  _page = 1;
  loadScans();
}

// ─── Render ─────────────────────────────────────────────────
export function renderPage() {
  const from = _total === 0 ? 0 : (_page - 1) * _perPage + 1;
  const to = Math.min(_page * _perPage, _total);
  const visibleProducts = _getVisibleProducts();
  const visibleCategories = _getVisibleCategories();
  const hasFilters = _filterProduct || _filterCategory || _filterResult || _filterCity;

  return `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div class="card-title">🔍 Scan History</div>
        <button class="btn btn-sm" onclick="exportScansCSV()">📊 Export CSV</button>
      </div>

      <!-- Filter Bar -->
      <div style="display:flex;gap:10px;padding:0 20px 16px;flex-wrap:wrap;align-items:center">
        <select class="input" style="max-width:200px;font-size:0.78rem;padding:6px 10px" onchange="window._scanFilterProduct(this.value)">
          <option value="">All Products (${visibleProducts.length})</option>
          ${visibleProducts.map(p => `<option value="${p.id}" ${_filterProduct === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
        <select class="input" style="max-width:160px;font-size:0.78rem;padding:6px 10px" onchange="window._scanFilterCategory(this.value)">
          <option value="">All Categories (${visibleCategories.length})</option>
          ${visibleCategories.map(c => `<option value="${c}" ${_filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <select class="input" style="max-width:160px;font-size:0.78rem;padding:6px 10px" onchange="window._scanFilterResult(this.value)">
          <option value="">All Results</option>
          ${_filterMeta.results.map(r => `<option value="${r}" ${_filterResult === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
        </select>
        <select class="input" style="max-width:160px;font-size:0.78rem;padding:6px 10px" onchange="window._scanFilterCity(this.value)">
          <option value="">All Cities (${(_filterMeta.cities || []).length})</option>
          ${(_filterMeta.cities || []).map(c => `<option value="${c}" ${_filterCity === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        ${hasFilters ? `<button class="btn btn-sm" onclick="window._scanClearFilters()" style="font-size:0.72rem;color:var(--rose)">✕ Clear</button>` : ''}
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted)">
          <span>Show</span>
          <select class="input" style="width:70px;font-size:0.78rem;padding:6px 8px" onchange="window._scanPerPageChange(this.value)">
            ${[10, 20, 50, 100].map(n => `<option value="${n}" ${_perPage === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
          <span>per page</span>
        </div>
      </div>

      ${_loading ? `
        <div style="padding:60px;text-align:center;color:var(--text-muted)">
          <div class="spinner" style="margin:0 auto 12px"></div>
          Loading scans...
        </div>
      ` : `
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Result</th><th>Fraud %</th><th>Trust</th><th>City</th><th>Response</th><th>Time</th></tr>
            ${_scans.length ? _scans.map(s => `
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">${s.product_name || '—'}</td>
                <td><span class="badge ${s.result}">${s.result}</span></td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${s.fraud_score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(s.fraud_score * 100).toFixed(0)}%</td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${scoreColor(s.trust_score)}">${Math.round(s.trust_score)}</td>
                <td style="font-size:0.75rem">${s.geo_city || '—'}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${s.response_time_ms != null ? s.response_time_ms + 'ms' : '—'}</td>
                <td class="event-time">${timeAgo(s.scanned_at)}</td>
              </tr>
            `).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No scan events found</td></tr>'}
          </table>
        </div>

        <!-- Pagination -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-top:1px solid var(--border);font-size:0.78rem">
          <div style="color:var(--text-muted)">
            ${_total > 0 ? `Showing <strong>${from.toLocaleString()}</strong>–<strong>${to.toLocaleString()}</strong> of <strong>${_total.toLocaleString()}</strong> scans` : 'No results'}
          </div>
          ${_totalPages > 1 ? `
            <div style="display:flex;align-items:center;gap:4px">
              <button class="btn btn-sm" onclick="window._scanGoPage(1)" ${_page <= 1 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>«</button>
              <button class="btn btn-sm" onclick="window._scanGoPage(${_page - 1})" ${_page <= 1 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>‹ Prev</button>
              ${_buildPageNumbers()}
              <button class="btn btn-sm" onclick="window._scanGoPage(${_page + 1})" ${_page >= _totalPages ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>Next ›</button>
              <button class="btn btn-sm" onclick="window._scanGoPage(${_totalPages})" ${_page >= _totalPages ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>»</button>
            </div>
          ` : ''}
        </div>
      `}
    </div>
  `;
}

// ─── Page number builder ────────────────────────────────────
function _buildPageNumbers() {
  if (_totalPages <= 7) {
    return Array.from({ length: _totalPages }, (_, i) => i + 1)
      .map(p => `<button class="btn btn-sm${p === _page ? ' btn-primary' : ''}" onclick="window._scanGoPage(${p})" style="min-width:32px;${p === _page ? 'pointer-events:none' : ''}">${p}</button>`)
      .join('');
  }
  const pages = [];
  pages.push(1);
  if (_page > 3) pages.push('...');
  for (let i = Math.max(2, _page - 1); i <= Math.min(_totalPages - 1, _page + 1); i++) pages.push(i);
  if (_page < _totalPages - 2) pages.push('...');
  pages.push(_totalPages);
  return pages.map(p =>
    p === '...'
      ? '<span style="padding:0 6px;color:var(--text-muted)">…</span>'
      : `<button class="btn btn-sm${p === _page ? ' btn-primary' : ''}" onclick="window._scanGoPage(${p})" style="min-width:32px;${p === _page ? 'pointer-events:none' : ''}">${p}</button>`
  ).join('');
}

// ─── Init: load on first visit ──────────────────────────────
export function initPage() {
  _page = 1;
  loadScans();
}

// ─── Window exports ─────────────────────────────────────────
window._scanPerPageChange = onPerPageChange;
window._scanFilterProduct = onFilterProduct;
window._scanFilterCategory = onFilterCategory;
window._scanFilterResult = onFilterResult;
window._scanFilterCity = onFilterCity;
window._scanGoPage = goToPage;
window._scanClearFilters = clearAllFilters;
