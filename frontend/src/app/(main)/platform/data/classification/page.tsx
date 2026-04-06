"use client";

import {
  Layers, ShieldAlert, FileSearch, ShieldCheck, Activity,
  Database, Combine, Search, Loader2, AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";

interface LabelBreakdown {
  name: string;
  code: string;
  risk_level: number;
  color: string | null;
  asset_count: number;
}

interface ClassificationEvent {
  id: string;
  orgId: string;
  dataAssetId: string;
  action: string;
  labels: string[];
  actor: string;
  createdAt: string;
}

interface Stats {
  coverage: number;
  totalAssets: number;
  classifiedAssets: number;
  totalClassifications: number;
  driftAlerts: number;
  policyDenials: number;
  labelBreakdown: LabelBreakdown[];
  recentEvents: ClassificationEvent[];
}

const RISK_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  5: { bg: "bg-red-50", border: "border-red-100", text: "text-red-700" },
  4: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" },
  3: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
  2: { bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-700" },
  1: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
};

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DataClassificationPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/classification/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const coverage = stats?.coverage ?? 0;
  const totalAssets = stats?.totalAssets ?? 0;
  const driftAlerts = stats?.driftAlerts ?? 0;
  const policyDenials = stats?.policyDenials ?? 0;
  const labelBreakdown = stats?.labelBreakdown ?? [];
  const recentEvents = stats?.recentEvents ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
             <div className="bg-blue-600/10 p-2 rounded-lg"><Layers className="w-5 h-5 text-blue-600"/></div>
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Governance & Classification</h1>
          </div>
          <p className="text-slate-500 mt-1">Manage schemas, tag assets, and enforce ABAC policies across the platform.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Simulate Policy
          </button>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm">
            Create Schema
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-slate-200">
        {(["overview", "schemas", "rules", "policies"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab === "overview" ? "Operational Overview" : tab === "schemas" ? "Schemas & Labels" : tab === "rules" ? "Auto-Tagging Rules" : "Policy Bindings"}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-500 text-sm">Loading classification data from database...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-500">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="text-sm">Failed to load stats: {error}</span>
            </div>
          ) : (
            <>
              {/* Top KPI row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Classification Coverage</div>
                    <Database className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{coverage}%</div>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(coverage, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Target &gt; 95% governance</p>
                </div>

                <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Data Assets</div>
                    <Combine className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{fmtNum(totalAssets)}</div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                    <Activity className="w-3 h-3" />
                    <span>Live from database</span>
                  </div>
                </div>

                <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Drift Detection Alerts</div>
                    <FileSearch className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{fmtNum(driftAlerts)}</div>
                  <p className="text-xs text-amber-600 font-medium mt-2">Payload snapshots recorded</p>
                </div>

                <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Policy Denials</div>
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{fmtNum(policyDenials)}</div>
                  <p className="text-xs text-slate-500 mt-2">Deny-effect bindings active</p>
                </div>
              </div>

              {/* Deep dive sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 p-6 border border-slate-200 bg-white rounded-xl shadow-sm">
                   <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Heatmap: Labels vs Volume</h3>
                   {labelBreakdown.length === 0 ? (
                     <div className="h-48 border border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
                        <span className="text-sm text-slate-400">No labels configured yet. Create a Schema first.</span>
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {labelBreakdown.map((label, i) => {
                         const colors = RISK_COLORS[label.risk_level] || RISK_COLORS[1];
                         return (
                           <div key={i} className={`p-3 rounded-lg ${colors.bg} border ${colors.border} text-center`}>
                             <span className={`font-bold text-xs ${colors.text} uppercase tracking-wide`}>{label.code}</span>
                             <div className="text-lg font-bold text-slate-900 mt-1">{fmtNum(label.asset_count)}</div>
                             <div className="text-[10px] text-slate-500">Risk Level {label.risk_level}</div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                </div>

                <div className="p-6 border border-slate-200 bg-slate-900 text-white rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-semibold">Engine Status</h3>
                    </div>
                    <p className="text-slate-400 text-xs mb-6">Real-time classification and policy evaluation is running across the pipeline.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Classification Engine</span>
                          <span className="text-emerald-400">Active</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1">
                          <div className="bg-emerald-400 h-1 rounded-full w-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Policy Evaluator</span>
                          <span className="text-emerald-400">Active</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1">
                          <div className="bg-emerald-400 h-1 rounded-full w-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Event Stream</span>
                          <span className="text-emerald-400">Active</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1">
                          <div className="bg-emerald-400 h-1 rounded-full w-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 text-xs text-slate-500 border-t border-slate-800 pt-4">
                     v2.1 Data-Aware Runtime • {fmtNum(totalAssets)} assets indexed
                  </div>
                </div>
              </div>

              <div className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Recent Classification Events</h3>
                    <div className="relative">
                       <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                       <input type="text" placeholder="Search events..." className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    </div>
                 </div>
                 {recentEvents.length === 0 ? (
                   <div className="py-8 text-center text-slate-400 text-sm">No classification events recorded yet.</div>
                 ) : (
                   <table className="w-full text-left text-sm text-slate-600">
                     <thead>
                       <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold bg-slate-50">
                         <th className="py-3 px-4 rounded-tl-lg">Event ID</th>
                         <th className="py-3 px-4">Action</th>
                         <th className="py-3 px-4">Asset ID</th>
                         <th className="py-3 px-4">Labels</th>
                         <th className="py-3 px-4">Actor</th>
                         <th className="py-3 px-4 rounded-tr-lg">Timestamp</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {recentEvents.map((evt) => (
                         <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                           <td className="py-3 px-4 font-mono text-xs">{evt.id.slice(0, 8)}</td>
                           <td className="py-3 px-4">
                             <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                               evt.action === 'auto_tagged' ? 'bg-blue-50 text-blue-700'
                               : evt.action === 'tagged' ? 'bg-amber-50 text-amber-700'
                               : 'bg-slate-100 text-slate-600'
                             }`}>{evt.action}</span>
                           </td>
                           <td className="py-3 px-4 font-mono text-xs text-slate-500">{evt.dataAssetId.slice(0, 8)}</td>
                           <td className="py-3 px-4">
                             <div className="flex gap-1 flex-wrap">
                               {Array.isArray(evt.labels) && evt.labels.map((l: string, i: number) => (
                                 <span key={i} className="inline-block border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">{l}</span>
                               ))}
                             </div>
                           </td>
                           <td className="py-3 px-4 text-xs text-slate-500">{evt.actor}</td>
                           <td className="py-3 px-4 text-slate-400 text-xs">{timeAgo(evt.createdAt)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="p-12 border border-slate-200 rounded-xl bg-white flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Configuration Module</h3>
          <p className="text-slate-500 max-w-sm mt-2">
              The interface for {activeTab} is currently being mapped to the new Prisma policy engine.
          </p>
        </div>
      )}

    </div>
  );
}
