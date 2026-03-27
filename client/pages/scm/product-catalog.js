// client/pages/scm/product-catalog.js
import { API } from '../../core/api.js';
import { State } from '../../core/state.js';

// Elements
const productForm = document.getElementById('productForm');
const poForm = document.getElementById('poForm');
const catalogList = document.getElementById('catalogList');
const poList = document.getElementById('poList');

// Render helpers
const formatNumber = (num, decimals = 2) => Number(num).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const getBadgeClass = (type) => ({ 'component': 'badge-component', 'finished_good': 'badge-finished', 'raw_material': 'badge-raw' }[type] || 'badge-raw');

// Fetch and render Catalog & BOM
async function loadCatalog() {
    try {
        const { products } = await API.get('/scm/catalog');
        if (!products || products.length === 0) {
            catalogList.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">No products registered yet.</div>';
            return;
        }

        let html = '<table><thead><tr><th>Product Name</th><th>SKU</th><th>Type</th><th>Base Carbon</th><th>ID Ref</th></tr></thead><tbody>';
        
        for (const p of products) {
            html += `
                <tr>
                    <td style="color: #f1f5f9; font-weight: 600;">${p.name}</td>
                    <td>${p.sku}</td>
                    <td><span class="badge ${getBadgeClass(p.productType)}">${p.productType.replace('_', ' ')}</span></td>
                    <td style="color: #ef4444; font-weight: 600;">${formatNumber(p.unitCarbonKgCO2e)} kgCO₂e</td>
                    <td style="font-family: monospace; font-size: 0.7rem; color: #64748b;">${p.id}</td>
                </tr>
            `;
            // Try fetching BOM if it's an assembled product
            if (p.productType !== 'raw_material') {
                 const bomRes = await API.get(`/scm/catalog/${p.id}/bom`);
                 if (bomRes && bomRes.bom && bomRes.bom.length > 0) {
                     html += `<tr><td colspan="5" style="padding: 0; background: #0f172a;"><div style="padding: 10px 10px 10px 40px; border-left: 3px solid #3b82f6;">`;
                     html += `<div style="font-size: 0.75rem; color: #3b82f6; font-weight: 600; margin-bottom: 5px;">Lineage: Bill of Materials</div>`;
                     bomRes.bom.forEach(b => {
                         html += `<div style="font-size: 0.75rem; color: #94a3b8; display: flex; gap: 10px;">
                            <span>↳ 1x <strong>${b.component?.name || 'Unknown Component'}</strong></span>
                            <span style="color: #10b981;">Inherited: ${(b.quantity * (b.component?.unitCarbonKgCO2e || 0)).toFixed(2)} kgCO₂e (Scope 3)</span>
                         </div>`;
                     });
                     html += `</div></td></tr>`;
                 }
            }
        }
        html += '</tbody></table>';
        catalogList.innerHTML = html;
    } catch (err) {
        console.error('Failed to load catalog', err);
        catalogList.innerHTML = '<div style="color: #ef4444;">Failed to load catalog.</div>';
    }
}

// Fetch and render POs
async function loadPOs() {
    try {
        const { pos } = await API.get('/scm/network/pos');
        if (!pos || pos.length === 0) {
            poList.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">No purchase orders defined.</div>';
            return;
        }

        let html = '<table><thead><tr><th>Date</th><th>Product</th><th>Supplier Org</th><th>Qty</th><th>Status</th><th>Scope 3 Value</th><th>Action</th></tr></thead><tbody>';
        pos.forEach(po => {
            const isFulfilled = po.status === 'fulfilled';
            const inheritedS3 = (po.quantity * (po.product?.unitCarbonKgCO2e || 0)) / 1000;
            
            html += `
                <tr>
                    <td>${new Date(po.createdAt).toLocaleDateString()}</td>
                    <td style="color: #f1f5f9; font-weight: 600;">${po.product?.name || po.productId}</td>
                    <td style="font-family: monospace; font-size: 0.7rem; color: #64748b;">${po.supplierOrgId}</td>
                    <td>${po.quantity}</td>
                    <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; background: ${isFulfilled ? '#10b98122' : '#f59e0b22'}; color: ${isFulfilled ? '#10b981' : '#f59e0b'}">${po.status.toUpperCase()}</span></td>
                    <td style="color: #ef4444; font-weight: 600;">${isFulfilled ? formatNumber(inheritedS3) + ' tCO₂e' : 'Pending'}</td>
                    <td>
                        ${!isFulfilled ? `<button onclick="fulfillPO('${po.id}')" style="background: #10b981; padding: 4px 8px; font-size: 0.7rem;">Fulfill</button>` : ''}
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        poList.innerHTML = html;
    } catch (err) {
        console.error('Failed to load POs', err);
        poList.innerHTML = '<div style="color: #ef4444;">Failed to load purchase orders.</div>';
    }
}

// Expose fulfill to window so onclick handlers work
window.fulfillPO = async function(poId) {
    if (!confirm('By fulfilling this PO, you are admitting physical transfer of goods and inheriting their Scope 3 footprint. Proceed?')) return;
    try {
        await API.post(`/scm/network/pos/${poId}/fulfill`);
        loadPOs(); // Refresh
        alert('PO Fulfilled! Your Scope 3 Ledger has been updated.');
    } catch (e) {
        alert('Failed to fulfill PO');
    }
};

// Form Handlers
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await API.post('/scm/catalog', {
            name: document.getElementById('pName').value,
            sku: document.getElementById('pSku').value,
            productType: document.getElementById('pType').value,
            unitCarbonKgCO2e: document.getElementById('pCarbon').value
        });
        productForm.reset();
        loadCatalog();
    } catch (err) {
        alert('Failed to create product');
    }
});

poForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await API.post('/scm/network/pos', {
            supplierOrgId: document.getElementById('poSupplier').value,
            productId: document.getElementById('poProduct').value,
            quantity: document.getElementById('poQty').value
        });
        poForm.reset();
        loadPOs();
    } catch (err) {
        alert('Failed to issue PO');
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    State.init().then(() => {
        loadCatalog();
        loadPOs();
    });
});
