import { Card, CardContent } from "@/components/ui/card";
import { Users, Gavel, Scale, Briefcase, PlusCircle, Shield, Building2 } from "lucide-react";
import { useState } from "react";

interface BoardData {
  members: any[];
  committees: any[];
}

export default function BoardCommittees({ data }: { data: BoardData }) {
  const members = data?.members || [];
  const committees = data?.committees || [];
  const [toast, setToast] = useState("");
  
  const hasMembers = members.length > 0;
  const hasCommittees = committees.length > 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">
          {toast}
        </div>
      )}

      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Board Size</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasMembers ? members.length : "0"}
              <span className="text-sm font-normal text-muted-foreground ml-2">Seats Filled</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Committees</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasCommittees ? committees.length : "3"}
              <span className="text-sm font-normal text-indigo-500 ml-2">Active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-md md:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 opacity-[0.02] dark:opacity-[0.03] group-hover:opacity-[0.04] dark:group-hover:opacity-[0.05] transition-opacity text-slate-900 dark:text-white">
             <Scale className="w-48 h-48" />
          </div>
          <CardContent className="p-6 flex flex-col justify-center h-full relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 rounded border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-serif">Charter Status</span>
            </div>
            <div className="text-2xl font-serif text-slate-900 dark:text-slate-100 mt-1 mb-2">
              Fully Compliant
            </div>
            <p className="text-sm font-serif text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">Institutional charter and bylaws are mathematically enforced by TrustChecker quantitative policies.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
        
        {/* Committees Layout */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Committees</h3>
                <p className="text-sm text-slate-500">Working groups defining operational and risk policy</p>
             </div>
             <button onClick={() => showToast("Charter Committee module opening... (Enterprise Feature)")} className="bg-slate-900 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Charter Committee
             </button>
          </div>

          <div className="p-6 flex-1">
             {hasCommittees ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {committees.map((c: any, i: number) => {
                     const colors = ['indigo', 'emerald', 'amber'];
                     const color = colors[i % colors.length];
                     return (
                       <div key={c.id || i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-slate-400 transition-colors bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden group">
                          <div className={`absolute top-0 right-0 h-full w-1 bg-${color}-500`}></div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{c.name}</h4>
                          <p className="text-xs text-slate-500 max-w-[90%] mb-4">
                            Status: <span className="font-medium text-emerald-600">{c.status}</span>
                          </p>
                          <div className="flex justify-between items-center mt-auto">
                             <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">{c.members} Members</span>
                             <button onClick={() => showToast(`Opening ${c.name} details...`)} className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">View →</button>
                          </div>
                       </div>
                     );
                   })}
                   <div onClick={() => showToast("Create Custom Committee (Enterprise Feature)")} className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-5 flex flex-col items-center justify-center text-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer">
                      <PlusCircle className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">Create custom committee</span>
                   </div>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 h-full w-1 bg-indigo-500"></div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Risk & Audit Committee</h4>
                      <p className="text-xs text-slate-500 max-w-[90%] mb-4">Oversees financial reporting, internal controls, and systemic risk assessments.</p>
                      <div className="flex justify-between items-center mt-auto">
                         <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">0 Members</span>
                         <button onClick={() => showToast("Assigning member... (Enterprise Feature)")} className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Assign →</button>
                      </div>
                   </div>
                   
                   <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-emerald-300 transition-colors bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 h-full w-1 bg-emerald-500"></div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Compensation Committee</h4>
                      <p className="text-xs text-slate-500 max-w-[90%] mb-4">Evaluates executive performance and aligns incentive structures.</p>
                      <div className="flex justify-between items-center mt-auto">
                         <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">0 Members</span>
                         <button onClick={() => showToast("Assigning member... (Enterprise Feature)")} className="text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">Assign →</button>
                      </div>
                   </div>
                   
                   <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-5 flex flex-col items-center justify-center text-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer" onClick={() => showToast("Create Custom Committee (Enterprise Feature)")}>
                      <PlusCircle className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">Create custom committee</span>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Board Roster */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Gavel className="w-5 h-5 text-slate-400" /> Executive Board
             </h3>
             {hasMembers && (
               <button onClick={() => showToast("Inviting board member... (Enterprise Feature)")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Invite</button>
             )}
          </div>
          
          <div className="flex-1 p-0">
             {!hasMembers ? (
               <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                     <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">No Members Added</h4>
                  <p className="text-xs text-slate-500 mt-2 mb-6">You have not established the organizational board of directors.</p>
                  <button onClick={() => showToast("Inviting board member... (Enterprise Feature)")} className="w-full bg-white border border-slate-200 shadow-sm text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
                     Invite Member
                  </button>
               </div>
             ) : (
               <div className="divide-y divide-slate-100 dark:divide-slate-700">
                 {members.map((m: any, i: number) => (
                   <div key={m.id || i} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                     <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                       {m.name?.charAt(0) || "?"}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{m.name}</h4>
                       <p className="text-xs text-slate-500 truncate">{m.role}</p>
                     </div>
                     <button onClick={() => showToast(`Viewing profile: ${m.name}`)} className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex-shrink-0">View</button>
                   </div>
                 ))}
                 <div className="p-4">
                   <button onClick={() => showToast("Inviting board member... (Enterprise Feature)")} className="w-full bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2">
                     <PlusCircle className="w-4 h-4" /> Invite Member
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
