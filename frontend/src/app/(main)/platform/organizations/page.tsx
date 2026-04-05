"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { Search, MoreVertical, ShieldCheck, Ban, Loader2, X, AlertCircle } from "lucide-react";

export default function OrganizationsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({
    name: "", slug: "", plan: "core", admin_email: "", admin_password: ""
  });
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [isSlugTaken, setIsSlugTaken] = useState(false);
  const [isNameTaken, setIsNameTaken] = useState(false);

  // Details Modal State
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Connectivity Modal State
  const [isConnectivityModalOpen, setIsConnectivityModalOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (newOrgForm.name || newOrgForm.slug) {
        handleCheckAvailability(newOrgForm.name, newOrgForm.slug);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [newOrgForm.name, newOrgForm.slug]);

  const handleCheckAvailability = async (name: string, slug: string) => {
    if (!name && !slug) {
      setIsNameTaken(false);
      setIsSlugTaken(false);
      setSlugSuggestions([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (slug) params.set('slug', slug);
      const res = await fetcher(`/api/platform/orgs/check-availability?${params.toString()}`);
      
      // Name check
      if (name) {
        setIsNameTaken(!res.name_available);
      }
      
      // Slug check
      if (slug) {
        if (!res.slug_available) {
          setIsSlugTaken(true);
          setSlugSuggestions(res.suggestions || []);
        } else {
          setIsSlugTaken(false);
          setSlugSuggestions([]);
        }
      }
    } catch (e) {
      console.error("Check availability error", e);
    }
  };

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetcher("/api/platform/orgs");
      if (res.orgs) setTenants(res.orgs);
    } catch (err) {
      console.error("Failed to load orgs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    setErrorMsg("");
    try {
      await fetcher("/api/platform/orgs", {
        method: "POST",
        body: JSON.stringify(newOrgForm)
      });
      setIsProvisionModalOpen(false);
      setNewOrgForm({ name: "", slug: "", plan: "core", admin_email: "", admin_password: "" });
      loadTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create organization");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedOrg) return;
    setIsTogglingStatus(true);
    try {
      const action = selectedOrg.status === 'active' ? 'suspend' : 'activate';
      await fetcher(`/api/platform/orgs/${selectedOrg.id}/${action}`, { method: 'POST' });
      
      setSelectedOrg({ ...selectedOrg, status: selectedOrg.status === 'active' ? 'suspended' : 'active' });
      loadTenants();
    } catch (err: any) {
      alert(err.message || "Failed to change organization status");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    for (let i = 0, n = chars.length; i < 16; ++i) {
      password += chars.charAt(Math.floor(Math.random() * n));
    }
    setNewOrgForm({ ...newOrgForm, admin_password: password });
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organization Management</h1>
        <p className="text-slate-500">Multi-tenant foundation layer. Manage institutional boundaries, plans, and hard quotas.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tenant by ID or Name..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            />
          </div>
          <button 
            onClick={() => setIsProvisionModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm transition-colors active:scale-95"
          >
            + Provision New Tenant
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-20 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-20 text-center text-slate-500">
              No organizations found.
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Tenant ID</th>
                  <th className="px-6 py-3 font-semibold">Organization Name</th>
                  <th className="px-6 py-3 font-semibold">Allocated Plan</th>
                  <th className="px-6 py-3 font-semibold">Environment</th>
                  <th className="px-6 py-3 font-semibold text-right">Users</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tenants.map((t, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrg(t)}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{t.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                          t.plan?.toLowerCase() === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                          t.plan?.toLowerCase() === 'pro' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {String(t.mrr_details?.planLabel || t.plan || 'core').toUpperCase()}
                        </span>
                        {t.mrr_details && (
                          <span className="text-[10px] text-slate-500 font-mono font-semibold px-1">
                            ${t.mrr_details.totalMRR.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">Production (ap-southeast-1)</td>
                    <td className="px-6 py-4 text-right font-mono font-medium">{t.user_count || 0}</td>
                    <td className="px-6 py-4 text-center">
                      {t.status === 'active' 
                        ? <ShieldCheck className="h-5 w-5 text-emerald-500 inline-block" /> 
                        : <Ban className="h-5 w-5 text-red-500 inline-block" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Provision New Tenant Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Provision New Tenant</h2>
              <button onClick={() => setIsProvisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
                  <input 
                    required type="text"
                    className={`w-full px-3 py-2 border ${isNameTaken ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none`}
                    value={newOrgForm.name}
                    onChange={e => {
                      setNewOrgForm({ ...newOrgForm, name: e.target.value, slug: generateSlug(e.target.value) });
                    }}
                    placeholder="e.g. Acme Corporation"
                  />
                  {isNameTaken && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠ Organization name already exists. Please choose a unique name.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tenant Slug</label>
                    <input 
                      required type="text"
                      className={`w-full px-3 py-2 border ${isSlugTaken ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50`}
                      value={newOrgForm.slug}
                      onChange={e => setNewOrgForm({...newOrgForm, slug: e.target.value})}
                    />
                    {isSlugTaken && (
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        Slug taken. Suggestions:
                        <div className="flex flex-wrap gap-2 mt-1">
                          {slugSuggestions.map((s, idx) => (
                            <button
                              key={idx} type="button"
                              onClick={() => setNewOrgForm({ ...newOrgForm, slug: s })}
                              className="px-2 py-1 bg-red-50 border border-red-200 rounded text-red-700 hover:bg-red-100 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Allocated Plan</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newOrgForm.plan}
                      onChange={e => setNewOrgForm({...newOrgForm, plan: e.target.value})}
                    >
                      <option value="core">Core ($0)</option>
                      <option value="pro">Pro ($299)</option>
                      <option value="enterprise">Enterprise ($5,000+)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 my-2 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Company Admin Access</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Email</label>
                      <input 
                        required type="email"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newOrgForm.admin_email}
                        onChange={e => setNewOrgForm({...newOrgForm, admin_email: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                        <div className="flex gap-2">
                          <input 
                            readOnly
                            required type="text"
                            placeholder="Click Generate to create secure password"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 outline-none font-mono text-sm"
                            value={newOrgForm.admin_password}
                          />
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm"
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isProvisioning}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProvisioning && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isProvisioning ? "Provisioning..." : "Deploy Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Org Details Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">
                  {selectedOrg.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedOrg.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedOrg.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm border border-slate-200 rounded-md p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {selectedOrg.status === 'active' 
                        ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> 
                        : <Ban className="h-5 w-5 text-red-500" />
                    }
                    <span className="font-semibold text-slate-900 capitalize">{selectedOrg.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subscription Plan</p>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase ${
                        selectedOrg.plan?.toLowerCase() === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                        selectedOrg.plan?.toLowerCase() === 'pro' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedOrg.plan || 'core'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tenant Slug</p>
                  <p className="text-slate-900 font-mono text-sm">{selectedOrg.slug}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Users</p>
                  <p className="text-slate-900 font-medium">{selectedOrg.user_count || 0} active identites</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Created Date</p>
                  <p className="text-slate-900 font-medium">
                    {selectedOrg.created_at ? new Date(selectedOrg.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Environment Bounds</p>
                  <p className="text-slate-900 font-medium">Production L4 (ap-southeast-1)</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsConnectivityModalOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-transparent"
                >
                  Manage Connectivity
                </button>
                <button 
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                    selectedOrg.status === 'active'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                  } disabled:opacity-50`}
                >
                  {isTogglingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedOrg.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connectivity Management Modal */}
      {isConnectivityModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-950 text-white">
              <div>
                <h2 className="text-lg font-bold">Network & Connectivity</h2>
                <p className="text-xs text-slate-400 font-mono">Tenant: {selectedOrg.slug}</p>
              </div>
              <button onClick={() => setIsConnectivityModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Public API Gateway</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-slate-100 text-slate-500 text-sm border-r border-slate-200 font-mono">GET</span>
                  <input readOnly value={`https://api.tonytran.work/v1/tenant/${selectedOrg.id}`} className="w-full px-3 py-2 text-sm text-slate-700 font-mono bg-transparent outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Webhooks Endpoint (Event Sink)</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-slate-100 text-slate-500 text-sm border-r border-slate-200 font-mono">POST</span>
                  <input readOnly value={`https://api.tonytran.work/webhooks/${selectedOrg.slug}/ingress`} className="w-full px-3 py-2 text-sm text-slate-700 font-mono bg-transparent outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">Rate Limits</h4>
                  <p className="text-xs text-slate-500">
                    {selectedOrg.plan?.toLowerCase() === 'enterprise' ? '25,000 req/sec' : '1,000 req/sec'} max
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">Data Residency</h4>
                  <p className="text-xs text-slate-500">ap-southeast-1 (Primary)</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
                <p className="text-xs text-blue-800 font-medium">
                  <strong>Notice:</strong> To generate API bearer tokens or rotating IP Allow-lists, Organization Administrators must authenticate into their own Tenant Dashboard ({`> Workspace Settings > Developers`}).
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button 
                onClick={() => setIsConnectivityModalOpen(false)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Close Connection Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
