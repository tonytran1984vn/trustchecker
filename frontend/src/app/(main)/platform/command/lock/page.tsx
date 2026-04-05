"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { Lock, ShieldCheck, Loader2, AlertTriangle, X, CheckCircle } from "lucide-react";

export default function IntegrationLockingPage() {
  const [architecture, setArchitecture] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<any>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetcher("/api/integration/architecture").catch(() => null);
        setArchitecture(data);
      } catch (err) {
        console.error("Failed to load integration architecture:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const openPanel = async (panelId: string, endpoint: string) => {
    if (activePanel === panelId) {
      setActivePanel(null);
      setPanelData(null);
      return;
    }
    setActivePanel(panelId);
    setPanelLoading(true);
    setPanelData(null);
    try {
      const data = await fetcher(endpoint);
      setPanelData(data);
    } catch (err: any) {
      setPanelData({ error: err.message });
    } finally {
      setPanelLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-12 flex justify-center items-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const renderArchitectureReport = (data: any) => {
    if (!data) return null;
    return (
      <div className="p-6 space-y-4">
        {data.title && (
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg p-4">
            <h3 className="font-bold text-indigo-800 dark:text-indigo-300">{data.title}</h3>
            {data.version && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">v{data.version}</span>}
            {data.purpose && <p className="text-indigo-700 dark:text-indigo-400 text-sm mt-1">{data.purpose}</p>}
          </div>
        )}

        {/* Capital Triggers Section */}
        {data.capital_triggers && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 px-4 py-3">
              <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">{data.capital_triggers.title || "Capital Triggers"}</h4>
              {data.capital_triggers.principle && <p className="text-red-700 dark:text-red-400 text-xs mt-0.5">{data.capital_triggers.principle}</p>}
            </div>
            {data.capital_triggers.bindings && Array.isArray(data.capital_triggers.bindings) && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.capital_triggers.bindings.map((b: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{b.id}</span>
                        <span className="ml-2 font-semibold text-sm text-slate-900 dark:text-white">{b.metric}</span>
                      </div>
                      <span className="text-xs text-slate-500">{b.source_engine}</span>
                    </div>
                    {b.thresholds && Array.isArray(b.thresholds) && (
                      <div className="mt-2 space-y-1">
                        {b.thresholds.map((t: any, j: number) => (
                          <div key={j} className="flex items-center gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              t.trigger === "KILL_SWITCH" ? "bg-red-100 text-red-700" :
                              t.trigger === "LOCKDOWN" ? "bg-orange-100 text-orange-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>{t.trigger}</span>
                            <span className="text-slate-600 dark:text-slate-400">{t.condition}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Revenue Stabilizer Section */}
        {data.revenue_stabilizer && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30 px-4 py-3">
              <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">{data.revenue_stabilizer.title || "Revenue Stabilizer"}</h4>
              {data.revenue_stabilizer.principle && <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">{data.revenue_stabilizer.principle}</p>}
            </div>
            {data.revenue_stabilizer.rules && Array.isArray(data.revenue_stabilizer.rules) && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.revenue_stabilizer.rules.map((r: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{r.id}</span>
                      <span className="ml-2 text-sm text-slate-900 dark:text-white">{r.condition || r.rule}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{r.action || r.response}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coherence Map Section */}
        {data.coherence_map && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-orange-50/50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30 px-4 py-3">
              <h4 className="font-bold text-orange-800 dark:text-orange-400 text-sm">{data.coherence_map.title || "Coherence Map"}</h4>
              {data.coherence_map.principle && <p className="text-orange-700 dark:text-orange-400 text-xs mt-0.5">{data.coherence_map.principle}</p>}
            </div>
            {data.coherence_map.bindings && Array.isArray(data.coherence_map.bindings) && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.coherence_map.bindings.map((b: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{b.from} → {b.to}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{b.mechanism || b.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPanelContent = () => {
    if (panelLoading) {
      return <div className="p-8 flex justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }
    if (!panelData) return null;
    if (panelData.error) {
      return <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-sm rounded-lg">{panelData.error}</div>;
    }

    // Render structured data
    if (panelData.title || panelData.bindings || panelData.rules || panelData.principle) {
      return (
        <div className="space-y-3">
          {panelData.title && <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3"><p className="text-blue-800 dark:text-blue-300 text-sm font-semibold">{panelData.title}</p></div>}
          {panelData.principle && <p className="text-slate-600 dark:text-slate-400 text-sm">{panelData.principle}</p>}
          {panelData.bindings && Array.isArray(panelData.bindings) && (
            <div className="space-y-2">
              {panelData.bindings.map((b: any, i: number) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{b.metric || b.from || b.id}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{b.source_engine || b.mechanism || b.type || ""}</div>
                </div>
              ))}
            </div>
          )}
          {panelData.rules && Array.isArray(panelData.rules) && (
            <div className="space-y-2">
              {panelData.rules.map((r: any, i: number) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3 flex justify-between">
                  <span className="text-sm text-slate-900 dark:text-white">{r.condition || r.rule || r.id}</span>
                  <span className="text-xs font-bold text-emerald-600">{r.action || r.response}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Fallback: render key-value pairs
    return (
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(panelData).map(([key, val]) => (
          <div key={key} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">{key.replace(/_/g, " ")}</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
              {typeof val === "object" ? JSON.stringify(val) : String(val)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Integration Locking Layer</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Capital triggers, revenue stabilizers, and charter amendment protocols for cross-engine coherence enforcement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-fit mb-3">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Capital Triggers</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review and manage automatic capital lockdown trigger conditions.</p>
          <button
            onClick={() => openPanel("triggers", "/api/integration/capital-triggers")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "triggers" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "triggers" ? "Close Panel" : "View Capital Triggers"}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Revenue Stabilizer</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Automatic revenue floor enforcement during integration stress.</p>
          <button
            onClick={() => openPanel("stabilizer", "/api/integration/revenue-stabilizer")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "stabilizer" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "stabilizer" ? "Close Panel" : "View Stabilizer"}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 w-fit mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Coherence Map</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cross-engine state synchronization and integrity verification map.</p>
          <button
            onClick={() => openPanel("coherence", "/api/integration/coherence-map")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "coherence" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "coherence" ? "Close Panel" : "View Coherence Map"}
          </button>
        </div>
      </div>

      {/* Inline Panel */}
      {activePanel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {activePanel === "triggers" ? "Capital Trigger Conditions" :
               activePanel === "stabilizer" ? "Revenue Stabilization Rules" :
               "Cross-Engine Coherence Verification"}
            </h3>
            <button onClick={() => { setActivePanel(null); setPanelData(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">{renderPanelContent()}</div>
        </div>
      )}

      {/* Architecture Report */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Integration Architecture</h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          {!architecture ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              Integration architecture data not available. Ensure backend API is running.
            </div>
          ) : renderArchitectureReport(architecture)}
        </div>
      </div>
    </div>
  );
}
