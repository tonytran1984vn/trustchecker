/**
 * TrustChecker – QR Scanner Page
 */
import { State } from '../core/state.js';
import { API } from '../core/api.js';
import { showToast } from '../components/toast.js';
import { shortHash, scoreColor } from '../utils/helpers.js';
import { escapeHTML } from '../utils/sanitize.js';

export function renderPage() {
  return `
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><div class="card-title">📱 Scan QR Code</div></div>
          <div class="qr-scanner-area" id="scanner-area">
            <div class="scanner-icon">📷</div>
            <div class="scanner-text">Enter QR data below or paste a product ID to validate</div>
          </div>
          <div style="margin-top:16px">
            <div class="input-group">
              <label>QR Data / Product Code</label>
              <input class="input" id="qr-input" type="text" placeholder="Paste or type QR code data here...">
            </div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary" onclick="validateQR()" style="flex:1">🔍 Validate</button>
              <button class="btn" onclick="simulateRandomScan()">🎲 Random Test</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><div class="card-title">📋 Validation Result</div></div>
          <div id="scan-result">${State.scanResult ? renderScanResult(State.scanResult) : '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Scan a QR code to see results</div></div>'}</div>
        </div>
      </div>
    </div>
  `;
}

async function validateQR() {
  const qrData = document.getElementById('qr-input').value.trim();
  if (!qrData) { showToast('Please enter QR data', 'error'); return; }
  try {
    showToast('🔍 Validating...', 'info');
    const result = await API.post('/qr/validate', {
      qr_data: qrData,
      device_fingerprint: 'web-' + navigator.userAgent.substring(0, 20),
      ip_address: '127.0.0.1'
    });
    State.scanResult = result;
    const el = document.getElementById('scan-result');
    if (el) el.innerHTML = renderScanResult(result);
    showToast(result.message, result.valid ? 'success' : 'error');
  } catch (e) {
    showToast('Validation failed: ' + e.message, 'error');
  }
}

async function simulateRandomScan() {
  try {
    const res = await API.get('/products?limit=10');
    if (res.products?.length) {
      const prod = res.products[Math.floor(Math.random() * res.products.length)];
      const detail = await API.get(`/products/${prod.id}`);
      if (detail.qr_codes?.length) {
        document.getElementById('qr-input').value = detail.qr_codes[0].qr_data;
        validateQR();
        return;
      }
    }
    document.getElementById('qr-input').value = 'FAKE-QR-' + Date.now();
    validateQR();
  } catch (e) {
    document.getElementById('qr-input').value = 'TEST-UNKNOWN-QR-' + Date.now();
    validateQR();
  }
}

function renderScanResult(r) {
  if (!r) return '';
  return `
    <div class="qr-result ${escapeHTML(r.result)}">
      <div style="font-size:1.5rem;font-weight:900;margin-bottom:8px">${escapeHTML(r.message)}</div>
      <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px">
        Response: ${r.response_time_ms}ms • Scan ID: ${escapeHTML(r.scan_id?.substring(0, 8) || '—')}
      </div>
    </div>
    ${r.product ? `
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">📦 Product Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem">
        <div style="color:var(--text-muted)">Name</div><div>${escapeHTML(r.product.name)}</div>
        <div style="color:var(--text-muted)">SKU</div><div style="font-family:'JetBrains Mono'">${escapeHTML(r.product.sku)}</div>
        <div style="color:var(--text-muted)">Manufacturer</div><div>${escapeHTML(r.product.manufacturer || '—')}</div>
        <div style="color:var(--text-muted)">Origin</div><div>${escapeHTML(r.product.origin_country || '—')}</div>
      </div>
    </div>` : ''}
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">🔍 Fraud Analysis</div>
      <div class="factor-bar-container">
        <div class="factor-bar-label"><span>Fraud Score</span><span style="color:${r.fraud?.score > 0.5 ? 'var(--rose)' : 'var(--emerald)'}">${(r.fraud?.score * 100).toFixed(1)}%</span></div>
        <div class="factor-bar"><div class="fill" style="width:${r.fraud?.score * 100}%;background:${r.fraud?.score > 0.5 ? 'var(--rose)' : r.fraud?.score > 0.2 ? 'var(--amber)' : 'var(--emerald)'}"></div></div>
      </div>
      ${(r.fraud?.details || []).map(a => `<div style="font-size:0.75rem;padding:4px 0;color:var(--text-secondary)"><span class="badge ${escapeHTML(a.severity)}" style="margin-right:6px">${escapeHTML(a.severity)}</span>${escapeHTML(a.description)}</div>`).join('')}
    </div>
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">📊 Trust Score</div>
      <div class="trust-gauge" style="flex-direction:row;gap:16px;justify-content:flex-start">
        <div class="gauge-circle" style="width:70px;height:70px;font-size:1.3rem">${r.trust?.score || 0}</div>
        <div><div class="gauge-grade" style="font-size:1.2rem">${r.trust?.grade || '—'}</div><div class="gauge-label">Trust Grade</div></div>
      </div>
    </div>
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">🔗 Blockchain Seal</div>
      <div style="font-size:0.75rem;color:var(--text-secondary)">
        <span class="badge sealed">✓ Sealed</span> Block #${r.blockchain?.block_index || '—'}<br>
        <span style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--text-muted)">Hash: ${shortHash(r.blockchain?.data_hash)}</span>
      </div>
    </div>
  `;
}

window.validateQR = validateQR;
window.simulateRandomScan = simulateRandomScan;
