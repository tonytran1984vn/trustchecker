"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { ShieldAlert, GitBranch, ArrowRightLeft, Power, Loader2, AlertTriangle } from "lucide-react";

export default function GovernancePage() {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetcher("/api/crisis/agentic-config");
        setConfig(res);
      } catch (err) {
        console.error("Failed to load agentic config:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleKillSwitch = (active: boolean) => {
    setPendingAction(active);
    setShowConfirm(true);
  };

  const executeKillSwitch = async () => {
    setShowConfirm(false);
    setIsToggling(true);
    try {
      const res = await fetcher("/api/crisis/agentic-config/toggle-kill-switch", {
        method: "POST",
        body: JSON.stringify({ active: pendingAction })
      });
      if (res.state) setConfig(res.state);
      else if (res.status === 'success') {
        // Reload config
        const fresh = await fetcher("/api/crisis/agentic-config");
        setConfig(fresh);
      }
    } catch (err: any) {
      console.error("Kill switch toggle failed:", err);
      alert(err.error || "Failed to toggle kill switch.");
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isKillSwitchActive = config?.killSwitchActive;
  const canaryPct = config?.canaryRatePct ?? 10;
  const stablePct = 100 - canaryPct;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto relative">
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Confirm Kill Switch</h3>
                <p className="text-sm text-slate-500">This action affects the entire platform.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
              Are you sure you want to <strong>{pendingAction ? 'ENGAGE' : 'DISENGAGE'}</strong> the Master Kill Switch?
              {pendingAction 
                ? ' All mutation traffic will be halted, and the system will drop to Read-Only mode.'
                : ' The system will resume normal operations and accept write traffic.'
              }
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeKillSwitch}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                {pendingAction ? 'ENGAGE LOCKDOWN' : 'DISENGAGE'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Governance & Deployment Safety</h1>
        <p className="text-slate-500 dark:text-slate-400">Agentic Safety Net. Manage Canary parameters, traffic routing, and emergency kill switches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Kill Switch Card */}
        <div className={`border-2 ${isKillSwitchActive ? 'border-red-500 bg-red-100 dark:bg-red-900/40' : 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20'} rounded-xl p-6 relative overflow-hidden transition-all`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-red-900 dark:text-red-400 flex items-center gap-2">
                <Power className="h-6 w-6" /> Master Kill Switch
              </h2>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Instantly halt all mutation traffic and drop to Read-Only mode.</p>
            </div>
            <div className="px-3 py-1 bg-white dark:bg-black rounded border border-red-200 dark:border-red-800 text-xs font-bold font-mono text-red-600">P0-RESTRICTED</div>
          </div>
          
          <div className="flex items-center gap-4 mt-8">
            <button 
              disabled={isToggling}
              onClick={() => handleToggleKillSwitch(!isKillSwitchActive)}
              className={`flex-1 ${isKillSwitchActive ? 'bg-red-800 hover:bg-red-900' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-4 rounded-lg shadow-lg shadow-red-600/20 transition-all active:scale-95 flex justify-center items-center gap-2 text-lg disabled:opacity-50`}
            >
              <ShieldAlert className="h-5 w-5" /> 
              {isToggling ? 'PROCESSING...' : isKillSwitchActive ? 'DISENGAGE LOCKDOWN' : 'ENGAGE LOCKDOWN'}
            </button>
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900">
              <div className={`w-8 h-8 rounded-full ${isKillSwitchActive ? 'bg-red-600 shadow-lg shadow-red-500/50' : 'bg-emerald-500 shadow-lg shadow-emerald-500/50'} animate-pulse`}></div>
            </div>
          </div>
          <p className="text-xs text-center text-slate-500 mt-4 font-semibold uppercase">
            Current State: {isKillSwitchActive ? <span className="text-red-600 font-bold">EMERGENCY HALT (READ-ONLY)</span> : 'System is fully operational and accepting traffic.'}
          </p>
        </div>

        {/* Canary Config Card */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <GitBranch className="h-5 w-5 text-blue-500" /> Canary Traffic Routing
          </h2>
          <p className="text-sm text-slate-500 mb-6">Gradual exposure of vNext architecture based on organizational rings.</p>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                <span>Production (Stable)</span>
                <span>Canary (vNext)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 flex-1 flex rounded overflow-hidden">
                  <div className="bg-slate-700 dark:bg-slate-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500" style={{ width: `${stablePct}%` }}>{stablePct}%</div>
                  <div className="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500" style={{ width: `${canaryPct}%` }}>{canaryPct}%</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Adjust Canary Routing Margin</h3>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={canaryPct}
                  disabled={isToggling}
                  onChange={(e) => {
                    const newPct = parseInt(e.target.value);
                    setConfig({ ...config, canaryRatePct: newPct });
                  }}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-12 text-right">{canaryPct}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Any change dictates instant traffic reallocation upon confirmation.</p>
            </div>
            
            <button 
              onClick={async () => {
                setIsToggling(true);
                try {
                  await fetcher("/api/crisis/agentic-config/update-canary", {
                    method: "POST",
                    body: JSON.stringify({ pct: canaryPct })
                  });
                  alert("Canary routing successfully re-allocated!");
                } catch (err: any) {
                  alert(err.error || "Failed to update canary %");
                } finally {
                  setIsToggling(false);
                }
              }}
              disabled={isToggling}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowRightLeft className="h-4 w-4" /> Apply Routing Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
