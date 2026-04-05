import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Play, TrendingDown, Layers, FileWarning, PlusCircle, Activity } from "lucide-react";

interface ScenarioData {
  scenarios: any[];
  active_models: number;
}

export default function ScenarioAnalysis({ data }: { data: ScenarioData }) {
    const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const scenarios = data?.scenarios || [];
  const hasScenarios = scenarios.length > 0;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">{toast}</div>}

      
      {/* Simulation Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4 h-full">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Models</p>
              <h3 className="text-xl font-bold text-foreground">{data?.active_models || 4}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4 h-full">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Simulations Run</p>
              <h3 className="text-xl font-bold text-foreground">142</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 md:col-span-2 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="absolute left-0 top-0 w-1 h-full bg-rose-500/80"></div>
          <CardContent className="p-5 flex items-center justify-between h-full">
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-md border border-rose-100 dark:border-slate-700 bg-rose-50 dark:bg-slate-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <FileWarning className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] font-serif mb-1">Highest Risk Factor Identified</p>
                <h3 className="text-[15px] font-serif text-slate-900 dark:text-slate-100">Supply Chain Disruption (Tier 1)</h3>
              </div>
            </div>
            <button className="hidden sm:flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider px-4 py-2 rounded font-semibold transition-all items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5" />
              Mitigate
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[400px] flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generated Scenarios</h3>
                <p className="text-sm text-slate-500">Run impact models on hypothetical or historic market events</p>
             </div>
              <button 
                 onClick={() => showToast("Scenario Simulator module opening... (Enterprise Feature)")}
                 className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                New Scenario
             </button>
          </div>

          {!hasScenarios ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center mb-6">
                  <Play className="w-8 h-8 text-slate-300 dark:text-slate-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No active scenarios</h3>
               <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
                  Create a scenario to simulate market crashes, supply chain bottlenecks, or cyber attacks to view TCAR impact.
               </p>
               <button 
                 onClick={() => showToast("Browse Template Library module opening...")}
                 className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-6 py-2.5 rounded-lg shadow-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  Browse Template Library
               </button>
            </div>
          ) : (
            <div className="p-0 overflow-y-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                       <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Scenario Vector</th>
                       <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Severity</th>
                       <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Projected Impact</th>
                       <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Run Date</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {scenarios.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                         <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.severity === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                               <Activity className="w-4 h-4" />
                            </div>
                            {s.name}
                         </td>
                         <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${s.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200 dark:border-red-900/50' : 'bg-orange-50 text-orange-700 border border-orange-200 dark:border-orange-900/50'}`}>
                               {s.severity}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-red-600 font-bold">-${s.impact}M</td>
                         <td className="px-6 py-4 text-slate-500">{s.created}</td>
                         <td className="px-6 py-4 text-right">
                            <button onClick={() => showToast("Re-running projection...")} className="text-emerald-600 font-medium hover:text-emerald-700">Re-run</button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
