import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Zap, CheckCircle2, AlertTriangle, ArrowRight, Flag } from "lucide-react";

interface ActionItem {
  id?: string;
  title?: string;
  priority?: string;
  status?: string;
  [key: string]: any;
}

interface ActionsData {
  actions: ActionItem[];
  message: string;
}

export default function StrategicActions({ data }: { data: ActionsData }) {
    const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const actions = data?.actions || [];
  const hasActions = actions.length > 0;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">{toast}</div>}

      
      {/* Header Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-md flex flex-col justify-center items-center p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative">
          <div className="w-10 h-10 rounded border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 flex items-center justify-center mb-4">
             <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] font-serif text-slate-500 dark:text-slate-400 mb-2">Pending Priority</h3>
          <div className="text-4xl font-serif text-slate-900 dark:text-slate-100 tracking-tight">{actions.filter(a => a.priority === 'High').length} <span className="text-2xl text-slate-400 dark:text-slate-600 font-normal ml-1">/ {actions.length}</span></div>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center text-center p-6 bg-slate-50 dark:bg-slate-800">
          <div className="text-slate-500 dark:text-slate-400 mb-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Execution Rate</h3>
          <div className="text-3xl font-black text-emerald-600 mt-1">94%</div>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center p-6">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Flag className="w-4 h-4" />
             </div>
             <span className="text-xs font-semibold text-slate-500 uppercase">Automated Protocols</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">Active</div>
          <p className="text-xs text-slate-500 mt-1">4 policies currently enforcing thresholds</p>
        </Card>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Required Strategic Actions</h3>
              <p className="text-sm text-slate-500">{data?.message || "Review top priority mitigations recommended by the engine."}</p>
            </div>
            {hasActions && (
              <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
                 Approve All
              </button>
            )}
        </div>

        <div className="p-0">
           {!hasActions ? (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                 <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Clear Horizon</h3>
                 <p className="text-slate-500 text-sm max-w-sm">No immediate strategic actions are required. The automated governance parameters are handling current system volatility.</p>
              </div>
           ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                 {actions.map((action, i) => (
                    <div key={action.id || i} className="p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                       <div className="mt-1 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center">
                          <Zap className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                       </div>
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-semibold text-slate-900 dark:text-slate-100">{action.title || "Unknown Action Directive"}</h4>
                             {action.priority === 'High' && <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded uppercase">High Priority</span>}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 block max-w-2xl">{action.description || "System recommends immediate realignment of resources to mitigate identified drift."}</p>
                          <div className="flex items-center gap-3">
                             <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-medium transition">
                                Execute
                             </button>
                             <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-2">
                                Dismiss
                             </button>
                          </div>
                       </div>
                       <div className="text-right flex-shrink-0 flex items-center justify-end h-full">
                          <ArrowRight className="w-5 h-5 text-slate-300 cursor-pointer hover:text-slate-500" />
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>

    </div>
  )
}
