"use client";

import { Rocket, Server, Users, GitMerge, AlertCircle } from "lucide-react";
import { useState } from "react";


export default function RolloutsPage() {
  const [deployments] = useState([
    { id: "rl-2026-v2-alpha", feature: "Advanced Institutional Ledger", status: "Canary", percent: 15, stability: 99.98 },
    { id: "rl-2026-core", feature: "V9.4 Risk Analytics", status: "Rolling", percent: 45, stability: 99.4 },
    { id: "rl-latency-opt", feature: "Radar Bottleneck Removal", status: "Global", percent: 100, stability: 100 }
  ]);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleUpdate = (id: string, newTarget: number) => {
    setSaving(true);
    setStatusMsg(`Applying new rollout constraints for ${id}...`);
    setTimeout(() => {
      setSaving(false);
      setStatusMsg("Canary weights updated across control plane.");
      setTimeout(() => setStatusMsg(""), 3000);
    }, 1200);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Rocket className="w-8 h-8 text-blue-600 dark:text-blue-500" />
          Deployment Rollouts
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage incremental canary deployments and fractional algorithmic traffic routing across the production cluster.
        </p>
      </div>

      {statusMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm font-semibold">
          {statusMsg}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6">
        {deployments.map((dep, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 w-full">
             <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${dep.percent === 100 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                   <GitMerge className="w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900 dark:text-white">{dep.feature}</h3>
                   <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-500">
                     <span>ID: {dep.id}</span>
                     <span>•</span>
                     <span className={dep.percent === 100 ? 'text-emerald-500' : 'text-blue-500'}>Status: {dep.status}</span>
                   </div>
                 </div>
               </div>
               
               <div className="text-right">
                 <div className="text-2xl font-bold text-slate-900 dark:text-white">{dep.stability}%</div>
                 <div className="text-xs text-slate-500 font-medium">Observed Stability</div>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span className="text-slate-600 dark:text-slate-300">Traffic Distribution Filter</span>
                    <span className="text-blue-600 font-bold">{dep.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full ${dep.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all`} style={{ width: `${dep.percent}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>0% (Halted)</span>
                    <span>100% (GA)</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                   {dep.percent < 100 && (
                     <>
                        <button 
                          onClick={() => handleUpdate(dep.id, dep.percent + 10)}
                          disabled={saving}
                          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          +10% Pulse
                        </button>
                        <button 
                          onClick={() => handleUpdate(dep.id, 100)}
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded shadow-sm transition-colors disabled:opacity-50"
                        >
                          Promote GA
                        </button>
                     </>
                   )}
                   {dep.percent === 100 && (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold bg-emerald-50 max-w-fit px-4 py-2 rounded-full">
                        <AlertCircle className="w-4 h-4" /> Global Enforced
                      </div>
                   )}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
