"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { ToggleRight, ToggleLeft, SlidersHorizontal, Loader2, X, Info } from "lucide-react";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [configuringFlag, setConfiguringFlag] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetcher("/api/platform/feature-flags");
        if (res.flagList) setFlags(res.flagList);
      } catch (err) {
        console.error("Failed to load feature flags:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleToggle = async (key: string, currentValue: boolean) => {
    try {
      await fetcher("/api/platform/feature-flags", {
        method: "PUT",
        body: JSON.stringify({ key, value: !currentValue }),
      });
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !currentValue } : f)));
    } catch (err) {
      console.error("Failed to toggle flag:", err);
      alert("Failed to toggle feature flag.");
    }
  };

  const totalFlags = flags.length;
  const activeRollouts = flags.filter(f => f.enabled).length;
  const staleFlags = 0; // Placeholder

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Feature Flag Governance</h1>
        <p className="text-slate-500 dark:text-slate-400">The Linchpin System. Control granular exposure and progressively roll out algorithmic engines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Flags</p>
          <p className="text-2xl font-bold">{isLoading ? "-" : totalFlags}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">Active Rollouts</p>
          <p className="text-2xl font-bold">{isLoading ? "-" : activeRollouts}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-1">Stale Flags (&gt;90d)</p>
          <p className="text-2xl font-bold">{isLoading ? "-" : staleFlags}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-6">
        {isLoading ? (
            <div className="p-12 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        ) : flags.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No flags found.
            </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">Feature Key</th>
                <th className="px-6 py-4 font-semibold text-center w-32">Master Toggle</th>
                <th className="px-6 py-4 font-semibold">Rollout Tracker</th>
                <th className="px-6 py-4 font-semibold">Scope</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {flags.map((f, i) => {
                const rollout = f.enabled ? 100 : 0;
                return (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-mono font-bold text-slate-900 dark:text-white text-xs">{f.key}</p>
                    <p className="text-xs text-slate-500 mt-1">{f.description || f.label}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {f.enabled
                      ? <ToggleRight onClick={() => handleToggle(f.key, true)} className="h-8 w-8 text-blue-500 mx-auto cursor-pointer" /> 
                      : <ToggleLeft onClick={() => handleToggle(f.key, false)} className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto cursor-pointer" />
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full max-w-[200px] flex items-center gap-3">
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${rollout}%` }}></div>
                      </div>
                      <span className="text-xs font-bold font-mono w-10 text-right">{rollout}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">Global</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setConfiguringFlag(f)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded transition-colors flex items-center justify-center gap-2 ml-auto active:scale-95"
                    >
                      <Info className="h-3 w-3" /> Inspect
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {configuringFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Inspect Engine</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{configuringFlag.key}</p>
                </div>
              </div>
              <button onClick={() => setConfiguringFlag(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">{configuringFlag.description || configuringFlag.label}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${configuringFlag.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                    <span className={`text-sm font-bold ${configuringFlag.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {configuringFlag.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Scope</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">Global</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest mb-2">Advanced Rollout: {configuringFlag.key}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {(() => {
                    switch (configuringFlag.key) {
                      case 'blockchain':
                        return "When enabled, cryptographic proofs for supply chain events will be generated and anchored on the blockchain (e.g., Ethereum/Polygon) for immutable verification.";
                      case 'carbon':
                        return "When enabled, real-time ESG metrics and institutional carbon footprint calculations will be activated for the organization's Carbon Registry.";
                      case 'evidence':
                        return "When enabled, the decentralized, tamper-proof evidence storage protocol will be utilized for all newly uploaded audit files across the platform.";
                      case 'fraud':
                        return "When enabled, the AI-driven Fraud engine will actively monitor transactions and trigger real-time anomaly alerts for the operations team.";
                      case 'sustainability':
                        return "Activates the Sustainability Core module, unlocking green indices and tracking for eco-certified products.";
                      default:
                        return "Advanced rollout configurations (percentage-based, ring-based, targeted specific institutions) for this feature are currently managed at the constitutional level. Contact your platform archivist to adjust deployment rings.";
                    }
                  })()}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setConfiguringFlag(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
