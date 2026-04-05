import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ShieldCheck, UserCheck, AlertOctagon } from "lucide-react";

interface ApprovalItem {
  id?: string;
  type?: string;
  requested_by?: string;
  timestamp?: string;
  [key: string]: any;
}

interface ApprovalsData {
  approvals: ApprovalItem[];
  pending_count: number;
}

export default function ApprovalsHub({ data }: { data: ApprovalsData }) {
    const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const approvals = data?.approvals || [];
  const pendingCount = data?.pending_count || approvals.length || 0;
  const hasApprovals = pendingCount > 0;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">{toast}</div>}

      
      {/* Header Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-sm flex flex-col justify-center p-5 bg-indigo-600 text-white md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
             <ShieldCheck className="w-24 h-24" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-indigo-300 mb-2 relative z-10">Dual-Auth Gateway</h3>
          <div className="text-3xl font-black text-white relative z-10">Running</div>
          <p className="text-xs text-indigo-200 mt-2 relative z-10 max-w-[80%]">All systemic configuration changes require multi-signature execution in accordance with the sovereign institutional charter.</p>
        </Card>

        <Card className={`border-border shadow-sm flex flex-col justify-center items-center p-6 ${hasApprovals ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${hasApprovals ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-200 text-slate-500'}`}>
             <AlertOctagon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Pending Approvals</h3>
          <div className={`text-3xl font-black ${hasApprovals ? 'text-amber-600' : 'text-slate-900'}`}>{pendingCount}</div>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center items-center p-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
             <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">24H Cleared</h3>
          <div className="text-3xl font-black text-slate-900">12</div>
        </Card>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 min-h-[400px] flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Authorization Queue</h3>
              <p className="text-sm text-slate-500">Review infrastructure deployments, budget realignments, and access elevations.</p>
            </div>
            {hasApprovals && (
              <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
                 <CheckCircle2 className="w-4 h-4" />
                 Sign & Execute All
              </button>
            )}
        </div>

        <div className="flex-1">
           {!hasApprovals ? (
              <div className="p-16 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                 <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center mb-6 shadow-inner">
                    <ShieldCheck className="w-10 h-10 text-emerald-500" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Queue is empty</h3>
                 <p className="text-slate-500 text-sm max-w-sm mb-6">No operations are currently pending your executive authorization.</p>
                 <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-sm font-medium text-slate-400 border hover:bg-slate-50 hover:text-slate-600 border-slate-200 px-6 py-2 rounded-full transition-colors">
                   View Historical Approvals
                 </button>
              </div>
           ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                 {approvals.map((approval, i) => (
                    <div key={approval.id || i} className="p-6 flex flex-col md:flex-row md:items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-200">
                       
                       <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                             <Clock className="w-6 h-6" />
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{approval.type || "Infrastructure Alteration"}</h4>
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Awaiting Signature</span>
                             </div>
                             <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>Requested by: <span className="font-medium">{approval.requestedBy || approval.requested_by || "System Automated"}</span></span>
                                <span>Risk Assessment: <span className="text-amber-600 font-medium">{approval.risk || "Medium"}</span></span>
                             </div>
                             <p className="text-xs text-slate-400 mt-2">{approval.timestamp || "2 hours ago"} • Ticket #{approval.id || "REQ-40921"}</p>
                          </div>
                       </div>
                       
                       <div className="flex flex-row md:flex-col gap-2 justify-end pl-16 md:pl-0">
                          <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-6 py-2 rounded-md font-medium transition-colors md:w-full">
                             Approve
                          </button>
                          <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 text-sm px-6 py-2 rounded-md font-medium transition-colors md:w-full">
                             Reject
                          </button>
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
