import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Filter, Search, Calendar, CheckSquare } from "lucide-react";
import { useState } from "react";

interface ReportItem {
  id?: string;
  title?: string;
  type?: string;
  date?: string;
  fileSize?: string;
  file_size?: string;
  status?: string;
  [key: string]: any;
}

interface ReportsData {
  reports: ReportItem[];
  last_generated: string;
}

export default function ReportsRepository({ data }: { data: ReportsData }) {
  const reports = data?.reports || [];
  const hasReports = reports.length > 0;
  const [toast, setToast] = useState("");

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

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                 type="text" 
                 placeholder="Search institutional reports..." 
                 className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           
           <div className="flex w-full md:w-auto gap-3">
              <button onClick={() => showToast("Date Range picker opening...")} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                 <Calendar className="w-4 h-4" />
                 Date Range
              </button>
              <button onClick={() => showToast("Filters panel opening...")} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                 <Filter className="w-4 h-4" />
                 Filters
              </button>
              <button onClick={() => showToast("Generating new report... (Enterprise Feature)")} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                 Generate New
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
        
        {/* Sidebar Categories */}
        <div className="lg:col-span-1 space-y-4">
           <Card className="border-border shadow-sm">
             <CardContent className="p-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase text-xs tracking-wider">Report Categories</h4>
                <ul className="space-y-2 text-sm">
                   <li>
                     <a href="#" className="flex justify-between items-center p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg font-medium">
                        All Reports
                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 py-0.5 px-2 rounded-full text-xs">{hasReports ? reports.length : 0}</span>
                     </a>
                   </li>
                   <li>
                     <a href="#" className="flex justify-between items-center p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                        Financial Audits
                        <span className="bg-slate-100 dark:bg-slate-800 py-0.5 px-2 rounded-full text-xs">{reports.filter(r => r.type === 'PDF').length}</span>
                     </a>
                   </li>
                   <li>
                     <a href="#" className="flex justify-between items-center p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                        Risk & Compliance
                        <span className="bg-slate-100 dark:bg-slate-800 py-0.5 px-2 rounded-full text-xs">{reports.filter(r => r.type === 'CSV').length}</span>
                     </a>
                   </li>
                   <li>
                     <a href="#" className="flex justify-between items-center p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                        Executive Summary
                        <span className="bg-slate-100 dark:bg-slate-800 py-0.5 px-2 rounded-full text-xs">0</span>
                     </a>
                   </li>
                </ul>
             </CardContent>
           </Card>

           <Card className="border-border shadow-sm bg-slate-900 text-white">
             <CardContent className="p-5 overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                   <CheckSquare className="w-24 h-24" />
                </div>
                <h4 className="font-bold text-slate-100 mb-2 relative z-10">Automated Delivery</h4>
                <p className="text-xs text-slate-400 mb-4 relative z-10 leading-relaxed">System is configured to generate and distribute the standard Monthly Institutional Report to all board members on the 1st of every month.</p>
                <button onClick={() => showToast("Configure Schedule (Enterprise Feature)")} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 relative z-10">Configure Schedule →</button>
             </CardContent>
           </Card>
        </div>

        {/* Repository List */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-[500px]">
          
          <div className="flex-1">
             {!hasReports ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
                     <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Repository Empty</h3>
                  <p className="text-slate-500 max-w-sm mb-6 text-sm">No historical reports have been generated. Configure an automated schedule or manually generate a compliance audit to populate the repository.</p>
                  <button onClick={() => showToast("Generating first report... (Enterprise Feature)")} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium transition text-sm">
                     Generate First Report
                  </button>
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                       <tr>
                          <th className="px-6 py-4">Document</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Date Generated</th>
                          <th className="px-6 py-4">File Size</th>
                          <th className="px-6 py-4 text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {reports.map((report, i) => (
                         <tr key={report.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${report.type === 'PDF' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                 {report.type || 'DOC'}
                               </div>
                               <span className="font-medium text-slate-900 dark:text-slate-100">{report.title}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className={`text-xs font-semibold px-2 py-1 rounded ${report.type === 'PDF' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                               {report.type}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-slate-500">{report.date}</td>
                           <td className="px-6 py-4 text-slate-500">{report.fileSize || report.file_size || '–'}</td>
                           <td className="px-6 py-4 text-right">
                             <button onClick={() => showToast(`Downloading: ${report.title}`)} className="text-indigo-600 hover:text-indigo-700 font-medium text-xs flex items-center gap-1 ml-auto">
                               <Download className="w-3 h-3" /> Download
                             </button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             )}
          </div>
          
          {hasReports && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500">
               <span>Showing 1 to {reports.length} of {reports.length} entries</span>
               <div className="flex gap-1">
                  <button onClick={() => showToast("Already on first page")} className="px-3 py-1 border border-slate-200 rounded text-slate-400 cursor-not-allowed">Previous</button>
                  <button onClick={() => showToast("No more pages")} className="px-3 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50">Next</button>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
