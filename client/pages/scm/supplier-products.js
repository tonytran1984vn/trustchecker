// client/pages/scm/supplier-products.js
import { API } from '../../core/api.js';
import { State } from '../../core/state.js';

export function renderPage() {
    return `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <div>
            <h1 style="margin:0; font-size: 1.5rem; color: var(--text, #1e293b); font-weight: 700;">Supplier Catalog</h1>
            <p style="margin: 4px 0 0 0; color: var(--text-muted, #64748b); font-size: 0.9rem;">Products and components provided by your network partners, including Carbon footprints.</p>
        </div>
        <button class="btn btn-primary" onclick="loadSupplierProducts()" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #2563eb; font-weight: 600; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
            ⟳ Refresh
        </button>
    </div>

    <div class="smp-card" style="padding: 24px; background: var(--card, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 16px;">
        <h3 style="margin-top:0; color: var(--text, #1e293b); font-weight: 600;">Supplier Products Inventory</h3>
        <div style="overflow-x:auto;">
            <table class="smp-table" style="width:100%; text-align:left; border-collapse:collapse; margin-top:16px;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border, #e2e8f0); color: var(--text-muted, #64748b); font-size: 0.75rem; text-transform: uppercase;">
                        <th style="padding: 12px 16px;">Supplier</th>
                        <th style="padding: 12px 16px;">Product Name</th>
                        <th style="padding: 12px 16px;">SKU</th>
                        <th style="padding: 12px 16px;">Category</th>
                        <th style="padding: 12px 16px;">Scope 3 Impact (Unit)</th>
                    </tr>
                </thead>
                <tbody id="supplierProductsTbody">
                    <tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted, #64748b);">Loading supplier products...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;
}

export async function initPage() {
    await loadSupplierProducts();
}

// Attach to window so onclick works
window.loadSupplierProducts = async function() {
    const tbody = document.getElementById('supplierProductsTbody');
    if (!tbody) return;

    try {
        const res = await API.get('/scm/catalog/supplier-products');
        const products = res.products || [];

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted, #64748b);">
                <div style="margin-bottom:8px; font-size:2rem;">📦</div>
                <div style="font-weight:600; margin-bottom:4px;">No supplier products available</div>
                <div style="font-size:0.85rem;">Visit the <a href="javascript:void(0)" onclick="navigate('scm-network')" style="color:#3b82f6;text-decoration:none;">Trust Network</a> page to connect with suppliers.</div>
            </td></tr>`;
            return;
        }

        let html = '';
        products.forEach(p => {
            const badgeClass = p.productType === 'component' ? 'color:#4f46e5;background:rgba(99,102,241,0.1)' : 'color:#10b981;background:rgba(16,185,129,0.1)';
            const formattedType = p.productType ? p.productType.replace('_', ' ').toUpperCase() : 'UNKNOWN';

            html += `
                <tr style="border-bottom: 1px solid var(--border, #e2e8f0); transition: background 0.2s;">
                    <td style="padding: 16px; color: var(--text, #1e293b); font-weight: 600;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:28px; height:28px; border-radius:6px; background: var(--bg-muted, #f1f5f9); display:flex; align-items:center; justify-content:center; font-size:12px; border: 1px solid var(--border, #e2e8f0);">🏢</div>
                            ${p.supplierName}
                        </div>
                    </td>
                    <td style="padding: 16px; color: var(--text, #1e293b); font-weight: 500;">${p.name || 'Unknown'}</td>
                    <td style="padding: 16px; color: var(--text-muted, #64748b); font-family: monospace; font-size:0.85rem;">${p.sku || '-'}</td>
                    <td style="padding: 16px;">
                        <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; ${badgeClass}">
                            ${formattedType}
                        </span>
                    </td>
                    <td style="padding: 16px; color: #ef4444; font-weight: 600;">
                        ${Number(p.unitCarbonKgCO2e || 0).toLocaleString()} <span style="font-size:0.8rem; font-weight:500; color:var(--text-muted, #64748b)">kgCO₂e</span>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (err) {
        console.error('Failed to load supplier products', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#ef4444;">Failed to load data. Ensure your SCM API is running.</td></tr>';
    }
};

export default { renderPage, initPage };
