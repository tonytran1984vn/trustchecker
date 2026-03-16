/**
 * SCM – Supply Chain Network Graph (Redesigned)
 * 
 * Hierarchical directed graph with typed nodes, risk-scored edges,
 * force simulation, click-to-inspect, hover highlighting, pan & zoom.
 */
import { State, render } from '../../core/state.js';
import { API } from '../../core/api.js';

let GS = {
  selectedNode: null, hoveredNode: null,
  transform: { x: 0, y: 0, scale: 1 },
  nodes: [], edges: [], filter: 'all',
};

const NT = {
  farm:         { icon: '🌿', color: '#4ade80', label: 'Farm',        tier: 0 },
  processor:    { icon: '⚙️',  color: '#f59e0b', label: 'Processor',   tier: 1 },
  warehouse:    { icon: '📦', color: '#60a5fa', label: 'Warehouse',   tier: 2 },
  port:         { icon: '🚢', color: '#a78bfa', label: 'Port',        tier: 3 },
  hub:          { icon: '🔀', color: '#6366f1', label: 'Hub',         tier: 4 },
  distributor:  { icon: '🏪', color: '#f472b6', label: 'Distributor', tier: 5 },
  organization: { icon: '🏢', color: '#6366f1', label: 'Organization',tier: 2.5 },
  supplier:     { icon: '🏭', color: '#14b8a6', label: 'Supplier',    tier: 1 },
  manufacturer: { icon: '🏭', color: '#f97316', label: 'Manufacturer',tier: 1 },
  logistics:    { icon: '🚛', color: '#8b5cf6', label: 'Logistics',   tier: 3 },
};

function nCfg(t) { return NT[t] || { icon: '●', color: '#94a3b8', label: t || 'Unknown', tier: 2 }; }
function riskC(s) { return s == null ? '#475569' : s <= 10 ? '#22c55e' : s <= 20 ? '#84cc16' : s <= 35 ? '#f59e0b' : s <= 50 ? '#f97316' : '#ef4444'; }
function trustC(s) { return s == null ? '#475569' : s >= 85 ? '#22c55e' : s >= 70 ? '#f59e0b' : s >= 50 ? '#f97316' : '#ef4444'; }
function markerName(s) { return s == null ? 'gray' : s <= 10 ? 'green' : s <= 20 ? 'lime' : s <= 35 ? 'yellow' : s <= 50 ? 'orange' : 'red'; }

export function renderPage() {
  const graph = State.networkGraph?.graph;
  const stats = State.networkStats;

  if (!graph) {
    return `<div id="scm-network-root" style="padding:40px;text-align:center;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 12px"></div>Loading network graph…</div>`;
  }

  const totalN = graph?.nodes?.length || 0;
  const totalE = graph?.edges?.length || 0;
  const scored = (graph.nodes || []).filter(n => n.trustScore);
  const avgT = scored.length ? Math.round(scored.reduce((s, n) => s + n.trustScore, 0) / scored.length) : 0;
  const highR = (graph.edges || []).filter(e => e.risk_score > 25).length;

  // Schedule graph init after DOM renders
  setTimeout(() => _initGraphEngine(), 60);

  return `<div id="scm-network-root">
    <div class="scng-stats-row">
      <div class="scng-stat-card"><div class="scng-stat-value">${totalN}</div><div class="scng-stat-label">Nodes</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value">${totalE}</div><div class="scng-stat-label">Connections</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value" style="color:${trustC(avgT)}">${avgT || '—'}</div><div class="scng-stat-label">Avg Trust</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value" style="color:${highR > 0 ? '#f59e0b' : '#22c55e'}">${highR}</div><div class="scng-stat-label">High-Risk Links</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value">${stats?.network_members || 0}</div><div class="scng-stat-label">Verified Partners</div></div>
    </div>

    <div class="scng-graph-container">
      <div class="scng-toolbar">
        <div class="scng-toolbar-left">
          <input type="text" class="scng-search" placeholder="Search nodes…" oninput="window._scngSearch(this.value)">
          <div class="scng-filter-group">
            <button class="scng-filter-btn ${GS.filter === 'all' ? 'active' : ''}" onclick="window._scngFilter('all')">All</button>
            <button class="scng-filter-btn ${GS.filter === 'supply_chain' ? 'active' : ''}" onclick="window._scngFilter('supply_chain')">Supply Chain</button>
            <button class="scng-filter-btn ${GS.filter === 'partners' ? 'active' : ''}" onclick="window._scngFilter('partners')">Partners</button>
          </div>
        </div>
        <div class="scng-toolbar-right">
          <button class="scng-icon-btn" onclick="window._scngZoom(1.25)" title="Zoom In">+</button>
          <button class="scng-icon-btn" onclick="window._scngZoom(0.8)" title="Zoom Out">−</button>
          <button class="scng-icon-btn" onclick="window._scngReset()" title="Reset">⟲</button>
        </div>
      </div>
      <div id="scng-canvas" class="scng-canvas"><svg id="scng-svg"></svg></div>
      <div class="scng-legend">
        ${['farm','processor','warehouse','port','hub','distributor','organization','supplier'].map(k => {
          const v = NT[k];
          return `<span class="scng-legend-item"><span class="scng-legend-dot" style="background:${v.color}"></span>${v.icon} ${v.label}</span>`;
        }).join('')}
        <span class="scng-legend-sep">│</span>
        <span class="scng-legend-item"><span class="scng-legend-line" style="background:#22c55e"></span>Low Risk</span>
        <span class="scng-legend-item"><span class="scng-legend-line" style="background:#f59e0b"></span>Med Risk</span>
        <span class="scng-legend-item"><span class="scng-legend-line" style="background:#ef4444"></span>High Risk</span>
      </div>
    </div>
    <div id="scng-detail" class="scng-detail" style="display:none"></div>
    ${_styles()}
  </div>`;
}

/* ── Graph Engine ────────────────────────────────────────────────── */
function _initGraphEngine() {
  const graph = State.networkGraph?.graph;
  const canvas = document.getElementById('scng-canvas');
  const svg = document.getElementById('scng-svg');
  if (!graph || !canvas || !svg) return;

  const W = canvas.clientWidth || 900;
  const H = canvas.clientHeight || 520;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Build nodes
  const map = new Map();
  GS.nodes = graph.nodes.map(n => {
    const cfg = nCfg(n.type);
    const nd = { ...n, _cfg: cfg, _r: n.isCenter ? 30 : (n.trustScore >= 85 ? 22 : 18), x: 0, y: 0, vx: 0, vy: 0 };
    map.set(n.id, nd);
    return nd;
  });

  // Build edges
  GS.edges = (graph.edges || []).filter(e => {
    const s = map.get(e.from_node_id), t = map.get(e.to_node_id);
    if (s && t) { e._s = s; e._t = t; return true; }
    return false;
  });

  // Add partner edges (nodes not in supply_chain_graph)
  const connected = new Set();
  GS.edges.forEach(e => { connected.add(e._s.id); connected.add(e._t.id); });
  const center = GS.nodes.find(x => x.isCenter);
  GS.nodes.forEach(n => {
    if (!n.isCenter && !connected.has(n.id) && center) {
      GS.edges.push({ from_node_id: center.id, to_node_id: n.id, relationship: 'partner', weight: 0.5, risk_score: null, _s: center, _t: n, _partner: true });
    }
  });

  // Force layout: tier-based initial positions
  const tiers = [...new Set(GS.nodes.map(n => n._cfg.tier))].sort((a, b) => a - b);
  const tw = W / (tiers.length + 1);
  const tierBuckets = {};
  GS.nodes.forEach(n => { const t = n._cfg.tier; if (!tierBuckets[t]) tierBuckets[t] = []; tierBuckets[t].push(n); });
  tiers.forEach((tier, ti) => {
    const bucket = tierBuckets[tier];
    const sp = H / (bucket.length + 1);
    bucket.forEach((n, ni) => {
      n.x = tw * (ti + 1) + (Math.random() - 0.5) * 25;
      n.y = sp * (ni + 1) + (Math.random() - 0.5) * 15;
    });
  });

  // Run force simulation
  for (let iter = 0; iter < 100; iter++) {
    const decay = 1 - iter / 100;
    // Repulsion
    for (let i = 0; i < GS.nodes.length; i++) {
      for (let j = i + 1; j < GS.nodes.length; j++) {
        const a = GS.nodes[i], b = GS.nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy) || 1;
        let f = 3500 / (d * d) * decay * 0.3;
        let fx = dx / d * f, fy = dy / d * f;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    }
    // Attraction
    GS.edges.forEach(e => {
      let dx = e._t.x - e._s.x, dy = e._t.y - e._s.y;
      let d = Math.sqrt(dx * dx + dy * dy) || 1;
      let f = d * 0.007 * (e.weight || 0.5) * decay * 0.3;
      let fx = dx / d * f, fy = dy / d * f;
      e._s.vx += fx; e._s.vy += fy; e._t.vx -= fx; e._t.vy -= fy;
    });
    // Tier gravity
    GS.nodes.forEach(n => {
      const ti = tiers.indexOf(n._cfg.tier);
      if (ti >= 0) n.vx += (tw * (ti + 1) - n.x) * 0.04 * decay;
    });
    // Apply
    GS.nodes.forEach(n => {
      n.x += n.vx * 0.55; n.y += n.vy * 0.55;
      n.vx *= 0.65; n.vy *= 0.65;
      n.x = Math.max(n._r + 10, Math.min(W - n._r - 10, n.x));
      n.y = Math.max(n._r + 25, Math.min(H - n._r - 25, n.y));
    });
  }

  _drawGraph(W, H);
  _setupEvents(W, H);
}

/* ── SVG Drawing ─────────────────────────────────────────────────── */
function _drawGraph(W, H) {
  const svg = document.getElementById('scng-svg');
  if (!svg) return;
  const { x: tx, y: ty, scale } = GS.transform;
  const tierLabels = { 0: 'SOURCE', 1: 'PROCESSING', 2: 'STORAGE', 2.5: 'ORG', 3: 'TRANSIT', 4: 'HUB', 5: 'DISTRIBUTION' };

  let h = `<defs>
    <marker id="ma-green" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#22c55e"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-lime" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#84cc16"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-yellow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#f59e0b"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-orange" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#f97316"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-red" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#ef4444"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-gray" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#64748b"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <filter id="ns"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.3"/></filter>
  </defs>`;

  h += `<g transform="translate(${tx},${ty}) scale(${scale})">`;

  // Tier columns
  const tiers = [...new Set(GS.nodes.map(n => n._cfg.tier))].sort((a, b) => a - b);
  const tw = W / (tiers.length + 1);
  tiers.forEach((tier, ti) => {
    const cx = tw * (ti + 1);
    h += `<text x="${cx}" y="18" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-weight="700" opacity="0.4" letter-spacing="1.5">${tierLabels[tier] || ''}</text>`;
    h += `<line x1="${cx}" y1="26" x2="${cx}" y2="${H - 8}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,6" opacity="0.2"/>`;
  });

  // Edges
  GS.edges.forEach((e, i) => {
    if (!e._s || !e._t) return;
    const isHL = GS.hoveredNode && (GS.hoveredNode === e._s.id || GS.hoveredNode === e._t.id);
    const isDim = GS.hoveredNode && !isHL;
    if (e._s._hidden || e._t._hidden) return;

    const rc = riskC(e.risk_score);
    const mn = markerName(e.risk_score);
    const op = isDim ? 0.08 : isHL ? 1 : 0.55;
    const sw = isHL ? 3 : e._partner ? 1 : 2;
    const dx = e._t.x - e._s.x, dy = e._t.y - e._s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const sx = e._s.x + (dx / d) * (e._s._r + 2), sy = e._s.y + (dy / d) * (e._s._r + 2);
    const ex = e._t.x - (dx / d) * (e._t._r + 8), ey = e._t.y - (dy / d) * (e._t._r + 8);

    h += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${rc}" stroke-width="${sw}" opacity="${op}" ${e._partner ? 'stroke-dasharray="4,4"' : ''} marker-end="url(#ma-${mn})"/>`;

    if (e.risk_score != null && !e._partner && !isDim) {
      const mx = (e._s.x + e._t.x) / 2 + (dy / d) * 10;
      const my = (e._s.y + e._t.y) / 2 - (dx / d) * 10;
      h += `<text x="${mx}" y="${my}" text-anchor="middle" fill="${rc}" font-size="8" font-weight="700" opacity="${isHL ? 1 : 0.6}">${e.risk_score}</text>`;
    }
  });

  // Nodes
  GS.nodes.forEach(n => {
    if (n._hidden) return;
    const c = n._cfg;
    const isS = GS.selectedNode === n.id;
    const isH = GS.hoveredNode === n.id;
    const isDim = GS.hoveredNode && !isH && !GS.edges.some(e =>
      (e._s.id === GS.hoveredNode && e._t.id === n.id) || (e._t.id === GS.hoveredNode && e._s.id === n.id));
    const op = isDim ? 0.12 : 1;
    const r = n._r;

    // Animated ring
    if (isS || isH) {
      h += `<circle cx="${n.x}" cy="${n.y}" r="${r + 8}" fill="none" stroke="${c.color}" stroke-width="2" stroke-dasharray="4,3" opacity="0.6"><animate attributeName="stroke-dashoffset" from="0" to="14" dur="1s" repeatCount="indefinite"/></circle>`;
    }

    h += `<g class="scng-node" data-id="${n.id}" opacity="${op}" style="cursor:pointer">`;
    h += `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${c.color}" fill-opacity="0.12" stroke="${c.color}" stroke-width="${isS ? 3 : 2}" filter="url(#ns)"/>`;
    h += `<circle cx="${n.x}" cy="${n.y}" r="${r - 2}" fill="${c.color}" fill-opacity="${n.isCenter ? 0.7 : 0.2}"/>`;
    
    // Icon
    h += `<text x="${n.x}" y="${n.y + 1}" text-anchor="middle" dominant-baseline="central" font-size="${n.isCenter ? 16 : 13}">${c.icon}</text>`;

    // Label
    const lbl = (n.label || '').length > 18 ? (n.label || '').substring(0, 16) + '…' : (n.label || '');
    h += `<text x="${n.x}" y="${n.y + r + 13}" text-anchor="middle" fill="var(--text)" font-size="8.5" font-weight="600">${lbl}</text>`;

    // Trust badge
    if (n.trustScore && !n.isCenter) {
      const tc = trustC(n.trustScore);
      h += `<rect x="${n.x + r - 4}" y="${n.y - r - 4}" width="24" height="14" rx="4" fill="${tc}" fill-opacity="0.9"/>`;
      h += `<text x="${n.x + r + 8}" y="${n.y - r + 7}" text-anchor="middle" fill="#fff" font-size="8" font-weight="800">${n.trustScore}</text>`;
    }

    // Country
    if (n.country && !isDim) {
      h += `<text x="${n.x}" y="${n.y + r + 23}" text-anchor="middle" fill="var(--text-muted)" font-size="7">${n.country}</text>`;
    }

    // Verified badge
    if (n.isNetworkMember) {
      h += `<circle cx="${n.x + r - 3}" cy="${n.y + r - 3}" r="7" fill="#6366f1" stroke="var(--card-bg)" stroke-width="2"/>`;
      h += `<text x="${n.x + r - 3}" y="${n.y + r}" text-anchor="middle" fill="white" font-size="7" font-weight="800">✓</text>`;
    }
    h += `</g>`;
  });

  h += `</g>`;
  svg.innerHTML = h;
}

/* ── Events ──────────────────────────────────────────────────────── */
function _setupEvents(W, H) {
  const svg = document.getElementById('scng-svg');
  const canvas = document.getElementById('scng-canvas');
  if (!svg || !canvas) return;

  svg.addEventListener('click', e => {
    const nd = e.target.closest('.scng-node');
    if (nd) { const id = nd.dataset.id; GS.selectedNode = GS.selectedNode === id ? null : id; _drawGraph(W, H); _showDetail(id); }
    else { GS.selectedNode = null; document.getElementById('scng-detail').style.display = 'none'; _drawGraph(W, H); }
  });

  svg.addEventListener('mouseover', e => {
    const nd = e.target.closest('.scng-node');
    if (nd) { GS.hoveredNode = nd.dataset.id; _drawGraph(W, H); }
  });
  svg.addEventListener('mouseout', e => {
    const nd = e.target.closest('.scng-node');
    if (nd) { GS.hoveredNode = null; _drawGraph(W, H); }
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    GS.transform.scale = Math.max(0.3, Math.min(3, GS.transform.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    _drawGraph(W, H);
  }, { passive: false });

  let drag = false, ds = { x: 0, y: 0 };
  canvas.addEventListener('mousedown', e => { if (e.target.closest('.scng-node')) return; drag = true; ds = { x: e.clientX - GS.transform.x, y: e.clientY - GS.transform.y }; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('mousemove', e => { if (!drag) return; GS.transform.x = e.clientX - ds.x; GS.transform.y = e.clientY - ds.y; _drawGraph(W, H); });
  window.addEventListener('mouseup', () => { drag = false; canvas.style.cursor = 'grab'; });
}

/* ── Detail Panel ────────────────────────────────────────────────── */
function _showDetail(nodeId) {
  const panel = document.getElementById('scng-detail');
  const node = GS.nodes.find(n => n.id === nodeId);
  if (!panel || !node) { if (panel) panel.style.display = 'none'; return; }
  const cfg = node._cfg;
  const inE = GS.edges.filter(e => e._t.id === nodeId);
  const outE = GS.edges.filter(e => e._s.id === nodeId);
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="scng-dh"><span class="scng-di" style="background:${cfg.color}">${cfg.icon}</span><div><div class="scng-dn">${node.label}</div><div class="scng-dt">${cfg.label}${node.country ? ' · ' + node.country : ''}</div></div><button class="scng-dc" onclick="this.closest('.scng-detail').style.display='none'">✕</button></div>
    ${node.trustScore ? `<div class="scng-dr"><span>Trust Score</span><span style="font-size:1.2rem;font-weight:800;color:${trustC(node.trustScore)}">${node.trustScore}</span></div>` : ''}
    ${node.riskLevel ? `<div class="scng-dr"><span>Risk Level</span><span class="scng-rb scng-rb-${(node.riskLevel || '').toLowerCase()}">${node.riskLevel}</span></div>` : ''}
    <div style="margin-top:10px">
      <div class="scng-st">⬆ Inbound (${inE.length})</div>
      ${inE.map(e => `<div class="scng-cr"><span>${e._s.label}</span><span class="scng-crel">${e.relationship || '—'}</span>${e.risk_score != null ? `<span style="color:${riskC(e.risk_score)};font-weight:700;font-size:0.72rem">Risk ${e.risk_score}</span>` : ''}</div>`).join('') || '<div style="font-size:0.72rem;color:var(--text-muted);font-style:italic">None</div>'}
      <div class="scng-st" style="margin-top:8px">⬇ Outbound (${outE.length})</div>
      ${outE.map(e => `<div class="scng-cr"><span>${e._t.label}</span><span class="scng-crel">${e.relationship || '—'}</span>${e.risk_score != null ? `<span style="color:${riskC(e.risk_score)};font-weight:700;font-size:0.72rem">Risk ${e.risk_score}</span>` : ''}</div>`).join('') || '<div style="font-size:0.72rem;color:var(--text-muted);font-style:italic">None</div>'}
    </div>`;
}

/* ── Global Handlers ─────────────────────────────────────────────── */
window._scngSearch = function(v) {
  const val = v.toLowerCase();
  const canvas = document.getElementById('scng-canvas');
  const W = canvas?.clientWidth || 900, H = canvas?.clientHeight || 520;
  if (val) {
    const m = GS.nodes.find(n => (n.label || '').toLowerCase().includes(val));
    GS.hoveredNode = m?.id || null;
  } else { GS.hoveredNode = null; }
  _drawGraph(W, H);
};

window._scngFilter = function(f) {
  GS.filter = f;
  document.querySelectorAll('.scng-filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.scng-filter-btn[onclick*="${f}"]`)?.classList.add('active');
  const canvas = document.getElementById('scng-canvas');
  const W = canvas?.clientWidth || 900, H = canvas?.clientHeight || 520;
  GS.nodes.forEach(n => {
    if (f === 'all') { n._hidden = false; return; }
    const inSC = GS.edges.some(e => !e._partner && (e._s.id === n.id || e._t.id === n.id));
    n._hidden = f === 'supply_chain' ? (!inSC && !n.isCenter) : (inSC && !n.isCenter);
  });
  _drawGraph(W, H);
};

window._scngZoom = function(f) {
  GS.transform.scale = Math.max(0.3, Math.min(3, GS.transform.scale * f));
  const canvas = document.getElementById('scng-canvas');
  _drawGraph(canvas?.clientWidth || 900, canvas?.clientHeight || 520);
};

window._scngReset = function() {
  GS.transform = { x: 0, y: 0, scale: 1 }; GS.hoveredNode = null; GS.selectedNode = null;
  document.getElementById('scng-detail').style.display = 'none';
  const canvas = document.getElementById('scng-canvas');
  _drawGraph(canvas?.clientWidth || 900, canvas?.clientHeight || 520);
};

/* ── Styles ──────────────────────────────────────────────────────── */
function _styles() {
  return `<style>
#scm-network-root { padding:0; }
.scng-stats-row { display:flex; gap:12px; padding:16px 24px 8px; flex-wrap:wrap; }
.scng-stat-card { flex:1; min-width:110px; background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:14px 16px; text-align:center; }
.scng-stat-value { font-size:1.5rem; font-weight:800; color:var(--text); }
.scng-stat-label { font-size:0.7rem; color:var(--text-muted); margin-top:2px; text-transform:uppercase; letter-spacing:.5px; }
.scng-graph-container { margin:8px 24px 16px; background:var(--card-bg); border:1px solid var(--border); border-radius:16px; overflow:hidden; position:relative; }
.scng-toolbar { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid var(--border); background:color-mix(in srgb,var(--card-bg) 95%,var(--primary) 5%); }
.scng-toolbar-left { display:flex; gap:10px; align-items:center; }
.scng-toolbar-right { display:flex; gap:4px; }
.scng-search { width:170px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:.78rem; outline:none; }
.scng-search:focus { border-color:var(--primary); box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 20%,transparent); }
.scng-filter-group { display:flex; gap:2px; background:var(--bg); border-radius:8px; padding:2px; }
.scng-filter-btn { padding:4px 10px; border:none; background:transparent; color:var(--text-muted); font-size:.72rem; border-radius:6px; cursor:pointer; font-weight:600; transition:all .2s; }
.scng-filter-btn:hover { color:var(--text); }
.scng-filter-btn.active { background:var(--primary); color:#fff; }
.scng-icon-btn { width:30px; height:30px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; transition:all .2s; }
.scng-icon-btn:hover { background:var(--primary); color:#fff; border-color:var(--primary); }
.scng-canvas { width:100%; height:520px; overflow:hidden; cursor:grab; position:relative; background:radial-gradient(circle at 30% 40%,color-mix(in srgb,var(--primary) 5%,transparent) 0%,transparent 50%),radial-gradient(circle at 70% 60%,color-mix(in srgb,#22c55e 4%,transparent) 0%,transparent 50%),var(--bg); }
#scng-svg { width:100%; height:100%; }
.scng-legend { display:flex; gap:10px; padding:8px 16px; border-top:1px solid var(--border); flex-wrap:wrap; align-items:center; font-size:.7rem; color:var(--text-muted); }
.scng-legend-item { display:flex; align-items:center; gap:4px; }
.scng-legend-dot { width:8px; height:8px; border-radius:50%; }
.scng-legend-line { width:16px; height:3px; border-radius:2px; }
.scng-legend-sep { color:var(--border); margin:0 4px; }
.scng-detail { position:fixed; right:24px; top:140px; width:320px; background:var(--card-bg); border:1px solid var(--border); border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,.2); padding:16px; z-index:100; max-height:400px; overflow-y:auto; }
.scng-dh { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
.scng-di { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
.scng-dn { font-weight:700; font-size:.95rem; color:var(--text); }
.scng-dt { font-size:.72rem; color:var(--text-muted); }
.scng-dc { margin-left:auto; background:none; border:none; color:var(--text-muted); font-size:1rem; cursor:pointer; padding:4px 8px; border-radius:6px; }
.scng-dc:hover { background:var(--bg); }
.scng-dr { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border); font-size:.8rem; color:var(--text-muted); }
.scng-rb { padding:2px 8px; border-radius:6px; font-size:.68rem; font-weight:700; text-transform:uppercase; }
.scng-rb-low { background:#22c55e20; color:#22c55e; }
.scng-rb-medium { background:#f59e0b20; color:#f59e0b; }
.scng-rb-high { background:#ef444420; color:#ef4444; }
.scng-st { font-size:.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
.scng-cr { display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:.78rem; color:var(--text); border-bottom:1px solid color-mix(in srgb,var(--border) 50%,transparent); gap:6px; }
.scng-crel { background:var(--bg); padding:1px 6px; border-radius:4px; font-size:.66rem; color:var(--text-muted); font-weight:600; white-space:nowrap; }
</style>`;
}
