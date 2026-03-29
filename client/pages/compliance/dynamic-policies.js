/**
 * Dynamic Compliance Policies Editor
 * Automatically detects SA vs CA tier and queries the correct engine endpoint.
 */
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { showToast } from '../../components/toast.js';

let _activePolicies = [];
let _selectedAction = 'PUBLISH_PRODUCT';
let _isSubmitting = false;

// Default rules template if none exist
const DEFAULT_RULES = [
  {
    id: "trust_score_min",
    condition: "trust_score >= 60",
    message: "Platform requires a minimum Trust Score of 60 to publish products."
  }
];

export async function renderPage() {
    setTimeout(loadPolicies, 50);

    const isPlatformAdmin = State.user?.role === 'super_admin';
    const title = isPlatformAdmin ? 'Global Compliance Policies (SYSTEM Layer)' : 'Organizational Compliance Policies (ORG Layer)';
    const subtitle = isPlatformAdmin 
        ? 'These policies are enforced system-wide across all organizations.'
        : 'These policies are enforced locally for your organization, in addition to global platform rules.';

    return `
      <div class="sa-page" style="max-width: 1000px; margin: 0 auto;">
        <div class="sa-page-title" style="margin-bottom: 1.5rem">
            <h1>${icon('shield', 28)} ${title}</h1>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.5rem">${subtitle}</p>
        </div>

        <div class="sa-card" style="margin-bottom: 1.5rem">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
              <div style="display:flex; align-items:center; gap: 1rem;">
                  <h3 style="margin:0;">Interception Point:</h3>
                  <select id="policyActionSelect" class="form-control" style="width: 250px; font-weight: 500;" onchange="window._changePolicyAction(this.value)">
                      <option value="PUBLISH_PRODUCT">PUBLISH_PRODUCT (Before Creation)</option>
                      <option value="UPDATE_PRODUCT" disabled>UPDATE_PRODUCT (Coming Soon)</option>
                      <option value="TRANSFER_BATCH" disabled>TRANSFER_BATCH (Coming Soon)</option>
                  </select>
              </div>
              <div id="policyMetadata" style="font-size:0.75rem; color:var(--text-secondary); text-align:right;">
                  Loading version history...
              </div>
          </div>

          <div style="background:var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border); overflow:hidden;">
              <div style="padding: 10px 15px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border); font-family: monospace; font-size: 0.75rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
                  <span>rules_jsonb = Array&lt;Rule&gt;</span>
                  <span>Syntax: { id, condition, message }</span>
              </div>
              <textarea id="policyEditorArea" spellcheck="false" style="width: 100%; min-height: 400px; padding: 15px; border: none; background: transparent; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--text-primary); resize: vertical; outline: none; line-height: 1.5;"></textarea>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1.5rem;">
              <div style="font-size:0.8rem; color:var(--text-secondary);">
                  <strong>Note:</strong> Policies are version-controlled. Publishing creates an immutable ` + "`v_new`" + ` and invalidates edge caches.
              </div>
              <button id="btnPublishPolicy" class="btn btn-primary" onclick="window._publishPolicy()" style="padding: 10px 24px; font-weight: 600;">
                  ${icon('save', 16)} Publish New Version
              </button>
          </div>
        </div>

        <div class="sa-card">
            <h3>📖 DSL Reference Guide</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
                <div>
                    <strong style="font-size:0.85rem">Supported Operators:</strong>
                    <ul style="font-size:0.8rem; color:var(--text-secondary); padding-left:20px; margin-top:0.5rem; line-height: 1.6;">
                        <li>` + "`==`, `!=`, `<`, `>`, `<=`, `>=`" + ` (Comparisons)</li>
                        <li>` + "`AND`, `OR`" + ` (Logical combinations)</li>
                        <li>` + "`IN [...]`, `NOT IN [...]`" + ` (Array inclusion)</li>
                    </ul>
                </div>
                <div>
                    <strong style="font-size:0.85rem">Available Context Variables (PUBLISH_PRODUCT):</strong>
                    <ul style="font-size:0.8rem; color:var(--text-secondary); padding-left:20px; margin-top:0.5rem; line-height: 1.6;">
                        <li>` + "`trust_score`" + ` (Number, 0-100)</li>
                        <li>` + "`origin_country`" + ` (String, ISO-2)</li>
                        <li>` + "`category`" + ` (String)</li>
                        <li>` + "`is_certified`" + ` (Boolean)</li>
                    </ul>
                </div>
            </div>
            <div style="margin-top: 1rem; padding: 10px 15px; background: rgba(59, 130, 246, 0.05); border-left: 3px solid #3b82f6; border-radius: 4px; font-size:0.8rem;">
                <strong>Example:</strong> ` + "`trust_score >= 80 AND origin_country IN ['US', 'VN'] AND is_certified == true`" + `
            </div>
        </div>
      </div>
    `;
}

async function loadPolicies() {
    try {
        const isPlatformAdmin = State.user?.role === 'super_admin';
        const endpoint = isPlatformAdmin ? '/admin/compliance/policies' : '/org/compliance/policies';

        const res = await API.get(` + "`" + `${endpoint}?action=${_selectedAction}` + "`" + `);
        _activePolicies = res.policies || [];

        renderEditor();
    } catch (e) {
        console.error('Failed to load compliance policies:', e);
        showToast('Failed to load compliance policies', 'error');
    }
}

function renderEditor() {
    const editor = document.getElementById('policyEditorArea');
    const metadata = document.getElementById('policyMetadata');
    if (!editor) return;

    if (_activePolicies.length > 0) {
        const activePolicy = _activePolicies[0]; // Currently active version
        const rules = activePolicy.rules_jsonb || [];
        editor.value = JSON.stringify(rules, null, 4);

        const version = activePolicy.version_id.substring(0, 8);
        const date = new Date(activePolicy.created_at).toLocaleString();
        metadata.innerHTML = `Active Version: <strong>${version}</strong> &bull; Updated: ${date}`;
    } else {
        editor.value = JSON.stringify(DEFAULT_RULES, null, 4);
        metadata.innerHTML = `<span style="color:var(--amber)">No active policies found for this action. Using defaults.</span>`;
    }
}

window._changePolicyAction = function(action) {
    _selectedAction = action;
    loadPolicies();
};

window._publishPolicy = async function() {
    if (_isSubmitting) return;
    const editor = document.getElementById('policyEditorArea');
    const btn = document.getElementById('btnPublishPolicy');
    
    let rulesJsonb;
    try {
        rulesJsonb = JSON.parse(editor.value);
        if (!Array.isArray(rulesJsonb)) throw new Error('Root must be a JSON array of rules.');
    } catch (e) {
        showToast('Invalid JSON: ' + e.message, 'error');
        return;
    }

    try {
        _isSubmitting = true;
        btn.innerHTML = '<span class="spinner"></span> Publishing...';
        btn.disabled = true;

        const isPlatformAdmin = State.user?.role === 'super_admin';
        const endpoint = isPlatformAdmin ? '/admin/compliance/policies' : '/org/compliance/policies';

        await API.post(endpoint, {
            action: _selectedAction,
            rules_jsonb: rulesJsonb
        });

        showToast('Successfully published new policy version!', 'success');
        await loadPolicies();
    } catch (e) {
        showToast(e.message || 'Failed to publish policy', 'error');
    } finally {
        _isSubmitting = false;
        btn.innerHTML = `${icon('save', 16)} Publish New Version`;
        btn.disabled = false;
    }
};
