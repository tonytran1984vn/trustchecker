/**
 * Evidence Verification Portal — Public page for auditor/regulator independent verification
 * No authentication required — anyone with a hash can verify evidence integrity
 */
import { icon } from '../../core/icons.js';

export function renderPage() {
    return `
    <div class="sa-page">
      <div class="sa-page-title"><h1>${icon('shield', 28)} Evidence Verification Portal</h1>
        <div class="sa-title-actions"><span class="sa-status-pill sa-pill-green">🔓 Public Access — No Login Required</span></div>
      </div>

      <div class="sa-metrics-row" style="margin-bottom:1.5rem">
        ${m('Verification Method', 'SHA-256', 'NIST FIPS 180-4 compliant', 'blue', 'lock')}
        ${m('Time-Stamp Authority', 'RFC 3161', 'External TSA provider', 'green', 'clock')}
        ${m('Digital Signature', 'RSA-2048', 'PKCS#7 / JWS format', 'purple', 'shield')}
        ${m('Chain Type', 'Hash-Linked', 'Append-only, tamper-proof', 'green', 'check')}
      </div>

      <!-- Single Hash Verification -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔍 Verify Evidence Hash</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">
          Paste a SHA-256 hash from an evidence package to verify it was sealed in the TrustChecker chain.
          This verification is independent — no login, no trust assumption.
        </p>
        <div style="display:flex;gap:0.75rem;align-items:flex-start">
          <input id="verify-hash-input" type="text" class="sa-input" placeholder="Enter SHA-256 hash (e.g. a1b2c3d4e5f6...)" 
            style="flex:1;font-family:'JetBrains Mono',monospace;font-size:0.78rem;padding:0.75rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary)">
          <button class="btn btn-primary" onclick="window.verifyHash()" style="padding:0.75rem 1.5rem;white-space:nowrap">
            ${icon('search', 16)} Verify
          </button>
        </div>
        <div id="verify-result" style="margin-top:1rem"></div>
      </div>

      <!-- Full Evidence Package Verification -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>📦 Verify Full Evidence Package</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">
          Verify an entire evidence package: main hash + scan log hashes + timestamp token.
        </p>
        <div style="display:grid;grid-template-columns:1fr;gap:0.75rem;margin-bottom:1rem">
          <div>
            <label style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">Evidence Package Hash *</label>
            <input id="evidence-hash-input" type="text" class="sa-input" placeholder="SHA-256 of evidence package"
              style="width:100%;font-family:'JetBrains Mono',monospace;font-size:0.78rem;padding:0.6rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary)">
          </div>
          <div>
            <label style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">Scan Log Hashes (comma-separated)</label>
            <input id="component-hashes-input" type="text" class="sa-input" placeholder="hash1, hash2, hash3..."
              style="width:100%;font-family:'JetBrains Mono',monospace;font-size:0.78rem;padding:0.6rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary)">
          </div>
          <div style="display:flex;align-items:flex-end;gap:0.75rem">
            <div style="flex:1">
              <label style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">TSA Token (optional)</label>
              <input id="tsa-token-input" type="text" class="sa-input" placeholder="RFC 3161 timestamp token"
                style="width:100%;font-family:'JetBrains Mono',monospace;font-size:0.78rem;padding:0.6rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary)">
            </div>
            <button class="btn btn-primary" onclick="window.verifyEvidence()" style="padding:0.6rem 1.5rem">
              ${icon('shield', 16)} Verify Package
            </button>
          </div>
        </div>
        <div id="evidence-result" style="margin-top:1rem"></div>
      </div>

      <!-- How It Works -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>ℹ️ How Verification Works</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1rem">
          ${step('1', 'Receive Evidence', 'You receive an evidence package from TrustChecker (PDF + JSON + hash proof)', 'blue')}
          ${step('2', 'Extract Hash', 'Find the SHA-256 hash in the evidence manifest (evidence_manifest.json)', 'purple')}
          ${step('3', 'Verify Here', 'Paste the hash above — we check if it was sealed in our tamper-proof chain', 'green')}
          ${step('4', 'Independent Trust', 'You verify without login, without trusting us — math proves integrity', 'green')}
        </div>
      </div>

      <!-- CLI Verification -->
      <div class="sa-card">
        <h3>💻 Command-Line Verification</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:1rem">
          You can also verify evidence offline using standard tools:
        </p>
        <pre style="background:var(--surface-elevated);padding:1rem;border-radius:8px;font-size:0.72rem;overflow-x:auto;color:var(--text-primary);border:1px solid var(--border)"><code># 1. Verify file hash matches evidence manifest
sha256sum evidence_scan_logs.json
# Compare with: evidence_manifest.json → hash_chain[last].payload_hash

# 2. Verify digital signature
openssl dgst -sha256 -verify public_key.pem \\
  -signature evidence.sig evidence_scan_logs.json

# 3. Verify via API (no auth required)
curl "https://your-domain/api/scm/integrity/public/verify?hash=YOUR_HASH"</code></pre>
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

function step(num, title, desc, color) {
    return `<div style="text-align:center;padding:1rem;background:var(--surface-elevated);border-radius:12px;border:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:50%;background:var(--${color});color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;margin-bottom:0.5rem">${num}</div>
      <div style="font-weight:600;font-size:0.82rem;margin-bottom:0.25rem">${title}</div>
      <div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.4">${desc}</div>
    </div>`;
}

// ─── Window handlers ────────────────────────────────────────
window.verifyHash = async function () {
    const hash = document.getElementById('verify-hash-input')?.value?.trim();
    const resultDiv = document.getElementById('verify-result');
    if (!hash) { resultDiv.innerHTML = '<div class="sa-alert sa-alert-red">Please enter a SHA-256 hash</div>'; return; }

    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const res = await fetch(`/api/scm/integrity/public/verify?hash=${encodeURIComponent(hash)}`);
        const data = await res.json();

        if (data.verified) {
            resultDiv.innerHTML = `
              <div class="sa-alert sa-alert-green" style="border-left:4px solid var(--green)">
                <div style="font-size:1rem;font-weight:700;margin-bottom:0.5rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> VERIFIED — Hash Found in Chain</div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem;font-size:0.78rem">
                  <div><strong>Block:</strong> #${data.seal.block_index}</div>
                  <div><strong>Event Type:</strong> ${data.seal.event_type}</div>
                  <div><strong>Sealed At:</strong> ${data.seal.sealed_at}</div>
                  <div><strong>Algorithm:</strong> ${data.seal.algorithm}</div>
                  <div><strong>Prev Block Linked:</strong> ${data.chain_context.prev_block_linked ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</div>
                  <div><strong>Next Block Linked:</strong> ${data.chain_context.next_block_linked ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</div>
                </div>
                <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:0.5rem">${data.verification_note}</div>
              </div>`;
        } else {
            resultDiv.innerHTML = `
              <div class="sa-alert sa-alert-red" style="border-left:4px solid var(--red)">
                <div style="font-size:1rem;font-weight:700;margin-bottom:0.25rem"><span class="status-icon status-fail" aria-label="Fail">✗</span> NOT FOUND</div>
                <div style="font-size:0.78rem">${data.message}</div>
              </div>`;
        }
    } catch (e) { resultDiv.innerHTML = '<div class="sa-alert sa-alert-red">Verification request failed</div>'; }
};

window.verifyEvidence = async function () {
    const evidence_hash = document.getElementById('evidence-hash-input')?.value?.trim();
    const componentStr = document.getElementById('component-hashes-input')?.value?.trim();
    const tsa = document.getElementById('tsa-token-input')?.value?.trim();
    const resultDiv = document.getElementById('evidence-result');
    if (!evidence_hash) { resultDiv.innerHTML = '<div class="sa-alert sa-alert-red">Evidence hash required</div>'; return; }

    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const body = { evidence_hash, scan_log_hashes: componentStr ? componentStr.split(',').map(h => h.trim()) : [], timestamp_token: tsa || null };
        const res = await fetch('/api/scm/integrity/public/verify-evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();

        const color = data.overall ? 'green' : 'red';
        resultDiv.innerHTML = `
          <div class="sa-alert sa-alert-${color}" style="border-left:4px solid var(--${color})">
            <div style="font-size:1rem;font-weight:700;margin-bottom:0.5rem">${data.overall ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'} ${data.verdict}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.78rem">
              <div><strong>Evidence Hash:</strong> ${data.evidence_hash.verified ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Verified' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> Not found'}</div>
              <div><strong>Timestamp:</strong> ${data.timestamp.verified ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Present' : '<span class="status-icon status-warn" aria-label="Warning">!</span> Not provided'}</div>
              <div><strong>Components Checked:</strong> ${data.component_hashes.length}</div>
              <div><strong>Components Verified:</strong> ${data.component_hashes.filter(c => c.verified).length}/${data.component_hashes.length}</div>
            </div>
          </div>`;
    } catch (e) { resultDiv.innerHTML = '<div class="sa-alert sa-alert-red">Verification request failed</div>'; }
};
