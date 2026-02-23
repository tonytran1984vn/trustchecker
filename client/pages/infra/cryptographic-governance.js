/** Cryptographic Governance — HSM, Multi-Sig, Key Recovery, Ceremony (Static Reference) */
import { icon } from '../../core/icons.js';

const HSM = [
    { name: 'Master Key Store', algo: 'AES-256-GCM', level: 'FIPS 140-2 L3', provider: 'AWS CloudHSM', status: 'Active' },
    { name: 'JWT Signing Module', algo: 'RS256 (2048-bit)', level: 'FIPS 140-2 L2', provider: 'Software HSM', status: 'Active' },
    { name: 'QR Code Signing', algo: 'HMAC-SHA256', level: 'FIPS 140-2 L2', provider: 'Software HSM', status: 'Active' },
    { name: 'Database TDE', algo: 'AES-256-CBC', level: 'FIPS 140-2 L2', provider: 'PostgreSQL Native', status: 'Active' },
];

const MULTISIG = [
    { action: 'Master Key Rotation', required: '3 of 5', roles: 'Super Admin + CTO + CISO', timeout: '24h' },
    { action: 'Tenant Data Deletion (GDPR)', required: '2 of 3', roles: 'Compliance + Admin', timeout: '48h' },
    { action: 'Emergency Key Revoke', required: '2 of 2', roles: 'Super Admin + CTO', timeout: '1h' },
];

const ROTATION = [
    { key: 'KMS-PII-001', purpose: 'PII Encryption', cycle: '90 days', next: 'Mar 1, 2026', status: 'On Schedule' },
    { key: 'KMS-JWT-001', purpose: 'JWT Signing', cycle: '180 days', next: 'Jun 1, 2026', status: 'On Schedule' },
    { key: 'KMS-QR-001', purpose: 'QR Code Signing', cycle: '90 days', next: 'Mar 15, 2026', status: 'On Schedule' },
    { key: 'KMS-DB-001', purpose: 'Database TDE', cycle: '365 days', next: 'Jun 1, 2026', status: 'On Schedule' },
];

const CEREMONY = [
    { step: 1, name: 'Preparation', desc: 'Secure room booked, cameras on, 3+ key holders notified 48h in advance' },
    { step: 2, name: 'Identity Verification', desc: 'Each key holder verified by ID + biometric. Notary present' },
    { step: 3, name: 'Key Generation', desc: 'Master key generated inside HSM. Split into 5 shares (Shamir Secret Sharing)' },
    { step: 4, name: 'Distribution', desc: 'Each share sealed in tamper-evident envelope → handed to designated holder' },
    { step: 5, name: 'Verification', desc: 'Test decryption with 3/5 shares. Confirm key works. Log ceremony hash to blockchain' },
    { step: 6, name: 'Archival', desc: 'Video recording + signed ceremony log stored in offline vault (30 year retention)' },
];

export function renderPage() {
    return `
<div class="sa-page">
    <div class="sa-page-title"><h1>${icon('key')} Cryptographic Governance</h1>
        <p style="color:#94a3b8;margin:4px 0 16px">HSM Architecture · Multi-Sig · Key Recovery · Key Ceremony · Zero Trust</p>
        <div style="display:inline-block;padding:4px 10px;background:#ef444422;color:#ef4444;border-radius:6px;font-size:0.72rem;font-weight:600">🔒 L5 Super Admin Only</div></div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        ${[{ l: 'HSM Modules', v: HSM.length, c: '#ef4444', i: '🔐' }, { l: 'Multi-Sig Policies', v: MULTISIG.length, c: '#f59e0b', i: '✍️' }, { l: 'Key Rotation', v: ROTATION.length, c: '#3b82f6', i: '🔄' }].map(k => `<div class="sa-card" style="text-align:center;padding:14px"><div style="font-size:18px">${k.i}</div><div style="font-size:22px;font-weight:700;color:${k.c}">${k.v}</div><div style="color:#94a3b8;font-size:0.72rem">${k.l}</div></div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <!-- HSM Architecture -->
        <div class="sa-card"><h3>🔐 HSM Architecture</h3>
            <table class="sa-table sa-table-compact"><thead><tr><th>Module</th><th>Algorithm</th><th>Level</th><th>Provider</th><th>Status</th></tr></thead><tbody>
            ${HSM.map(h => `<tr><td><strong>${h.name}</strong></td><td class="sa-code" style="font-size:0.72rem">${h.algo}</td><td style="font-size:0.72rem">${h.level}</td><td style="font-size:0.72rem">${h.provider}</td><td><span class="sa-dot sa-dot-green"></span> ${h.status}</td></tr>`).join('')}
            </tbody></table>
        </div>

        <!-- Multi-Sig Policy -->
        <div class="sa-card"><h3>✍️ Multi-Sig Policy</h3>
            <table class="sa-table sa-table-compact"><thead><tr><th>Action</th><th>Required</th><th>Roles</th><th>Timeout</th></tr></thead><tbody>
            ${MULTISIG.map(m => `<tr><td><strong>${m.action}</strong></td><td style="color:#f59e0b;font-weight:600">${m.required}</td><td style="font-size:0.72rem">${m.roles}</td><td>${m.timeout}</td></tr>`).join('')}
            </tbody></table>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Key Rotation -->
        <div class="sa-card"><h3>🔄 Key Rotation Schedule</h3>
            <table class="sa-table sa-table-compact"><thead><tr><th>Key ID</th><th>Purpose</th><th>Cycle</th><th>Next</th><th>Status</th></tr></thead><tbody>
            ${ROTATION.map(r => `<tr><td class="sa-code" style="font-size:0.72rem">${r.key}</td><td>${r.purpose}</td><td>${r.cycle}</td><td>${r.next}</td><td><span class="sa-status-pill sa-pill-green" style="font-size:0.65rem">${r.status}</span></td></tr>`).join('')}
            </tbody></table>
        </div>

        <!-- Key Ceremony Protocol -->
        <div class="sa-card"><h3>🎩 Key Ceremony Protocol</h3>
            ${CEREMONY.map(c => `<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">
                <span style="min-width:24px;height:24px;border-radius:50%;background:#3b82f6;color:#fff;font-size:0.72rem;font-weight:700;display:flex;align-items:center;justify-content:center">${c.step}</span>
                <div><strong style="font-size:0.82rem">${c.name}</strong><div style="font-size:0.72rem;color:#94a3b8;margin-top:2px">${c.desc}</div></div>
            </div>`).join('')}
        </div>
    </div>
</div>`;
}
export { renderPage as render };
