/**
 * Dynamic Compliance Policies Editor
 */
import { State } from '../../core/state.js';
import { API } from '../../core/api.js';
import { icon } from '../../core/icons.js';
import { showToast } from '../../components/toast.js';

let _activePolicies = [];
let _selectedAction = 'PUBLISH_PRODUCT';
let _isSubmitting = false;

// UI State
let _uiMode = 'visual'; // 'visual' | 'json'
let _rulesData = [];

// Default rules template if none exist
const DEFAULT_RULES = [
  {
    id: "trust_score_min",
    condition: "trust_score >= 60 AND origin_country IN ['US', 'VN'] AND is_certified == true",
    message: "Platform requires a minimum Trust Score of 60 to publish products."
  }
];

function generateId() { return Math.random().toString(36).substring(2, 9); }

export async function renderPage() {
    setTimeout(loadPolicies, 50);

    const isPlatformAdmin = State.user?.role === 'super_admin';
    const title = isPlatformAdmin ? 'Global Compliance Policies (SYSTEM)' : 'Organizational Compliance Policies (ORG)';
    const subtitle = isPlatformAdmin 
        ? 'These policies are enforced system-wide across all organizations.'
        : 'These policies are enforced locally for your organization, in addition to global platform rules.';

    return `
      <div class="sa-page" style="max-width: 1000px; margin: 0 auto;">
        <div class="sa-page-title" style="margin-bottom: 1.5rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h1 style="display:flex;align-items:center;gap:10px">${icon('shield', 28)} ${title}</h1>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.5rem">${subtitle}</p>
            </div>
            <button id="btnToggleMode" class="btn btn-secondary" onclick="window._toggleUiMode()">
                ${icon('code', 16)} Switch to JSON Editor
            </button>
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

          <div id="editorContainer">
              <div id="visualBuilderContainer"></div>
              
              <div id="jsonEditorContainer" style="display:none; background:var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border); overflow:hidden;">
                  <div style="padding: 10px 15px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border); font-family: monospace; font-size: 0.75rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
                      <span>rules_jsonb = Array&lt;Rule&gt;</span>
                      <span>Syntax: { id, condition, message }</span>
                  </div>
                  <textarea id="policyEditorArea" spellcheck="false" style="width: 100%; min-height: 400px; padding: 15px; border: none; background: transparent; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--text-primary); resize: vertical; outline: none; line-height: 1.5;"></textarea>
              </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1.5rem;">
              <div style="font-size:0.8rem; color:var(--text-secondary);">
                  <strong>Note:</strong> Policies are version-controlled. Publishing creates an immutable v_new and invalidates edge caches.
              </div>
              <button id="btnPublishPolicy" class="btn btn-primary" onclick="window._publishPolicy()" style="padding: 10px 24px; font-weight: 600;">
                  ${icon('save', 16)} Publish New Version
              </button>
          </div>
        </div>
      </div>
    `;
}

// ------ DSL PARSER / BUILDER ------

function _parseJsonToState(rulesJson) {
    if (!Array.isArray(rulesJson)) return [];
    return rulesJson.map(rule => {
        let clauses = [];
        if (rule.condition) {
            const parts = rule.condition.split(/\s+AND\s+/i);
            clauses = parts.map(part => {
                part = part.trim();
                const inMatch = part.match(/^([a-zA-Z0-9_]+)\s+(NOT IN|IN)\s+\[(.*?)\]$/i);
                if (inMatch) {
                    let vals = inMatch[3].split(',').map(s => s.trim().replace(/['"]/g, ''));
                    return { field: inMatch[1], operator: inMatch[2].toUpperCase(), value: vals.join(', ') };
                }
                const opMatch = part.match(/^([a-zA-Z0-9_]+)\s*(>=|<=|>|<|==|!=)\s*(.*)$/i);
                if (opMatch) {
                    return { field: opMatch[1], operator: opMatch[2], value: opMatch[3].trim().replace(/['"]/g, '') };
                }
                return { field: 'trust_score', operator: '==', value: part };
            });
        }
        return { id: rule.id || '', message: rule.message || '', clauses };
    });
}

window._getJsonFromVisual = function() {
    return _rulesData.map(rule => {
        const conditions = rule.clauses.map(c => {
            if (c.operator === 'IN' || c.operator === 'NOT IN') {
                const arr = c.value.split(',').map(s => s.trim()).filter(Boolean);
                const quoted = arr.map(s => `'${s}'`).join(', ');
                return `${c.field} ${c.operator} [${quoted}]`;
            }
            return `${c.field} ${c.operator} ${c.value}`;
        }).join(' AND ');
        return { id: rule.id, condition: conditions, message: rule.message };
    });
}

// ------ UI RENDERING LOGIC ------

window._toggleEditRule = function(rIdx) {
    if (window._expandedRules.has(rIdx)) window._expandedRules.delete(rIdx);
    else window._expandedRules.add(rIdx);
    window._renderVisualBuilder();
};

window._renderVisualBuilder = function() {
    window._expandedRules = window._expandedRules || new Set();
    const container = document.getElementById('visualBuilderContainer');
    if (!container) return;
    
    if (_rulesData.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; background:var(--bg-secondary); border-radius:8px; border:1px dashed var(--border);">
            <div style="color:var(--text-secondary); margin-bottom:15px;">No compliance rules defined.</div>
            <button class="btn btn-primary" onclick="window._addRule()">+ Add Rule</button>
        </div>`;
        return;
    }

    let html = '';
    _rulesData.forEach((rule, rIdx) => {
        if (!window._expandedRules.has(rIdx)) {
            const clauseSummary = rule.clauses.map(c => `<strong style="color:var(--text-primary)">${c.field}</strong> ${c.operator} <i>${c.value}</i>`).join(' AND ');
            html += `<div style="border:1px solid var(--border); border-radius:8px; padding:15px; margin-bottom:15px; background:var(--bg-primary); display:flex; justify-content:space-between; align-items:center; transition:0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="flex:1; margin-right:20px; overflow:hidden;">
                    <div style="font-size:1rem; font-weight:600; margin-bottom:4px; color:var(--text-primary);"><span style="color:var(--text-secondary); font-size:0.75rem; font-weight:normal;">RULE ID:</span> ${rule.id}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        IF ${clauseSummary || 'No conditions'} THEN REJECT
                    </div>
                </div>
                <div style="display:flex; gap:8px; flex-shrink:0;">
                    <button class="btn btn-sm btn-secondary" onclick="window._toggleEditRule(${rIdx})" style="padding:4px 12px;">Edit Rule</button>
                </div>
            </div>`;
        } else {
            html += `<div style="border:1px solid var(--primary); border-radius:8px; padding:20px; margin-bottom:15px; background:var(--bg-primary); position:relative; box-shadow:0 0 0 2px rgba(9, 105, 218, 0.1);">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="font-size:0.8rem; color:var(--text-secondary); text-transform:uppercase;">Rule ID</strong>
                    <input type="text" value="${rule.id.replace(/"/g, '&quot;')}" onchange="window._updateRule(${rIdx}, 'id', this.value)" placeholder="e.g. min_trust" class="form-control" style="width:200px" />
                </div>
                <button class="btn btn-sm btn-danger" onclick="window._removeRule(${rIdx})" style="padding:4px 8px;">${icon('trash', 14)} Remove Rule</button>
            </div>
            
            <div style="background:var(--bg-secondary); padding:15px; border-radius:6px; margin-bottom:15px; border:1px solid var(--border);">
                <h4 style="margin:0 0 10px 0; font-size:11px; text-transform:uppercase; color:var(--text-secondary); letter-spacing:0.5px;">Match ALL Conditions (AND)</h4>
                ${rule.clauses.map((clause, cIdx) => {
                    let availableOperators = [];
                    if (clause.field === 'trust_score') {
                        availableOperators = ['>=', '<=', '==', '!=', '>', '<'];
                    } else if (clause.field === 'origin_country') {
                        availableOperators = ['IN', 'NOT IN', '==', '!='];
                    } else if (clause.field === 'category') {
                        availableOperators = ['==', '!=', 'IN', 'NOT IN'];
                    } else if (clause.field === 'is_certified') {
                        availableOperators = ['==', '!='];
                    } else {
                        availableOperators = ['>=', '<=', '==', '!=', 'IN', 'NOT IN'];
                    }

                    if (!availableOperators.includes(clause.operator)) {
                        clause.operator = availableOperators[0];
                    }

                    if (!window._dropdownEvtReady) {
                        document.addEventListener('click', (e) => {
                            if (!e.target.closest('details.custom-dropdown')) {
                                document.querySelectorAll('details.custom-dropdown[open]').forEach(d => {
                                    d.removeAttribute('open');
                                });
                            }
                        });
                        const style = document.createElement('style');
                        style.innerHTML = 'details.custom-dropdown summary::-webkit-details-marker { display:none; } details.custom-dropdown summary { list-style: none; outline:none; }';
                        document.head.appendChild(style);
                        window._dropdownEvtReady = true;
                    }

                    window._toggleDropdownItem = window._toggleDropdownItem || function(rIdx, cIdx, val, isChecked) {
                        let currentVal = _rulesData[rIdx].clauses[cIdx].value;
                        let arr = currentVal.split(',').map(s=>s.trim()).filter(Boolean);
                        if (isChecked) { if(!arr.includes(val)) arr.push(val); } 
                        else arr = arr.filter(x => x !== val);
                        window._updateClause(rIdx, cIdx, 'value', arr.join(', '));
                    };

                    window._addOptions = window._addOptions || function(rIdx, cIdx, valStr) {
                        let currentVal = _rulesData[rIdx].clauses[cIdx].value;
                        let arr = currentVal.split(',').map(s=>s.trim()).filter(Boolean);
                        valStr.split(',').map(s=>s.trim()).filter(Boolean).forEach(nv => {
                            if(!arr.includes(nv)) arr.push(nv);
                        });
                        window._updateClause(rIdx, cIdx, 'value', arr.join(', '));
                    };

                    function buildMultiSelectDropdown(options, selectedArr, rIdx, cIdx) {
                        const selectedCount = selectedArr.length;
                        const summaryText = selectedCount > 0 ? (selectedCount === 1 ? selectedArr[0] : `${selectedCount} selected`) : 'Select...';
                        
                        let itemsHtml = options.map(opt => {
                            const val = typeof opt === 'string' ? opt : opt.c;
                            const label = typeof opt === 'string' ? opt : `${opt.n} (${opt.c})`;
                            const isSel = selectedArr.includes(val);
                            
                            return `<label style="display:flex; align-items:center; gap:8px; padding:6px 10px; cursor:pointer; margin:0; border-bottom:1px solid var(--border); font-size:0.8rem; background:${isSel?'var(--bg-secondary)':'transparent'};">
                                <input type="checkbox" ${isSel?'checked':''} onchange="window._toggleDropdownItem(${rIdx}, ${cIdx}, '${val.replace(/'/g, "\\'")}', this.checked)">
                                ${label}
                            </label>`;
                        }).join('');

                        let customInputHtml = `<div style="padding:6px 10px;">
                            <input type="text" placeholder="+ Custom value (Enter)" onchange="window._addOptions(${rIdx}, ${cIdx}, this.value)" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px 8px; font-size:0.75rem;">
                        </div>`;

                        return `
                        <details class="custom-dropdown" style="position:relative; flex:1;">
                            <summary class="form-control" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none; height:36px;">
                                <span style="font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${summaryText}</span>
                                <span style="font-size:10px; color:var(--text-secondary);">▼</span>
                            </summary>
                            <div style="position:absolute; top:calc(100% + 4px); left:0; width:100%; max-height:220px; overflow-y:auto; background:var(--bg-primary); border:1px solid var(--primary); border-radius:6px; box-shadow:0 5px 20px rgba(0,0,0,0.15); z-index:100;">
                                ${itemsHtml}
                                ${customInputHtml}
                            </div>
                        </details>
                        `;
                    }

                    let valInputHtml = '';
                    
                    const ALL_COUNTRIES = [
                        { c: 'VN', n: 'Vietnam' }, { c: 'US', n: 'United States' }, { c: 'CN', n: 'China' }, { c: 'SG', n: 'Singapore' },
                        { c: 'JP', n: 'Japan' }, { c: 'KR', n: 'South Korea' }, { c: 'GB', n: 'United Kingdom' }, { c: 'FR', n: 'France' },
                        { c: 'DE', n: 'Germany' }, { c: 'IN', n: 'India' }, { c: 'CA', n: 'Canada' }, { c: 'AU', n: 'Australia' },
                        { c: 'AE', n: 'United Arab Emirates' }, { c: 'AR', n: 'Argentina' }, { c: 'AT', n: 'Austria' }, { c: 'BE', n: 'Belgium' },
                        { c: 'BR', n: 'Brazil' }, { c: 'CH', n: 'Switzerland' }, { c: 'CL', n: 'Chile' }, { c: 'CO', n: 'Colombia' },
                        { c: 'CZ', n: 'Czech Republic' }, { c: 'DK', n: 'Denmark' }, { c: 'EG', n: 'Egypt' }, { c: 'ES', n: 'Spain' },
                        { c: 'FI', n: 'Finland' }, { c: 'HK', n: 'Hong Kong' }, { c: 'ID', n: 'Indonesia' }, { c: 'IE', n: 'Ireland' },
                        { c: 'IL', n: 'Israel' }, { c: 'IT', n: 'Italy' }, { c: 'KH', n: 'Cambodia' }, { c: 'KW', n: 'Kuwait' },
                        { c: 'LA', n: 'Laos' }, { c: 'LK', n: 'Sri Lanka' }, { c: 'MO', n: 'Macau' }, { c: 'MX', n: 'Mexico' },
                        { c: 'MY', n: 'Malaysia' }, { c: 'NL', n: 'Netherlands' }, { c: 'NO', n: 'Norway' }, { c: 'NZ', n: 'New Zealand' },
                        { c: 'OM', n: 'Oman' }, { c: 'PE', n: 'Peru' }, { c: 'PH', n: 'Philippines' }, { c: 'PL', n: 'Poland' },
                        { c: 'PT', n: 'Portugal' }, { c: 'QA', n: 'Qatar' }, { c: 'RU', n: 'Russia' }, { c: 'SA', n: 'Saudi Arabia' },
                        { c: 'SE', n: 'Sweden' }, { c: 'TH', n: 'Thailand' }, { c: 'TR', n: 'Turkey' }, { c: 'TW', n: 'Taiwan' },
                        { c: 'ZA', n: 'South Africa' }, { c: 'EU', n: 'European Union' }
                    ].sort((a,b) => a.n.localeCompare(b.n));

                    const ALL_CATEGORIES = [
                        'Electronics', 'Apparel & Fashion', 'Food & Beverage', 
                        'Health & Beauty', 'Home & Garden', 'Industrial Parts', 
                        'Automotive', 'Toys', 'Sports', 'Software & Digital'
                    ];

                    if (clause.field === 'origin_country') {
                        if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
                            let selectedArr = clause.value.split(',').map(s=>s.trim()).filter(Boolean);
                            valInputHtml = buildMultiSelectDropdown(ALL_COUNTRIES, selectedArr, rIdx, cIdx);
                        } else {
                            valInputHtml = `<select class="form-control" onchange="window._updateClause(${rIdx}, ${cIdx}, 'value', this.value)" style="flex:1">
                                <option value="">Select Country...</option>
                                ${ALL_COUNTRIES.map(c => `<option value="${c.c}" ${clause.value===c.c?'selected':''}>${c.n} (${c.c})</option>`).join('')}
                            </select>`;
                        }
                    } else if (clause.field === 'category') {
                        if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
                            let selectedArr = clause.value.split(',').map(s=>s.trim()).filter(Boolean);
                            valInputHtml = buildMultiSelectDropdown(ALL_CATEGORIES, selectedArr, rIdx, cIdx);
                        } else {
                            valInputHtml = `<select class="form-control" onchange="window._updateClause(${rIdx}, ${cIdx}, 'value', this.value)" style="flex:1">
                                <option value="">Select Category...</option>
                                ${ALL_CATEGORIES.map(c => `<option value="${c}" ${clause.value===c?'selected':''}>${c}</option>`).join('')}
                            </select>`;
                        }
                    } else if (clause.field === 'is_certified') {
                        valInputHtml = `<select class="form-control" onchange="window._updateClause(${rIdx}, ${cIdx}, 'value', this.value)" style="flex:1">
                            <option value="true" ${clause.value==='true'?'selected':''}>True</option>
                            <option value="false" ${clause.value==='false'?'selected':''}>False</option>
                        </select>`;
                    } else {
                        valInputHtml = `<input type="text" class="form-control" value="${clause.value.replace(/"/g, '&quot;')}" placeholder="Value..." onchange="window._updateClause(${rIdx}, ${cIdx}, 'value', this.value)" style="flex:1" />`;
                    }

                    return `
                    <div style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">
                        <select class="form-control" onchange="window._updateClause(${rIdx}, ${cIdx}, 'field', this.value)" style="width:180px">
                            <option value="trust_score" ${clause.field==='trust_score'?'selected':''}>Trust Score</option>
                            <option value="origin_country" ${clause.field==='origin_country'?'selected':''}>Origin Country</option>
                            <option value="category" ${clause.field==='category'?'selected':''}>Category</option>
                            <option value="is_certified" ${clause.field==='is_certified'?'selected':''}>Is Certified</option>
                        </select>
                        
                        <select class="form-control" onchange="window._updateClause(${rIdx}, ${cIdx}, 'operator', this.value)" style="width:130px">
                            ${availableOperators.map(op => `<option value="${op}" ${clause.operator===op?'selected':''}>${op}</option>`).join('')}
                        </select>
                        
                        ${valInputHtml}
                        
                        <button class="btn btn-icon btn-sm" onclick="window._removeClause(${rIdx}, ${cIdx})">${icon('x', 14)}</button>
                    </div>`;
                }).join('')}
                <button class="btn btn-sm" style="margin-top:5px; background:var(--bg-primary); border:1px dashed var(--border);" onclick="window._addClause(${rIdx})">+ Add Condition</button>
            </div>

            <div style="display:flex; align-items:center; gap:10px;">
                <strong style="font-size:0.8rem; color:var(--text-secondary); text-transform:uppercase; white-space:nowrap;">Rejection Message</strong>
                <input type="text" value="${rule.message.replace(/"/g, '&quot;')}" onchange="window._updateRule(${rIdx}, 'message', this.value)" placeholder="Error message shown when condition fails..." class="form-control" style="width:100%" />
            </div>

            <div style="text-align:right; margin-top:15px; border-top:1px dashed var(--border); padding-top:15px;">
                <button class="btn btn-sm btn-primary" onclick="window._toggleEditRule(${rIdx})">Done Editing</button>
            </div>
        </div>`;
        }
    });
    
    html += `<div style="text-align:center"><button class="btn btn-secondary" onclick="window._addRule()">+ Add Another Rule</button></div>`;
    container.innerHTML = html;
}

window._addRule = function() {
    _rulesData.push({
        id: "rule_" + generateId(),
        message: "Policy condition failed.",
        clauses: [{ field: "trust_score", operator: ">=", value: "60" }]
    });
    window._expandedRules.add(_rulesData.length - 1);
    window._renderVisualBuilder();
}
window._removeRule = function(rIdx) {
    _rulesData.splice(rIdx, 1);
    window._renderVisualBuilder();
}
window._addClause = function(rIdx) {
    _rulesData[rIdx].clauses.push({ field: "origin_country", operator: "IN", value: "VN, US" });
    window._renderVisualBuilder();
}
window._removeClause = function(rIdx, cIdx) {
    _rulesData[rIdx].clauses.splice(cIdx, 1);
    window._renderVisualBuilder();
}
window._updateRule = function(rIdx, key, val) {
    _rulesData[rIdx][key] = val;
}
window._updateClause = function(rIdx, cIdx, key, val) {
    _rulesData[rIdx].clauses[cIdx][key] = val;
    // Auto adjust reasonable defaults when field changes
    if (key === 'field') {
        if (val === 'is_certified') {
            _rulesData[rIdx].clauses[cIdx].operator = '==';
            _rulesData[rIdx].clauses[cIdx].value = 'true';
        } else if (val === 'origin_country') {
            _rulesData[rIdx].clauses[cIdx].operator = 'IN';
            _rulesData[rIdx].clauses[cIdx].value = 'VN, US';
        } else {
            _rulesData[rIdx].clauses[cIdx].operator = '>=';
            _rulesData[rIdx].clauses[cIdx].value = '60';
        }
    }
    window._renderVisualBuilder();
}

window._toggleUiMode = function() {
    if (_uiMode === 'visual') {
        const json = window._getJsonFromVisual();
        document.getElementById('policyEditorArea').value = JSON.stringify(json, null, 4);
        _uiMode = 'json';
        document.getElementById('visualBuilderContainer').style.display = 'none';
        document.getElementById('jsonEditorContainer').style.display = 'block';
        document.getElementById('btnToggleMode').innerHTML = icon('eye', 16) + ' Switch to Visual Builder';
    } else {
        try {
            const parsed = JSON.parse(document.getElementById('policyEditorArea').value);
            _rulesData = _parseJsonToState(parsed);
            window._renderVisualBuilder();
            _uiMode = 'visual';
            document.getElementById('jsonEditorContainer').style.display = 'none';
            document.getElementById('visualBuilderContainer').style.display = 'block';
            document.getElementById('btnToggleMode').innerHTML = icon('code', 16) + ' Switch to JSON Editor';
        } catch(e) {
            showToast('Cannot switch: Invalid JSON format', 'error');
        }
    }
}

// ------ CORE INFRASTRUCTURE ------

async function loadPolicies() {
    try {
        const isPlatformAdmin = State.user?.role === 'super_admin';
        const endpoint = isPlatformAdmin ? '/admin/compliance/policies' : '/org/compliance/policies';

        const res = await API.get(`${endpoint}?action=${_selectedAction}`);
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

    let initialJson = DEFAULT_RULES;
    if (_activePolicies.length > 0) {
        const activePolicy = _activePolicies[0]; // Currently active version
        let rawJson = activePolicy.rules_jsonb || [];
        if (typeof rawJson === 'string') {
            try {
                rawJson = JSON.parse(rawJson);
            } catch(e) {
                console.warn('Failed to parse stringified rules_jsonb:', e);
                rawJson = [];
            }
        }
        initialJson = rawJson;

        const version = activePolicy.version_id.substring(0, 8);
        const date = new Date(activePolicy.created_at).toLocaleString();
        metadata.innerHTML = `Active Version: <strong>${version}</strong> &bull; Updated: ${date}`;
    } else {
        metadata.innerHTML = `<span style="color:var(--amber)">No active policies found for this action. Using defaults.</span>`;
    }

    // Set initial text
    editor.value = JSON.stringify(initialJson, null, 4);
    
    // Parse to visual state and render
    try {
        _rulesData = _parseJsonToState(initialJson);
        window._renderVisualBuilder();
    } catch(e) {
        console.error('Failed to parse JSON into Visual state', e);
    }
    
    // Force ui based on toggle
    if (_uiMode === 'visual') {
        document.getElementById('jsonEditorContainer').style.display = 'none';
        document.getElementById('visualBuilderContainer').style.display = 'block';
    } else {
        document.getElementById('visualBuilderContainer').style.display = 'none';
        document.getElementById('jsonEditorContainer').style.display = 'block';
    }
}

window._changePolicyAction = function(action) {
    _selectedAction = action;
    loadPolicies();
};

window._publishPolicy = async function() {
    if (_isSubmitting) return;
    const btn = document.getElementById('btnPublishPolicy');
    
    let rulesJsonb;
    try {
        if (_uiMode === 'visual') {
            rulesJsonb = window._getJsonFromVisual();
        } else {
            const editor = document.getElementById('policyEditorArea');
            rulesJsonb = JSON.parse(editor.value);
            if (!Array.isArray(rulesJsonb)) throw new Error('Root must be a JSON array of rules.');
        }
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
