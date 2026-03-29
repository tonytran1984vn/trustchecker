/**
 * SCM – Supply Chain Network (Phase 9.5)
 *
 * Enriched Data Grid with Pagination, Role Filters, and Fixed Modal Overlays.
 */
import { State, render } from '../../core/state.js';

let GS = {
  search: '', 
  filter: 'all', 
  role: 'all', 
  page: 1, 
  pageSize: 20, 
  detailId: null
};

const NT = {
  farm:         { icon: '🌿', color: '#4ade80', label: 'Farm',        tier: 0 },
  processor:    { icon: '⚙️', color: '#f59e0b', label: 'Processor',   tier: 1 },
  manufacturer: { icon: '🏭', color: '#f97316', label: 'Manufacturer',tier: 1 },
  supplier:     { icon: '📦', color: '#14b8a6', label: 'Supplier',    tier: 1 },
  warehouse:    { icon: '🏢', color: '#60a5fa', label: 'Warehouse',   tier: 2 },
  organization: { icon: '🏢', color: '#6366f1', label: 'Organization',tier: 2.5 },
  transit:      { icon: '🚛', color: '#8b5cf6', label: 'Transit',     tier: 3 },
  port:         { icon: '🚢', color: '#a78bfa', label: 'Port',        tier: 3 },
  logistics:    { icon: '🚛', color: '#8b5cf6', label: 'Logistics',   tier: 3 },
  hub:          { icon: '🔀', color: '#6366f1', label: 'Hub',         tier: 4 },
  distributor:  { icon: '🏪', color: '#f472b6', label: 'Distributor', tier: 5 },
};

const TIER_LABELS = { 
  0: 'SOURCE & RAW MATERIALS', 1: 'PROCESSING & MANUFACTURING', 2: 'STORAGE FACILITIES', 
  2.5: 'CORE ORGANIZATION', 3: 'LOGISTICS & TRANSIT', 4: 'REGIONAL HUBS', 5: 'DISTRIBUTION' 
};

function nCfg(t) { return NT[t] || { icon: '●', color: '#94a3b8', label: t || 'Unknown', tier: 2 }; }
function trustC(s) { return s == null ? 'var(--text-muted)' : s >= 85 ? '#22c55e' : s >= 70 ? '#f59e0b' : s >= 50 ? '#f97316' : '#ef4444'; }
function riskC(s) { return s == null ? 'var(--text-muted)' : s <= 10 ? '#22c55e' : s <= 20 ? '#84cc16' : s <= 35 ? '#f59e0b' : s <= 50 ? '#f97316' : '#ef4444'; }

export function renderPage() {
  const graph = State.networkGraph?.graph;
  if (!graph) return `<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading Network Data...</div>`;

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  
  // Tag and process all nodes
  nodes.forEach(n => {
    n._cfg = nCfg(n.type);
    n._inSC = edges.some(e => e.from_node_id === n.id || e.to_node_id === n.id);
  });

  // Filtering
  let visible = nodes;
  if (GS.search) {
    const s = GS.search.toLowerCase();
    visible = visible.filter(n => (n.label || '').toLowerCase().includes(s));
  }
  if (GS.filter === 'supply_chain') visible = visible.filter(n => n._inSC || n.isCenter);
  if (GS.role !== 'all') visible = visible.filter(n => n.type === GS.role);

  // Sorting: Tier -> Trust Score
  visible.sort((a,b) => {
    if (a._cfg.tier !== b._cfg.tier) return a._cfg.tier - b._cfg.tier;
    return (b.trustScore||0) - (a.trustScore||0);
  });

  // Pagination logic
  const totalItems = visible.length;
  const totalPages = Math.ceil(totalItems / GS.pageSize);
  if (GS.page > totalPages && totalPages > 0) GS.page = 1;
  const startIdx = (GS.page - 1) * GS.pageSize;
  const paginated = visible.slice(startIdx, startIdx + GS.pageSize);

  // Build Table HTML
  let tableHtml = '';
  if (totalItems === 0) {
    tableHtml = `<tr><td colspan="5" style="padding:60px;text-align:center;color:var(--text-muted)">No entities match the current filters.</td></tr>`;
  } else {
    let currentTier = null;
    paginated.forEach(n => {
      // Group Headers Break
      if (n._cfg.tier !== currentTier) {
        currentTier = n._cfg.tier;
        tableHtml += `
          <tr style="background:var(--bg)">
            <td colspan="5" style="padding:10px 24px;border-bottom:1px solid var(--border);border-top:1px solid var(--border);font-size:0.75rem;font-weight:800;color:var(--text);letter-spacing:0.5px">
              <span style="color:var(--text-muted);display:inline-block;width:20px">▼</span> ${TIER_LABELS[currentTier] || 'TIER ' + currentTier}
            </td>
          </tr>
        `;
      }
      const c = n._cfg;
      const tc = trustC(n.trustScore);
      let statusHtml = n.isCenter ? `<span class="tb-badge" style="background:#6366f115;color:#6366f1;border:1px solid #6366f130">★ CORE</span>` :
                       n.isNetworkMember ? `<span class="tb-badge" style="background:#10b98115;color:#10b981;border:1px solid #10b98130">VERIFIED</span>` :
                       !n._inSC ? `<span class="tb-badge" style="background:var(--bg-muted);color:var(--text-muted);border:1px solid var(--border)">UNLINKED</span>` :
                       `<span class="tb-badge" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)">SYNCED</span>`;

      tableHtml += `
        <tr class="grid-tr" onclick="window._scngDetail('${n.id}')">
          <td style="padding:12px 24px;border-bottom:1px solid var(--border)">
             <div style="display:flex;align-items:center;gap:12px">
               <div style="width:28px;height:28px;border-radius:6px;background:${c.color}15;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:14px">${c.icon}</div>
               <div style="font-weight:700;color:var(--text)">${n.label}</div>
             </div>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--border);color:var(--text-muted)">${n.country || '—'}</td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--border)"><span class="tb-badge" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border)">${c.label.toUpperCase()}</span></td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--border)">${statusHtml}</td>
          <td style="padding:12px 24px;border-bottom:1px solid var(--border);text-align:right">
            ${n.trustScore ? `<span style="font-weight:800;color:${tc};font-size:0.95rem">${n.trustScore}</span>` : '<span style="color:var(--text-muted)">—</span>'}
          </td>
        </tr>
      `;
    });
  }

  return `
  <div style="padding:24px;width:100%;box-sizing:border-box">

    <!-- Header Stats -->
    <div style="display:flex;gap:20px;margin-bottom:24px;flex-wrap:wrap">
      ${_statCard('Verified Nodes', nodes.length)}
      ${_statCard('Total Links', edges.length)}
      ${_statCard('Sovereign Partners', State.networkStats?.network_members || 0)}
    </div>

    <!-- Data Grid Container -->
    <div style="background:var(--card, #fff);border:1px solid var(--border, #e2e8f0);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02)">
      
      <!-- Toolbar -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border);background:var(--bg);flex-wrap:wrap;gap:12px">
        <div>
          <h2 style="font-size:1.15rem;font-weight:800;color:var(--text);margin:0 0 4px 0">Network Topology Ledger</h2>
        </div>
        
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <input type="text" placeholder="Search..." value="${GS.search}" oninput="window._scngSearch(this.value)"
                 style="width:200px;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:0.8rem;outline:none">
          
          <select onchange="window._scngRoleFilter(this.value)" style="padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:0.8rem;outline:none">
             <option value="all" ${GS.role==='all'?'selected':''}>All Roles</option>
             ${Object.keys(NT).map(k => `<option value="${k}" ${GS.role===k?'selected':''}>${NT[k].label}</option>`).join('')}
          </select>
                 
          <div style="display:flex;background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <button onclick="window._scngFilter('all')" class="grid-filter-btn ${GS.filter === 'all' ? 'active' : ''}">All</button>
            <button onclick="window._scngFilter('supply_chain')" class="grid-filter-btn ${GS.filter === 'supply_chain' ? 'active' : ''}" style="border-left:1px solid var(--border)">In-Chain</button>
          </div>
        </div>
      </div>
      
      <!-- Table -->
      <div style="overflow-x:auto; min-height: 400px;">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.85rem">
          <thead style="background:var(--bg);border-bottom:2px solid var(--border);color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px">
            <tr>
              <th style="padding:14px 24px;font-weight:700">Organization Name</th>
              <th style="padding:14px 16px;font-weight:700">Location</th>
              <th style="padding:14px 16px;font-weight:700">Network Role</th>
              <th style="padding:14px 16px;font-weight:700">Status</th>
              <th style="padding:14px 24px;font-weight:700;text-align:right">Trust Score</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml}
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-top:1px solid var(--border);background:var(--bg)">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:0.8rem;color:var(--text-muted)">Rows per page:</span>
          <select onchange="window._scngPageSize(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--card);color:var(--text);outline:none">
            <option value="10" ${GS.pageSize==10?'selected':''}>10</option>
            <option value="20" ${GS.pageSize==20?'selected':''}>20</option>
            <option value="50" ${GS.pageSize==50?'selected':''}>50</option>
            <option value="100" ${GS.pageSize==100?'selected':''}>100</option>
          </select>
        </div>
        
        <div style="display:flex;align-items:center;gap:16px">
          <span style="font-size:0.8rem;color:var(--text-muted)">${totalItems === 0 ? 0 : startIdx + 1}-${Math.min(startIdx + GS.pageSize, totalItems)} of ${totalItems}</span>
          <div style="display:flex;gap:4px">
            <button onclick="window._scngPage(-1)" ${GS.page===1?'disabled':''} class="pag-btn">❮</button>
            <button onclick="window._scngPage(1)" ${GS.page>=totalPages?'disabled':''} class="pag-btn">❯</button>
          </div>
        </div>
      </div>
      
    </div>
    
    ${_styles()}
    ${GS.detailId ? _renderModal(GS.detailId, nodes, edges) : ''}
  </div>`;
}

function _statCard(l, v) {
  return `<div style="flex:1;min-width:160px;background:var(--card, #fff);border:1px solid var(--border, #e2e8f0);border-radius:10px;padding:16px 20px;box-shadow:0 1px 2px rgba(0,0,0,0.02)">
    <div style="font-size:1.6rem;font-weight:800;color:var(--text, #1e293b);line-height:1;margin-bottom:6px">${v}</div>
    <div style="font-size:0.7rem;color:var(--text-muted, #64748b);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">${l}</div>
  </div>`;
}

function _renderModal(id, nodes, edges) {
  const node = nodes.find(n => n.id === id);
  if (!node) return '';
  const c = node._cfg || nCfg(node.type);
  const tc = trustC(node.trustScore);
  
  const inE = edges.filter(e => e.to_node_id === id);
  const outE = edges.filter(e => e.from_node_id === id);
  
  const relH = (e, isOut) => {
    const o = nodes.find(x => x.id === (isOut ? e.to_node_id : e.from_node_id)) || {label:'Unknown'};
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e2e8f0">
      <div style="font-weight:600;font-size:0.8rem;color:#1e293b">${o.label}</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:0.65rem;font-weight:700;color:#64748b;background:#f8fafc;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0;text-transform:uppercase">${e.relationship||'LINK'}</span>
      </div>
    </div>`;
  };

  // Hardcoded solid white background and slate text colors specifically for the modal container to prevent CSS bleeding
  return `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999">
      <div style="background:#ffffff;color:#1e293b;width:500px;max-width:90vw;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;animation:mFadeIn 0.2s ease-out">
        
        <div style="padding:24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;background:#f8fafc">
          <div style="display:flex;gap:16px;align-items:center">
             <div style="width:48px;height:48px;border-radius:10px;background:${c.color}15;color:${c.color};border:1px solid ${c.color}30;display:flex;align-items:center;justify-content:center;font-size:24px">${c.icon}</div>
             <div>
               <h3 style="margin:0 0 4px 0;font-size:1.2rem;font-weight:800;color:#0f172a">${node.label}</h3>
               <div style="font-size:0.8rem;color:#475569;font-weight:600">${c.label} ${node.country ? '· ' + node.country : ''}</div>
             </div>
          </div>
          <button onclick="window._scngDetail(null)" style="background:#e2e8f0;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;color:#475569;font-weight:800;transition:0.2s">✕</button>
        </div>
        
        <div style="padding:24px;max-height:60vh;overflow-y:auto;background:#ffffff">
          
          <div style="display:flex;gap:16px;margin-bottom:24px">
            <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
              <div style="font-size:0.65rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Trust Score</div>
              <div style="font-size:1.6rem;font-weight:800;color:${tc};line-height:1">${node.trustScore || '—'}</div>
            </div>
            <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
              <div style="font-size:0.65rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Risk Tier</div>
              <div style="font-size:1.1rem;font-weight:800;color:${riskC(node.riskLevel==='HIGH'?90:node.riskLevel==='MEDIUM'?40:10)};text-transform:uppercase;margin-top:4px">${node.riskLevel || 'UNKNOWN'}</div>
            </div>
          </div>
          
          <div style="font-size:0.75rem;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px">Inbound Supply (${inE.length})</div>
          <div style="margin-bottom:24px">${inE.map(e => relH(e, false)).join('') || '<div style="padding:12px 0;font-size:0.8rem;color:#94a3b8;font-style:italic">No incoming connections.</div>'}</div>
          
          <div style="font-size:0.75rem;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px">Outbound Logistics (${outE.length})</div>
          <div>${outE.map(e => relH(e, true)).join('') || '<div style="padding:12px 0;font-size:0.8rem;color:#94a3b8;font-style:italic">No outgoing connections.</div>'}</div>
          
        </div>
      </div>
    </div>
  `;
}

window._scngSearch = function(v) { GS.search = v; GS.page = 1; render(); };
window._scngFilter = function(f) { GS.filter = f; GS.page = 1; render(); };
window._scngRoleFilter = function(r) { GS.role = r; GS.page = 1; render(); };
window._scngPageSize = function(s) { GS.pageSize = parseInt(s); GS.page = 1; render(); };
window._scngPage = function(d) { GS.page += d; render(); };
window._scngDetail = function(id) { GS.detailId = id; render(); };

function _styles() {
  return `<style>
.grid-filter-btn { padding:8px 16px; border:none; background:transparent; font-size:0.75rem; font-weight:700; color:var(--text-muted); cursor:pointer; outline:none; transition:0.2s; }
.grid-filter-btn:hover { background:var(--bg); color:var(--text); }
.grid-filter-btn.active { background:var(--bg); color:var(--text); }
.grid-tr { transition:background 0.15s; cursor:pointer; }
.grid-tr:hover { background:var(--bg); }
.tb-badge { padding:3px 8px; border-radius:4px; font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
.pag-btn { padding:4px 10px; border:1px solid var(--border); background:var(--card); color:var(--text); border-radius:4px; cursor:pointer; font-weight:800; }
.pag-btn:disabled { opacity:0.3; cursor:not-allowed; }
.pag-btn:not(:disabled):hover { background:var(--bg); }
@keyframes mFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
</style>`;
}

export default { renderPage };
