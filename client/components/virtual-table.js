/**
 * TrustChecker v9.4 — Virtual Table Component
 * 
 * Viewport-recycling virtualized table for 100k+ rows.
 * Features: sort, filter, debounced search, sticky header,
 * column resize, infinite scroll.
 */

const ROW_HEIGHT = 44;
const BUFFER_ROWS = 10;
const SEARCH_DEBOUNCE_MS = 300;

/** Escape HTML for default cell values */
function _escapeCell(val) {
    const str = String(val);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render a virtualized table into a container element.
 * @param {string} containerId - ID of the container element
 * @param {Object} config
 * @param {Array} config.columns - [{ key, label, width?, sortable?, render? }]
 * @param {Array} config.data - Full dataset
 * @param {Function} [config.onRowClick] - (row, index) => void
 * @param {Function} [config.fetchMore] - async (offset, limit) => rows (for server-side paging)
 * @param {number} [config.pageSize] - Items per page for server-side
 * @param {string} [config.emptyMessage] - Message when no data
 */
export function renderVirtualTable(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
        columns = [],
        data = [],
        onRowClick = null,
        fetchMore = null,
        pageSize = 50,
        emptyMessage = 'No data available',
    } = config;

    // State
    let fullData = [...data];
    let filteredData = [...fullData];
    let sortCol = null;
    let sortDir = 'asc';
    let searchTerm = '';
    let scrollTop = 0;
    let searchTimeout = null;
    let isLoading = false;
    let hasMore = fetchMore != null;

    // ─── Build HTML ─────────────────────────────────────────────
    container.innerHTML = `
        <div class="vtable-wrapper" style="display:flex;flex-direction:column;height:100%;background:var(--bg-card,#1a1a2e);border-radius:12px;overflow:hidden;border:1px solid var(--border,rgba(255,255,255,0.08));">
            <div class="vtable-toolbar" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,0.08));">
                <div style="position:relative;flex:1;max-width:320px;">
                    <input type="text" class="vtable-search" placeholder="Search..."
                        style="width:100%;padding:8px 12px 8px 36px;background:var(--bg-input,rgba(255,255,255,0.05));border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text,#e0e0e0);font-size:13px;outline:none;" />
                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:0.4;">🔍</span>
                </div>
                <span class="vtable-count" style="font-size:12px;color:var(--text-muted,#888);"></span>
            </div>
            <div class="vtable-header-row" style="display:flex;padding:0 16px;background:var(--bg-header,rgba(255,255,255,0.03));border-bottom:1px solid var(--border,rgba(255,255,255,0.08));position:sticky;top:0;z-index:2;"></div>
            <div class="vtable-body" style="flex:1;overflow-y:auto;position:relative;">
                <div class="vtable-spacer" style="width:100%;"></div>
                <div class="vtable-visible-rows" style="position:absolute;top:0;left:0;right:0;"></div>
            </div>
            <div class="vtable-loading" style="display:none;text-align:center;padding:12px;color:var(--text-muted,#888);font-size:13px;">Loading more...</div>
        </div>
    `;

    const searchInput = container.querySelector('.vtable-search');
    const countLabel = container.querySelector('.vtable-count');
    const headerRow = container.querySelector('.vtable-header-row');
    const body = container.querySelector('.vtable-body');
    const spacer = container.querySelector('.vtable-spacer');
    const visibleRows = container.querySelector('.vtable-visible-rows');
    const loadingEl = container.querySelector('.vtable-loading');

    // ─── Header ─────────────────────────────────────────────────
    function renderHeader() {
        headerRow.innerHTML = columns.map(col => {
            const sortIcon = sortCol === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
            const cursor = col.sortable !== false ? 'cursor:pointer;' : '';
            const w = col.width ? `width:${col.width};min-width:${col.width};` : 'flex:1;';
            return `<div class="vtable-hcell" data-key="${col.key}"
                style="${w}padding:10px 8px;font-size:12px;font-weight:600;color:var(--text-muted,#aaa);text-transform:uppercase;letter-spacing:0.5px;${cursor}user-select:none;">
                ${col.label}${sortIcon}
            </div>`;
        }).join('');

        // Sort click handlers
        headerRow.querySelectorAll('.vtable-hcell').forEach(cell => {
            const key = cell.dataset.key;
            const col = columns.find(c => c.key === key);
            if (col && col.sortable !== false) {
                cell.addEventListener('click', () => {
                    if (sortCol === key) {
                        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortCol = key;
                        sortDir = 'asc';
                    }
                    applySort();
                    renderHeader();
                    renderVisibleRows();
                });
            }
        });
    }

    // ─── Rendering ──────────────────────────────────────────────
    function renderVisibleRows() {
        const bodyHeight = body.clientHeight;
        const totalHeight = filteredData.length * ROW_HEIGHT;
        spacer.style.height = `${totalHeight}px`;

        const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
        const endIdx = Math.min(filteredData.length, Math.ceil((scrollTop + bodyHeight) / ROW_HEIGHT) + BUFFER_ROWS);

        let html = '';
        for (let i = startIdx; i < endIdx; i++) {
            const row = filteredData[i];
            const top = i * ROW_HEIGHT;
            const rowClass = onRowClick ? 'cursor:pointer;' : '';
            const hover = 'transition:background 0.15s;';

            html += `<div class="vtable-row" data-idx="${i}"
                style="display:flex;position:absolute;top:${top}px;left:0;right:0;height:${ROW_HEIGHT}px;align-items:center;padding:0 16px;border-bottom:1px solid var(--border,rgba(255,255,255,0.04));${rowClass}${hover}"
                onmouseenter="this.style.background='rgba(255,255,255,0.03)'"
                onmouseleave="this.style.background='transparent'">`;

            for (const col of columns) {
                const w = col.width ? `width:${col.width};min-width:${col.width};` : 'flex:1;';
                const rawVal = row[col.key];
                // Custom renderers handle their own escaping; default values get auto-escaped
                const value = col.render ? col.render(rawVal, row) : _escapeCell(rawVal ?? '—');
                html += `<div style="${w}padding:0 8px;font-size:13px;color:var(--text,#e0e0e0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${value}</div>`;
            }
            html += '</div>';
        }

        visibleRows.innerHTML = html;
        countLabel.textContent = `${filteredData.length.toLocaleString()} rows`;

        // Click handlers
        if (onRowClick) {
            visibleRows.querySelectorAll('.vtable-row').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.dataset.idx, 10);
                    onRowClick(filteredData[idx], idx);
                });
            });
        }

        // Infinite scroll check
        if (hasMore && !isLoading && endIdx >= filteredData.length - 5) {
            loadMore();
        }
    }

    // ─── Sort ───────────────────────────────────────────────────
    function applySort() {
        if (!sortCol) return;
        filteredData.sort((a, b) => {
            let va = a[sortCol], vb = b[sortCol];
            if (va == null) return 1;
            if (vb == null) return -1;
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // ─── Search ─────────────────────────────────────────────────
    function applySearch() {
        if (!searchTerm) {
            filteredData = [...fullData];
        } else {
            const term = searchTerm.toLowerCase();
            filteredData = fullData.filter(row =>
                columns.some(col => {
                    const val = row[col.key];
                    return val != null && String(val).toLowerCase().includes(term);
                })
            );
        }
        applySort();
        renderVisibleRows();
    }

    // ─── Infinite Scroll ────────────────────────────────────────
    async function loadMore() {
        if (!fetchMore || isLoading) return;
        isLoading = true;
        loadingEl.style.display = 'block';
        try {
            const newRows = await fetchMore(fullData.length, pageSize);
            if (newRows && newRows.length > 0) {
                fullData.push(...newRows);
                applySearch();
            }
            if (!newRows || newRows.length < pageSize) {
                hasMore = false;
            }
        } catch (e) {
            console.error('[VTable] Fetch error:', e);
        } finally {
            isLoading = false;
            loadingEl.style.display = 'none';
        }
    }

    // ─── Event Listeners ────────────────────────────────────────
    body.addEventListener('scroll', () => {
        scrollTop = body.scrollTop;
        renderVisibleRows();
    });

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value;
            applySearch();
        }, SEARCH_DEBOUNCE_MS);
    });

    // ─── Initial Render ─────────────────────────────────────────
    renderHeader();
    applySearch();

    // ─── Public API ─────────────────────────────────────────────
    return {
        setData(newData) {
            fullData = [...newData];
            applySearch();
        },
        refresh() { renderVisibleRows(); },
        getFilteredCount() { return filteredData.length; },
        destroy() {
            clearTimeout(searchTimeout);
            container.innerHTML = '';
        },
    };
}
