/**
 * Company Admin – Traceability View
 * ════════════════════════════════════
 * Real data from /api/scm/events + /api/scm/batches
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let events = null, batches = null, loading = false, activeTab = 'timeline';

// ═══ Geo Map — Leaflet.js + OpenStreetMap (free, no API key) ═══
const GEO_COORDS = {
  'dalat coffee farm, vietnam': [11.94, 108.44],
  'hcmc processing hub': [10.85, 106.63],
  'cat lai port, hcmc': [10.77, 106.77],
  'singapore customs': [1.27, 103.81],
  'singapore dc, jurong': [1.33, 103.72],
  'binh duong factory': [11.17, 106.65],
  'da nang packaging center': [16.05, 108.22],
  'hai phong port': [20.86, 106.68],
  'tokyo warehouse, chiba': [35.61, 140.11],
  'akihabara store, tokyo': [35.70, 139.77],
  'factory hcmc': [10.85, 106.65],
  'qc lab dalat': [11.94, 108.43],
  'port hai phong': [20.86, 106.68],
  'can tho': [10.04, 105.77],
  'dalat': [11.94, 108.44], 'binh duong': [11.17, 106.65],
  'da nang': [16.05, 108.22], 'hai phong': [20.86, 106.68],
  'hcmc': [10.82, 106.63], 'hanoi': [21.03, 105.85],
  'tokyo': [35.68, 139.69], 'singapore': [1.35, 103.82],
  'jurong': [1.33, 103.72], 'dubai': [25.20, 55.27],
  'hamburg': [53.55, 9.99], 'munich': [48.14, 11.58],
  'seoul': [37.57, 126.98], 'phu quoc': [10.23, 103.97],
};

function _findCoords(loc) {
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

function _loadLeaflet(cb) {
  // CSS
  if (!document.getElementById('leaflet-css')) {
    const css = document.createElement('link');
    css.id = 'leaflet-css'; css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
  }
  // JS
  if (window.L) return cb();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  s.onload = cb;
  document.head.appendChild(s);
}

function _initGeoMap() {
  const container = document.getElementById('geo-map');
  if (!container) return;
  // Clean up previous map instance
  if (container._leaflet_id) {
    container._leaflet_id = null;
    container.innerHTML = '<div id="geo-map-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#64748b;font-size:0.85rem;z-index:1">Loading map...</div>';
  }

  _loadLeaflet(() => {
    const el = document.getElementById('geo-map');
    if (!el) return;
    // Remove loading text
    const loadingEl = document.getElementById('geo-map-loading');
    if (loadingEl) loadingEl.remove();

    const map = L.map(el).setView([15, 108], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18
    }).addTo(map);

    const evts = window._geoMapEvents || [];
    const groups = {};
    evts.forEach(e => {
      if (!e.location) return;
      if (!groups[e.location]) groups[e.location] = [];
      groups[e.location].push(e);
    });

    const pts = [];
    Object.entries(groups).forEach(([loc, list]) => {
      const c = _findCoords(loc);
      if (!c) return;
      const detail = list.map(e => '<b>' + (e.event_type || '').replace(/_/g, ' ') + '</b>').join('<br>');
      L.circleMarker(c, {
        radius: 7 + Math.min(list.length * 2, 10),
        fillColor: '#3b82f6', fillOpacity: 0.85,
        color: '#1e40af', weight: 2
      }).addTo(map).bindPopup(
        '<div style="min-width:150px"><strong>' + loc + '</strong><br><small>' + list.length + ' event(s)</small><hr style="margin:4px 0">' + detail + '</div>'
      );
      pts.push(c);
    });

    if (pts.length >= 2) {
      L.polyline(pts, { color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '6 4' }).addTo(map);
      map.fitBounds(L.latLngBounds(pts).pad(0.15));
    }
    setTimeout(() => map.invalidateSize(), 300);
  });
}
window._initGeoMap = _initGeoMap;
export function renderPage() {
  return `<div id="traceability-root">${renderContent()}</div>`;
}

window._caTraceTab = (t) => { activeTab = t; { const _el = document.getElementById('traceability-root'); if (_el) _el.innerHTML = renderContent ? renderContent() : ''; } };

async function load() {
  if (loading) return; loading = true;
  try {
    const [evRes, bRes] = await Promise.all([
      API.get('/scm/events?limit=50').catch(() => ({ events: [] })),
      API.get('/scm/batches?limit=20').catch(() => ({ batches: [] })),
    ]);
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

  // geo tab — Leaflet.js + OpenStreetMap (FREE, no API key)
  const uniqueLocations = [...new Set(evList.map(e => e.location).filter(Boolean))];
  // Store events for map init
  window._geoMapEvents = evList.filter(e => e.location);

  // Trigger map init after DOM update
  setTimeout(() => _initGeoMap(), 150);

  return `
    <div class="sa-card">
      <h3>Geographic View</h3>
      <div id="geo-map" style="height:420px;border-radius:8px;overflow:hidden;background:#e8ecf1;position:relative">
        <div id="geo-map-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#64748b;font-size:0.85rem;z-index:1">Loading map...</div>
      </div>
      <div class="sa-metrics-row" style="margin-top:1rem">
        <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${uniqueLocations.length}</div><div class="sa-metric-label">Locations</div></div></div>
        <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${evList.length}</div><div class="sa-metric-label">Total Events</div></div></div>
        <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${bList.length}</div><div class="sa-metric-label">Batches Tracked</div></div></div>
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
