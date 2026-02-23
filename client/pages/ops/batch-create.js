/**
 * Ops – Create Batch
 * ═══════════════════
 * Create batch, assign SKU/factory, generate QR block
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('plus', 28)} Create Batch</h1>
      </div>

      <div class="sa-grid-2col">
        <div class="sa-card">
          <h3>Batch Information</h3>
          <div class="ops-form">
            ${formField('Batch ID', 'Auto-generated', 'B-2026-0893', true)}
            ${formField('Product / SKU', 'Select product', '')}
            ${formField('Quantity', 'Enter quantity', '')}
            ${formField('Production Date', 'Select date', new Date().toISOString().split('T')[0])}
            ${formField('Expiry Date', 'Select date', '')}
          </div>
        </div>

        <div class="sa-card">
          <h3>Origin Assignment</h3>
          <div class="ops-form">
            ${formField('Factory / Origin Node', 'Select factory', '')}
            ${formField('Production Line', 'Select line', '')}
            ${formField('QC Status', 'Select', 'Pending')}
            ${formField('Notes', 'Optional notes', '')}
          </div>
        </div>
      </div>

      <div class="sa-card" style="margin-top:1rem">
        <h3>${icon('qrcode', 18)} QR Generation</h3>
        <div class="sa-grid-2col">
          <div>
            <div class="ops-form">
              ${formField('QR Type', 'Select', 'Individual per unit')}
              ${formField('QR Count', 'Auto from quantity', '500')}
              ${formField('Format', 'Select', 'QR Code + Serial')}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:2rem;background:rgba(255,255,255,0.02);border-radius:8px">
            <div style="text-align:center">
              <div style="font-size:3rem;margin-bottom:0.5rem">📱</div>
              <div style="font-size:0.82rem;color:var(--text-secondary)">500 QR codes will be generated</div>
              <div style="font-size:0.72rem;color:var(--text-secondary)">Format: SKU-SERIAL-CHECK</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.5rem">
        <button class="btn btn-outline">Save Draft</button>
        <button class="btn btn-primary">Create Batch & Generate QR</button>
      </div>
    </div>
  `;
}

function formField(label, placeholder, value, disabled) {
    return `
    <div class="ops-field">
      <label class="ops-label">${label}</label>
      <input class="ops-input" placeholder="${placeholder}" value="${value || ''}" ${disabled ? 'disabled' : ''} />
    </div>
  `;
}
