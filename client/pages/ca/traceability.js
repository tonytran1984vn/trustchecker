/**
 * Company Admin – Traceability View
 * ════════════════════════════════════
 * Real data from /api/scm/events + /api/scm/batches
 * Geo View: Leaflet.js + OpenStreetMap + Nominatim geocoding
 * Per-batch route drawing with batch filter
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let events = null, batches = null, loading = false, activeTab = 'timeline';
let _selectedBatch = 'all'; // batch filter for geo view
let _mapInstance = null;
let _mapLayers = [];

// ═══ Known coordinates (fast lookup, no network needed) ═══
const GEO_COORDS = {
  'dalat coffee farm, vietnam': [11.94, 108.44], 'dalat coffee farm': [11.94, 108.44],
  'hcmc processing hub': [10.85, 106.63],
  'cat lai port, hcmc': [10.77, 106.77], 'cat lai port': [10.77, 106.77],
  'singapore customs': [1.27, 103.81],
  'singapore dc, jurong': [1.33, 103.72],
  'binh duong factory': [11.17, 106.65],
  'da nang packaging center': [16.05, 108.22],
  'hai phong port': [20.86, 106.68],
  'tokyo warehouse, chiba': [35.61, 140.11], 'tokyo warehouse': [35.61, 140.11],
  'akihabara store, tokyo': [35.70, 139.77],
  'factory hcmc': [10.85, 106.65],
  'qc lab dalat': [11.94, 108.43],
  'port hai phong': [20.86, 106.68],
  'can tho': [10.04, 105.77], 'dalat': [11.94, 108.44],
  'binh duong': [11.17, 106.65], 'da nang': [16.05, 108.22],
  'hai phong': [20.86, 106.68], 'hcmc': [10.82, 106.63],
  'ho chi minh': [10.82, 106.63], 'ho chi minh city': [10.82, 106.63],
  'hanoi': [21.03, 105.85], 'tokyo': [35.68, 139.69],
  'singapore': [1.35, 103.82], 'jurong': [1.33, 103.72],
  'dubai': [25.20, 55.27], 'hamburg': [53.55, 9.99],
  'munich': [48.14, 11.58], 'seoul': [37.57, 126.98],
  'phu quoc': [10.23, 103.97], 'vung tau': [10.35, 107.08],
  'nha trang': [12.24, 109.19], 'busan': [35.18, 129.08],
  'osaka': [34.69, 135.50], 'shanghai': [31.23, 121.47],
  'guangzhou': [23.13, 113.26], 'hong kong': [22.32, 114.17],
  'bangkok': [13.76, 100.50], 'jakarta': [-6.21, 106.85],
  'kuala lumpur': [3.14, 101.69], 'manila': [14.60, 120.98],
  'sydney': [-33.87, 151.21], 'los angeles': [34.05, -118.24],
  'new york': [40.71, -74.01], 'london': [51.51, -0.13],
  'amsterdam': [52.37, 4.90], 'rotterdam': [51.92, 4.48],
  'paris': [48.86, 2.35], 'berlin': [52.52, 13.41],
  'mumbai': [19.08, 72.88], 'chennai': [13.08, 80.27],
};

// Geocoding cache (persists during session)
const _geocodeCache = {};

// ═══ Geocoding: local first, then Nominatim fallback ═══
function _findCoordsLocal(loc) {
  if (!loc) return null;
  const lower = loc.toLowerCase().trim();
  if (GEO_COORDS[lower]) return GEO_COORDS[lower];
  for (const [key, val] of Object.entries(GEO_COORDS)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  const words = lower.split(/[,\s—\-]+/).filter(w => w.length >= 3);
  for (const w of words) {
    for (const [key, val] of Object.entries(GEO_COORDS)) {
      if (key.includes(w)) return val;
    }
  }
  return null;
}

async function _geocode(loc) {
  if (!loc) return null;
  const lower = loc.toLowerCase().trim();

  // 1. Local lookup
  const local = _findCoordsLocal(lower);
  if (local) return local;

  // 2. Check cache
  if (_geocodeCache[lower]) return _geocodeCache[lower];
  if (_geocodeCache[lower] === false) return null; // previously failed

  // 3. Nominatim (free, 1 req/sec)
  try {
    const q = encodeURIComponent(loc);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'TrustChecker/3.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      _geocodeCache[lower] = coords;
      GEO_COORDS[lower] = coords; // cache for future use
      return coords;
    }
  } catch (e) { console.warn('[Geo] Nominatim error for:', loc, e); }

  _geocodeCache[lower] = false; // mark as failed
  return null;
}

// ═══ Batch route colors ═══
const BATCH_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

function _getBatchColor(index) {
  return BATCH_COLORS[index % BATCH_COLORS.length];
}

// ═══ Leaflet loading ═══
function _loadLeaflet(cb) {
  if (!document.getElementById('leaflet-css')) {
    const css = document.createElement('link');
    css.id = 'leaflet-css'; css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
  }
  if (window.L) return cb();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  s.onload = cb;
  document.head.appendChild(s);
}

// ═══ Geo Map Init (with batch routes) ═══
async function _initGeoMap() {
  const container = document.getElementById('geo-map');
  if (!container) return;

  _loadLeaflet(async () => {
    const el = document.getElementById('geo-map');
    if (!el) return;

    // Create or reuse map — detect stale container (destroyed by tab switch)
    if (_mapInstance) {
      const currentContainer = _mapInstance.getContainer();
      if (!currentContainer || !document.body.contains(currentContainer) || currentContainer !== el) {
        // Container was destroyed by tab switch — remove old map
        try { _mapInstance.remove(); } catch (_) { }
        _mapInstance = null;
        _mapLayers = [];
      } else {
        // Container still valid — just clear layers
        _mapLayers.forEach(l => _mapInstance.removeLayer(l));
        _mapLayers = [];
      }
    }

    if (!_mapInstance) {
      el.innerHTML = '';
      _mapInstance = L.map(el).setView([15, 108], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap', maxZoom: 18
      }).addTo(_mapInstance);
    }

    const evts = window._geoMapEvents || [];
    const batchList = batches || [];

    // Group events by batch
    const batchMap = {};
    const noBatch = [];

    evts.forEach(e => {
      if (!e.location) return;
      const bId = e.batch_id || e.batch_code || null;
      if (bId) {
        if (!batchMap[bId]) batchMap[bId] = [];
        batchMap[bId].push(e);
      } else {
        noBatch.push(e);
      }
    });

    // Filter by selected batch
    let batchEntries;
    if (_selectedBatch === 'all') {
      batchEntries = Object.entries(batchMap);
      if (noBatch.length > 0) batchEntries.push(['_unassigned', noBatch]);
    } else if (_selectedBatch === '_unassigned') {
      batchEntries = [['_unassigned', noBatch]];
    } else {
      batchEntries = batchMap[_selectedBatch] ?
        [[_selectedBatch, batchMap[_selectedBatch]]] : [];
    }

    // Update status
    const statusEl = document.getElementById('geo-status');
    if (statusEl) statusEl.textContent = 'Geocoding locations...';

    const allPts = [];
    let batchIdx = 0;

    for (const [bId, bEvents] of batchEntries) {
      const color = _getBatchColor(batchIdx);
      const batchLabel = bId === '_unassigned' ? 'Unassigned' :
        (batchList.find(b => b.id === bId || b.batch_code === bId || b.batch_number === bId)?.batch_number || bId.substring(0, 12));
      const routePts = [];

      // Sort by created_at for correct route order
      const sorted = [...bEvents].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

      for (const e of sorted) {
        const coords = await _geocode(e.location);
        if (!coords) continue;

        // Marker
        const marker = L.circleMarker(coords, {
          radius: 8, fillColor: color, fillOpacity: 0.85,
          color: '#fff', weight: 2
        }).addTo(_mapInstance);

        const time = e.created_at ? new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        marker.bindPopup(
          `<div style="min-width:180px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block"></span>
              <strong>${batchLabel}</strong>
            </div>
            <div style="font-size:0.82rem;margin-bottom:4px">📍 ${e.location}</div>
            <div style="font-size:0.78rem;color:#64748b">${(e.event_type || 'event').replace(/_/g, ' ')}</div>
            ${e.description || e.notes ? `<div style="font-size:0.75rem;color:#94a3b8;margin-top:4px">${e.description || e.notes}</div>` : ''}
            ${time ? `<div style="font-size:0.72rem;color:#94a3b8;margin-top:2px">🕐 ${time}</div>` : ''}
          </div>`
        );

        _mapLayers.push(marker);
        routePts.push(coords);
        allPts.push(coords);
      }

      // Draw route line for this batch
      if (routePts.length >= 2) {
        const line = L.polyline(routePts, {
          color: color, weight: 3, opacity: 0.7, dashArray: '8 4'
        }).addTo(_mapInstance);
        line.bindPopup(`<strong style="color:${color}">🚚 ${batchLabel}</strong><br><small>${routePts.length} stops</small>`);
        _mapLayers.push(line);

        // Arrow at end point
        const endPt = routePts[routePts.length - 1];
        const endMarker = L.marker(endPt, {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap;transform:translate(-50%,-100%)">${batchLabel} ✓</div>`,
            iconSize: [0, 0], iconAnchor: [0, 0]
          })
        }).addTo(_mapInstance);
        _mapLayers.push(endMarker);
      }

      batchIdx++;
    }

    // Fit bounds
    if (allPts.length >= 2) {
      _mapInstance.fitBounds(L.latLngBounds(allPts).pad(0.15));
    } else if (allPts.length === 1) {
      _mapInstance.setView(allPts[0], 10);
    }

    // Update status
    if (statusEl) statusEl.textContent = `${allPts.length} locations mapped, ${batchEntries.length} batch routes`;
    setTimeout(() => _mapInstance.invalidateSize(), 300);
  });
}

window._initGeoMap = _initGeoMap;
window._geoSelectBatch = (val) => { _selectedBatch = val; _initGeoMap(); };

export function renderPage() {
  return `<div id="traceability-root">${renderContent()}</div>`;
}

window._caTraceTab = (t) => {
  activeTab = t;
  const _el = document.getElementById('traceability-root');
  if (_el) _el.innerHTML = renderContent ? renderContent() : '';
};

async function load() {
  if (loading) return; loading = true;
  try {
    if (window._caOpsReady) { try { await window._caOpsReady; } catch { } }
    const oc = window._caOpsCache;
    let evRes, bRes;
    if (oc?.events && oc?.batches && oc._loadedAt && !events) {
      evRes = oc.events; bRes = oc.batches;
    } else {
      [evRes, bRes] = await Promise.all([
        API.get('/scm/events?limit=500').catch(() => ({ events: [] })),
        API.get('/scm/batches?limit=20').catch(() => ({ batches: [] })),
      ]);
    }
    events = Array.isArray(evRes) ? evRes : (evRes.events || []);
    batches = Array.isArray(bRes) ? bRes : (bRes.batches || []);
  } catch (e) { events = []; batches = []; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('traceability-root'); if (el) el.innerHTML = renderContent ? renderContent() : ''; }, 50);
}

function renderContent() {
  if (!events && !loading) { load(); }
  if (loading && !events) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Traceability...</div></div>`;

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('search', 28)} Traceability</h1>
        <div class="sa-title-actions">
          <input class="sa-search-input" placeholder="Search by batch ID or serial..." style="min-width:280px" />
        </div>
      </div>

      <div class="sa-tabs">
        ${tab('timeline', 'Timeline View')}
        ${tab('batches', 'Batch Trace')}
        ${tab('geo', 'Geo View')}
      </div>

      ${renderTabContent()}
    </div>
  `;
}

function tab(id, label) {
  return `<button class="sa-tab ${activeTab === id ? 'active' : ''}" onclick="_caTraceTab('${id}')">${label}</button>`;
}

function renderTabContent() {
  const evList = events || [];
  const bList = batches || [];

  if (activeTab === 'timeline') {
    if (evList.length === 0) return `<div class="sa-card"><div style="text-align:center;padding:40px;color:var(--text-muted)">No supply chain events found</div></div>`;
    return `
      <div class="sa-card">
        <h3>Supply Chain Events Timeline</h3>
        <div class="sa-spike-list" style="margin-top:1rem">
          ${evList.slice(0, 20).map(e => {
      const time = e.created_at ? new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      const level = e.event_type === 'anomaly' || e.event_type === 'alert' ? 'critical' : e.event_type === 'transfer' ? 'warning' : 'info';
      return timelineItem(time, (e.event_type || 'event').replace(/_/g, ' ') + (e.location ? ' — ' + e.location : ''), e.description || e.notes || (e.product_id ? 'Product: ' + e.product_id.substring(0, 8) : '—'), level);
    }).join('')}
        </div>
      </div>
    `;
  }

  if (activeTab === 'batches') {
    if (bList.length === 0) return `<div class="sa-card"><div style="text-align:center;padding:40px;color:var(--text-muted)">No batches found</div></div>`;
    return `
      <div class="sa-card">
        <h3>Batch Traceability</h3>
        <table class="sa-table"><thead><tr><th>Batch</th><th>Product</th><th>Qty</th><th>Facility</th><th>Mfg Date</th><th>Status</th><th>Created</th></tr></thead><tbody>
          ${bList.map(b => `
            <tr class="sa-row-clickable">
              <td><strong class="sa-code">${b.batch_number || b.batch_code || b.id?.substring(0, 12) || '—'}</strong></td>
              <td>${b.product_name || '—'}</td>
              <td class="sa-code">${(b.quantity || 0).toLocaleString()}</td>
              <td>${b.origin_facility || b.origin || '—'}</td>
              <td style="color:var(--text-secondary)">${b.manufactured_date ? new Date(b.manufactured_date).toLocaleDateString('en-US') : '—'}</td>
              <td><span class="sa-status-pill sa-pill-${b.status === 'delivered' ? 'green' : b.status === 'shipped' || b.status === 'in_transit' ? 'blue' : b.status === 'manufactured' ? 'purple' : 'orange'}">${(b.status || 'created').replace(/_/g, ' ')}</span></td>
              <td style="color:var(--text-secondary)">${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US') : '—'}</td>
            </tr>
          `).join('')}
        </tbody></table>
      </div>
    `;
  }

  // ═══ GEO TAB ═══
  const uniqueLocations = [...new Set(evList.map(e => e.location).filter(Boolean))];
  window._geoMapEvents = evList.filter(e => e.location);

  // Build batch list for filter
  const batchIds = {};
  evList.forEach(e => {
    const bId = e.batch_id || e.batch_code;
    if (bId && !batchIds[bId]) {
      const bInfo = bList.find(b => b.id === bId || b.batch_code === bId || b.batch_number === bId);
      batchIds[bId] = bInfo?.batch_number || bInfo?.batch_code || bId.substring(0, 12);
    }
  });

  const batchOptions = Object.entries(batchIds).map(([id, label]) =>
    `<option value="${id}" ${_selectedBatch === id ? 'selected' : ''}>${label}</option>`
  ).join('');

  setTimeout(() => _initGeoMap(), 150);

  return `
    <div class="sa-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <h3 style="margin:0">Geographic View</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:0.78rem;color:var(--text-secondary)">Filter by batch:</label>
          <select onchange="window._geoSelectBatch(this.value)"
            style="font-size:0.78rem;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);cursor:pointer">
            <option value="all" ${_selectedBatch === 'all' ? 'selected' : ''}>All Batches</option>
            ${batchOptions}
            <option value="_unassigned" ${_selectedBatch === '_unassigned' ? 'selected' : ''}>Unassigned Events</option>
          </select>
        </div>
      </div>
      <div id="geo-map" style="height:450px;border-radius:10px;overflow:hidden;background:#e8ecf1;position:relative">
        <div id="geo-map-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#64748b;font-size:0.85rem;z-index:1">Loading map...</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px">
        <div id="geo-status" style="font-size:0.75rem;color:var(--text-muted)">Initializing...</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${Object.entries(batchIds).slice(0, 6).map(([id, label], i) =>
    `<span style="display:flex;align-items:center;gap:4px;font-size:0.72rem;color:var(--text-secondary)">
              <span style="width:10px;height:10px;border-radius:50%;background:${_getBatchColor(i)}"></span>${label}
            </span>`
  ).join('')}
        </div>
      </div>
      <div class="sa-metrics-row" style="margin-top:1rem">
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${uniqueLocations.length}</div><div class="sa-metric-label">Locations</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${evList.length}</div><div class="sa-metric-label">Total Events</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${Object.keys(batchIds).length}</div><div class="sa-metric-label">Batches Tracked</div></div></div>
      </div>
    </div>
  `;
}

function timelineItem(time, title, detail, level) {
  return `
    <div class="sa-spike-item sa-spike-${level}">
      <div class="sa-spike-header">
        <strong>${title}</strong>
        <span style="font-size:0.7rem;color:var(--text-secondary)">${time}</span>
      </div>
      <div class="sa-spike-detail">${detail}</div>
    </div>
  `;
}
