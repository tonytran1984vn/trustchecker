import { API } from '../core/api.js';
import { State } from '../core/state.js';
import { showToast } from '../components/toast.js';

export function renderPage() {
    return `
    <style>
      .smp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .smp-header h1 { margin: 0; font-size: 1.5rem; color: var(--text, #1e293b); font-weight: 700; }
      .smp-header p { margin: 4px 0 0 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
      .smp-btn-add { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.2); transition: all 0.2s; }
      .smp-btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.3); }
      
      .smp-card { background: var(--card, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 16px; padding: 24px; }
      
      .smp-table { width: 100%; border-collapse: collapse; margin-top: 16px; text-align: left; }
      .smp-table th { padding: 12px 16px; border-bottom: 1px solid var(--border, #e2e8f0); color: var(--text-muted, #64748b); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
      .smp-table td { padding: 16px; border-bottom: 1px solid var(--border, #e2e8f0); color: var(--text, #1e293b); font-size: 0.9rem; }
      .smp-table tr:hover td { background: var(--hover, rgba(0,0,0,0.02)); }
      
      .smp-sku { font-family: monospace; color: var(--text-muted, #64748b); background: var(--bg-muted, #f1f5f9); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }
      .smp-cat { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: rgba(99,102,241,0.1); color: #4f46e5; text-transform: capitalize; }
      .smp-price { font-weight: 600; color: #10b981; }
      
      .smp-btn-edit { background: rgba(59,130,246,0.1); color: #2563eb; border: 1px solid rgba(59,130,246,0.3); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
      .smp-btn-edit:hover { background: rgba(59,130,246,0.2); }

      /* Modal Styles */
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
    </style>

    <div class="smp-header">
        <div>
            <h1>My Products</h1>
            <p>Manage your product catalog and supply offerings.</p>
        </div>
        <button class="smp-btn-add" onclick="smpOpenModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Product
        </button>
    </div>

    <div class="smp-card">
        <div style="overflow-x:auto;">
            <table class="smp-table">
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Origin</th>
                        <th>Unit Price ($)</th>
                        <th style="text-align:right">Actions</th>
                    </tr>
                </thead>
                <tbody id="smpProductsTbody">
                    <tr><td colspan="6" style="text-align:center; padding: 40px; color:#64748b;">Loading your products...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

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
                
                <div class="smp-modal-actions">
                    <button type="button" class="smp-btn-cancel" onclick="smpCloseModal()">Cancel</button>
                    <button type="submit" class="smp-btn-save">Save Product</button>
                </div>
            </form>
        </div>
    </div>
    `;
}

export async function initPage() {
    setTimeout(smpLoadData, 50);
}

    window.smpLoadData = async function() {
        const tbody = document.getElementById('smpProductsTbody');
        if (!tbody) return;

        try {
            const res = await API.get('/supplier-portal/my/products');
            const products = res.products || [];

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px; color:#94a3b8;"><div style="font-size:3rem;margin-bottom:12px;opacity:0.3">📦</div>You haven\\'t added any products to your catalog yet.</td></tr>';
                return;
            }

            // Store for editing
            window._smpCache = {};
            products.forEach(p => window._smpCache[p.id] = p);

            let html = '';
            products.forEach(p => {
                html += `
                    <tr>
                        <td>
                            <div style="font-weight:700; color:var(--text, #1e293b); font-size: 0.95rem; margin-bottom:4px;">${p.name}</div>
                            <div style="display:flex; gap: 6px; align-items:center;">
                                <span style="font-size: 0.65rem; background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 600;">🏷 My Sell Offer</span>
                                <span style="font-size: 0.65rem; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid rgba(22,101,52,0.2);">✓ Network Synced</span>
                            </div>
                        </td>
                        <td><span class="smp-sku">${p.sku}</span></td>
                        <td><span class="smp-cat">${(p.category || 'misc').replace(/_/g, ' ')}</span></td>
                        <td>${p.origin_country || '-'}</td>
                        <td><span class="smp-price">$${Number(p.price || 0).toFixed(2)}</span></td>
                        <td style="text-align:right">
                            <button class="smp-btn-edit" onclick="smpEditProduct('${p.id}')">Edit</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (err) {
            console.error('[Supplier Portal] Data load error:', err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color:#ef4444; font-weight:600;">Failed to load products. Please check your connection.</td></tr>';
            showToast('Error loading products', 'error');
        }
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
    document.getElementById('smpSku').disabled = true; // SKU usually shouldn't change
    document.getElementById('smpCat').value = p.category || 'raw_material';
    document.getElementById('smpCountry').value = p.origin_country || '';
    document.getElementById('smpPrice').value = p.price || '';
    
    document.getElementById('smpModalTitle').innerText = 'Edit Product';
    document.getElementById('smpModal').classList.add('visible');
};

window.smpSaveProduct = async function(e) {
    e.preventDefault();
    const id = document.getElementById('smpId').value;
    const isEdit = !!id;
    
    const payload = {
        name: document.getElementById('smpName').value.trim(),
        sku: document.getElementById('smpSku').value.trim(),
        category: document.getElementById('smpCat').value,
        origin_country: document.getElementById('smpCountry').value.toUpperCase().trim(),
        price: parseFloat(document.getElementById('smpPrice').value) || 0
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
        smpLoadData();
    } catch (err) {
        showToast(err.message || 'Failed to save product', 'error');
    }
};

export default { renderPage, initPage };
