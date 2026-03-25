/**
 * TrustChecker – Global QR Codes Management (Paginated + Filterable)
 */
import { State, render } from '../core/state.js';
import { API } from '../core/api.js';
import { timeAgo } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

// Detect reverse-proxy prefix (e.g. /trustchecker)
const _appPrefix = (() => {
  const segs = window.location.pathname.split('/').filter(Boolean);
  return segs.length > 0 && !segs[0].includes('.') ? '/' + segs[0] : '';
})();

// ─── Local pagination state ─────────────────────────────────
let _page = 1;
let _perPage = 50;
let _filterSearch = '';
let _filterBatch = '';
let _filterStatus = '';
let _total = 0;
let _totalPages = 0;
let _codes = [];
let _loading = false;

// ─── Load scan events from API ──────────────────────────────
async function loadQrCodes() {
  _loading = true;
  render();
  try {
    const offset = (_page - 1) * _perPage;
    let url = `/products/codes/all?limit=${_perPage}&offset=${offset}`;
    if (_filterSearch) url += `&search=${encodeURIComponent(_filterSearch)}`;
    if (_filterBatch) url += `&batch_id=${encodeURIComponent(_filterBatch)}`;
    if (_filterStatus) url += `&status=${encodeURIComponent(_filterStatus)}`;

    const res = await API.get(url);
    _codes = res.codes || [];
    _total = res.total || 0;
    _totalPages = Math.ceil(_total / _perPage) || 1;
    State.qrCodes = _codes;
  } catch (e) {
    showToast('Failed to load QR codes', 'error');
    _codes = [];
  }
  _loading = false;
  render();
}

// ─── Event handlers ─────────────────────────────────────────
function onPerPageChange(val) { _perPage = Number(val); _page = 1; loadQrCodes(); }
function onSearchChange(val) { _filterSearch = val; _page = 1; loadQrCodes(); }
function onFilterBatch(val) { _filterBatch = val; _page = 1; loadQrCodes(); }
function onFilterStatus(val) { _filterStatus = val; _page = 1; loadQrCodes(); }
function goToPage(p) { _page = Math.max(1, Math.min(p, _totalPages)); loadQrCodes(); }

function clearAllFilters() {
  _filterSearch = '';
  _filterBatch = '';
  _filterStatus = '';
  _page = 1;
  const searchEl = document.getElementById('qrCodeSearchInput');
  if (searchEl) searchEl.value = '';
  const batchEl = document.getElementById('qrCodeBatchInput');
  if (batchEl) batchEl.value = '';
  loadQrCodes();
}

async function handleCopyQrCode(qrData) {
  try {
    const origin = window.location.origin;
    let baseUrl = origin;
    if (window.location.pathname.startsWith('/trustchecker')) baseUrl += '/trustchecker';
    const link = `${baseUrl}/check?code=${encodeURIComponent(qrData)}`;
    await navigator.clipboard.writeText(link);
    showToast('Copied verification link');
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
}

async function handleDeleteQrCode(id) {
  if (!confirm('Are you certain you want to delete this QR code? It will no longer verify.')) return;
  try {
    await API.delete(`/products/codes/${id}`);
    showToast('QR Code deleted');
    loadQrCodes(); // Refresh
  } catch (e) {
    showToast(e.message || 'Failed to delete QR code', 'error');
  }
}

// ─── Render ─────────────────────────────────────────────────
export function renderPage() {
  const from = _total === 0 ? 0 : (_page - 1) * _perPage + 1;
  const to = Math.min(_page * _perPage, _total);
  const hasFilters = _filterSearch || _filterBatch || _filterStatus;
  const isAdmin = ['super_admin', 'company_admin', 'org_owner'].includes(State.user?.role || State.user?.active_role);

  return `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div class="card-title">📱 QR Codes Management</div>
      </div>

      <!-- Filter Bar -->
      <div style="display:flex;gap:10px;padding:0 20px 16px;flex-wrap:wrap;align-items:center">
        <input id="qrCodeSearchInput" type="text" class="input" placeholder="Search ID, Code, Product..." 
               value="${_filterSearch}" style="max-width:240px;font-size:0.78rem;padding:6px 10px" 
               onkeyup="if(event.key==='Enter') window._qrSearchChange(this.value)">
        <input id="qrCodeBatchInput" type="text" class="input" placeholder="Batch Number..." 
               value="${_filterBatch}" style="max-width:160px;font-size:0.78rem;padding:6px 10px" 
               onkeyup="if(event.key==='Enter') window._qrFilterBatch(this.value)">
               
        <select class="input" style="max-width:160px;font-size:0.78rem;padding:6px 10px" onchange="window._qrFilterStatus(this.value)">
          <option value="">All Statuses</option>
          <option value="scanned" ${_filterStatus === 'scanned' ? 'selected' : ''}>Scanned</option>
          <option value="not_scanned" ${_filterStatus === 'not_scanned' ? 'selected' : ''}>Not Scanned</option>
          <option value="deleted" ${_filterStatus === 'deleted' ? 'selected' : ''}>Deleted</option>
        </select>
        
        <button class="btn btn-sm" onclick="window._qrSearchChange(document.getElementById('qrCodeSearchInput').value)">Search</button>
        ${hasFilters ? `<button class="btn btn-sm" onclick="window._qrClearFilters()" style="font-size:0.72rem;color:var(--rose)">✕ Clear</button>` : ''}
        
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted)">
          <span>Show</span>
          <select class="input" style="width:70px;font-size:0.78rem;padding:6px 8px" onchange="window._qrPerPageChange(this.value)">
            ${[20, 50, 100, 500].map(n => `<option value="${n}" ${_perPage === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
          <span>per page</span>
        </div>
      </div>

      ${_loading ? `
        <div style="padding:60px;text-align:center;color:var(--text-muted)">
          <div class="spinner" style="margin:0 auto 12px"></div>
          Loading codes...
        </div>
      ` : `
        <div class="table-container">
          <table>
            <tr>
                <th style="width:64px;text-align:center">QR</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Batch</th>
                <th style="width:120px">Status</th>
                <th>Created</th>
                <th style="text-align:right;width:90px">Actions</th>
            </tr>
            ${_codes.length ? _codes.map(c => {
              const isScanned = (c.scan_count || 0) > 0;
              const scanCount = c.scan_count || 0;
              return `
              <tr style="${_filterStatus === 'deleted' ? 'opacity:0.5' : ''}">
                <td style="text-align:center;padding:8px 6px">
                  ${c.image_key
                    ? `<img src="${_appPrefix}/qr/${c.image_key}" alt="QR" style="width:44px;height:44px;border-radius:6px;border:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,0.06);transition:transform .2s ease" onmouseover="this.style.transform='scale(1.8)';this.style.zIndex='10';this.style.position='relative'" onmouseout="this.style.transform='';this.style.zIndex='';this.style.position=''" loading="lazy">`
                    : `<div style="width:44px;height:44px;background:var(--bg-input);border-radius:6px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div>`}
                </td>
                <td style="font-weight:600;color:var(--text-primary);font-size:0.82rem">${c.product_name || '\u2014'}</td>
                <td><span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;padding:3px 8px;background:var(--bg-input);border-radius:4px;color:var(--text-secondary)">${c.product_sku || '\u2014'}</span></td>
                <td>${c.batch_id ? `<span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;padding:3px 8px;background:var(--bg-input);border-radius:4px;color:var(--text-secondary)">${c.batch_id}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td>
                  ${_filterStatus === 'deleted'
                    ? '<span class="badge suspicious">Deleted</span>'
                    : isScanned
                      ? `<div style="display:flex;align-items:center;gap:6px">
                          <span style="width:8px;height:8px;border-radius:50%;background:var(--emerald);display:inline-block;box-shadow:0 0 6px var(--emerald-glow)"></span>
                          <span style="font-size:0.75rem;font-weight:600;color:var(--emerald)">Scanned</span>
                        </div>
                        <div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px;padding-left:14px">${scanCount} verification${scanCount > 1 ? 's' : ''}</div>`
                      : `<div style="display:flex;align-items:center;gap:6px">
                          <span style="width:8px;height:8px;border-radius:50%;background:var(--border-hover);display:inline-block"></span>
                          <span style="font-size:0.75rem;font-weight:500;color:var(--text-muted)">Pending</span>
                        </div>`
                  }
                </td>
                <td class="event-time">${timeAgo(c.generated_at)}</td>
                <td style="text-align:right">
                  <button class="btn btn-sm" onclick="window._qrCopyCode('${c.qr_data || c.code}')" title="Copy Verification Link" style="padding:5px 8px;font-size:0.7rem;border-radius:6px">📋</button>
                </td>
              </tr>
            `}).join('') : '<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-muted);font-size:0.85rem"><div style="margin-bottom:8px;font-size:1.5rem">📭</div>No QR codes found</td></tr>'}
          </table>
        </div>

        <!-- Pagination -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-top:1px solid var(--border);font-size:0.78rem">
          <div style="color:var(--text-muted)">
            ${_total > 0 ? `Showing <strong>${from.toLocaleString()}</strong>–<strong>${to.toLocaleString()}</strong> of <strong>${_total.toLocaleString()}</strong> codes` : 'No results'}
          </div>
          ${_totalPages > 1 ? `
            <div style="display:flex;align-items:center;gap:4px">
              <button class="btn btn-sm" onclick="window._qrGoPage(1)" ${_page <= 1 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>«</button>
              <button class="btn btn-sm" onclick="window._qrGoPage(${_page - 1})" ${_page <= 1 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>‹ Prev</button>
              ${_buildPageNumbers()}
              <button class="btn btn-sm" onclick="window._qrGoPage(${_page + 1})" ${_page >= _totalPages ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>Next ›</button>
              <button class="btn btn-sm" onclick="window._qrGoPage(${_totalPages})" ${_page >= _totalPages ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>»</button>
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
      .map(p => `<button class="btn btn-sm${p === _page ? ' btn-primary' : ''}" onclick="window._qrGoPage(${p})" style="min-width:32px;${p === _page ? 'pointer-events:none' : ''}">${p}</button>`)
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
      : `<button class="btn btn-sm${p === _page ? ' btn-primary' : ''}" onclick="window._qrGoPage(${p})" style="min-width:32px;${p === _page ? 'pointer-events:none' : ''}">${p}</button>`
  ).join('');
}

// ─── Init: load on first visit ──────────────────────────────
export function initPage() {
  _page = 1;
  loadQrCodes();
}

// ─── Window exports ─────────────────────────────────────────
window._qrPerPageChange = onPerPageChange;
window._qrSearchChange = onSearchChange;
window._qrFilterBatch = onFilterBatch;
window._qrFilterStatus = onFilterStatus;
window._qrGoPage = goToPage;
window._qrClearFilters = clearAllFilters;
window._qrCopyCode = handleCopyQrCode;
window._qrDeleteCode = handleDeleteQrCode;
