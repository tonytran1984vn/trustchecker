"use client";

import { useState } from "react";
import { clientApi, ApiError } from "@/lib/client/api";

const ACTIONS = ['view', 'create', 'update', 'delete', 'export', 'manage', 'verify', 'resolve', 'approve', 'generate', 'upload', 'mint', 'simulate'];

const CA_FORBIDDEN_PERMS = new Set([
  'carbon_credit:approve_mint', 'carbon_credit:anchor',
  'cie_passport:approve', 'cie_passport:seal', 'cie_passport:validate',
  'cie_methodology:propose', 'cie_methodology:vote', 'cie_methodology:freeze', 'cie_methodology:publish',
  'cie_disclosure:sign_off', 'cie_disclosure:certify_csrd',
  'risk_model:deploy', 'risk_model:approve', 'risk_model:validate',
  'model_certification:issue',
  'compliance:freeze', 'regulatory_export:approve', 'gdpr_masking:execute',
  'graph_schema:approve', 'graph_schema:deploy',
  'graph_weight:approve', 'graph_override:approve',
  'evidence:seal', 'evidence:freeze',
  'lrgf_case:override', 'fraud_case:approve',
]);

function formatResourceName(resource: string) {
  const map: Record<string, string> = {
    dashboard: '📊 Dashboard', product: '📦 Product', scan: '🔍 Scan', qr: '📱 QR Code',
    evidence: '🔐 Evidence', trust_score: '⭐ Trust Score', stakeholder: '👥 Stakeholder',
    supply_chain: '🔗 Supply Chain', inventory: '📋 Inventory', logistics: '🚚 Logistics',
    partner: '🤝 Partner', epcis: '📡 EPCIS', trustgraph: '🕸️ TrustGraph',
    digital_twin: '🪞 Digital Twin', fraud: '🚨 Fraud', fraud_case: '📁 Fraud Case',
    risk_radar: '🎯 Risk Radar', anomaly: '⚡ Anomaly', leak_monitor: '💧 Leak Monitor',
    ai_analytics: '🤖 AI Analytics', kyc: '🏛️ KYC', esg: '🌱 ESG',
    sustainability: '♻️ Sustainability', compliance: '📜 Compliance', report: '📈 Report',
    blockchain: '⛓️ Blockchain', nft: '🎨 NFT', wallet: '💰 Wallet',
    api_key: '🔑 API Key', webhook: '🪝 Webhook', notification: '🔔 Notification',
    billing: '💳 Billing', settings: '⚙️ Settings',
    org: '🏢 Org Mgmt',
  };
  return map[resource] || resource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

interface RoleMatrixProps {
  role: any;
  matrix: any[];
  onBack: () => void;
}

export default function RoleMatrix({ role, matrix, onBack }: RoleMatrixProps) {
  // Convert permission array to boolean map
  const initialPerms: Record<string, boolean> = {};
  (role.permissions || []).forEach((p: string) => { initialPerms[p] = true; });
  
  const [perms, setPerms] = useState<Record<string, boolean>>(initialPerms);
  const [saving, setSaving] = useState(false);

  const togglePerm = (key: string) => {
    if (role.is_system) return;
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (role.is_system) return;
    setSaving(true);
    
    const permissionsToSave = Object.entries(perms)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    try {
      await clientApi.put(`/org-admin/roles/${role.id}`, { permissions: permissionsToSave });
      alert(`Saved ${permissionsToSave.length} permissions successfully`);
      onBack();
    } catch (e) {
      if (e instanceof ApiError && e.data?.code === 'PERMISSION_CEILING') {
        alert(`🔒 Permission Ceiling: Cannot grant governance permissions — ${(e.data.forbidden_permissions || []).join(', ')}`);
      } else {
        alert(e instanceof ApiError ? e.message : 'Error connecting to backend API');
      }
    } finally {
      setSaving(false);
    }
  };

  const groupedByLevel: Record<string, any[]> = {};
  matrix.forEach(group => {
    const lvl = group.level || 'business';
    if (lvl === 'platform') return;
    if (!groupedByLevel[lvl]) groupedByLevel[lvl] = [];
    groupedByLevel[lvl].push(group);
  });

  const levelLabels: Record<string, string> = { org: '🏢 Organization Management', business: '📊 Business Modules' };
  const permCount = Object.values(perms).filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-0">
      
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-lg">{role.display_name || role.name}</span>
              {role.is_system && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                  SYSTEM
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {permCount} permissions selected
            </div>
          </div>
        </div>

        {role.is_system ? (
          <div className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
            ⚠️ System roles cannot be modified
          </div>
        ) : (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save Permissions'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-b-xl pb-8">
        {Object.entries(groupedByLevel).map(([level, groups]) => (
          <div key={level} className="mb-8">
            <div className="px-6 py-3 font-bold text-sm bg-gray-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              {levelLabels[level] || level}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] text-gray-500 dark:text-gray-400 uppercase bg-white dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 font-medium min-w-[200px] border-r border-gray-100 dark:border-gray-700">Resource</th>
                    {ACTIONS.map(act => (
                      <th key={act} className="px-2 py-3 font-medium text-center w-[70px]">{act}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                  {groups.map(g => (
                    <tr key={g.resource} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-200 border-r border-gray-100 dark:border-gray-700">
                        {formatResourceName(g.resource)}
                      </td>
                      {ACTIONS.map(act => {
                        const match = g.actions.find((a: any) => a.action === act);
                        if (!match) {
                          return <td key={act} className="px-2 py-3 text-center text-gray-300 dark:text-gray-600">—</td>;
                        }

                        const key = `${g.resource}:${match.action}`;
                        const isChecked = !!perms[key];
                        const isForbidden = CA_FORBIDDEN_PERMS.has(key);

                        if (isForbidden) {
                          return (
                            <td key={act} className="px-2 py-3 text-center" title="🔒 Governance permission — requires org_owner">
                              <span className="text-rose-500 cursor-not-allowed">🔒</span>
                            </td>
                          );
                        }

                        return (
                          <td key={act} className="px-2 py-3 text-center">
                            <label className="cursor-pointer flex items-center justify-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full h-full">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                disabled={role.is_system}
                                onChange={() => togglePerm(key)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
