import { Card, CardContent } from "@/components/ui/card";
import { Radar, Search, AlertTriangle, ShieldAlert, Globe, Crosshair } from "lucide-react";

interface RadarSnapshot {
  id?: string;
  snapshot_date?: string;
  status?: string;
  risk_level?: string;
  [key: string]: any;
}

interface MacroRadarData {
  snapshots: RadarSnapshot[];
}

export default function MacroRadar({ data }: { data: MacroRadarData }) {
  const snapshots = data?.snapshots || [];
  const latestSnap = snapshots.length > 0 ? snapshots[0] : null;
  const payload = latestSnap?.payload || {};
  const activeScanners = payload.active_scanners || 0;
  const targetsMonitored = payload.targets_monitored || 0;
  const criticalThreats = payload.critical_threats || 0;

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Radar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Scanners</p>
              <h3 className="text-2xl font-bold text-foreground">{activeScanners > 0 ? activeScanners.toLocaleString() : "..."}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Targets Monitored</p>
              <h3 className="text-2xl font-bold text-foreground">{targetsMonitored > 0 ? targetsMonitored.toLocaleString() : "..."}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Critical Threats</p>
              <h3 className="text-2xl font-bold text-red-600">{criticalThreats}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
        
        {/* Radar Visualizer Mock */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white absolute top-6 left-6 z-10 text-left w-full">Threat Proximity</h3>
          
          <div className="relative w-64 h-64 mt-8 flex items-center justify-center">
            {/* Concentric Circles */}
            <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute inset-4 border border-emerald-500/30 rounded-full"></div>
            <div className="absolute inset-12 border border-emerald-500/40 rounded-full"></div>
            <div className="absolute inset-20 border border-emerald-500/50 rounded-full"></div>
            
            {/* Sweep */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/20 to-transparent animate-spin origin-center" style={{ animationDuration: '4s' }}></div>
            
            {/* Dots */}
            <div className="absolute top-10 left-12 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>
            <div className="absolute bottom-16 right-16 w-2 h-2 bg-amber-400 rounded-full"></div>
            <div className="absolute top-24 right-10 w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            
            {/* Center Icon */}
            <div className="relative z-10 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>
          
          <div className="absolute bottom-6 w-full px-6 flex justify-between text-xs font-semibold text-slate-500 uppercase">
             <span>Sector A: Safe</span>
             <span className="text-red-500 animate-pulse">Sector B: Alert</span>
          </div>
        </div>

        {/* Intelligence Log */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Global Snapshots</h3>
            <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md font-medium hover:bg-slate-800 transition-colors">Run Deep Scan</button>
          </div>
          
          <div className="flex-1 overflow-auto rounded-lg border border-slate-100 dark:border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase tracking-wider text-[11px] font-bold sticky top-0">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Vector</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {snapshots.length > 0 ? snapshots.map((snap, i) => (
                  <tr key={snap.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {snap.timestamp ? new Date(snap.timestamp).toLocaleString() : (snap.snapshot_date ? new Date(snap.snapshot_date).toLocaleString() : new Date().toLocaleString())}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{snap.vector || `Global Scan #${snap.id?.slice(0, 8) || i + 100}`}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        (snap.riskLevel || snap.risk_level) === 'High' ? 'bg-red-50 text-red-600' :
                        (snap.riskLevel || snap.risk_level) === 'Medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {(snap.riskLevel || snap.risk_level) || 'Low'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:underline font-medium text-xs">Analyze</button>
                    </td>
                  </tr>
                )) : (
                  [1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 border-l border-transparent">
                        2026-04-05 14:{item}0:00
                      </td>
                      <td className="px-4 py-4 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">Market Stress Test</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${item === 2 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item === 2 ? 'CRITICAL' : 'OPTIMAL'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-blue-600 hover:underline font-medium text-xs">Examine</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
