import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, DollarSign, Settings2 } from "lucide-react";
import { useState, useMemo } from "react";

interface TcarData {
  risk_scores: any[];
  trust_score: any;
  capital_at_risk?: number;
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TcarMonitor({ data }: { data: TcarData }) {
  const [range, setRange] = useState<'30d' | '12m'>('12m');

  const currentScore = data?.trust_score?.score || 850;
  const maxScore = 1000;
  const scorePercent = (currentScore / maxScore) * 100;
  const riskScores = data?.risk_scores || [];
  const capitalAtRisk = data?.capital_at_risk || 0;

  // Filter scores by selected range
  const filteredScores = useMemo(() => {
    if (range === '30d') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return riskScores.filter(s => new Date(s.createdAt || s.created_at) >= cutoff);
    }
    return riskScores; // 12m = show all (API already limits to 12)
  }, [riskScores, range]);

  // Build chart bars from filtered scores, sorted chronologically (oldest first)
  const chartBars = useMemo(() => {
    const sorted = [...filteredScores].sort((a, b) =>
      new Date(a.createdAt || a.created_at).getTime() - new Date(b.createdAt || b.created_at).getTime()
    );
    const vals = sorted.map(s => ({
      amount: (s.financialImpact || s.financial_impact || 0) / 1000000,
      label: monthNames[new Date(s.createdAt || s.created_at).getMonth()],
      date: new Date(s.createdAt || s.created_at),
    }));
    const maxVal = Math.max(...vals.map(v => v.amount), 0.01);
    return vals.map(v => ({
      ...v,
      pct: Math.max((v.amount / maxVal) * 90, 4), // 4% minimum visible bar
    }));
  }, [filteredScores]);

  const fmtUSD = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toFixed(0)}`;
  };

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
              {fmtUSD(capitalAtRisk)} <span className="text-sm text-red-500 ml-1">↑ 4.2%</span>
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
               <button
                 onClick={() => setRange('30d')}
                 className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${range === '30d' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
               >30 Days</button>
               <button
                 onClick={() => setRange('12m')}
                 className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${range === '12m' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
               >12 Months</button>
            </div>
          </div>
          
          {chartBars.length > 0 ? (
            <>
              <div className="relative" style={{ height: '16rem' }}>
                {/* Guide lines */}
                <div className="absolute top-0 left-0 right-0 border-t border-dashed border-slate-100"></div>
                <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-slate-100"></div>
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-slate-100"></div>
                <div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-slate-100"></div>
                <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200"></div>

                {/* Bars */}
                <div className="absolute inset-0 flex items-end justify-around gap-1 px-2">
                  {chartBars.map((bar, i) => (
                    <div key={i} className="flex-1 flex justify-center group relative" style={{ height: '100%', alignItems: 'flex-end' }}>
                      <div
                        className={`w-full max-w-[1.8rem] rounded-t-md transition-all duration-500 ${bar.pct > 50 ? 'bg-gradient-to-t from-red-500 to-red-400 hover:from-red-600 hover:to-red-500' : 'bg-gradient-to-t from-slate-400 to-slate-300 hover:from-slate-500 hover:to-slate-400'}`}
                        style={{ height: `${bar.pct}%` }}
                      ></div>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg transition-opacity whitespace-nowrap z-20 pointer-events-none">
                        {fmtUSD(bar.amount * 1_000_000)}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* X-axis labels from actual data */}
              <div className="flex justify-around mt-4 text-xs font-medium text-slate-400 pt-2 border-t border-slate-50">
                {chartBars.map((bar, i) => (
                  <span key={i} className="flex-1 text-center">{bar.label}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height: '16rem' }}>
              No exposure data for this period.
            </div>
          )}
        </div>

        {/* Risk Scores Log */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full max-h-[420px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent TCAR Triggers</h3>
             <Settings2 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
             {riskScores.length > 0 ? riskScores.map((score, i) => (
                <div key={i} className="flex justify-between items-start border-b border-slate-50 pb-3">
                   <div>
                      <p className="text-sm font-semibold text-slate-800">{score.eventId || `Event ${score.id?.slice(0, 6)}`}</p>
                      <p className="text-xs text-slate-500">{new Date(score.createdAt || score.created_at).toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <span className="text-sm font-bold text-red-600 block">{fmtUSD(score.financialImpact || score.financial_impact || 0)}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{score.tier || 'N/A'}</span>
                   </div>
                </div>
             )) : (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                  No TCAR triggers recorded.
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
