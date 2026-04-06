"use client";

import { Layers, ShieldAlert, FileSearch, ShieldCheck, Activity, Database, Combine, Search } from "lucide-react";
import { useState } from "react";

export default function DataClassificationPage() {
  const [activeTab, setActiveTab] = useState("overview");

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
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Operational Overview
        </button>
        <button 
          onClick={() => setActiveTab('schemas')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schemas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Schemas & Labels
        </button>
        <button 
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Auto-Tagging Rules
        </button>
        <button 
          onClick={() => setActiveTab('policies')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'policies' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Policy Bindings
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Classification Coverage</div>
                <Database className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900">82.4%</div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '82.4%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Target &gt; 95% governance</p>
            </div>

            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Data Assets</div>
                <Combine className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900">124,502</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                <Activity className="w-3 h-3" />
                <span>+1,204 this week</span>
              </div>
            </div>

            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Drift Detection Alerts</div>
                <FileSearch className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900">14</div>
              <p className="text-xs text-amber-600 font-medium mt-2">Data mutated without re-tag</p>
            </div>

            <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Policy Denials</div>
                <ShieldAlert className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900">89</div>
              <p className="text-xs text-slate-500 mt-2">Blocked executions (24h)</p>
            </div>
          </div>

          {/* Deep dive sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 p-6 border border-slate-200 bg-white rounded-xl shadow-sm">
               <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Heatmap: Labels vs Volume</h3>
               <div className="h-48 border border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
                  <span className="text-sm text-slate-400">Chart Component Initializing...</span>
               </div>
               <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-red-50 border border-red-100"><span className="font-bold text-red-700">RESTRICTED</span><br/>LR-5 • 1.2k assets</div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-100"><span className="font-bold text-amber-700">CONFIDENTIAL</span><br/>LR-4 • 14k assets</div>
                  <div className="p-2 rounded bg-blue-50 border border-blue-100"><span className="font-bold text-blue-700">PII / SENSITIVE</span><br/>LR-3 • 42k assets</div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200"><span className="font-bold text-slate-700">PUBLIC / GENERAL</span><br/>LR-1 • 67k assets</div>
               </div>
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
                      <span className="text-slate-300">Event Stream (Kafka)</span>
                      <span className="text-amber-400">Syncing</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1">
                      <div className="bg-amber-400 h-1 rounded-full w-4/5"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 text-xs text-slate-500 border-t border-slate-800 pt-4">
                 v2.1 Data-Aware Runtime
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
             <table className="w-full text-left text-sm text-slate-600">
               <thead>
                 <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold bg-slate-50">
                   <th className="py-3 px-4 rounded-tl-lg">Event ID</th>
                   <th className="py-3 px-4">Action</th>
                   <th className="py-3 px-4">Asset ID</th>
                   <th className="py-3 px-4">Classified As</th>
                   <th className="py-3 px-4 rounded-tr-lg">Timestamp</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 <tr className="hover:bg-slate-50 transition-colors">
                   <td className="py-3 px-4 font-mono text-xs">evt_3mP82x</td>
                   <td className="py-3 px-4"><span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">auto_tagged</span></td>
                   <td className="py-3 px-4 font-mono text-xs text-slate-500">asset_90xLk</td>
                   <td className="py-3 px-4 flex gap-1"><span className="inline-block border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">PII</span><span className="inline-block border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">INTERNAL</span></td>
                   <td className="py-3 px-4 text-slate-400">2 min ago</td>
                 </tr>
                 <tr className="hover:bg-slate-50 transition-colors">
                   <td className="py-3 px-4 font-mono text-xs">evt_8xK19m</td>
                   <td className="py-3 px-4"><span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium">manual_tagged</span></td>
                   <td className="py-3 px-4 font-mono text-xs text-slate-500">asset_44pB2</td>
                   <td className="py-3 px-4 flex gap-1"><span className="inline-block border border-red-200 px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold tracking-wide">CONFIDENTIAL</span></td>
                   <td className="py-3 px-4 text-slate-400">14 min ago</td>
                 </tr>
               </tbody>
             </table>
          </div>
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
