"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, RadioReceiver, Factory, BarChart3, FileBadge, AlertTriangle, Search, ShieldCheck, Link2 } from "lucide-react";

// --- Helpers ---
function scoreColor(score: number, returnHex = false) {
  if (score >= 80) return returnHex ? '#10b981' : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800';
  if (score >= 60) return returnHex ? '#f59e0b' : 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800';
  if (score >= 40) return returnHex ? '#f97316' : 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800';
  return returnHex ? '#ef4444' : 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
}

function scoreTextColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-500';
}

function scopeBadge(scope: number) {
  const map: Record<number, string> = {
    1: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    2: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    3: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  };
  return <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-widest ${map[scope] || 'bg-slate-100 text-slate-700'}`}>S{scope}</span>;
}

export default function CarbonEngine({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
    { id: 'ingestion', label: 'Ingestion', icon: <RadioReceiver className="w-4 h-4" /> },
    { id: 'emission', label: 'Emission Engine', icon: <Factory className="w-4 h-4" /> },
    { id: 'benchmark', label: 'Benchmark', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'passport', label: 'CIP Issuance', icon: <FileBadge className="w-4 h-4" /> },
    { id: 'overclaim', label: 'Overclaim Detect', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'lineage', label: 'Lineage Replay', icon: <Search className="w-4 h-4" /> },
    { id: 'governance', label: 'Governance SoD', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'blockchain', label: 'Proof Layer', icon: <Link2 className="w-4 h-4" /> },
  ];

  // ==========================================
  // Module 1: Ingestion
  // ==========================================
  const renderIngestion = () => {
    const sources = [
        { name: 'SCM Lineage Data', scope: 3, status: 'active', records: 12847, integrity: 98.2, last: '2 min ago' },
        { name: 'Production Energy Logs', scope: 2, status: 'active', records: 5632, integrity: 99.1, last: '5 min ago' },
        { name: 'Transport Emissions', scope: 3, status: 'active', records: 3419, integrity: 96.8, last: '12 min ago' },
        { name: 'Supplier Declarations', scope: 3, status: 'pending', records: 891, integrity: 87.4, last: '3h ago' },
        { name: 'Direct Emissions (Fuel)', scope: 1, status: 'active', records: 2105, integrity: 99.7, last: '1 min ago' },
        { name: 'Purchased Energy', scope: 2, status: 'active', records: 1560, integrity: 98.9, last: '8 min ago' },
    ];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm text-center flex flex-col justify-center py-4">
            <RadioReceiver className="w-6 h-6 text-indigo-500 mx-auto mb-2 opacity-80" />
            <div className="text-2xl font-black text-indigo-600 mb-0.5">{sources.length}</div>
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Data Sources</div>
          </Card>
          <Card className="border-border shadow-sm text-center flex flex-col justify-center py-4">
            <BarChart3 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
            <div className="text-2xl font-black text-emerald-600 mb-0.5">{sources.reduce((a, s) => a + s.records, 0).toLocaleString()}</div>
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Records</div>
          </Card>
          <Card className="border-border shadow-sm text-center flex flex-col justify-center py-4">
            <ShieldCheck className="w-6 h-6 text-purple-500 mx-auto mb-2 opacity-80" />
            <div className="text-2xl font-black text-purple-600 mb-0.5">{(sources.reduce((a, s) => a + s.integrity, 0) / sources.length).toFixed(1)}%</div>
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Avg Integrity</div>
          </Card>
          <Card className="border-border shadow-sm text-center flex flex-col justify-center py-4">
            <Globe className="w-6 h-6 text-orange-500 mx-auto mb-2 opacity-80" />
            <div className="text-2xl font-black text-orange-600 mb-0.5">S1+S2+S3</div>
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Scope Coverage</div>
          </Card>
        </div>
        <Card className="border-border shadow-sm overflow-hidden text-sm">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Source</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Scope</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Records</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Integrity</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-right">Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map(s => (
                  <TableRow key={s.name} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                    <TableCell className="text-center">{scopeBadge(s.scope)}</TableCell>
                    <TableCell className="text-center text-muted-foreground font-mono text-xs">{s.records.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase ${scoreColor(s.integrity)}`}>
                        {s.integrity}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-[10px] font-medium text-muted-foreground uppercase">{s.last}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ==========================================
  // Render Switcher
  // ==========================================
  const renderContent = () => {
    switch (activeTab) {
      case 'ingestion': return renderIngestion();
      case 'emission':
        const calculations = [
            { batch: 'BATCH-2024-001', product: 'Organic Coffee 1kg', scope1: 0.12, scope2: 0.08, scope3: 0.45, total: 0.65, intensity: 0.65, unit: 'kgCO₂e/unit', confidence: 94 },
            { batch: 'BATCH-2024-002', product: 'Fair Trade Tea 500g', scope1: 0.05, scope2: 0.04, scope3: 0.28, total: 0.37, intensity: 0.74, unit: 'kgCO₂e/unit', confidence: 91 },
        ];
        return (
          <Card className="border-border shadow-sm text-sm overflow-hidden">
             <CardHeader className="p-4 border-b bg-slate-50/50">
               <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                 <Factory className="w-5 h-5 text-indigo-600" /> Emission Calculation Engine
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0 overflow-x-auto">
               <Table>
                 <TableHeader className="bg-slate-50 sticky top-0 shadow-sm border-b">
                   <TableRow>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Batch</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Product</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Total kgCO₂e</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Confidence</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {calculations.map(c => (
                     <TableRow key={c.batch} className="hover:bg-slate-50/50">
                       <TableCell className="font-mono text-xs text-indigo-600 font-semibold">{c.batch}</TableCell>
                       <TableCell className="font-semibold text-foreground">{c.product}</TableCell>
                       <TableCell className="text-center font-bold text-red-500">{c.total}</TableCell>
                       <TableCell className="text-center">
                         <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm font-bold text-[10px]">{c.confidence}%</span>
                       </TableCell>
                      </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
          </Card>
        );
      case 'passport':
        const passports = [
            { id: 'CIP-2024-00142', batch: 'BATCH-2024-001', product: 'Organic Coffee 1kg', emission: 0.65, benchmark: 82, status: 'sealed', anchor: '0xab3f…e821' },
            { id: 'CIP-2024-00145', batch: 'BATCH-2024-003', product: 'Cacao Powder 2kg', emission: 1.55, benchmark: 45, status: 'pending_review', anchor: '—' },
        ];
        return (
          <Card className="border-border shadow-sm text-sm overflow-hidden">
             <CardHeader className="p-4 border-b bg-slate-50/50">
               <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
                 <FileBadge className="w-5 h-5 text-indigo-600" /> Carbon Integrity Passports (CIP)
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0 overflow-x-auto">
               <Table>
                 <TableHeader className="bg-slate-50 sticky top-0 shadow-sm border-b">
                   <TableRow>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Passport ID</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Product</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Emission</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Status</TableHead>
                     <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Anchor</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {passports.map(c => (
                     <TableRow key={c.id} className="hover:bg-slate-50/50">
                       <TableCell className="font-mono text-xs text-indigo-600 font-semibold">{c.id}</TableCell>
                       <TableCell className="font-semibold text-foreground">{c.product}</TableCell>
                       <TableCell className="text-center font-bold text-red-500">{c.emission}</TableCell>
                       <TableCell className="text-center">
                         <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider ${c.status === 'sealed' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>{c.status}</span>
                       </TableCell>
                       <TableCell className="text-center font-mono text-purple-600 text-[10px] bg-purple-50/50 py-1 px-2 rounded">{c.anchor}</TableCell>
                      </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
          </Card>
        );
      case 'overclaim':
        const signals = [
            { type: 'Sudden Drop Anomaly', product: 'Cacao Powder 2kg', severity: 'high', detail: 'Emission dropped 42% in 30 days', score: 78, action: 'IVU Deep Review' },
            { type: 'Baseline Manipulation', product: 'Raw Cotton Bundle', severity: 'critical', detail: 'Baseline shifted from 2.8 to 3.5', score: 92, action: 'Block + Investigate' },
        ];
        return (
          <Card className="border-border shadow-sm text-sm overflow-hidden">
             <CardHeader className="p-4 border-b bg-red-50/50 border-red-100">
               <CardTitle className="font-bold flex items-center gap-2 text-base text-red-600">
                 <AlertTriangle className="w-5 h-5 text-red-500" /> Fraud & Overclaim Signals
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
               <div className="space-y-4">
                 {signals.map(s => (
                   <div key={s.type} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-l-4 border-red-500 shadow-sm">
                     <div className="flex justify-between items-center mb-1.5">
                       <strong className="text-slate-900 dark:text-white font-bold">{s.type}</strong>
                       <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest">{s.severity}</span>
                     </div>
                     <div className="text-xs text-muted-foreground mb-3 font-medium">{s.product} — <span className="text-slate-700 dark:text-slate-300">{s.detail}</span></div>
                     <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-50 inline-block px-2 py-1 rounded">Action Required: {s.action}</div>
                   </div>
                 ))}
               </div>
             </CardContent>
          </Card>
        );
      case 'overview':
      default:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
               {[
                 {l:'Passports',v:5,c:'text-indigo-600',dot:'bg-indigo-500',i:<FileBadge className="w-5 h-5 text-indigo-500" />}, 
                 {l:'Emission',v:'6.02 kg',c:'text-red-500',dot:'bg-red-500',i:<Factory className="w-5 h-5 text-red-500" />}, 
                 {l:'Efficiency',v:'65/100',c:'text-yellow-600',dot:'bg-yellow-500',i:<BarChart3 className="w-5 h-5 text-yellow-500" />}, 
                 {l:'Integrity',v:'97.8%',c:'text-emerald-600',dot:'bg-emerald-500',i:<ShieldCheck className="w-5 h-5 text-emerald-500" />}, 
                 {l:'Anomalies',v:2,c:'text-red-500',dot:'bg-red-500',i:<AlertTriangle className="w-5 h-5 text-red-500" />}, 
                 {l:'Chains',v:3,c:'text-purple-600',dot:'bg-purple-500',i:<Link2 className="w-5 h-5 text-purple-500" />}
               ].map(k => (
                 <Card key={k.l} className="relative overflow-hidden border-border shadow-sm text-center flex flex-col justify-center py-4 group hover:shadow-md transition-all">
                   <div className={`absolute top-0 w-full h-1 ${k.dot}`}></div>
                   <div className="mx-auto mb-2 opacity-80 bg-slate-50 dark:bg-slate-800 p-2 rounded-full">{k.i}</div>
                   <div className={`text-xl font-black mb-0.5 ${k.c}`}>{k.v}</div>
                   <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{k.l}</div>
                 </Card>
               ))}
            </div>
            <Card className="border-border shadow-sm">
               <CardHeader className="border-b bg-slate-50/50 p-4 pb-4">
                 <CardTitle className="font-bold text-base flex items-center gap-2">
                   <Globe className="w-5 h-5 text-indigo-600" /> Strategic Positioning
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-6 grid md:grid-cols-2 gap-6 text-sm">
                  <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100">
                     <div className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> We Do
                     </div>
                     <ul className="text-slate-600 space-y-2 font-medium text-xs">
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500"></span> Footprint Calculation</li>
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500"></span> Overclaim Detection</li>
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500"></span> Audit-grade CIP</li>
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500"></span> Registry Export</li>
                     </ul>
                  </div>
                  <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
                     <div className="font-bold text-red-700 mb-3 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" /> We Do Not
                     </div>
                     <ul className="text-slate-600 space-y-2 font-medium text-xs">
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-400"></span> Mint Credits</li>
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-400"></span> Trade/Speculate</li>
                       <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-400"></span> Auto-approve limits</li>
                     </ul>
                  </div>
               </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`px-4 py-2 rounded-md font-semibold text-[11px] sm:text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
               activeTab === tab.id 
               ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800' 
               : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
             }`}
           >
             <span className={activeTab === tab.id ? "text-indigo-600" : "text-slate-400"}>{tab.icon}</span> {tab.label}
           </button>
        ))}
      </div>
      
      {renderContent()}
    </div>
  );
}
