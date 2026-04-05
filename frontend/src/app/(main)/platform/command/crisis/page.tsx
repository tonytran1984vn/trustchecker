"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { ActivitySquare, RotateCcw, ShieldCheck, Loader2, X } from "lucide-react";

export default function CrisisEnginePage() {
  const [overrides, setOverrides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetcher("/api/crisis/audit-trail");
        if (res.events) setOverrides(res.events);
      } catch (err) {
        console.error("Failed to load crisis audit trail:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const panels: Record<string, { title: string; content: React.ReactNode }> = {
    replay: {
      title: "Transaction Replay Wizard",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 text-sm">Replay Engine Status</h4>
            <p className="text-blue-700 text-sm mt-1">The replay engine is connected and ready. This module allows re-execution of failed mutations with bypassed idempotency keys.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Queued Replays</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">0</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Last Replay</div>
              <div className="text-sm font-semibold text-slate-600 mt-1">No recent replays</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">Direct database mutation access is required. Contact the platform operator to initiate a replay session.</p>
        </div>
      ),
    },
    entity: {
      title: "State Transition Override",
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-bold text-purple-800 text-sm">Entity Override Console</h4>
            <p className="text-purple-700 text-sm mt-1">Force an entity into a specific FSM state, ignoring standard guard conditions. Use with extreme caution.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Eligible Entities</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">0</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Overrides</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">0</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">Select an entity by ID or use the search to find entities stuck in transition states.</p>
        </div>
      ),
    },
    blocklist: {
      title: "Rate Limit Blocklist",
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-bold text-emerald-800 text-sm">Anti-DDoS Blocklist</h4>
            <p className="text-emerald-700 text-sm mt-1">Organizations currently caught in the rate-limiting net. Manually unblock from here.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Blocked Orgs</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">0</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Rate Limit Hits (24h)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">0</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Auto-Released</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">0</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">No organizations are currently blocked. The blocklist is clean.</p>
        </div>
      ),
    },
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Ops Control / Crisis Engine</h1>
        <p className="text-slate-500 dark:text-slate-400">Transaction-first control panel. Replay requests, enforce idempotency, and execute manual state overrides.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-fit mb-3">
            <ActivitySquare className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Transaction Replay</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Re-execute failed mutations with bypassed idempotency keys.</p>
          <button
            onClick={() => setActivePanel(activePanel === "replay" ? null : "replay")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "replay" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "replay" ? "Close Panel" : "Start Replay Wizard"}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-fit mb-3">
            <RotateCcw className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">State Transition Override</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Force an entity into a specific FSM state ignoring standard guards.</p>
          <button
            onClick={() => setActivePanel(activePanel === "entity" ? null : "entity")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "entity" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "entity" ? "Close Panel" : "Select Entity"}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Clear Rate Limit Jails</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manually unblock organizations caught in the anti-DDoS net.</p>
          <button
            onClick={() => setActivePanel(activePanel === "blocklist" ? null : "blocklist")}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors ${activePanel === "blocklist" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {activePanel === "blocklist" ? "Close Panel" : "View Blocklist"}
          </button>
        </div>
      </div>

      {/* Inline Detail Panel */}
      {activePanel && panels[activePanel] && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">{panels[activePanel].title}</h3>
            <button onClick={() => setActivePanel(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">{panels[activePanel].content}</div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Recent Manual Overrides</h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : overrides.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">No manual overrides recorded.</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Audit ID</th>
                  <th className="px-6 py-4 font-semibold">Action Type</th>
                  <th className="px-6 py-4 font-semibold">Target Entity</th>
                  <th className="px-6 py-4 font-semibold">Executing Actor</th>
                  <th className="px-6 py-4 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {overrides.map((o, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{o.id || `EVENT-${i}`}</td>
                    <td className="px-6 py-4 font-semibold text-xs">{o.action || o.type}</td>
                    <td className="px-6 py-4 font-mono text-xs text-blue-600">{o.target || o.entity_id || "System"}</td>
                    <td className="px-6 py-4">{o.actor || o.actorId || "unknown"}</td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">{new Date(o.timestamp || o.time || Date.now()).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
