import { State } from '../../core/state.js';
import { icon } from '../../core/icons.js';

let govData = { checkpoints: null, maturity: null, zones: null, sod: null, layers: null, roleMatrix: null, auditor: null };

async function fetchGovData() {
    try {
        const h = { 'Authorization': 'Bearer ' + State.token };
        const [cp, mat, zones, sod, layers, roleMatrix, auditor] = await Promise.all([
            fetch('/api/scm/integrity/governance-checkpoints', { headers: h }).then(r => r.json()).catch(() => null),
            fetch('/api/scm/integrity/maturity-level', { headers: h }).then(r => r.json()).catch(() => null),
            fetch('/api/scm/integrity/control-zones', { headers: h }).then(r => r.json()).catch(() => null),
            fetch('/api/scm/integrity/sod-validation', { headers: h }).then(r => r.json()).catch(() => null),
            fetch('/api/scm/integrity/enforcement-layers', { headers: h }).then(r => r.json()).catch(() => null),
            fetch('/api/scm/integrity/role-matrix', { headers: h }).then(r => r.json()).catch(() => null),
            fetch('/api/scm/integrity/auditor-path', { headers: h }).then(r => r.json()).catch(() => null)
        ]);
        govData = { checkpoints: cp, maturity: mat, zones, sod, layers, roleMatrix, auditor };
    } catch (e) { console.error('Governance fetch error:', e); }
}

function renderMaturityGauge(level) {
    const pct = (level / 5) * 100;
    const colors = ['#6b7280', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];
    const c = colors[level] || '#6b7280';
    const targets = ['', 'Baseline', 'Enterprise Ready', 'Regulated Industry', 'Cross-border', 'IPO-grade'];
    return `
    <div style="text-align:center;margin:16px 0">
        <svg width="180" height="120" viewBox="0 0 200 130">
            <path d="M 20 120 A 80 80 0 0 1 180 120" fill="none" stroke="#1e293b" stroke-width="14" stroke-linecap="round"/>
            <path d="M 20 120 A 80 80 0 0 1 180 120" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round"
                  stroke-dasharray="${pct * 2.51} 251" style="transition:stroke-dasharray 1s ease"/>
            <text x="100" y="90" text-anchor="middle" fill="${c}" font-size="32" font-weight="bold">L${level}</text>
            <text x="100" y="115" text-anchor="middle" fill="#94a3b8" font-size="12">${targets[level] || ''}</text>
        </svg>
    </div>`;
}

function renderRoleCell(val) {
    if (val === true) return '<span style="color:#10b981"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span></span>';
    if (val === false) return '<span style="color:#ef4444"><span class="status-icon status-fail" aria-label="Fail">✗</span></span>';
    return `<span style="color:#f59e0b;font-size:0.72rem">${val}</span>`;
}

export function render() {
    fetchGovData();
    const { checkpoints: cp, maturity: mat, zones, sod, layers, roleMatrix: rm, auditor } = govData;

    return `
    <div class="sa-page">
        <div class="sa-page-title">
            <h1>${icon('shield')} Blockchain Governance (EAS v2.0)</h1>
            <p style="color:#94a3b8;margin:4px 0 16px">Enterprise Audit Spec — SoD, Zero-Trust, 5 Enforcement Layers</p>
            <div class="sa-page-actions">
                <button onclick="window.refreshGovernance()" style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer">
                    ${icon('workflow')} Refresh All
                </button>
            </div>
        </div>

        <!-- ═════ GOVERNANCE STRUCTURE DIAGRAM ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 16px;color:#f1f5f9">${icon('target')} Governance Structure (EAS v2.0)</h3>
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:12px 24px;border-radius:12px;width:300px;text-align:center">
                    <div style="font-weight:700;color:#fff;font-size:14px">👔 Board / CEO</div>
                    <div style="color:#93c5fd;font-size:0.78rem">Strategic Oversight Only</div>
                </div>
                <div style="color:#475569;font-size:0.78rem">Trust Report / KPI</div>
                <div style="color:#475569;font-size:16px">▼</div>
                <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:12px 24px;border-radius:12px;width:300px;text-align:center">
                    <div style="font-weight:700;color:#fff;font-size:14px">⚖️ Compliance Officer</div>
                    <div style="color:#6ee7b7;font-size:0.78rem">Legal Authorization Layer</div>
                </div>
                <div style="color:#475569;font-size:0.78rem">4-eyes approval</div>
                <div style="color:#475569;font-size:16px">▼</div>
                <div style="background:linear-gradient(135deg,#92400e,#f59e0b);padding:12px 24px;border-radius:12px;width:300px;text-align:center">
                    <div style="font-weight:700;color:#fff;font-size:14px">🎯 Risk Team</div>
                    <div style="color:#fde68a;font-size:0.78rem">Material Risk Classifier</div>
                </div>
                <div style="color:#475569;font-size:0.78rem">trigger seal request</div>
                <div style="color:#475569;font-size:16px">▼</div>
                <!-- Zone A -->
                <div style="border:2px solid #10b981;border-radius:14px;padding:14px 20px;width:100%;max-width:520px;background:rgba(16,185,129,0.04);text-align:center">
                    <div style="color:#10b981;font-weight:700;font-size:13px;margin-bottom:6px">ZONE A — Tenant Governance</div>
                    <div style="color:#94a3b8;font-size:0.82rem">Case Freeze → Evidence Packaging → Approval Token</div>
                </div>
                <div style="color:#475569;font-size:0.78rem">Signed request (no raw DB access)</div>
                <div style="color:#475569;font-size:16px">▼</div>
                <!-- Zone B -->
                <div style="border:2px solid #3b82f6;border-radius:14px;padding:16px 20px;width:100%;max-width:520px;background:rgba(59,130,246,0.04)">
                    <div style="color:#3b82f6;font-weight:700;font-size:13px;margin-bottom:10px;text-align:center">ZONE B — Cryptographic Control</div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                        <div style="background:#0f172a;padding:8px;border-radius:8px;text-align:center">
                            <div style="color:#60a5fa;font-weight:600;font-size:0.82rem">Hash Engine</div>
                            <div style="color:#475569;font-size:0.72rem">Append-only</div>
                        </div>
                        <div style="background:#0f172a;padding:8px;border-radius:8px;text-align:center">
                            <div style="color:#34d399;font-weight:600;font-size:0.82rem">TSA Service</div>
                            <div style="color:#475569;font-size:0.72rem">RFC 3161</div>
                        </div>
                        <div style="background:#0f172a;padding:8px;border-radius:8px;text-align:center">
                            <div style="color:#fbbf24;font-weight:600;font-size:0.82rem">HSM Signer</div>
                            <div style="color:#475569;font-size:0.72rem">Key Custody</div>
                        </div>
                    </div>
                    <div style="color:#475569;font-size:0.78rem;margin-top:8px;text-align:center">→ Seal Record → Time Proof → Digital Signature → Anchor Provider</div>
                </div>
                <div style="color:#475569;font-size:0.78rem">infra configuration only</div>
                <div style="color:#475569;font-size:16px">▼</div>
                <!-- Zone C -->
                <div style="border:2px solid #ef4444;border-radius:14px;padding:14px 20px;width:100%;max-width:520px;background:rgba(239,68,68,0.04)">
                    <div style="color:#ef4444;font-weight:700;font-size:13px;margin-bottom:6px;text-align:center">ZONE C — Platform Infrastructure</div>
                    <div style="background:linear-gradient(135deg,#7c2d12,#ef4444);padding:10px 20px;border-radius:10px;text-align:center;margin-bottom:8px">
                        <div style="font-weight:700;color:#fff;font-size:14px">🔧 Super Admin</div>
                        <div style="color:#fca5a5;font-size:0.78rem">Infrastructure Custodian</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.78rem">
                        <div style="color:#94a3b8">• Anchor provider config</div>
                        <div style="color:#94a3b8">• Key rotation</div>
                        <div style="color:#fca5a5"><span class="status-icon status-fail" aria-label="Fail">✗</span> No tenant evidence</div>
                        <div style="color:#fca5a5"><span class="status-icon status-fail" aria-label="Fail">✗</span> No seal creation</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═════ ROLE MATRIX ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('users')} Role Matrix — Governance Control Map</h3>
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.78rem;text-transform:uppercase">
                            <th style="padding:8px;text-align:left">Role</th>
                            <th style="padding:8px;text-align:center">Trigger Seal</th>
                            <th style="padding:8px;text-align:center">Approve Seal</th>
                            <th style="padding:8px;text-align:center">Access Hash</th>
                            <th style="padding:8px;text-align:center">Access Evidence</th>
                            <th style="padding:8px;text-align:center">Config Anchor</th>
                            <th style="padding:8px;text-align:center">Rotate Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rm?.full_matrix ? Object.entries(rm.full_matrix).map(([role, perms]) => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:8px;color:#f1f5f9;font-weight:600">${role}</td>
                            <td style="padding:8px;text-align:center">${renderRoleCell(perms.trigger_seal)}</td>
                            <td style="padding:8px;text-align:center">${renderRoleCell(perms.approve_seal)}</td>
                            <td style="padding:8px;text-align:center">${renderRoleCell(perms.access_hash)}</td>
                            <td style="padding:8px;text-align:center">${renderRoleCell(perms.access_evidence)}</td>
                            <td style="padding:8px;text-align:center">${renderRoleCell(perms.configure_anchor)}</td>
                            <td style="padding:8px;text-align:center">${renderRoleCell(perms.rotate_key)}</td>
                        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px">Loading...</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:10px;padding:8px 12px;background:rgba(139,92,246,0.1);border-radius:8px;color:#a78bfa;font-size:0.82rem;font-family:monospace">
                Audit Rule: Signer ≠ Approver ≠ Configurer ≠ Infrastructure Owner
            </div>
        </div>

        <!-- ═════ ROW: Enforcement Layers + Maturity ═════ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

            <!-- ENFORCEMENT LAYERS -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('layers')} Enforcement Layers</h3>
                ${layers?.layers ? layers.layers.map(l => {
        const statusColor = l.status === 'active' ? '#10b981' : l.status === 'architecture_ready' ? '#f59e0b' : l.status === 'optional' ? '#3b82f6' : '#64748b';
        return `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:10px;background:#0f172a;border-left:4px solid ${statusColor}">
                        <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;background:${statusColor}">L${l.layer}</div>
                        <div style="flex:1">
                            <div style="color:#f1f5f9;font-weight:600;font-size:13px">${l.name}</div>
                            <div style="color:#64748b;font-size:0.78rem">${l.capabilities.join(' • ')}</div>
                        </div>
                        <span style="font-size:0.72rem;padding:2px 8px;border-radius:4px;background:${statusColor}22;color:${statusColor};text-transform:uppercase">${l.status}</span>
                    </div>`;
    }).join('') : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
            </div>

            <!-- MATURITY -->
            <div class="sa-card">
                <h3 style="margin:0 0 4px;color:#f1f5f9">${icon('barChart')} Enterprise Maturity</h3>
                ${mat ? renderMaturityGauge(mat.current_level) : '<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>'}
                ${mat?.levels ? mat.levels.map(l => `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin-bottom:3px;border-radius:8px;background:${l.achieved ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.06)'}">
                        <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.78rem;color:#fff;background:${l.achieved ? '#10b981' : '#334155'}">${l.level}</div>
                        <div style="flex:1">
                            <div style="color:${l.achieved ? '#f1f5f9' : '#64748b'};font-weight:600;font-size:0.82rem">${l.name}</div>
                            <div style="color:#475569;font-size:0.72rem">${l.target}</div>
                        </div>
                        <span>${l.achieved ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : l.note ? '<span class="status-icon status-warn" aria-label="Warning">!</span>' : '⬜'}</span>
                    </div>
                `).join('') : ''}
                ${mat?.recommendation ? `<div style="margin-top:10px;padding:8px;background:rgba(59,130,246,0.1);border-radius:8px;color:#93c5fd;font-size:0.78rem">💡 ${mat.recommendation}</div>` : ''}
            </div>
        </div>

        <!-- ═════ ROW: Checkpoints + SoD ═════ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

            <!-- CHECKPOINTS -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('check')} Governance Checkpoints</h3>
                ${cp?.checkpoints ? cp.checkpoints.map(c => `
                    <div style="background:#0f172a;padding:10px 14px;border-radius:10px;margin-bottom:6px;border-left:4px solid ${c.status === 'PASS' ? '#10b981' : c.status === 'WARN' ? '#f59e0b' : '#ef4444'}">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="color:#f1f5f9;font-weight:600;font-size:13px">${c.icon} ${c.name}</span>
                            <span style="font-size:0.78rem;padding:2px 6px;border-radius:4px;background:${c.status === 'PASS' ? 'rgba(16,185,129,0.15);color:#10b981' : c.status === 'WARN' ? 'rgba(245,158,11,0.15);color:#f59e0b' : 'rgba(239,68,68,0.15);color:#ef4444'}">${c.status}</span>
                        </div>
                        <div style="margin-top:4px">${c.checks.map(ch => `<span style="color:#94a3b8;font-size:0.78rem;margin-right:8px">• ${ch}</span>`).join('')}</div>
                    </div>
                `).join('') : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
                ${cp ? `<div style="text-align:center;margin-top:10px;padding:6px;background:${cp.overall?.includes('PASS') ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};border-radius:6px;color:${cp.overall?.includes('PASS') ? '#10b981' : '#f59e0b'};font-weight:600;font-size:13px">${cp.overall || ''}</div>` : ''}
            </div>

            <!-- SoD -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('alertTriangle')} Separation of Duties</h3>
                ${sod ? `
                    <div style="text-align:center;margin-bottom:12px">
                        <div style="font-size:40px">${sod.violations?.length === 0 ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</div>
                        <div style="color:${sod.violations?.length === 0 ? '#10b981' : '#ef4444'};font-weight:700;font-size:14px">${sod.status}</div>
                        <div style="color:#64748b;font-size:0.78rem">${sod.total_users_checked} users checked</div>
                    </div>
                    <div style="margin-bottom:8px;color:#94a3b8;font-size:0.78rem;font-weight:600">AUDIT RULE</div>
                    <div style="padding:6px 10px;background:#0f172a;border-radius:6px;color:#a78bfa;font-size:0.82rem;font-family:monospace;margin-bottom:10px">${sod.audit_rule || ''}</div>
                    <div style="display:grid;gap:3px">
                        ${sod.checkpoints ? Object.entries(sod.checkpoints).map(([k, v]) => `
                            <div style="display:flex;justify-content:space-between;padding:5px 10px;background:#0f172a;border-radius:6px">
                                <span style="color:#94a3b8;font-size:0.78rem">${k.replace(/_/g, ' ')}</span>
                                <span>${v ? '<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span>' : '<span class="status-icon status-fail" aria-label="Fail">✗</span>'}</span>
                            </div>
                        `).join('') : ''}
                    </div>
                ` : '<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>'}
            </div>
        </div>

        <!-- ═════ ROW: Control Zones + Zero-Trust ═════ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

            <!-- ZONES -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('lock')} Control Zones (Zero-Trust)</h3>
                ${zones?.zones ? zones.zones.map(z => {
        const zoneColor = z.zone === 'A' ? '#10b981' : z.zone === 'B' ? '#3b82f6' : '#ef4444';
        return `
                    <div style="background:#0f172a;padding:12px 14px;border-radius:10px;margin-bottom:6px;border-left:4px solid ${zoneColor}">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                            <span style="color:#f1f5f9;font-weight:700;font-size:14px">Zone ${z.zone} — ${z.name}</span>
                            <span style="font-size:0.78rem">${z.access}</span>
                        </div>
                        <div style="color:#475569;font-size:0.78rem;margin-bottom:4px;font-style:italic">${z.boundary || ''}</div>
                        ${z.permissions.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:3px">${z.permissions.map(p => `<span style="font-size:0.72rem;padding:2px 6px;background:${zoneColor}22;color:${zoneColor};border-radius:4px">${p}</span>`).join('')}</div>` : ''}
                        ${z.restrictions ? z.restrictions.map(r => `<div style="color:#fca5a5;font-size:0.78rem;margin-top:2px">${r}</div>`).join('') : ''}
                    </div>`;
    }).join('') : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
            </div>

            <!-- ZERO-TRUST RULES -->
            <div class="sa-card">
                <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('shield')} Zero-Trust Design</h3>
                ${zones?.zero_trust_rules ? zones.zero_trust_rules.map(r => `
                    <div style="padding:10px 12px;background:#0f172a;border-radius:10px;margin-bottom:6px;border-left:4px solid #8b5cf6">
                        <div style="color:#f1f5f9;font-weight:600;font-size:13px">Rule ${r.id}: ${r.rule}</div>
                        <div style="color:#94a3b8;font-size:0.78rem;margin-top:3px">${r.impl}</div>
                    </div>
                `).join('') : '<div style="text-align:center;padding:20px;color:#64748b">Loading...</div>'}
            </div>
        </div>

        <!-- ═════ ESCALATION ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('workflow')} Escalation Matrix — Anchor Policy</h3>
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="border-bottom:2px solid #1e293b;color:#94a3b8;font-size:0.78rem;text-transform:uppercase">
                            <th style="padding:8px;text-align:left">Risk Level</th>
                            <th style="padding:8px;text-align:left">Required Approvals</th>
                            <th style="padding:8px;text-align:left">Seal Type</th>
                            <th style="padding:8px;text-align:left">Anchor Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[
            { level: 'Medium', color: '#f59e0b', approvals: 'Risk', seal: 'Internal hash', anchor: 'None' },
            { level: 'High', color: '#ef4444', approvals: 'Risk + Compliance', seal: 'Hash + TSA', anchor: 'TSA' },
            { level: 'Critical', color: '#8b5cf6', approvals: 'Risk + Compliance + Legal', seal: 'Full seal', anchor: 'Public anchor' },
            { level: 'Model Deploy', color: '#3b82f6', approvals: 'Compliance', seal: 'Hash + Signature', anchor: 'Optional TSA' },
            { level: 'Evidence Export', color: '#10b981', approvals: 'Compliance', seal: 'Full seal', anchor: 'Mandatory TSA' }
        ].map(r => `
                        <tr style="border-bottom:1px solid #1e293b">
                            <td style="padding:8px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};margin-right:6px"></span><span style="color:#f1f5f9;font-weight:600">${r.level}</span></td>
                            <td style="padding:8px;color:#94a3b8">${r.approvals}</td>
                            <td style="padding:8px;color:#94a3b8">${r.seal}</td>
                            <td style="padding:8px;color:#94a3b8">${r.anchor}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div style="text-align:center;margin-top:8px;color:#64748b;font-size:0.82rem;font-style:italic">CEO không tham gia approve — chỉ nhận Trust KPI.</div>
        </div>

        <!-- ═════ AUDITOR PATH ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('scroll')} Auditor Verification Path</h3>
            ${auditor?.steps ? `
            <div style="display:flex;flex-direction:column;gap:2px;padding:0 20px">
                ${auditor.steps.map((s, i) => `
                    <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
                        <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.82rem;color:#fff;background:${i === auditor.steps.length - 1 ? '#10b981' : '#3b82f6'};flex-shrink:0">${s.step}</div>
                        <div style="flex:1">
                            <div style="color:#f1f5f9;font-weight:600;font-size:13px">${s.name}</div>
                            <div style="color:#64748b;font-size:0.78rem">${s.tool}</div>
                        </div>
                    </div>
                    ${i < auditor.steps.length - 1 ? '<div style="margin-left:13px;border-left:2px solid #1e293b;height:8px"></div>' : ''}
                `).join('')}
            </div>
            <div style="text-align:center;margin-top:12px;color:#10b981;font-size:0.82rem"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Không cần trust TrustChecker — Independent verification</div>
            ` : '<div style="text-align:center;padding:20px;color:#64748b">Loading auditor path...</div>'}
        </div>

        <!-- ═════ STRATEGIC POSITIONING ═════ -->
        <div class="sa-card" style="margin-bottom:20px">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('target')} Strategic Positioning</h3>
            <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                <span style="font-size:0.82rem;padding:4px 12px;border-radius:6px;background:rgba(239,68,68,0.1);color:#fca5a5"><span class="status-icon status-fail" aria-label="Fail">✗</span> Not core product</span>
                <span style="font-size:0.82rem;padding:4px 12px;border-radius:6px;background:rgba(239,68,68,0.1);color:#fca5a5"><span class="status-icon status-fail" aria-label="Fail">✗</span> Not marketing gimmick</span>
                <span style="font-size:0.82rem;padding:4px 12px;border-radius:6px;background:rgba(16,185,129,0.1);color:#6ee7b7"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">✓</span></span> Governance Infrastructure</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
                ${[
            { role: 'CEO', value: 'Trust KPI', color: '#3b82f6' },
            { role: 'Compliance', value: 'Legal defensibility', color: '#10b981' },
            { role: 'Risk', value: 'Non-repudiation', color: '#f59e0b' },
            { role: 'Investor', value: 'Tamper-proof governance', color: '#8b5cf6' },
            { role: 'Regulator', value: 'Independent verification', color: '#ec4899' }
        ].map(s => `
                    <div style="text-align:center;padding:12px 8px;background:${s.color}11;border-radius:10px;border:1px solid ${s.color}33">
                        <div style="color:${s.color};font-weight:700;font-size:13px;margin-bottom:4px">${s.role}</div>
                        <div style="color:#94a3b8;font-size:0.78rem">${s.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- ═════ STRUCTURAL RULES ═════ -->
        <div class="sa-card">
            <h3 style="margin:0 0 12px;color:#f1f5f9">${icon('alertTriangle')} Structural Rules — Audit Fail Conditions</h3>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
                ${[
            'Không tạo quyền lực tập trung',
            'Không cho Super Admin xem tenant data',
            'Không cho Risk tự seal',
            'Không cho Compliance sửa event',
            'Không cho ai rewrite history'
        ].map(rule => `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#0f172a;border-radius:8px;border-left:3px solid #ef4444">
                        <span style="color:#ef4444;font-size:13px">🚫</span>
                        <div>
                            <div style="color:#f1f5f9;font-size:0.82rem;font-weight:500">${rule}</div>
                            <div style="color:#ef4444;font-size:0.72rem">Violation = Audit Fail</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

    </div>`;
}

window.refreshGovernance = async function () {
    await fetchGovData();
    const el = document.getElementById('app') || document.querySelector('.sa-page')?.parentElement;
    if (el) el.innerHTML = render();
};
