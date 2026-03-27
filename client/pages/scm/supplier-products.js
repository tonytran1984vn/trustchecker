// client/pages/scm/supplier-products.js
import { API } from '../../core/api.js';
import { State } from '../../core/state.js';

export function renderPage() {
    return `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <div>
            <h1 style="margin:0; font-size: 1.5rem; color: #f8fafc;">Supplier Catalog</h1>
            <p style="margin: 4px 0 0 0; color: #94a3b8;">Products and components provided by your network partners, including Carbon footprints.</p>
        </div>
        <button class="btn btn-primary" onclick="loadSupplierProducts()" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa;">
            ⟳ Refresh
        </button>
    </div>

    <div class="card" style="padding: 24px; background: rgba(30,30,40,0.6); border: 1px solid rgba(255,255,255,0.05);">
        <h3 style="margin-top:0; color:#cbd5e1; font-weight:500;">Supplier Products Inventory</h3>
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%; text-align:left; border-collapse:collapse; margin-top:16px;">
                <thead>
                    <tr style="border-bottom: 1px solid #334155; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">
                        <th style="padding: 12px 0;">Supplier</th>
                        <th style="padding: 12px 16px;">Product Name</th>
                        <th style="padding: 12px 16px;">SKU</th>
                        <th style="padding: 12px 16px;">Category</th>
                        <th style="padding: 12px 16px;">Scope 3 Impact (Unit)</th>
                    </tr>
                </thead>
                <tbody id="supplierProductsTbody">
                    <tr><td colspan="5" style="text-align:center; padding: 20px; color:#64748b;">Loading supplier products...</td></tr>
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color:#64748b;">No supplier products found in the network.</td></tr>';
            return;
        }

        let html = '';
        products.forEach(p => {
            const badgeClass = p.productType === 'component' ? 'color:#a855f7;background:rgba(168,85,247,0.1)' : 'color:#10b981;background:rgba(16,185,129,0.1)';
            const formattedType = p.productType ? p.productType.replace('_', ' ').toUpperCase() : 'UNKNOWN';

            html += `
                <tr style="border-bottom: 1px solid #1e293b; transition: background 0.2s;">
                    <td style="padding: 16px 0; color: #e2e8f0; font-weight: 500;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:24px; height:24px; border-radius:4px; background:#475569; display:flex; align-items:center; justify-content:center; font-size:10px;">🏢</div>
                            ${p.supplierName}
                        </div>
                    </td>
                    <td style="padding: 16px; color: #f8fafc; font-weight: 600;">${p.name || 'Unknown'}</td>
                    <td style="padding: 16px; color: #94a3b8; font-family: monospace;">${p.sku || '-'}</td>
                    <td style="padding: 16px;">
                        <span style="padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; ${badgeClass}">
                            ${formattedType}
                        </span>
                    </td>
                    <td style="padding: 16px; color: #ef4444; font-weight: 600;">
                        ${Number(p.unitCarbonKgCO2e || 0).toLocaleString()} kgCO₂e
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
