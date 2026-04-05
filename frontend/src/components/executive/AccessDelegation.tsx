import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Key, ShieldAlert, Fingerprint, Lock, ChevronDown, CheckCircle2 } from "lucide-react";

interface AccessData {
  roles: any[];
  delegation_matrix: any;
}

export default function AccessDelegation({ data }: { data: AccessData }) {
    const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const roles = data?.roles || [];
  const hasRoles = roles.length > 0;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">{toast}</div>}

      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-md flex flex-col justify-center p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="absolute -right-4 -bottom-8 opacity-[0.03] dark:opacity-10 group-hover:opacity-[0.06] dark:group-hover:opacity-20 transition-opacity duration-500 text-emerald-900 dark:text-emerald-500">
             <Fingerprint className="w-40 h-40" />
          </div>
          <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] font-serif text-slate-500 dark:text-slate-400 mb-4 relative z-10">MFA Enforced</h3>
          <div className="text-5xl font-serif text-slate-900 dark:text-white tracking-tight relative z-10">98.2<span className="text-2xl font-serif text-emerald-600 dark:text-emerald-400 ml-1">%</span></div>
          <p className="text-xs font-serif text-emerald-600 dark:text-emerald-400 mt-4 relative z-10 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5"/> Institutional compliance target met</p>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center p-6 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delegations</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">14</div>
          <p className="text-xs text-slate-500 mt-2">Active role delegations</p>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center p-6 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Violations</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-2">0</div>
          <p className="text-xs text-emerald-500 mt-2">Zero anomalous access events</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
        
        {/* Delegation Matrix */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delegation Matrix</h3>
                <p className="text-sm text-slate-500">Configure institutional role assignments</p>
             </div>
             <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Add Role
             </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
             {!hasRoles ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
                   <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
                      <Lock className="w-8 h-8 text-slate-400" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Standard Configuration</h3>
                   <p className="text-slate-500 text-sm max-w-sm mb-6">Using the default Sovereign OS access constraints. Add custom roles to structure your own organizational hierarchy.</p>
                   
                   {/* Fake Matrix representation */}
                   <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-left">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Executive Defaults</span>
                         <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">Active</span>
                      </div>
                      <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                           <span>Company Administrator</span>
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                         </div>
                         <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                           <span>Financial Auditor</span>
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                         </div>
                         <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                           <span>Risk Officer</span>
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                         </div>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="p-8 text-center text-slate-500">
                   {/* Dynamic roles mapping would go here */}
                   Roles populated
                </div>
             )}
          </div>
        </div>

        {/* Security Policies */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Policies</h3>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             <div className="p-5 flex items-start gap-4">
                <div className="flex items-center mt-1">
                   <div className="w-10 h-5 bg-emerald-500 rounded-full relative shadow-inner">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                   </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Strict Session Timeout</h4>
                  <p className="text-xs text-slate-500 mt-1">Idle sessions expire after 15 minutes of inactivity for all administrative roles.</p>
                </div>
             </div>

             <div className="p-5 flex items-start gap-4">
                <div className="flex items-center mt-1">
                   <div className="w-10 h-5 bg-emerald-500 rounded-full relative shadow-inner">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                   </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">IP Whitelisting</h4>
                  <p className="text-xs text-slate-500 mt-1">Executive roles restricted to pre-approved corporate IP addresses.</p>
                </div>
             </div>

             <div className="p-5 flex items-start gap-4">
                <div className="flex items-center mt-1">
                   <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 rounded-full relative shadow-inner">
                      <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                   </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Device Fingerprinting</h4>
                  <p className="text-xs text-slate-500 mt-1">Require cryptographic proof of device identity for core banking access.</p>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
