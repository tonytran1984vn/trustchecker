import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, TrendingDown, DollarSign, Activity, Settings2 } from "lucide-react";

interface TcarData {
  risk_scores: any[];
  trust_score: any;
  capital_at_risk?: number;
}

export default function TcarMonitor({ data }: { data: TcarData }) {
  const currentScore = data?.trust_score?.score || 850;
  const maxScore = 1000;
  const scorePercent = (currentScore / maxScore) * 100;
  const riskScores = data?.risk_scores || [];
  const capitalAtRisk = data?.capital_at_risk || 0;
  
  // Transform risk scores to exposure chart data (up to 12 months)
  const rawChartData = [...riskScores].slice(0, 12).reverse().map(score => {
    return (score.financialImpact || score.financial_impact || 0) / 1000000; // in Millions
  });
  
  // Pad if less than 12
  while(rawChartData.length < 12) {
    rawChartData.unshift(0);
  }

  const maxChartVal = Math.max(...rawChartData, 1); // avoid div 0
  const chartData = rawChartData.map(val => ({
    val,
    heightPct: val > 0 ? Math.max((val / maxChartVal) * 95, 5) : 0
  }));

  return (
    <div className="space-y-6">
      
      {/* Metric Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <Card className="border-border shadow-md flex flex-col justify-center items-center p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-white to-white dark:from-emerald-900/40 dark:via-slate-900 dark:to-slate-900"></div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] font-serif text-slate-500 dark:text-slate-300 mb-4 z-10">Institutional Trust Score</h3>
          <div className="text-6xl font-serif text-emerald-600 dark:text-emerald-400 z-10 flex items-baseline tracking-tight">
            {currentScore} <span className="text-xl text-slate-400 dark:text-slate-500 font-serif ml-3 font-normal opacity-80">/ {maxScore}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full mt-8 relative z-10 overflow-hidden shadow-inner">
             <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-300 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] dark:shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${scorePercent}%` }}></div>
          </div>
        </Card>

        <Card className="border-border shadow-sm border-red-200 bg-red-50/50">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-red-600 uppercase tracking-wider">Capital at Risk</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              ${capitalAtRisk > 0 ? capitalAtRisk.toLocaleString() : "1,240,000"} <span className="text-sm text-red-500 ml-1">↑ 4.2%</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Exposure across active pipelines</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Protected Cap</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              $14,500,000 <span className="text-sm text-emerald-500 ml-1">92%</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Total secured via Trust Network</p>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
        
        {/* Exposure Analysis Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exposure Analysis (TCAR)</h3>
            <div className="flex gap-2">
               <button className="text-xs bg-slate-100 px-3 py-1.5 rounded-md font-medium text-slate-700">30 Days</button>
               <button className="text-xs bg-slate-900 px-3 py-1.5 rounded-md font-medium text-white">12 Months</button>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-1 mt-8 relative">
            {/* Guide lines */}
            <div className="absolute top-0 w-full border-t border-slate-100 border-dashed"></div>
            <div className="absolute top-1/2 w-full border-t border-slate-100 border-dashed"></div>
            <div className="absolute bottom-0 w-full border-t border-slate-200"></div>

            {chartData.map((data, i) => (
              <div key={i} className="w-full flex justify-center group relative z-10">
                <div 
                  className={`w-full max-w-[1.5rem] rounded-t-sm transition-all ${data.heightPct > 40 ? 'bg-red-400 hover:bg-red-500' : 'bg-slate-300 hover:bg-slate-400'}`}
                  style={{ height: `${data.heightPct}%` }}
                ></div>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-20">
                  Vol: {data.val.toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs font-medium text-slate-400 pt-2">
             <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </div>

        {/* Risk Scores Log */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent TCAR Triggers</h3>
             <Settings2 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="flex-1 overflow-auto space-y-4">
             {riskScores.length > 0 ? riskScores.map((score, i) => (
                <div key={i} className="flex justify-between items-start border-b border-slate-50 pb-3">
                   <div>
                      <p className="text-sm font-semibold text-slate-800">Event ID: {score.eventId || score.id?.slice(0, 6)}</p>
                      <p className="text-xs text-slate-500">{new Date(score.createdAt || score.created_at).toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <span className="text-sm font-bold text-red-600 block">${(score.financialImpact || score.financial_impact || 0).toLocaleString()}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{score.tier || 'N/A'}</span>
                   </div>
                </div>
             )) : (
                [1,2,3,4,5].map((item) => (
                  <div key={item} className="flex justify-between items-start border-b border-slate-50 pb-3">
                     <div className="flex gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full ${item === 1 ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Asset Volatility Limit</p>
                          <p className="text-xs text-slate-500">Today, 14:3{item} PM</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-sm font-bold text-red-500 block">-$1,200.00</span>
                        <span className="text-[10px] px-1 bg-slate-100 rounded text-slate-500 uppercase font-bold">L1 TCAR</span>
                     </div>
                  </div>
                ))
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
