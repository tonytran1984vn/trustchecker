"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { AlertTriangle, Activity, Loader2, Play, Clock, X } from "lucide-react";

export default function SystemicStressPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultType, setResultType] = useState<string>("");

  const [selectedScenario, setSelectedScenario] = useState("ES-01");
  const [carPct, setCarPct] = useState(12);
  const [revenueUsd, setRevenueUsd] = useState(500000);
  const [execMode, setExecMode] = useState("dry-run");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetcher("/api/stress/scenarios").catch(() => null);
        if (data && data.scenarios && Array.isArray(data.scenarios)) {
          setScenarios(data.scenarios);
        } else if (data && Array.isArray(data)) {
          setScenarios(data);
        } else {
          setScenarios([
            { id: "ES-01", name: "Carbon Price Collapse" },
            { id: "ES-02", name: "Global Supply Chain Disruption" }
          ]);
        }
      } catch {
        setScenarios([
          { id: "ES-01", name: "Carbon Price Collapse" },
          { id: "ES-02", name: "Global Supply Chain Disruption" }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setResult(null);
    setResultType("stress");
    try {
      const res = await fetcher("/api/stress/run", {
        method: "POST",
        body: JSON.stringify({ scenario_id: selectedScenario, car_pct: carPct, revenue_usd: revenueUsd, execute_mode: execMode })
      });
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message || "Simulation failed" });
    } finally {
      setIsRunning(false);
    }
  };

  const loadLatencyModel = async () => {
    setIsRunning(true);
    setResult(null);
    setResultType("latency");
    try {
      const data = await fetcher("/api/stress/decision-latency");
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-12 flex justify-center items-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Systemic Stress Testing</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Simulate Capital Adequacy drops and network collapse to evaluate resiliency of the settlement pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Simulation Control */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-fit mb-3">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Target Simulation</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure and execute a systemic stress test scenario.</p>

          <form onSubmit={runSimulation} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Attack Vector</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-2 text-sm outline-none"
              >
                <optgroup label="Level 1: Base Scenarios">
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Level 2: Adaptive">
                  <option value="ES-AUTO-COMPOSITE" className="font-bold text-indigo-600 dark:text-indigo-400">
                    ⚡ MULTI-FAILURE CASCADE (Auto-Generate)
                  </option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">CAR Base %</label>
              <input type="number" value={carPct} onChange={(e) => setCarPct(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-2 text-sm outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Revenue At Risk (USD)</label>
              <input type="number" value={revenueUsd} onChange={(e) => setRevenueUsd(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-2 text-sm outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Execution Mode</label>
              <select
                value={execMode}
                onChange={(e) => setExecMode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-2 text-sm outline-none font-bold"
              >
                <option value="dry-run">Dry-Run (Simulate Only)</option>
                <option value="staged">Staged (Sandbox DB Test)</option>
                <option value="commit">Commit (Live Execution)</option>
              </select>
            </div>
            <button type="submit" disabled={isRunning}
              className={`w-full py-2 rounded-[4px] text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-transparent ${isRunning ? "bg-[#1A80F8] text-white shadow-sm" : "bg-blue-50 hover:bg-[#1A80F8] text-[#1A80F8] hover:text-white dark:bg-slate-800 dark:text-slate-300"}`}>
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Simulating..." : "Execute Stress Test"}
            </button>
          </form>
        </div>

        {/* Scenarios */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] flex flex-col h-full">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 w-fit mb-3 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Available Scenarios</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Institutional-Grade Risk Lab.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded">PHASE 2</span>
          </div>
          
          <div className="mt-4 flex-1 min-h-[200px] max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            <ul className="space-y-3">
              {/* Magic Level 2 Item */}
              <li className="text-sm bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-2 rounded-lg flex items-start gap-2 mb-4">
                <span className="text-indigo-500 mt-0.5">⚡</span>
                <div className="flex-1">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400 block">Level 2: Composite Auto-Gen</span>
                  <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Dynamically layers 2-3 single-event failures to test cascade immunity.</span>
                </div>
              </li>
              
              {scenarios.map(s => (
                <li key={s.id} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2 border-b border-slate-50 dark:border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-500 mt-0.5">{s.id}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">{s.name}</span>
                    {s.category && <span className="text-[10px] uppercase font-bold text-slate-400">{s.category} Risk</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Latency Model */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.03)]">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-fit mb-3">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Decision Latency Model</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Network propagation delay and cascade failure timing analysis.</p>
          <button onClick={loadLatencyModel} disabled={isRunning}
            className={`mt-4 w-full py-2 rounded-[4px] text-sm font-bold transition-colors disabled:opacity-50 ${
              isRunning && resultType === "latency" ? "bg-[#1A80F8] text-white shadow-sm border border-transparent" : "bg-blue-50 hover:bg-blue-100 text-[#1A80F8] border border-transparent dark:bg-slate-800 dark:text-slate-300"
            }`}>
            {isRunning && resultType === "latency" ? "Loading..." : "Load Latency Model"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          {resultType === "latency" ? "Decision Latency Analysis" : "Simulation Results"}
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] overflow-hidden">
          {isRunning ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Processing analysis...</p>
            </div>
          ) : !result ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No simulation executed yet. Configure parameters and click &quot;Execute Stress Test&quot; or &quot;Load Latency Model&quot;.
            </div>
          ) : result.error ? (
            <div className="p-6 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-sm">{String(result.error)}</div>
          ) : resultType === "latency" ? (
            <LatencyReport data={result} />
          ) : (
            <div className="space-y-6">
              <StressReport data={result} />
              {result?.scenario?.scenario_hash && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <ObservabilityTower scenarioHash={result.scenario.scenario_hash} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StressReport({ data }: { data: any }) {
  const scenarioName = data.scenario?.name || data.scenario_id || "Unknown";
  const scenarioId = data.scenario?.id || data.scenario_id || "—";
  const category = data.scenario?.category || "—";
  const preCAR = data.pre_stress?.car_pct ?? "—";
  const postCAR = data.post_stress?.car_pct ?? "—";
  const preRevenue = data.pre_stress?.annual_revenue ?? 0;
  const postRevenue = data.post_stress?.annual_revenue ?? 0;
  const revLossPct = data.post_stress?.revenue_loss_pct ?? 0;
  const carBreached = data.car_breached ?? false;
  const killSwitches = data.kill_switches_triggered || [];

  return (
    <div className="p-6 space-y-5">
      {/* Scenario Header */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{scenarioName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{scenarioId}</span>
              <span className="text-xs text-slate-500">{category}</span>
              {data.scenario?.scenario_hash && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800" title="Deterministic Seed: {data.scenario?.seed}">
                    HASH: {data.scenario.scenario_hash}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.probability && (
              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-bold">P: {String(data.probability)}</span>
            )}
            {data.severity && (
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                data.severity === "Existential" || data.severity === "Critical" ? "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400" :
                data.severity === "High" ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-100 text-orange-700" : "bg-yellow-50 border border-yellow-100 text-yellow-700"
              }`}>{String(data.severity)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pre-Stress CAR</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{String(preCAR)}%</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Post-Stress CAR</div>
          <div className={`text-2xl font-bold mt-1 ${carBreached ? "text-red-600" : "text-emerald-600"}`}>
            {String(postCAR)}%
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Revenue Loss</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{String(revLossPct)}%</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">CAR Status</div>
          <div className="mt-1">
            <span className={`px-2 py-1 rounded text-xs font-bold ${carBreached ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
              {carBreached ? "BREACHED" : "HEALTHY"}
            </span>
          </div>
        </div>
      </div>

      {/* Fragility Index (L5 Feature) */}
      {data.fragility_index !== undefined && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Fragility Index (System Resilience)</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{data.fragility_index} / 100</div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full ${data.fragility_index < 30 ? 'bg-emerald-500' : data.fragility_index < 60 ? 'bg-yellow-400' : data.fragility_index < 85 ? 'bg-orange-500' : 'bg-red-600'}`} style={{ width: `${data.fragility_index}%` }}></div>
          </div>
          {data.fragility_index >= 85 && <div className="text-xs text-red-500 mt-2 font-semibold">Tipping Point Breached: Sovereign Cascade Inevitable.</div>}
        </div>
      )}

      {/* Revenue Impact */}
      <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4">
        <div className="text-xs text-red-600 dark:text-red-400 uppercase font-bold tracking-wider mb-2">Revenue Impact</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-red-500">Pre-Stress Revenue</div>
            <div className="text-lg font-bold text-red-800 dark:text-red-300">${Number(preRevenue).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-red-500">Post-Stress Revenue</div>
            <div className="text-lg font-bold text-red-800 dark:text-red-300">${Number(postRevenue).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Kill Switches */}
      {killSwitches.length > 0 && (
        <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 uppercase font-bold tracking-wider mb-2">Kill Switches Triggered</div>
          <div className="flex flex-wrap gap-2">
            {killSwitches.map((ks: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded font-mono text-sm font-bold">{String(ks)}</span>
            ))}
          </div>
        </div>
      )}

      {/* Cascading Effects */}
      {data.cascading_effects && Array.isArray(data.cascading_effects) && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
          <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-2">Cascading Effects</div>
          <ul className="space-y-1">
            {data.cascading_effects.map((e: any, i: number) => (
              <li key={i} className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">→</span>
                <span>{String(e)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Temporal Timeline (L5 State Machine) */}
      {data.temporal_state && data.temporal_state.horizon && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Temporal Progression Horizon</div>
            <span className="text-[10px] font-bold px-2 py-1 bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/30 rounded">V3.1 STATE MACHINE</span>
          </div>
          <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6">
            {data.temporal_state.horizon.map((hKey: string, i: number) => {
              const step = data.temporal_state.states[hKey];
              if (!step) return null;
              return (
                <div key={i} className="relative pl-6">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-slate-50 dark:ring-slate-900"></span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{hKey}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{step.events.join(' → ')}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    <span className="text-slate-500">CAR: <strong className="text-slate-700 dark:text-slate-300">{step.metrics.car_pct.toFixed(2)}%</strong></span>
                    <span className="text-slate-500">Rev Loss: <strong className="text-orange-600">{step.metrics.revenue_loss_pct.toFixed(1)}%</strong></span>
                    <span className="text-slate-500">Trust Decay: <strong className="text-red-600">{step.metrics.trust_decay.toFixed(2)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution Logs (L5) */}
      {data.execution_logs && data.execution_logs.length > 0 && (
        <div className="bg-[#0f172a] rounded-lg p-5 border border-slate-800 shadow-inner overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <div className="text-xs text-slate-300 uppercase font-bold tracking-wider font-mono">Autonomous Execution Layer</div>
          </div>
          <div className="font-mono text-xs text-emerald-400/90 whitespace-pre-wrap">
            {data.execution_logs.join('\n')}
          </div>
        </div>
      )}

      {/* Affected Systems */}
      {data.affected_systems && Array.isArray(data.affected_systems) && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Affected Systems</div>
          <div className="flex flex-wrap gap-2">
            {data.affected_systems.map((s: any, i: number) => (
              <span key={i} className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-mono">{String(s)}</span>
            ))}
          </div>
        </div>
      )}

      {/* Survival Plan */}
      {data.survival && (
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-4">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider mb-1">Survival Plan</div>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold">{String(data.survival)}</p>
        </div>
      )}
    </div>
  );
}

function LatencyReport({ data }: { data: any }) {
  return (
    <div className="p-6 space-y-4">
      {data.title && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 dark:text-blue-300">{String(data.title)}</h3>
          {data.principle && <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">{String(data.principle)}</p>}
        </div>
      )}

      {data.events && Array.isArray(data.events) && (
        <div className="space-y-3">
          {data.events.map((event: any, i: number) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{String(event.event)}</span>
                  {event.tier && <span className="ml-2 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold">{String(event.tier)}</span>}
                </div>
              </div>
              {event.decision_path && Array.isArray(event.decision_path) && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {event.decision_path.map((step: any, j: number) => (
                    <div key={j} className="px-4 py-2 flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">{String(step.step)}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white">{String(step.action)}</span>
                        {step.authority && <span className="ml-2 text-xs text-slate-500">by {String(step.authority)}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {step.max_time && <span className="text-xs text-slate-400"><Clock className="w-3 h-3 inline mr-1" />{String(step.max_time)}</span>}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step.human ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                          {step.human ? "H" : "A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(event.ivu_can_block || event.ceo_can_override !== undefined) && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex gap-4 text-xs">
                  {event.ivu_can_block !== undefined && (
                    <span className={event.ivu_can_block ? "text-red-600 font-bold" : "text-slate-400"}>
                      IVU Block: {event.ivu_can_block ? "YES" : "NO"}
                    </span>
                  )}
                  {event.ceo_can_override !== undefined && (
                    <span className={event.ceo_can_override ? "text-orange-600 font-bold" : "text-slate-400"}>
                      CEO Override: {event.ceo_can_override ? "YES" : "NO"}
                    </span>
                  )}
                  {event.rationale && <span className="text-slate-500 italic ml-auto">{String(event.rationale)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.latency_sla && (
        <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 uppercase font-bold tracking-wider mb-2">Governance SLA</div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.latency_sla).map(([key, val]) => (
              <div key={key} className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900/30 rounded p-2">
                <div className="text-xs text-orange-500 uppercase font-bold">{key.replace(/_/g, " ")}</div>
                <div className="text-sm font-semibold text-orange-800 dark:text-orange-300 mt-0.5">{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ObservabilityTower({ scenarioHash }: { scenarioHash: string }) {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [maxSeq, setMaxSeq] = useState<number>(0);
  const [targetSeq, setTargetSeq] = useState<number>(0);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await fetcher(`/api/v5/observability/timeline/${scenarioHash}`);
      if (!data.error) {
        setTimeline(data.events || []);
        setMaxSeq(data.max_sequence || 0);
        setTargetSeq(data.max_sequence || 0);
        setPendingApprovals(data.pending_approvals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scenarioHash) loadTimeline();
  }, [scenarioHash]);

  const calculateDiff = async () => {
    setDiffLoading(true);
    try {
      const data = await fetcher('/api/v5/observability/diff', {
        method: 'POST',
        body: JSON.stringify({ scenario_hash: scenarioHash, until_sequence_no: targetSeq })
      });
      setDiffResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDiffLoading(false);
    }
  };

  const executeRollback = async () => {
    try {
      await fetcher('/api/v5/observability/execute', {
        method: 'POST',
        body: JSON.stringify({ scenario_hash: scenarioHash, until_sequence_no: targetSeq, mode: 'commit' })
      });
      loadTimeline();
    } catch (e) {
      console.error(e);
    }
  };

  const signRequest = async (request_id: string, role: string) => {
    try {
      await fetcher('/api/v5/observability/sign', {
        method: 'POST',
        body: JSON.stringify({ request_id, actor: { role, user_id: `${role}-123`, org_id: 'GLOBAL' } })
      });
      loadTimeline();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pt-6 relative">
      <div className="absolute top-0 right-0 p-2 text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-b">V5 CONTROL TOWER</div>
      <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-500" /> Temporal Radar
      </h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">Event Sourced Timeline & Diff Engine</p>

      {loading ? (
        <div className="py-8 text-center text-slate-400 flex flex-col items-center"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs mt-2">Connecting to Risk Memory...</span></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Timeline */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-500 tracking-wider">EVENT STREAM HORIZON</span>
                <span className="text-xs font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">MAX SEQ: {maxSeq}</span>
              </div>
              <div className="relative py-12 flex items-center overflow-x-auto min-h-[140px] custom-scrollbar px-6">
                <div className="absolute h-1 bg-slate-300 dark:bg-slate-700 w-full top-1/2 -translate-y-1/2 left-0 rounded-full z-0"></div>
                {timeline.length === 0 ? <div className="text-slate-400 text-sm z-10 bg-slate-50 dark:bg-slate-900 px-2">No timeline data found</div> : null}
                {timeline.map((e, idx) => {
                  const isKS = String(e.type).includes('KILL_SWITCH');
                  const isRB = String(e.type).includes('ROLLBACK');
                  return (
                    <div key={idx} 
                      onClick={() => { setTargetSeq(e.sequence); calculateDiff(); }}
                      className={`relative z-10 shrink-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm cursor-pointer hover:scale-150 transition-transform mr-12 ${isKS ? 'bg-red-500 w-5 h-5 ring-2 ring-red-200 dark:ring-red-900' : isRB ? 'bg-amber-400' : 'bg-indigo-500'}`}>
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded shadow-sm">#{e.sequence}</div>
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-slate-500">{String(e.type).replace('_TRIGGERED','').replace('_EXECUTED','').substring(0, 15)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <input type="number" min={0} max={maxSeq} value={targetSeq} onChange={e => setTargetSeq(parseInt(e.target.value)||0)} className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm text-center font-mono outline-indigo-500" />
                <button onClick={calculateDiff} disabled={diffLoading} className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400 rounded text-sm font-bold transition-colors disabled:opacity-50">
                  {diffLoading ? '...' : 'Compute Mock Diff'}
                </button>
                <button onClick={executeRollback} className="px-3 py-1 ml-auto bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 rounded text-sm font-bold transition-colors">
                  <Play className="w-3 h-3 inline mr-1" /> Revert Stream
                </button>
              </div>
            </div>

            {/* Diff Engine Result */}
            {diffResult && (
              <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-5 shadow-sm">
                <div className="text-xs font-bold text-emerald-600 tracking-wider mb-3">STATE DIFF ENGINE (T0 → T-{diffResult.target_sequence})</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-bold">EVENTS REMOVED</span>
                    <span className="text-xl font-bold font-mono text-red-500">-{diffResult.metrics_diff?.events_dropped}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-bold">INTEGRITY CHECK</span>
                    <span className="text-sm font-bold font-mono text-emerald-600 mt-2 block">{diffResult.metrics_diff?.status}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] text-slate-500 font-bold">STATE FALLBACK</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Valid</span>
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* Approvals */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 h-full shadow-[0_3px_4px_0_rgba(0,0,0,0.03)] flex flex-col">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-4">
                <span>Pending Governance</span>
                {pendingApprovals.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingApprovals.length}</span>}
              </h4>
              
              <div className="space-y-3 flex-1 overflow-y-auto">
                {pendingApprovals.length === 0 ? (
                  <div className="text-slate-400 text-sm italic py-4 text-center">No multi-sig actions required</div>
                ) : pendingApprovals.map((req: any, i: number) => (
                  <div key={i} className={`p-3 rounded border-l-4 ${req.status === 'COMMITTED' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/10'}`}>
                    <div className="text-xs font-bold text-slate-800 dark:text-white mb-1">{String(req.target_action)}</div>
                    <div className="text-[10px] text-slate-500 mb-2">Signature: {req.signatures?.length || 0} / {req.required_signatures}</div>
                    
                    {req.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button onClick={() => signRequest(req.request_id, 'risk_chair')} className="flex-1 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Risk Chair Sign</button>
                        <button onClick={() => signRequest(req.request_id, 'cto')} className="flex-1 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">CTO Sign</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
