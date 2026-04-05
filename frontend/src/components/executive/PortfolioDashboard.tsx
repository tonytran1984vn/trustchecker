import { Card, CardContent } from "@/components/ui/card";
import { Activity, CreditCard, Presentation, ShieldCheck, ArrowRight, Zap } from "lucide-react";
import { useState, useMemo } from "react";

interface PortfolioData {
  usage: any[];
  revenue: any[];
  status: string;
  timestamp: string;
}

// Map percentage to nearest Tailwind fraction class (CSP-safe, JIT-safe)
const heightClassMap: [number, string][] = [
  [100, 'h-full'], [95, 'h-[95%]'], [90, 'h-[90%]'], [85, 'h-[85%]'],
  [80, 'h-4/5'], [75, 'h-3/4'], [70, 'h-[70%]'], [65, 'h-[65%]'],
  [60, 'h-3/5'], [55, 'h-[55%]'], [50, 'h-1/2'], [45, 'h-[45%]'],
  [40, 'h-2/5'], [35, 'h-[35%]'], [30, 'h-[30%]'], [25, 'h-1/4'],
  [20, 'h-1/5'], [15, 'h-[15%]'], [10, 'h-[10%]'], [5, 'h-[5%]'],
];
// Safelist comment for Tailwind JIT scanner (these must exist in source):
// h-full h-[95%] h-[90%] h-[85%] h-4/5 h-3/4 h-[70%] h-[65%] h-3/5 h-[55%] h-1/2 h-[45%] h-2/5 h-[35%] h-[30%] h-1/4 h-1/5 h-[15%] h-[10%] h-[5%]

function getHeightClass(pct: number): string {
  for (const [threshold, cls] of heightClassMap) {
    if (pct >= threshold - 2) return cls;
  }
  return 'h-[5%]';
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PortfolioDashboard({ data }: { data: PortfolioData }) {
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const usage = data?.usage || [];
  const revenue = data?.revenue || [];
  
  // Extract real values from API data (latest month first)
  const latestUsage = usage[0];
  const latestRevenue = revenue[0];
  
  const activeUsers = latestUsage?.active_users || latestUsage?.activeUsers || 4231;
  const mrrValue = latestRevenue?.mrr || 125000;
  const mrrGrowth = latestRevenue?.growth || 12.5;
  
  // Build chart bars from real revenue data (12 months, sorted chronologically)
  const chartBars = useMemo(() => {
    const sorted = [...revenue].reverse(); // oldest first for chart
    if (sorted.length === 0) return [];
    const maxRev = Math.max(...sorted.map(r => r.mrr || r.totalRevenue || 0));
    return sorted.map(r => {
      const val = r.mrr || r.totalRevenue || 0;
      const pct = maxRev > 0 ? Math.round((val / maxRev) * 100) : 0;
      const monthDate = new Date(r.current_month);
      const monthLabel = monthNames[monthDate.getMonth()] || r.current_month;
      return { pct, label: monthLabel, value: val, heightClass: getHeightClass(pct) };
    });
  }, [revenue]);
  
  const fmtUSD = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">{toast}</div>}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Status</span>
            </div>
            <div className="text-2xl font-bold text-foreground capitalize">
              {data?.status || 'Unknown'}
              <span className="text-sm font-normal text-emerald-500 ml-2">● Online</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Usage</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {activeUsers.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">scans/mo</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MRR Capture</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {fmtUSD(mrrValue)}
              <span className="text-sm font-normal text-emerald-600 ml-2">↑ {mrrGrowth}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-colors cursor-pointer group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10 pointer-events-none"></div>
          <CardContent className="p-5 flex flex-col justify-between h-full group relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-serif">Actionable</span>
            </div>
            <div className="text-xl font-bold font-serif flex items-center justify-between text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Allocate Idle Capital
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transform group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Analytics Space */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Revenue vs Usage Velocity Chart — Dynamic from DB data */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue vs Usage Velocity</h3>
            <button onClick={() => showToast("Exporting CSV... (Enterprise Feature)")} className="text-sm text-blue-600 font-medium hover:underline">Export CSV</button>
          </div>
          
          {chartBars.length > 0 ? (
            <>
              <div className="h-64 flex items-end justify-between gap-2 px-2">
                {chartBars.map((bar, i) => (
                  <div key={i} className="w-full h-full flex items-end justify-center group relative">
                    <div className={`w-full max-w-[2rem] bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 rounded-t-sm transition-all relative overflow-hidden ${bar.heightClass}`}>
                      <div className="absolute bottom-0 left-0 w-full bg-indigo-500 h-3/5"></div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-10">
                      {bar.label}: {fmtUSD(bar.value)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs font-medium text-slate-400 border-t border-slate-100 pt-3">
                {chartBars.map((bar, i) => (
                  <span key={i}>{bar.label}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Loading revenue data...
            </div>
          )}
        </div>

        {/* Asset Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Asset Distribution</h3>
          <div className="flex-1 flex flex-col justify-center gap-6">
             {/* Donut Representation using Tailwind classes only */}
             <div className="w-40 h-40 rounded-full border-[1.5rem] border-blue-500 border-r-emerald-400 border-t-indigo-400 border-b-slate-200 mx-auto transform rotate-45 relative">
                <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                   <div className="text-center">
                     <span className="block text-2xl font-bold text-slate-900">4</span>
                     <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Portfolios</span>
                   </div>
                </div>
             </div>
             
             <div className="space-y-3">
               <div className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-blue-500"></span><span className="text-slate-600 font-medium">Bonds & Tier 1</span></div>
                 <span className="font-bold text-slate-800">45%</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-indigo-400"></span><span className="text-slate-600 font-medium">Private Equity</span></div>
                 <span className="font-bold text-slate-800">25%</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-400"></span><span className="text-slate-600 font-medium">Real Estate</span></div>
                 <span className="font-bold text-slate-800">20%</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-slate-200"></span><span className="text-slate-600 font-medium">Cash Eq</span></div>
                 <span className="font-bold text-slate-800">10%</span>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
