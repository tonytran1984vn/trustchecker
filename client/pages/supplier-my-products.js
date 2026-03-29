import { API } from '../core/api.js';
import { State } from '../core/state.js';
import { showToast } from '../components/toast.js';

// ── Permission helpers ──────────────────────────────────────────
const WRITABLE_ROLES = ['supplier_contributor', 'company_admin', 'admin', 'org_owner', 'super_admin'];

function canWrite() {
    const user = State.user || {};
    const role = user.active_role || user.role || '';
    if (user.permissions && Array.isArray(user.permissions)) {
        return user.permissions.includes('product:create') || user.permissions.includes('product:update');
    }
    return WRITABLE_ROLES.includes(role);
}

function syncBadge(status) {
    if (status === 'synced') return '<span class="smp-badge smp-badge-synced">✓ Synced</span>';
    if (status === 'failed') return '<span class="smp-badge smp-badge-failed">✗ Failed</span>';
    return '<span class="smp-badge smp-badge-pending">⏳ Pending</span>';
}

function roleBadges(p) {
    let html = '';
    if (p.has_outbound) html += '<span class="smp-badge smp-badge-sell">📤 Selling</span>';
    if (p.has_inbound) html += '<span class="smp-badge smp-badge-buy">📥 Purchased</span>';
    if (p.has_inventory) html += '<span class="smp-badge smp-badge-inv">📦 In Stock</span>';
    if (!html) html = '<span class="smp-badge smp-badge-neutral">— No Activity</span>';
    return html;
}

export function renderPage() {
    const addBtn = canWrite() ? `
        <button class="smp-btn-add" onclick="smpOpenModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Product
        </button>` : '';

    return `
    <style>
      .smp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .smp-header h1 { margin: 0; font-size: 1.5rem; color: var(--text, #1e293b); font-weight: 700; }
      .smp-header p { margin: 4px 0 0 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
      .smp-btn-add { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.2); transition: all 0.2s; }
      .smp-btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.3); }
      
      /* ── Tabs ── */
      .smp-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg-muted, #f1f5f9); padding: 4px; border-radius: 12px; }
      .smp-tab { flex: 1; padding: 10px 16px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted, #64748b); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; text-align: center; font-family: inherit; }
      .smp-tab:hover { color: var(--text, #1e293b); background: rgba(255,255,255,0.5); }
      .smp-tab.active { background: var(--card, #ffffff); color: var(--text, #1e293b); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .smp-tab-count { display: inline-block; background: rgba(99,102,241,0.1); color: #6366f1; font-size: 0.7rem; padding: 1px 6px; border-radius: 10px; margin-left: 5px; font-weight: 700; }
      .smp-tab.active .smp-tab-count { background: rgba(99,102,241,0.15); }
      
      /* ── Enhanced Toolbar ── */
      .smp-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; align-items: center; justify-content: space-between; }
      .smp-toolbar-left, .smp-toolbar-right { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .smp-filter-input, .smp-filter-select { padding: 8px 12px; border: 1px solid var(--border, #cbd5e1); border-radius: 8px; font-size: 0.85rem; color: var(--text, #1e293b); background: var(--bg-element, #fff); font-family: inherit; }
      .smp-filter-input:focus, .smp-filter-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
      .smp-filter-input { width: 220px; }
      .smp-filter-select { cursor: pointer; }
      
      .smp-btn-outline { background: transparent; color: var(--text, #1e293b); border: 1px solid var(--border, #cbd5e1); padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
      .smp-btn-outline:hover { background: var(--hover, #f1f5f9); border-color: #94a3b8; }
      .smp-btn-danger { background: #fee2e2; color: #b91c1c; border: 1px solid rgba(185,28,28,0.2); padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
      .smp-btn-danger:hover { background: #fca5a5; }

      .smp-card { background: var(--card, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 16px; padding: 24px; }
      
      .smp-table { width: 100%; border-collapse: collapse; text-align: left; }
      .smp-table th { padding: 12px 16px; border-bottom: 1px solid var(--border, #e2e8f0); color: var(--text-muted, #64748b); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
      .smp-table td { padding: 14px 16px; border-bottom: 1px solid var(--border, #e2e8f0); color: var(--text, #1e293b); font-size: 0.9rem; }
      .smp-table tr:hover td { background: var(--hover, rgba(0,0,0,0.02)); }
      
      .smp-sortable { cursor: pointer; user-select: none; }
      .smp-sortable:hover { color: #3b82f6; }
      .smp-sort-icon { display: inline-block; margin-left: 4px; font-size: 0.7rem; color: #94a3b8; }
      
      .smp-sku { font-family: monospace; color: var(--text-muted, #64748b); background: var(--bg-muted, #f1f5f9); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }
      .smp-cat { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: rgba(99,102,241,0.1); color: #4f46e5; text-transform: capitalize; }
      .smp-price { font-weight: 600; color: #10b981; }
      
      /* ── Badges ── */
      .smp-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; white-space: nowrap; display: inline-block; margin-right: 3px; }
      .smp-badge-sell { background: #dcfce7; color: #166534; border: 1px solid rgba(22,101,52,0.15); }
      .smp-badge-buy { background: #dbeafe; color: #1e40af; border: 1px solid rgba(30,64,175,0.15); }
      .smp-badge-inv { background: #ede9fe; color: #6d28d9; border: 1px solid rgba(109,40,217,0.15); }
      .smp-badge-neutral { background: var(--bg-muted, #f1f5f9); color: var(--text-muted, #94a3b8); }
      .smp-badge-synced { background: #dcfce7; color: #166534; border: 1px solid rgba(22,101,52,0.2); }
      .smp-badge-failed { background: #fee2e2; color: #991b1b; border: 1px solid rgba(153,27,27,0.2); }
      .smp-badge-pending { background: #fef9c3; color: #854d0e; border: 1px solid rgba(133,77,14,0.2); }
      
      .smp-btn-edit { background: rgba(59,130,246,0.1); color: #2563eb; border: 1px solid rgba(59,130,246,0.3); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
      .smp-btn-edit:hover { background: rgba(59,130,246,0.2); }
      .smp-btn-del { background: rgba(239,68,68,0.08); color: #dc2626; border: 1px solid rgba(239,68,68,0.25); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-left: 4px; }
      .smp-btn-del:hover { background: rgba(239,68,68,0.15); }

      .smp-group-header td { background: var(--bg-muted, #f8fafc); cursor: pointer; font-weight: 700; border-top: 2px solid var(--border, #e2e8f0); transition: background 0.2s; }
      .smp-group-header:hover td { background: #f1f5f9; }
      .smp-group-row { display: table-row; }
      .smp-group-row.hidden { display: none; }
      .smp-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; margin: 0; padding: 0; border-radius: 4px; border: 1px solid var(--border, #cbd5e1); }

      /* Modal */
      .smp-modal-underlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px); z-index: 999; display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
      .smp-modal-underlay.visible { display: flex; opacity: 1; }
      .smp-modal { background: var(--card, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 16px; padding: 32px; width: 100%; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); transform: translateY(20px); transition: transform 0.2s; }
      .smp-modal-underlay.visible .smp-modal { transform: translateY(0); }
      
      .smp-modal-header { font-size: 1.25rem; font-weight: 700; color: var(--text, #1e293b); margin-bottom: 24px; }
      .smp-form-group { margin-bottom: 16px; }
      .smp-form-group label { display: block; font-size: 0.8rem; color: var(--text-muted, #64748b); font-weight: 600; margin-bottom: 6px; }
      .smp-form-group input, .smp-form-group select { width: 100%; padding: 10px 14px; background: var(--bg-element, #ffffff); border: 1px solid var(--border, #cbd5e1); border-radius: 8px; color: var(--text, #1e293b); font-size: 0.9rem; font-family: inherit; }
      .smp-form-group input:focus, .smp-form-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
      
      .smp-modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; }
      .smp-btn-cancel { background: transparent; color: var(--text-muted, #64748b); border: 1px solid var(--border, #cbd5e1); padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
      .smp-btn-cancel:hover { background: var(--hover, #f1f5f9); color: var(--text, #1e293b); }
      .smp-btn-save { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
      .smp-btn-save:hover { background: #2563eb; }

      .smp-readonly-notice { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.15); border-radius: 8px; color: var(--text-muted, #64748b); font-size: 0.82rem; margin-bottom: 16px; }
      .smp-pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; padding: 12px 0; }
      .smp-page-btn { background: var(--bg-element, #ffffff); border: 1px solid var(--border, #cbd5e1); color: var(--text, #1e293b); padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
      .smp-page-btn:hover:not(:disabled) { background: var(--hover, #f1f5f9); border-color: #3b82f6; }
      .smp-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .smp-page-info { font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }
    </style>

    <div class="smp-header">
        <div>
            <h1>Products</h1>
            <p>Product catalog with transaction-derived roles.</p>
        </div>
        ${addBtn}
    </div>

    ${!canWrite() ? '<div class="smp-readonly-notice">🔒 You have read-only access to this catalog. Contact an admin to request edit permissions.</div>' : ''}

    <!-- Tabs -->
    <div class="smp-tabs" id="smpTabs">
        <button class="smp-tab active" data-view="all" onclick="smpSwitchTab('all')">All <span class="smp-tab-count" id="smpCountAll">–</span></button>
        <button class="smp-tab" data-view="selling" onclick="smpSwitchTab('selling')">Selling <span class="smp-tab-count" id="smpCountSelling">–</span></button>
        <button class="smp-tab" data-view="purchasing" onclick="smpSwitchTab('purchasing')">Purchasing <span class="smp-tab-count" id="smpCountPurchasing">–</span></button>
        <button class="smp-tab" data-view="inventory" onclick="smpSwitchTab('inventory')">Inventory <span class="smp-tab-count" id="smpCountInventory">–</span></button>
    </div>

    <!-- Enhanced Toolbar -->
    <div class="smp-toolbar">
        <div class="smp-toolbar-left">
            <input type="text" id="smpSearchFilter" class="smp-filter-input" placeholder="Search Name or SKU..." onkeyup="smpDebounceFilter()" />
            <select id="smpCatFilter" class="smp-filter-select" onchange="smpApplyFilters()">
                <option value="all">All Categories</option>
                <option value="raw_material">Raw Material</option>
                <option value="component">Component</option>
                <option value="finished_goods">Finished Goods</option>
            </select>
            <select id="smpSyncFilter" class="smp-filter-select" onchange="smpApplyFilters()">
                <option value="all">All Sync Status</option>
                <option value="synced">✓ Synced</option>
                <option value="pending">⏳ Pending</option>
                <option value="failed">✗ Failed</option>
            </select>
        </div>
        <div class="smp-toolbar-right">
            <label style="font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" class="smp-checkbox" id="smpGroupToggle" onchange="smpToggleGroupView()" />
                Group by Name
            </label>
            <button class="smp-btn-outline" onclick="smpExportCSV()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export CSV
            </button>
        </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div id="smpBulkActions" style="display:none; background: #fff8f1; border: 1px solid #fed7aa; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; align-items: center; justify-content: space-between;">
        <div style="font-weight: 600; color: #9a3412;"><span id="smpSelectedCount">0</span> items selected</div>
        <button class="smp-btn-danger" onclick="smpBulkArchive()">Archive Selected</button>
    </div>

    <div class="smp-card">
        <div style="overflow-x:auto;">
            <table class="smp-table">
                <thead>
                    <tr>
                        ${canWrite() ? '<th style="width: 40px"><input type="checkbox" class="smp-checkbox" id="smpSelectAll" onchange="smpToggleAll(this.checked)"></th>' : ''}
                        <th class="smp-sortable" onclick="smpSortBy('name')">Product Name <span class="smp-sort-icon" id="smpSort_name">↕</span></th>
                        <th class="smp-sortable" onclick="smpSortBy('sku')">SKU <span class="smp-sort-icon" id="smpSort_sku">↕</span></th>
                        <th>Activity Status</th>
                        <th class="smp-sortable" onclick="smpSortBy('category')">Category <span class="smp-sort-icon" id="smpSort_category">↕</span></th>
                        <th style="width:70px">Origin</th>
                        <th class="smp-sortable" onclick="smpSortBy('price')">Price ($) <span class="smp-sort-icon" id="smpSort_price">↕</span></th>
                        ${canWrite() ? '<th style="text-align:right; width: 140px;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody id="smpProductsTbody">
                    <tr><td colspan="${canWrite() ? 8 : 6}" style="text-align:center; padding: 40px; color:#64748b;">Loading products...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Pagination -->
    <div class="smp-pagination" id="smpPagination" style="display:none;"></div>

    <!-- Add/Edit Modal -->
    <div id="smpModal" class="smp-modal-underlay">
        <div class="smp-modal">
            <div class="smp-modal-header" id="smpModalTitle">Add New Product</div>
            <form id="smpForm" onsubmit="smpSaveProduct(event)">
                <input type="hidden" id="smpId" />
                <div class="smp-form-group">
                    <label>Product Name <span style="color:#ef4444">*</span></label>
                    <input type="text" id="smpName" required placeholder="e.g. Premium Arabica Beans" />
                </div>
                <div class="smp-form-group">
                    <label>SKU <span style="color:#ef4444">*</span></label>
                    <input type="text" id="smpSku" required placeholder="e.g. PAB-100" />
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="smp-form-group">
                        <label>Category</label>
                        <select id="smpCat">
                            <option value="raw_material">Raw Material</option>
                            <option value="component">Component</option>
                            <option value="finished_goods">Finished Goods</option>
                        </select>
                    </div>
                    <div class="smp-form-group">
                        <label>Origin Country</label>
                        <input type="text" id="smpCountry" placeholder="e.g. VN, US, BR" maxlength="2" style="text-transform:uppercase" />
                    </div>
                </div>
                <div class="smp-form-group">
                    <label>Unit Price (USD)</label>
                    <input type="number" id="smpPrice" step="0.01" min="0" placeholder="0.00" />
                </div>
                <div class="smp-form-group">
                    <label>Description</label>
                    <textarea id="smpDesc" rows="3" placeholder="Brief product description..." style="width:100%; padding:10px 14px; background:var(--bg-element,#fff); border:1px solid var(--border,#cbd5e1); border-radius:8px; color:var(--text,#1e293b); font-size:0.9rem; font-family:inherit; resize:vertical;"></textarea>
                </div>
                
                <div class="smp-modal-actions">
                    <button type="button" class="smp-btn-cancel" onclick="smpCloseModal()">Cancel</button>
                    <button type="submit" class="smp-btn-save">Save Product</button>
                </div>
            </form>
        </div>
    </div>
    `;
}

// ── Globals & State ──────────────────────────────────────────────
let _currentView = 'all';
let _currentOffset = 0;
let _filterSearch = '';
let _filterCat = 'all';
let _filterSync = 'all';
let _sortBy = 'created_at';
let _sortDir = 'desc';
let _isGroupedView = false;
let _selectedIds = new Set();
const PAGE_SIZE = 50;

export async function initPage() {
    // Sync state from URL hash
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
        const params = new URLSearchParams(hashParts[1]);
        if (params.has('view')) _currentView = params.get('view');
        if (params.has('offset')) _currentOffset = parseInt(params.get('offset')) || 0;
    }
    
    // Init DOM inputs
    setTimeout(() => {
        document.getElementById('smpSearchFilter').value = _filterSearch;
        document.getElementById('smpCatFilter').value = _filterCat;
        document.getElementById('smpSyncFilter').value = _filterSync;
        document.getElementById('smpGroupToggle').checked = _isGroupedView;
        smpUpdateSortIcons();
        
        // Sync tabs visually
        document.querySelectorAll('.smp-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === _currentView);
        });
        smpLoadData();
    }, 50);
}

window.smpSwitchTab = function(view) {
    _currentView = view;
    _currentOffset = 0;
    _selectedIds.clear();
    smpUpdateBulkUI();
    document.querySelectorAll('.smp-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.view === view);
    });
    smpLoadData();
};

let _debounceTimer;
window.smpDebounceFilter = function() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        smpApplyFilters();
    }, 400);
};

window.smpApplyFilters = function() {
    _filterSearch = document.getElementById('smpSearchFilter').value.trim();
    _filterCat = document.getElementById('smpCatFilter').value;
    _filterSync = document.getElementById('smpSyncFilter').value;
    _currentOffset = 0;
    _selectedIds.clear();
    smpUpdateBulkUI();
    smpLoadData();
};

window.smpSortBy = function(col) {
    if (_sortBy === col) {
        _sortDir = _sortDir === 'desc' ? 'asc' : 'desc';
    } else {
        _sortBy = col;
        _sortDir = col === 'price' ? 'desc' : 'asc';
    }
    smpUpdateSortIcons();
    smpLoadData();
};

window.smpUpdateSortIcons = function() {
    document.querySelectorAll('.smp-sort-icon').forEach(el => el.innerHTML = '↕');
    const activeIcon = document.getElementById(`smpSort_${_sortBy}`);
    if (activeIcon) activeIcon.innerHTML = _sortDir === 'desc' ? '↓' : '↑';
};

window.smpToggleGroupView = function() {
    _isGroupedView = document.getElementById('smpGroupToggle').checked;
    smpRenderTable();
};

window.smpExportCSV = function() {
    const products = Object.values(window._smpCache || {});
    if (products.length === 0) return showToast('No data to export', 'error');
    
    let csv = 'ID,Name,SKU,Roles,Category,Origin,Price,Sync_Status\n';
    products.forEach(p => {
        const rolesArr = [];
        if (p.has_outbound) rolesArr.push('Selling');
        if (p.has_inbound) rolesArr.push('Purchasing');
        if (p.has_inventory) rolesArr.push('Inventory');
        const roles = rolesArr.join('/');
        
        csv += `"${p.id}","${(p.name||'').replace(/"/g,'""')}","${p.sku}","${roles}","${p.category||''}","${p.origin_country||''}","${p.price||0}","${p.sync_status||'pending'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'supplier_products_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

window.smpLoadData = async function(silent = false) {
    const tbody = document.getElementById('smpProductsTbody');
    if (!tbody) return;
    const writable = canWrite();
    const cols = writable ? 8 : 6;
    
    const baseUrl = window.location.hash.split('?')[0];
    const newHash = `${baseUrl}?view=${_currentView}&offset=${_currentOffset}`;
    if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
    }

    if (!silent) {
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center; padding: 40px; color:#64748b;">Loading products...</td></tr>`;
    }

    try {
        const q = new URLSearchParams({ 
            view: _currentView, 
            limit: PAGE_SIZE, 
            offset: _currentOffset, 
            sort_by: _sortBy, 
            sort_dir: _sortDir 
        });
        if (_filterSearch) q.set('search', _filterSearch);
        if (_filterCat !== 'all') q.set('category', _filterCat);
        if (_filterSync !== 'all') q.set('sync_status', _filterSync);
        
        const res = await API.get(`/supplier-portal/my/products?${q.toString()}`);
        const products = res.products || [];
        const counts = res.counts || {};
        const total = res.total || 0;

        const countMap = { All: 'all', Selling: 'selling', Purchasing: 'purchasing', Inventory: 'inventory' };
        for (const [label, key] of Object.entries(countMap)) {
            const el = document.getElementById(`smpCount${label}`);
            if (el) el.textContent = counts[key] != null ? Number(counts[key]).toLocaleString() : '–';
        }

        if (products.length === 0) {
            const emptyMsg = _currentView === 'all'
                ? 'No products in your catalog yet.'
                : `No products with ${_currentView} activity found.`;
            tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center; padding: 50px; color:#94a3b8;"><div style="font-size:3rem;margin-bottom:12px;opacity:0.3">📦</div>${emptyMsg}</td></tr>`;
            return;
        }

        window._smpCache = {};
        products.forEach(p => window._smpCache[p.id] = p);
        
        // Re-check selected IDs against loaded cache to prevent ghost selections
        const loadedIds = new Set(products.map(p => p.id));
        for (let id of _selectedIds) if (!loadedIds.has(id)) _selectedIds.delete(id);
        
        smpRenderTable();

        const pagDiv = document.getElementById('smpPagination');
        if (pagDiv && total > PAGE_SIZE) {
            const page = Math.floor(_currentOffset / PAGE_SIZE) + 1;
            const totalPages = Math.ceil(total / PAGE_SIZE);
            pagDiv.style.display = 'flex';
            pagDiv.innerHTML = `
                <button class="smp-page-btn" onclick="smpPagePrev()" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
                <span class="smp-page-info">Page ${page} of ${totalPages}</span>
                <button class="smp-page-btn" onclick="smpPageNext()" ${page >= totalPages ? 'disabled' : ''}>Next →</button>
            `;
        } else if (pagDiv) {
            pagDiv.style.display = 'none';
        }
    } catch (err) {
        console.error('[Supplier Portal] Data load error:', err);
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center; padding: 30px; color:#ef4444; font-weight:600;">Failed to load products. Please check your connection.</td></tr>`;
        showToast('Error loading products', 'error');
    }
};

window.smpToggleAll = function(checked) {
    const products = Object.values(window._smpCache || {});
    if (checked) {
        products.forEach(p => _selectedIds.add(p.id));
    } else {
        _selectedIds.clear();
    }
    document.querySelectorAll('.smp-row-checkbox').forEach(cb => cb.checked = checked);
    smpUpdateBulkUI();
};

window.smpToggleRow = function(id, checked) {
    if (checked) _selectedIds.add(id);
    else _selectedIds.delete(id);
    
    const selectAll = document.getElementById('smpSelectAll');
    if (selectAll) {
        const totalCount = Object.keys(window._smpCache || {}).length;
        selectAll.checked = (totalCount > 0 && _selectedIds.size === totalCount);
    }
    smpUpdateBulkUI();
};

window.smpUpdateBulkUI = function() {
    const bar = document.getElementById('smpBulkActions');
    if (!bar) return;
    if (_selectedIds.size > 0) {
        bar.style.display = 'flex';
        document.getElementById('smpSelectedCount').textContent = _selectedIds.size;
    } else {
        bar.style.display = 'none';
    }
};

window.smpBulkArchive = async function() {
    if (_selectedIds.size === 0) return;
    if (!confirm(`Archive ${_selectedIds.size} selected items?`)) return;
    try {
        await API.post('/supplier-portal/my/products/bulk-archive', { productIds: Array.from(_selectedIds) });
        showToast('Bulk archive successful', 'success');
        _selectedIds.clear();
        smpLoadData();
    } catch(err) {
        showToast(err.message || 'Failed to bulk archive', 'error');
    }
};

window.smpToggleGroupCollapse = function(groupId) {
    document.querySelectorAll(`.smp-group-row-${groupId}`).forEach(el => el.classList.toggle('hidden'));
};

window.smpRenderTable = function() {
    const tbody = document.getElementById('smpProductsTbody');
    if (!tbody) return;
    const writable = canWrite();
    const products = Object.values(window._smpCache || {});
    let html = '';
    
    const renderRow = (p, hiddenClass = '') => {
        const roles = roleBadges(p);
        const sync = syncBadge(p.sync_status || 'pending');
        const isChecked = _selectedIds.has(p.id);
        
        return `
            <tr class="${hiddenClass}">
                ${writable ? `<td><input type="checkbox" class="smp-checkbox smp-row-checkbox" ${isChecked ? 'checked' : ''} onchange="smpToggleRow('${p.id}', this.checked)"></td>` : ''}
                <td>
                    <div style="font-weight:700; color:var(--text, #1e293b); font-size: 0.95rem; margin-bottom:4px;">${p.name}</div>
                    <div style="display:flex; gap: 4px; align-items:center; flex-wrap: wrap;">${sync}</div>
                </td>
                <td><span class="smp-sku">${p.sku}</span></td>
                <td><div style="display:flex; gap: 3px; flex-wrap: wrap;">${roles}</div></td>
                <td><span class="smp-cat">${(p.category || 'misc').replace(/_/g, ' ')}</span></td>
                <td>${p.origin_country || '-'}</td>
                <td><span class="smp-price">$${Number(p.price || 0).toFixed(2)}</span></td>
                ${writable ? `<td style="text-align:right">
                    <button class="smp-btn-edit" onclick="smpEditProduct('${p.id}')">Edit</button>
                    <button class="smp-btn-del" onclick="smpDeleteProduct('${p.id}','${p.name.replace(/'/g, "\\'")}')">Archive</button>
                </td>` : ''}
            </tr>
        `;
    };

    if (_isGroupedView) {
        const groups = {};
        products.forEach(p => {
            if (!groups[p.name]) groups[p.name] = [];
            groups[p.name].push(p);
        });
        
        let gIndex = 0;
        for (let name in groups) {
            gIndex++;
            html += `
                <tr class="smp-group-header" onclick="smpToggleGroupCollapse('${gIndex}')">
                    <td colspan="${writable ? 8 : 6}">
                        <span style="display:inline-block; width: 20px; color: #94a3b8; font-size: 0.8rem;">▼</span>
                        ${name} <span style="color:#64748b; font-weight: normal; font-size:0.85rem; margin-left: 8px;">(${groups[name].length} items)</span>
                    </td>
                </tr>
            `;
            groups[name].forEach(p => html += renderRow(p, `smp-group-row smp-group-row-${gIndex}`));
        }
    } else {
        products.forEach(p => html += renderRow(p));
    }
    
    tbody.innerHTML = html;
    
    const selectAll = document.getElementById('smpSelectAll');
    if (selectAll) {
        selectAll.checked = (products.length > 0 && _selectedIds.size === products.length);
    }
    smpUpdateBulkUI();
};

window.smpOpenModal = function() {
    document.getElementById('smpForm').reset();
    document.getElementById('smpId').value = '';
    document.getElementById('smpSku').disabled = false;
    document.getElementById('smpModalTitle').innerText = 'Add New Product';
    document.getElementById('smpModal').classList.add('visible');
};

window.smpCloseModal = function() {
    document.getElementById('smpModal').classList.remove('visible');
};

window.smpEditProduct = function(id) {
    const p = window._smpCache?.[id];
    if (!p) return;
    
    document.getElementById('smpId').value = p.id;
    document.getElementById('smpName').value = p.name || '';
    document.getElementById('smpSku').value = p.sku || '';
    document.getElementById('smpSku').disabled = true;
    document.getElementById('smpCat').value = p.category || 'raw_material';
    document.getElementById('smpCountry').value = p.origin_country || '';
    document.getElementById('smpPrice').value = p.price || '';
    document.getElementById('smpDesc').value = p.description || '';
    
    document.getElementById('smpModalTitle').innerText = 'Edit Product';
    document.getElementById('smpModal').classList.add('visible');
};

window.smpSaveProduct = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.smp-btn-save');
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Saving...';
    
    const id = document.getElementById('smpId').value;
    const isEdit = !!id;
    
    const payload = {
        name: document.getElementById('smpName').value.trim(),
        sku: document.getElementById('smpSku').value.trim(),
        category: document.getElementById('smpCat').value,
        origin_country: document.getElementById('smpCountry').value.toUpperCase().trim(),
        price: parseFloat(document.getElementById('smpPrice').value) || 0,
        description: document.getElementById('smpDesc').value.trim(),
    };

    try {
        if (isEdit) {
            await API.put('/supplier-portal/my/products/' + id, payload);
            showToast('Product updated successfully', 'success');
        } else {
            await API.post('/supplier-portal/my/products', payload);
            showToast('Product added to catalog', 'success');
        }
        smpCloseModal();
        smpLoadData(true);
    } catch (err) {
        showToast(err.message || 'Failed to save product', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
};

window.smpDeleteProduct = async function(id, name) {
    if (!confirm(`Archive product "${name}"? It will be hidden from your catalog.`)) return;
    try {
        await API.delete('/supplier-portal/my/products/' + id);
        showToast('Product archived', 'success');
        smpLoadData();
    } catch (err) {
        showToast(err.message || 'Failed to archive product', 'error');
    }
};

window.smpPagePrev = function() {
    _currentOffset = Math.max(0, _currentOffset - PAGE_SIZE);
    smpLoadData();
};

window.smpPageNext = function() {
    _currentOffset += PAGE_SIZE;
    smpLoadData();
};

export default { renderPage, initPage };
