/**
 * Company Admin – Flow Configuration
 * ════════════════════════════════════
 * Real data from /api/scm/supply/routes + /api/scm/supply/channel-rules
 */
import { icon } from '../../core/icons.js';
import { API } from '../../core/api.js';

let data = null, loading = false;

window._fcCreateFlow = () => {
  const modal = document.getElementById('create-flow-modal');
  if (modal) modal.style.display = 'flex';
};

window._fcCloseModal = () => {
  const modal = document.getElementById('create-flow-modal');
  if (modal) modal.style.display = 'none';
};

window._fcAddStep = () => {
  const container = document.getElementById('flow-steps');
  if (!container) return;
  const idx = container.children.length + 1;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px';
  div.innerHTML = `
    <span style="color:var(--text-secondary);font-size:0.75rem;min-width:18px">${idx}.</span>
    <input type="text" placeholder="Node name" class="flow-step-name" style="flex:1;padding:6px 10px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem;box-sizing:border-box" />
    <select class="flow-step-type" style="padding:6px 8px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem">
      <option value="checkpoint">Checkpoint</option>
      <option value="farm">Farm</option>
      <option value="factory">Factory</option>
      <option value="warehouse">Warehouse</option>
      <option value="distributor">Distributor</option>
      <option value="retailer">Retailer</option>
    </select>
    <input type="text" placeholder="Location" class="flow-step-location" style="flex:1;padding:6px 10px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem;box-sizing:border-box" />
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px">✕</button>
  `;
  container.appendChild(div);
};

window._fcSubmitFlow = async () => {
  const name = document.getElementById('flow-name')?.value?.trim();
  if (!name) return alert('Flow name is required');

  const steps = [];
  document.querySelectorAll('#flow-steps > div').forEach(div => {
    const nodeName = div.querySelector('.flow-step-name')?.value?.trim();
    const type = div.querySelector('.flow-step-type')?.value || 'checkpoint';
    const location = div.querySelector('.flow-step-location')?.value?.trim() || '';
    if (nodeName) steps.push({ node_name: nodeName, type, location });
  });

  if (steps.length < 2) return alert('A flow needs at least 2 steps (origin and destination)');

  try {
    await API.post('/scm/supply/routes', {
      name,
      chain: steps,
      products: [],
      status: 'active'
    });
    window._fcCloseModal();
    data = null;
    loading = false;
    load();
  } catch (e) {
    alert('Failed to create flow: ' + (e.message || 'Unknown error'));
  }
};

async function load() {
  if (loading) return; loading = true;
  try {
    const [routes, rules] = await Promise.all([
      API.get('/scm/supply/routes').catch(() => ({ routes: [] })),
      API.get('/scm/supply/channel-rules').catch(() => ({ rules: [] })),
    ]);
    data = {
      routes: Array.isArray(routes) ? routes : (routes.routes || []),
      rules: Array.isArray(rules) ? rules : (rules.rules || []),
    };
  } catch (e) { data = { routes: [], rules: [] }; }
  loading = false;
  setTimeout(() => { const el = document.getElementById('flow-config-root'); if (el) el.innerHTML = renderContent(); }, 50);
}

function parseChain(route) {
  let chain = route.chain;
  if (typeof chain === 'string') {
    try { chain = JSON.parse(chain); } catch (e) { chain = []; }
  }
  return Array.isArray(chain) ? chain : [];
}

function extractPath(route) {
  const chain = parseChain(route);
  if (chain.length >= 2) {
    const nodeName = (n) => n.node_name || n.name || n.location || '?';
    return `${nodeName(chain[0])} → ${nodeName(chain[chain.length - 1])}`;
  }
  if (chain.length === 1) {
    return chain[0].node_name || chain[0].name || chain[0].location || route.name || '—';
  }
  return route.name || '—';
}

function renderContent() {
  if (!data && !loading) { load(); }
  if (loading && !data) return `<div class="sa-page"><div style="text-align:center;padding:60px;color:var(--text-muted)">Loading Flow Configuration...</div></div>`;

  const routes = data?.routes || [];
  const rules = data?.rules || [];

  return `
    <div class="sa-page">
      <div class="sa-page-title">
        <h1>${icon('network', 28)} Flow Configuration</h1>
        <div class="sa-title-actions">
          <button class="btn btn-primary btn-sm" onclick="_fcCreateFlow()">+ Create Flow</button>
        </div>
      </div>

      <div class="sa-grid-2col">
        <!-- Active Flows from DB -->
        <div class="sa-card">
          <h3>Active Supply Routes</h3>
          ${routes.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No routes configured. Click "+ Create Flow" to add one.</div>' : `
          <div class="sa-spike-list">
            ${routes.map(r => {
    const chain = parseChain(r);
    return flowItem(
      r.name || extractPath(r),
      extractPath(r),
      chain.length,
      r.status || 'active'
    );
  }).join('')}
          </div>`}
        </div>

        <!-- Channel Rules from DB -->
        <div class="sa-card">
          <h3>Channel Rules</h3>
          ${rules.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No rules configured</div>' : `
          <div class="sa-threshold-list">
            ${rules.map(r => ruleItem(
    r.rule_name || r.name || '—',
    r.description || r.condition || '—',
    r.is_active !== false
  )).join('')}
          </div>`}
        </div>
      </div>

      <!-- Route Integrity -->
      <section class="sa-section" style="margin-top:1.5rem">
        <h2 class="sa-section-title">${icon('shield', 20)} Route Integrity</h2>
        <div class="sa-card">
          <div class="sa-metrics-row">
            <div class="sa-metric-card sa-metric-green"><div class="sa-metric-body"><div class="sa-metric-value">${routes.length}</div><div class="sa-metric-label">Routes</div></div></div>
            <div class="sa-metric-card sa-metric-blue"><div class="sa-metric-body"><div class="sa-metric-value">${rules.length}</div><div class="sa-metric-label">Channel Rules</div></div></div>
            <div class="sa-metric-card sa-metric-orange"><div class="sa-metric-body"><div class="sa-metric-value">${rules.filter(r => r.is_active !== false).length}</div><div class="sa-metric-label">Active Rules</div></div></div>
          </div>
        </div>
      </section>
    </div>

    <!-- Create Flow Modal -->
    <div id="create-flow-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center">
      <div style="background:var(--surface-primary,#fff);border-radius:12px;padding:24px;width:560px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;color:var(--text-primary,#1e293b)">Create Supply Flow</h3>
          <button onclick="_fcCloseModal()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-secondary,#94a3b8)">✕</button>
        </div>

        <div style="margin-bottom:14px">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Flow Name *</label>
          <input id="flow-name" type="text" placeholder="e.g. Dalat Coffee → Singapore Export" style="width:100%;padding:8px 12px;border:1px solid var(--border-primary,#e2e8f0);border-radius:8px;font-size:0.85rem;box-sizing:border-box" />
        </div>

        <div style="margin-bottom:8px">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px">Flow Steps (min 2)</label>
          <div style="font-size:0.72rem;color:var(--text-muted,#94a3b8);margin-bottom:8px">Define the checkpoints in order from origin to destination</div>
        </div>

        <div id="flow-steps">
          <div style="display:flex;gap:8px;align-items:center">
            <span style="color:var(--text-secondary);font-size:0.75rem;min-width:18px">1.</span>
            <input type="text" placeholder="Origin node name" class="flow-step-name" style="flex:1;padding:6px 10px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem;box-sizing:border-box" />
            <select class="flow-step-type" style="padding:6px 8px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem">
              <option value="farm">Farm</option>
              <option value="factory">Factory</option>
              <option value="warehouse">Warehouse</option>
              <option value="checkpoint">Checkpoint</option>
              <option value="distributor">Distributor</option>
              <option value="retailer">Retailer</option>
            </select>
            <input type="text" placeholder="Location" class="flow-step-location" style="flex:1;padding:6px 10px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem;box-sizing:border-box" />
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
            <span style="color:var(--text-secondary);font-size:0.75rem;min-width:18px">2.</span>
            <input type="text" placeholder="Destination node name" class="flow-step-name" style="flex:1;padding:6px 10px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem;box-sizing:border-box" />
            <select class="flow-step-type" style="padding:6px 8px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem">
              <option value="distributor">Distributor</option>
              <option value="retailer">Retailer</option>
              <option value="warehouse">Warehouse</option>
              <option value="checkpoint">Checkpoint</option>
              <option value="farm">Farm</option>
              <option value="factory">Factory</option>
            </select>
            <input type="text" placeholder="Location" class="flow-step-location" style="flex:1;padding:6px 10px;border:1px solid var(--border-primary,#e2e8f0);border-radius:6px;font-size:0.82rem;box-sizing:border-box" />
          </div>
        </div>

        <button onclick="_fcAddStep()" style="margin-top:10px;background:none;border:1px dashed var(--border-primary,#cbd5e1);border-radius:6px;padding:6px 14px;color:var(--text-secondary,#64748b);font-size:0.78rem;cursor:pointer;width:100%">+ Add Step</button>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button onclick="_fcCloseModal()" class="btn btn-sm btn-outline">Cancel</button>
          <button onclick="_fcSubmitFlow()" class="btn btn-sm btn-primary">Create Flow</button>
        </div>
      </div>
    </div>
  `;
}

function flowItem(name, path, hops, status) {
  return `
    <div class="sa-spike-item sa-spike-${status === 'active' ? 'info' : 'warning'}">
      <div class="sa-spike-header">
        <strong>${name}</strong>
        <span class="sa-status-pill sa-pill-${status === 'active' ? 'green' : 'orange'}">${status}</span>
      </div>
      <div class="sa-spike-detail">${path} · ${hops} hops</div>
    </div>
  `;
}

function ruleItem(name, desc, enabled) {
  return `
    <div class="sa-threshold-item">
      <div class="sa-threshold-header">
        <strong>${name}</strong>
        <span class="sa-status-pill sa-pill-${enabled ? 'green' : 'red'}">${enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
      <div class="sa-threshold-desc">${desc}</div>
    </div>
  `;
}

export function renderPage() {
  return `<div id="flow-config-root">${renderContent()}</div>`;
}
