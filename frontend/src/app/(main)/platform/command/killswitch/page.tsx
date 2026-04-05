"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { Power, ShieldAlert, Cpu, Loader2, AlertOctagon, X, CheckCircle, Clock } from "lucide-react";

export default function KillSwitchPage() {
  const [switches, setSwitches] = useState<any[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threatResult, setThreatResult] = useState<any>(null);
  const [assessing, setAssessing] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [sw, cb] = await Promise.all([
          fetcher("/api/killswitch/switches").catch(() => []),
          fetcher("/api/killswitch/circuit-breakers").catch(() => [])
        ]);
        if (Array.isArray(sw)) setSwitches(sw);
        if (Array.isArray(cb)) setCircuitBreakers(cb);
      } catch (err) {
        console.error("Failed to load Kill Switch architecture:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const assessThreat = async () => {
    setActivePanel("threat");
    setAssessing(true);
    try {
      const res = await fetcher("/api/killswitch/assess-threat", {
        method: "POST",
        body: JSON.stringify({ metrics: { cpu: 85, latency: 1500 } })
      });
      setThreatResult(res);
    } catch (err: any) {
      setThreatResult({ error: err.message || "Assessment failed" });
    } finally {
      setAssessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-12 flex justify-center items-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Kill Switch Interface</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Root-level access to system termination and isolation circuit breakers. These actions sever network interfaces directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Threat Assessor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-fit mb-3">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Automated Threat Assessor</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Evaluate DDoS vectors, data leak potentials, and CPU anomalies.</p>
          <button
            onClick={assessThreat}
            disabled={assessing}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors disabled:opacity-50 border border-transparent ${activePanel === "threat" || assessing ? "bg-[#1A80F8] text-white shadow-sm" : "bg-blue-50 hover:bg-[#1A80F8] text-[#1A80F8] hover:text-white dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {assessing ? "Assessing..." : "Run Threat Assessment"}
          </button>
        </div>

        {/* Active Kill Switches */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 w-fit mb-3">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Active Kill Switches</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {switches.length === 0
              ? "No active kill switches detected."
              : `${switches.length} switches loaded.`}
          </p>
          <button
            onClick={() => setActivePanel(activePanel === "registry" ? null : "registry")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "registry" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "registry" ? "Close Registry" : "View Registry"}
          </button>
        </div>

        {/* Circuit Breakers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 w-fit mb-3">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Hardware Circuit Breakers</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {circuitBreakers.length === 0
              ? "No circuit breakers registered."
              : `${circuitBreakers.length} breakers loaded.`}
          </p>
          <button
            onClick={() => setActivePanel(activePanel === "breakers" ? null : "breakers")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "breakers" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "breakers" ? "Close Breakers" : "View Breakers"}
          </button>
        </div>
      </div>

      {/* Inline Panel: Registry */}
      {activePanel === "registry" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Kill Switch Registry</h3>
            <button onClick={() => setActivePanel(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Registered</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{switches.length}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{switches.filter((s: any) => s.active).length}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Dormant</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{switches.filter((s: any) => !s.active).length}</div>
              </div>
            </div>
            {switches.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-4 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-700 dark:text-emerald-400 text-sm font-semibold">System Clear — No kill switches are currently registered.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {switches.map((sw: any, i: number) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{sw.name || sw.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Target: {sw.target || "GLOBAL"} · Level: {sw.level || "UNKNOWN"}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${sw.active ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {sw.active ? "ARMED" : "DORMANT"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline Panel: Breakers */}
      {activePanel === "breakers" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Circuit Breaker Dashboard</h3>
            <button onClick={() => setActivePanel(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Breakers</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{circuitBreakers.length}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Tripped</div>
                <div className="text-2xl font-bold text-orange-600 mt-1">0</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Healthy</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{circuitBreakers.length}</div>
              </div>
            </div>
            {circuitBreakers.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-4 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-700 dark:text-emerald-400 text-sm font-semibold">All Clear — No circuit breakers currently registered.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {circuitBreakers.map((cb: any, i: number) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3 flex justify-between items-center">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{cb.name || cb.id}</div>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">TRIP @ {cb.limit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threat Assessment Report */}
      {activePanel === "threat" && (
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Threat Assessment Report</h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          {!threatResult ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No assessment has been run. Click &quot;Run Threat Assessment&quot; above to analyze system vectors.
            </div>
          ) : threatResult.error ? (
            <div className="p-6 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-sm">{threatResult.error}</div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Assessment Time</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    <Clock className="w-4 h-4 inline mr-1 text-slate-400" />
                    {threatResult.assessed_at ? new Date(threatResult.assessed_at).toLocaleString() : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Breakers Evaluated</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{threatResult.circuit_breakers_evaluated ?? "—"}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Triggered</div>
                  <div className="text-2xl font-bold mt-1">
                    {threatResult.triggered?.length > 0 ? (
                      <span className="text-red-600">{threatResult.triggered.length}</span>
                    ) : (
                      <span className="text-emerald-600">0</span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Status</div>
                  <div className="mt-1">
                    {threatResult.triggered?.length > 0 ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">THREAT DETECTED</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">SYSTEM CLEAR</span>
                    )}
                  </div>
                </div>
              </div>
              {threatResult.threat_level && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Threat Level</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{threatResult.threat_level}</div>
                </div>
              )}
              {threatResult.recommendations && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
                  <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-2">Recommendations</div>
                  {Array.isArray(threatResult.recommendations) ? (
                    <ul className="space-y-1">
                      {threatResult.recommendations.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-blue-800 dark:text-blue-300">• {r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-blue-800 dark:text-blue-300">{String(threatResult.recommendations)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
