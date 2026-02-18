/**
 * TrustChecker v9.4 — Audit View Page
 * 
 * Enterprise audit trail viewer with timeline, filtering,
 * traceability drill-down, and export.
 */

import { State, render } from '../core/state.js';
import { renderVirtualTable } from '../components/virtual-table.js';
import { api } from '../services/api.js';
import { escapeHTML } from '../utils/sanitize.js';

let _tableInstance = null;

export function renderAuditView() {
    const isAdmin = State.user?.role === 'admin' || State.user?.role === 'super_admin';

    return `
    <div class="page-container" style="padding:24px;max-width:1400px;margin:0 auto;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <div>
                <h1 style="font-size:24px;font-weight:700;color:var(--text,#fff);margin:0;">
                    🔍 Audit Trail
                </h1>
                <p style="color:var(--text-muted,#888);font-size:14px;margin:4px 0 0;">
                    Complete traceability of all system actions
                </p>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="audit-export-json" class="btn-secondary" style="padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));color:var(--text);">
                    📄 Export JSON
                </button>
                <button id="audit-export-csv" class="btn-secondary" style="padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));color:var(--text);">
                    📊 Export CSV
                </button>
            </div>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
            <select id="audit-filter-action" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text);font-size:13px;">
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="SCAN">Scan</option>
                <option value="VERIFY">Verify</option>
                <option value="EXPORT">Export</option>
            </select>
            <select id="audit-filter-entity" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text);font-size:13px;">
                <option value="">All Entities</option>
                <option value="Product">Product</option>
                <option value="User">User</option>
                <option value="Organization">Organization</option>
                <option value="Shipment">Shipment</option>
                <option value="FraudAlert">Fraud Alert</option>
                <option value="Invoice">Invoice</option>
            </select>
            ${isAdmin ? `
            <select id="audit-filter-user" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text);font-size:13px;">
                <option value="">All Users</option>
            </select>` : ''}
            <input type="date" id="audit-filter-from" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text);font-size:13px;" />
            <input type="date" id="audit-filter-to" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text);font-size:13px;" />
            <button id="audit-filter-apply" style="padding:8px 20px;background:var(--accent,#6c5ce7);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">
                Apply Filters
            </button>
        </div>

        <!-- Stats Bar -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
            <div class="audit-stat-card" style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Events</div>
                <div id="audit-total" style="font-size:28px;font-weight:700;color:var(--text);margin-top:4px;">—</div>
            </div>
            <div class="audit-stat-card" style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Today</div>
                <div id="audit-today" style="font-size:28px;font-weight:700;color:var(--accent,#6c5ce7);margin-top:4px;">—</div>
            </div>
            <div class="audit-stat-card" style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Unique Users</div>
                <div id="audit-users" style="font-size:28px;font-weight:700;color:var(--success,#00b894);margin-top:4px;">—</div>
            </div>
            <div class="audit-stat-card" style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border,rgba(255,255,255,0.08));">
                <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Critical Actions</div>
                <div id="audit-critical" style="font-size:28px;font-weight:700;color:var(--danger,#e74c3c);margin-top:4px;">—</div>
            </div>
        </div>

        <!-- Audit Table via Virtual Table -->
        <div id="audit-table-container" style="height:500px;"></div>

        <!-- Trace Detail Modal -->
        <div id="audit-trace-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;">
            <div style="background:var(--bg-card,#1a1a2e);border-radius:16px;padding:24px;max-width:700px;width:90%;max-height:80vh;overflow-y:auto;border:1px solid var(--border,rgba(255,255,255,0.1));">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="margin:0;font-size:18px;color:var(--text);">🔗 Trace Detail</h3>
                    <button id="audit-trace-close" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;">✕</button>
                </div>
                <div id="audit-trace-content" style="font-size:13px;color:var(--text);"></div>
            </div>
        </div>
    </div>`;
}

export function mountAuditView() {
    loadAuditData();

    // Filter apply
    document.getElementById('audit-filter-apply')?.addEventListener('click', loadAuditData);

    // Export buttons
    document.getElementById('audit-export-json')?.addEventListener('click', () => exportAudit('json'));
    document.getElementById('audit-export-csv')?.addEventListener('click', () => exportAudit('csv'));

    // Close modal
    document.getElementById('audit-trace-close')?.addEventListener('click', () => {
        document.getElementById('audit-trace-modal').style.display = 'none';
    });
}

async function loadAuditData() {
    try {
        const params = new URLSearchParams();
        const action = document.getElementById('audit-filter-action')?.value;
        const entity = document.getElementById('audit-filter-entity')?.value;
        const from = document.getElementById('audit-filter-from')?.value;
        const to = document.getElementById('audit-filter-to')?.value;
        if (action) params.set('action', action);
        if (entity) params.set('entity', entity);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await api(`/api/audit?${params.toString()}`);
        const data = res.events || res.data || [];

        // Update stats
        const today = new Date().toISOString().split('T')[0];
        const todayCount = data.filter(e => e.timestamp?.startsWith(today)).length;
        const uniqueUsers = new Set(data.map(e => e.user_id || e.userId)).size;
        const criticalCount = data.filter(e => ['DELETE', 'LOGOUT', 'EXPORT'].includes(e.action)).length;

        updateStat('audit-total', data.length);
        updateStat('audit-today', todayCount);
        updateStat('audit-users', uniqueUsers);
        updateStat('audit-critical', criticalCount);

        // Render virtual table
        if (_tableInstance) _tableInstance.destroy();
        _tableInstance = renderVirtualTable('audit-table-container', {
            columns: [
                { key: 'timestamp', label: 'Time', width: '160px', render: v => formatTime(v) },
                { key: 'action', label: 'Action', width: '100px', render: v => renderActionBadge(v) },
                { key: 'entity_type', label: 'Entity', width: '120px', render: v => escapeHTML(v || '') },
                { key: 'entity_id', label: 'Entity ID', width: '140px', render: v => v ? `<code style="font-size:11px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">${escapeHTML(v.slice(0, 12))}…</code>` : '—' },
                { key: 'user_id', label: 'User', width: '140px', render: v => v ? escapeHTML(v.slice(0, 12)) + '…' : 'System' },
                { key: 'changes', label: 'Changes', render: v => v ? summarizeChanges(v) : '—' },
            ],
            data,
            onRowClick: (row) => showTraceDetail(row),
        });
    } catch (err) {
        console.error('[Audit] Failed to load:', err);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
}

function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function renderActionBadge(action) {
    const colors = {
        CREATE: '#00b894', UPDATE: '#0984e3', DELETE: '#e74c3c',
        LOGIN: '#6c5ce7', LOGOUT: '#fdcb6e', SCAN: '#00cec9',
        VERIFY: '#55efc4', EXPORT: '#fd79a8',
    };
    const color = colors[action] || '#888';
    return `<span style="background:${color}22;color:${color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${escapeHTML(action || '?')}</span>`;
}

function summarizeChanges(changes) {
    try {
        const obj = typeof changes === 'string' ? JSON.parse(changes) : changes;
        const keys = Object.keys(obj);
        if (keys.length === 0) return '—';
        if (keys.length <= 2) return keys.join(', ');
        return `${keys.slice(0, 2).join(', ')} +${keys.length - 2} more`;
    } catch (e) {
        return typeof changes === 'string' ? changes.slice(0, 30) : '—';
    }
}

function showTraceDetail(row) {
    const modal = document.getElementById('audit-trace-modal');
    const content = document.getElementById('audit-trace-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div style="display:grid;gap:12px;">
            <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;">
                <span style="color:var(--text-muted);font-weight:600;">Action:</span>
                <span>${renderActionBadge(row.action)}</span>
                <span style="color:var(--text-muted);font-weight:600;">Entity Type:</span>
                <span>${escapeHTML(row.entity_type || '—')}</span>
                <span style="color:var(--text-muted);font-weight:600;">Entity ID:</span>
                <span style="font-family:monospace;font-size:12px;">${escapeHTML(row.entity_id || '—')}</span>
                <span style="color:var(--text-muted);font-weight:600;">User:</span>
                <span>${escapeHTML(row.user_id || 'System')}</span>
                <span style="color:var(--text-muted);font-weight:600;">Organization:</span>
                <span>${escapeHTML(row.org_id || '—')}</span>
                <span style="color:var(--text-muted);font-weight:600;">Timestamp:</span>
                <span>${formatTime(row.timestamp)}</span>
                <span style="color:var(--text-muted);font-weight:600;">Trace ID:</span>
                <span style="font-family:monospace;font-size:12px;">${escapeHTML(row.trace_id || row.traceId || '—')}</span>
            </div>
            <div style="margin-top:12px;">
                <h4 style="font-size:14px;margin:0 0 8px;color:var(--text-muted);">Changes</h4>
                <pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;color:var(--text);max-height:300px;overflow-y:auto;">${escapeHTML(formatJSON(row.changes))}</pre>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function formatJSON(val) {
    try {
        const obj = typeof val === 'string' ? JSON.parse(val) : val;
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return val || '{}';
    }
}

async function exportAudit(format) {
    try {
        const res = await api('/api/audit?limit=10000');
        const data = res.events || res.data || [];

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            downloadBlob(blob, `audit_${new Date().toISOString().split('T')[0]}.json`);
        } else {
            const headers = ['timestamp', 'action', 'entity_type', 'entity_id', 'user_id', 'org_id'];
            const csv = [headers.join(',')].concat(
                data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
            ).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            downloadBlob(blob, `audit_${new Date().toISOString().split('T')[0]}.csv`);
        }
    } catch (e) {
        console.error('[Audit] Export failed:', e);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
