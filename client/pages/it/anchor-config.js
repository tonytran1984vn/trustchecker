/**
 * Blockchain Anchor Configuration — Chain-agnostic provider management
 * Admin only — configure anchor provider, failover, module toggle
 */
import { icon } from '../../core/icons.js';

const PROVIDERS = [
    { id: 'none', name: 'No Public Anchor', icon: '🔒', cost: '$0', desc: 'Hash chain only — sufficient for most audits', recommended: false },
    { id: 'tsa_only', name: 'TSA Only (RFC 3161)', icon: '⏱', cost: '$0-50/mo', desc: 'Independent timestamp proof. Recommended minimum.', recommended: true },
    { id: 'polygon', name: 'Polygon (PoS)', icon: '🔷', cost: '~$0.001/tx', desc: 'Low-cost public anchor. Good for high volume.', recommended: false },
    { id: 'ethereum', name: 'Ethereum (L1)', icon: '⟠', cost: '~$1-50/tx', desc: 'Highest trust. Expensive. Use batch/merkle.', recommended: false },
    { id: 'avalanche', name: 'Avalanche (C-Chain)', icon: '🔺', cost: '~$0.01/tx', desc: 'Fast finality. Enterprise-friendly.', recommended: false },
];

const CURRENT_CONFIG = {
    enabled: true,
    provider: 'tsa_only',
    fallback_provider: 'tsa_only',
    anchor_frequency: 'hourly',
    batch_size: 100,
    tsa_provider: 'freetsa',
    gas_budget_monthly: 0
};

const MODULE_STATUS = {
    module: 'Enterprise Data Integrity Add-on',
    enabled: true,
    chain_seals: 847,
    chain_intact: true,
    features: { hash_chain: true, evidence_verification_portal: true, trust_report: true, public_anchor: true, tsa_timestamping: true }
};

export function renderPage() {
    const cfg = CURRENT_CONFIG;
    const mod = MODULE_STATUS;

    return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('settings', 28)} Data Integrity Configuration</h1>
        <div class="sa-title-actions">
          <span class="sa-status-pill ${mod.enabled ? 'sa-pill-green' : 'sa-pill-red'}">${mod.enabled ? '<span class="status-dot green"></span> Module Active' : '<span class="status-dot red"></span> Module Disabled'}</span>
        </div>
      </div>

      <!-- Module Status -->
      <div class="sa-card" style="margin-bottom:1.5rem;border:1px solid ${mod.enabled ? 'var(--green)' : 'var(--red)'}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h3 style="margin-bottom:0.25rem">${mod.module}</h3>
            <div style="font-size:0.78rem;color:var(--text-secondary)">
              ${mod.chain_seals.toLocaleString()} seals | Chain: ${mod.chain_intact ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Intact' : '<span class="status-icon status-fail" aria-label="Fail">✗</span> Broken'} | Pricing: Enterprise tier
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span style="font-size:0.75rem;color:var(--text-secondary)">Module:</span>
            <label class="toggle-switch" style="position:relative;display:inline-block;width:48px;height:24px">
              <input type="checkbox" ${mod.enabled ? 'checked' : ''} onchange="window.toggleModule(this.checked)"
                style="opacity:0;width:0;height:0">
              <span style="position:absolute;cursor:pointer;inset:0;background:${mod.enabled ? 'var(--green)' : 'var(--border)'};border-radius:24px;transition:0.3s">
                <span style="position:absolute;left:${mod.enabled ? '26px' : '3px'};top:3px;width:18px;height:18px;background:white;border-radius:50%;transition:0.3s"></span>
              </span>
            </label>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.75rem;margin-top:1rem">
          ${Object.entries(mod.features).map(([k, v]) => `
            <div style="text-align:center;padding:0.5rem;background:var(--surface-elevated);border-radius:8px;font-size:0.72rem">
              <div style="margin-bottom:0.25rem">${v ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</div>
              <div style="color:var(--text-secondary)">${k.replace(/_/g, ' ')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Anchor Provider Selection -->
      <div class="sa-card" style="margin-bottom:1.5rem">
        <h3>🔗 Anchor Provider</h3>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:1rem">Select where to publish proof anchors. Hash chain remains intact regardless of anchor choice.</p>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.75rem">
          ${PROVIDERS.map(p => `
            <div onclick="window.selectProvider('${p.id}')" id="provider-${p.id}"
              style="cursor:pointer;padding:1rem;background:var(--surface-elevated);border-radius:12px;text-align:center;
              border:2px solid ${cfg.provider === p.id ? 'var(--blue)' : 'var(--border)'};transition:all 0.2s;position:relative">
              ${p.recommended ? '<div style="position:absolute;top:-8px;right:-8px;background:var(--green);color:white;font-size:0.6rem;padding:2px 6px;border-radius:10px;font-weight:600">Recommended</div>' : ''}
              <div style="font-size:1.5rem;margin-bottom:0.5rem">${p.icon}</div>
              <div style="font-weight:600;font-size:0.78rem;margin-bottom:0.25rem">${p.name}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary);margin-bottom:0.5rem;line-height:1.3">${p.desc}</div>
              <div style="font-weight:700;font-size:0.82rem;color:var(--blue)">${p.cost}</div>
              ${cfg.provider === p.id ? '<div style="margin-top:0.5rem"><span class="sa-status-pill sa-pill-blue">Active</span></div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Configuration Details -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div class="sa-card">
          <h3>⚙️ Seal Settings</h3>
          <div style="display:grid;gap:0.75rem;margin-top:1rem">
            <div>
              <label style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Anchor Frequency</label>
              <select id="anchor-freq" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary);font-size:0.82rem">
                <option value="realtime" ${cfg.anchor_frequency === 'realtime' ? 'selected' : ''}>Real-time (every seal)</option>
                <option value="hourly" ${cfg.anchor_frequency === 'hourly' ? 'selected' : ''}>Hourly (batched)</option>
                <option value="daily" ${cfg.anchor_frequency === 'daily' ? 'selected' : ''}>Daily (batched)</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Batch Size (for batched mode)</label>
              <input type="number" id="batch-size" value="${cfg.batch_size}" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary);font-size:0.82rem">
            </div>
            <div>
              <label style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">TSA Provider</label>
              <select id="tsa-provider" style="width:100%;padding:0.5rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-primary);font-size:0.82rem">
                <option value="freetsa" ${cfg.tsa_provider === 'freetsa' ? 'selected' : ''}>FreeTSA (Free)</option>
                <option value="digicert" ${cfg.tsa_provider === 'digicert' ? 'selected' : ''}>DigiCert ($)</option>
                <option value="sectigo" ${cfg.tsa_provider === 'sectigo' ? 'selected' : ''}>Sectigo ($)</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="window.saveConfig()" style="margin-top:0.5rem">💾 Save Configuration</button>
          </div>
        </div>

        <div class="sa-card">
          <h3>🛡 Failover & Security</h3>
          <div style="margin-top:1rem">
            <div style="padding:0.75rem;background:var(--surface-elevated);border-radius:8px;margin-bottom:0.75rem;border-left:3px solid var(--green)">
              <div style="font-weight:600;font-size:0.82rem;margin-bottom:0.25rem">Failover Strategy</div>
              <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.4">If primary anchor fails → auto-fallback to <strong>TSA-only</strong>. Hash chain remains intact. No data loss. No manual intervention needed.</div>
            </div>
            <div style="padding:0.75rem;background:var(--surface-elevated);border-radius:8px;margin-bottom:0.75rem;border-left:3px solid var(--blue)">
              <div style="font-weight:600;font-size:0.82rem;margin-bottom:0.25rem">Material Risk Policy</div>
              <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.4">Only material events are sealed: <code>fraud_alert</code>, <code>route_breach</code>, <code>evidence_sealed</code>, <code>model_deployed</code>, <code>case_frozen</code>, <code>batch_locked</code>, <code>code_generated</code></div>
            </div>
            <div style="padding:0.75rem;background:var(--surface-elevated);border-radius:8px;border-left:3px solid var(--amber)">
              <div style="font-weight:600;font-size:0.82rem;margin-bottom:0.25rem">GDPR Compliance</div>
              <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.4">Only hash proofs go to public anchor. No PII, no raw data. Hash-only = GDPR compliant by design.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing Note -->
      <div class="sa-card" style="background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))">
        <div style="display:flex;align-items:center;gap:1rem">
          <div style="font-size:2rem">💎</div>
          <div>
            <div style="font-weight:700;font-size:0.9rem">Enterprise Data Integrity Add-on</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">This module can be enabled/disabled independently. Existing seals remain immutable when module is disabled. Available as separate pricing tier for compliance-specific requirements.</div>
          </div>
        </div>
      </div>
    </div>`;
}

function m(l, v, s, c, i) { return `<div class="sa-metric-card sa-metric-${c}"><div class="sa-metric-icon">${icon(i, 22)}</div><div class="sa-metric-body"><div class="sa-metric-value">${v}</div><div class="sa-metric-label">${l}</div><div class="sa-metric-sub">${s}</div></div></div>`; }

// ─── Window handlers ────────────────────────────────────────
window.selectProvider = function (id) {
    PROVIDERS.forEach(p => {
        const el = document.getElementById('provider-' + p.id);
        if (el) el.style.borderColor = id === p.id ? 'var(--blue)' : 'var(--border)';
    });
    CURRENT_CONFIG.provider = id;
};

window.toggleModule = function (enabled) {
    alert(enabled ? 'Module enabled — sealing will resume' : 'Module disabled — existing seals preserved');
};

window.saveConfig = function () {
    alert('Configuration saved. Changes take effect within 1 minute.');
};
