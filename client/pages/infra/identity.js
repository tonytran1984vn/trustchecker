/** Identity & Trust Layer — DID + Verifiable Credentials Dashboard */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js'; import { icon } from '../../core/icons.js';
let D = {};
let _loading = false;
async function load() {
    if (_loading) return;
    _loading = true;
    const h = { 'Authorization': 'Bearer ' + State.token };
    const [dids, vcs, types] = await Promise.all([
        API.get('/identity/did/registry').catch(() => ({})),
        API.get('/identity/vc/registry').catch(() => ({})),
        API.get('/identity/types').catch(() => ({}))
    ]);
    D = { dids, vcs, types };
    _loading = false;
    render();
}
export function renderPage() {
    if (!D.dids) load(); return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('fingerprint')} Identity & Trust Layer</h1><p style="color:var(--text-secondary);margin:4px 0 16px">Decentralized Identity (DID) + Verifiable Credentials (VC) — W3C Standard</p>
        <div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="window.idShowDID()">${icon('plus')} Create DID</button><button class="btn btn-sm" onclick="window.idShowVC()" style="background:#8b5cf6;color:#fff;border:none">${icon('shield')} Issue VC</button></div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'DIDs Registered', v: D.dids?.total || 0, c: '#3b82f6', i: '🆔' }, { l: 'Active VCs', v: D.vcs?.total || 0, c: '#8b5cf6', i: '📜' }, { l: 'Entity Types', v: D.types?.entity_types?.length || 8, c: '#10b981', i: '📦' }, { l: 'VC Types', v: Object.keys(D.types?.vc_types || {}).length || 10, c: '#f59e0b', i: '🏅' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:20px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:var(--text-secondary);font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="sa-card"><h3 style="margin:0 0 10px">${icon('fingerprint')} DID Registry</h3>
            ${D.dids?.dids?.length > 0 ? `<table class="sa-table"><thead><tr><th style="text-align:left">DID</th><th>Type</th><th>Status</th></tr></thead><tbody>${D.dids.dids.map(d => `<tr><td style="color:#3b82f6;font-family:monospace;font-size:0.68rem">${d.did}</td><td style="text-align:center;color:var(--text-secondary)">${d.entity_type}</td><td style="text-align:center"><span class="badge valid">${d.status}</span></td></tr>`).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:var(--text-secondary)">No DIDs yet — Create one above</div>'}
        </div>
        <div class="sa-card"><h3 style="margin:0 0 10px">${icon('shield')} Verifiable Credentials</h3>
            ${D.vcs?.credentials?.length > 0 ? `<table class="sa-table"><thead><tr><th style="text-align:left">VC ID</th><th>Type</th><th>Status</th></tr></thead><tbody>${D.vcs.credentials.map(v => `<tr><td style="color:#8b5cf6;font-family:monospace;font-size:0.68rem">${(v.vc_id || '').slice(0, 24)}</td><td style="text-align:center;color:var(--text-secondary);font-size:0.72rem">${v.credential_type}</td><td style="text-align:center"><span class="badge ${v.status === 'active' ? 'valid' : 'invalid'}">${v.status}</span></td></tr>`).join('')}</tbody></table>` : '<div style="text-align:center;padding:20px;color:var(--text-secondary)">No VCs issued yet</div>'}
        </div>
    </div>
    <div class="sa-card"><h3 style="margin:0 0 10px">${icon('target')} Available VC Types</h3>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${Object.entries(D.types?.vc_types || {}).map(([k, v]) => `<div style="padding:8px;background:var(--surface);border-radius:6px;text-align:center"><div style="font-weight:600;font-size:0.72rem">${k.replace(/_/g, ' ')}</div><div style="color:var(--text-secondary);font-size:0.68rem">${v?.category || ''} · ${v?.validity_days || 0}d</div></div>`).join('')}</div>
    </div>
</div>`;
}
export { renderPage as render };

// ─── Modal: Create DID ────────────────────────────────────
window.idShowDID = function() {
    var opts = ['product', 'partner', 'factory', 'shipment', 'device', 'company', 'carrier', 'warehouse'];
    State.modal =
        '<div class="modal" style="max-width:480px">' +
        '<div class="modal-title">' + icon('fingerprint', 20) + ' Create DID</div>' +
        '<p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 16px">Generate a W3C Decentralized Identifier for any entity in your supply chain.</p>' +
        '<div style="margin-bottom:12px">' +
        '<label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Entity Type</label>' +
        '<select id="id-type" class="form-input" style="width:100%;padding:10px 12px;cursor:pointer">' +
        opts.map(function(t) { return '<option value="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>'; }).join('') +
        '</select></div>' +
        '<div style="margin-bottom:12px">' +
        '<label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Entity ID</label>' +
        '<input type="text" id="id-eid" class="form-input" placeholder="e.g. factory-dalat-01 (auto-generated if blank)" style="width:100%;padding:10px 12px"></div>' +
        '<div id="id-res" style="display:none;padding:12px;background:var(--surface);border-radius:8px;margin-bottom:12px;font-size:0.82rem"></div>' +
        '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button class="btn btn-primary" style="flex:1;padding:10px" onclick="window.idCreateDID()">' + icon('zap', 16) + ' Generate DID</button>' +
        '<button class="btn" style="padding:10px 20px" onclick="closeIdModal()">Close</button>' +
        '</div></div>';
    render();
};

// ─── Modal: Issue VC ──────────────────────────────────────
window.idShowVC = function() {
    var vcTypes = Object.keys(D.types?.vc_types || { ISO_14001: 1, ESG_GRADE: 1, LOW_CARBON: 1, TRUST_VERIFIED: 1 });
    State.modal =
        '<div class="modal" style="max-width:480px">' +
        '<div class="modal-title">' + icon('shield', 20) + ' Issue Verifiable Credential</div>' +
        '<p style="font-size:0.82rem;color:var(--text-secondary);margin:4px 0 16px">Create a cryptographically signed credential linking an issuer DID to a subject DID.</p>' +
        '<div style="margin-bottom:12px">' +
        '<label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Issuer DID</label>' +
        '<input type="text" id="vc-issuer" class="form-input" placeholder="did:trustchecker:factory:dalat-01" style="width:100%;padding:10px 12px;font-family:\'JetBrains Mono\',monospace;font-size:0.82rem"></div>' +
        '<div style="margin-bottom:12px">' +
        '<label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Subject DID</label>' +
        '<input type="text" id="vc-subject" class="form-input" placeholder="did:trustchecker:product:coffee-blend" style="width:100%;padding:10px 12px;font-family:\'JetBrains Mono\',monospace;font-size:0.82rem"></div>' +
        '<div style="margin-bottom:12px">' +
        '<label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Credential Type</label>' +
        '<select id="vc-type" class="form-input" style="width:100%;padding:10px 12px;cursor:pointer">' +
        vcTypes.map(function(t) { return '<option value="' + t + '">' + t.replace(/_/g, ' ') + '</option>'; }).join('') +
        '</select></div>' +
        '<div id="vc-res" style="display:none;padding:12px;background:var(--surface);border-radius:8px;margin-bottom:12px;font-size:0.82rem"></div>' +
        '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button class="btn" style="flex:1;padding:10px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer" onclick="window.idIssueVC()">' + icon('shield', 16) + ' Issue VC</button>' +
        '<button class="btn" style="padding:10px 20px" onclick="closeIdModal()">Close</button>' +
        '</div></div>';
    render();
};

window.closeIdModal = function() { State.modal = null; render(); };

// ─── Actions ────────────────────────────────────────────
window.idCreateDID = async function() {
    try {
        var r = await API.post('/identity/did', {
            entity_type: document.getElementById('id-type').value,
            entity_id: document.getElementById('id-eid').value || 'E-' + Date.now()
        });
        var resEl = document.getElementById('id-res');
        if (resEl) {
            resEl.style.display = 'block';
            resEl.innerHTML = r.did
                ? '<div style="color:#10b981;font-weight:700">✓ ' + r.did + '</div><div style="color:var(--text-secondary);font-size:0.75rem;margin-top:4px">DID created and registered on-chain</div>'
                : '<div style="color:#ef4444">' + (r.error || 'Failed') + '</div>';
        }
    } catch (e) {
        var resEl = document.getElementById('id-res');
        if (resEl) { resEl.style.display = 'block'; resEl.innerHTML = '<div style="color:#ef4444">' + e.message + '</div>'; }
    }
};

window.idIssueVC = async function() {
    try {
        var r = await API.post('/identity/vc/issue', {
            issuer_did: document.getElementById('vc-issuer').value,
            subject_did: document.getElementById('vc-subject').value,
            credential_type: document.getElementById('vc-type').value
        });
        var resEl = document.getElementById('vc-res');
        if (resEl) {
            resEl.style.display = 'block';
            resEl.innerHTML = r.vc_id
                ? '<div style="color:#10b981;font-weight:700">✓ ' + r.vc_id + '</div><div style="color:var(--text-secondary);font-size:0.75rem;margin-top:4px">Verifiable Credential issued and signed</div>'
                : '<div style="color:#ef4444">' + (r.error || 'Failed') + '</div>';
        }
    } catch (e) {
        var resEl = document.getElementById('vc-res');
        if (resEl) { resEl.style.display = 'block'; resEl.innerHTML = '<div style="color:#ef4444">' + e.message + '</div>'; }
    }
};
