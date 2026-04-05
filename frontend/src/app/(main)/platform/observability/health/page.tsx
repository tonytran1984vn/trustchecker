"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Cpu, HardDrive, MemoryStick, Activity,
  Database, Globe, Zap, AlertTriangle, CheckCircle2,
  XCircle, Clock, Server, Wifi, BarChart3, TrendingUp,
  ScanLine, Users, ShieldCheck, ArrowUpRight
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";

// ── Types ───────────────────────────────────────────────────────────
interface InfraHealth {
  hostname: string; platform: string; cpus: number;
  load_avg: number[]; total_memory: string; free_memory: string;
  pid: number; uptime_seconds: number; node_version: string;
  rss: string; heap_used: string; heap_total: string;
}

interface DBHealth {
  status: string; latency_ms: number;
  connections: { active: number; total: number };
  slow_queries: { query: string; calls: number; avg_ms: number; total_ms: number }[];
  table_sizes: { table_name: string; size: string }[];
}

interface BusinessHealth {
  total_scans: number; scans_today: number;
  total_products: number; active_tenants: number;
  total_fraud_alerts: number; open_fraud_alerts: number;
  fraud_rate_percent: number; avg_trust_score: number;
  total_users: number;
}

type HealthState = "healthy" | "degraded" | "partial_outage" | "full_outage";

// ── Helpers ─────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function parseMB(str: string): number {
  return parseInt(str?.replace("MB", "") || "0");
}

function pctBar(pct: number, color: string) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex w-2.5 h-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
  );
}

// ── Panel Card ──────────────────────────────────────────────────────
function Panel({ title, icon: Icon, state, children }: {
  title: string; icon: any; state: HealthState; children: React.ReactNode;
}) {
  const stateConfig = {
    healthy: { label: "Healthy", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
    degraded: { label: "Degraded", bg: "bg-amber-100", text: "text-amber-700", icon: AlertTriangle },
    partial_outage: { label: "Partial Outage", bg: "bg-orange-100", text: "text-orange-700", icon: AlertTriangle },
    full_outage: { label: "Outage", bg: "bg-red-100", text: "text-red-700", icon: XCircle },
  };
  const cfg = stateConfig[state];
  const StateIcon = cfg.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-slate-100"><Icon className="w-4 h-4 text-slate-600" /></div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
          <StateIcon className="w-3 h-3" />
          {cfg.label}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Metric Row ──────────────────────────────────────────────────────
function MetricRow({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-bold ${warn ? "text-red-600" : "text-slate-800"}`}>{value}</span>
        {sub && <span className="text-[10px] text-slate-400 ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SystemHealthPage() {
  const [infra, setInfra] = useState<InfraHealth | null>(null);
  const [db, setDb] = useState<DBHealth | null>(null);
  const [biz, setBiz] = useState<BusinessHealth | null>(null);
  const [overallState, setOverallState] = useState<HealthState>("healthy");
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [deep, dashStats] = await Promise.all([
        fetcher("/api/platform/system-health"),
        fetcher("/api/platform/dashboard-stats"),
      ]);

      // Infra + Runtime
      if (deep.checks) {
        setInfra({
          hostname: deep.checks.system?.hostname || "unknown",
          platform: deep.checks.system?.platform || "unknown",
          cpus: deep.checks.system?.cpus || 0,
          load_avg: deep.checks.system?.load_avg || [0, 0, 0],
          total_memory: deep.checks.system?.total_memory || "0MB",
          free_memory: deep.checks.system?.free_memory || "0MB",
          pid: deep.checks.process?.pid || 0,
          uptime_seconds: deep.checks.process?.uptime_seconds || 0,
          node_version: deep.checks.process?.node_version || "unknown",
          rss: deep.checks.process?.rss || "0MB",
          heap_used: deep.checks.process?.heap_used || "0MB",
          heap_total: deep.checks.process?.heap_total || "0MB",
        });

        setDb({
          status: deep.checks.database?.status || "unknown",
          latency_ms: deep.checks.database?.latency_ms || 0,
          connections: deep.checks.connections || { active: 0, total: 0 },
          slow_queries: Array.isArray(deep.checks.slow_queries) ? deep.checks.slow_queries : [],
          table_sizes: Array.isArray(deep.checks.table_sizes) ? deep.checks.table_sizes : [],
        });
      }

      // Business health from dashboard-stats
      if (dashStats.kpi) {
        setBiz({
          total_scans: dashStats.kpi.total_scans || 0,
          scans_today: dashStats.kpi.scans_today || 0,
          total_products: dashStats.kpi.total_products || 0,
          active_tenants: dashStats.kpi.active_tenants || 0,
          total_fraud_alerts: dashStats.kpi.total_fraud_alerts || 0,
          open_fraud_alerts: dashStats.kpi.open_fraud_alerts || 0,
          fraud_rate_percent: dashStats.kpi.fraud_rate_percent || 0,
          avg_trust_score: dashStats.kpi.avg_trust_score || 0,
          total_users: dashStats.kpi.total_users || 0,
        });
      }

      // Determine overall state
      const dbOk = deep.checks?.database?.status === "ok";
      const latencyOk = (deep.checks?.database?.latency_ms || 0) < 200;
      const memTotal = parseMB(deep.checks?.system?.total_memory || "0MB");
      const memFree = parseMB(deep.checks?.system?.free_memory || "0MB");
      const memPct = memTotal > 0 ? ((memTotal - memFree) / memTotal) * 100 : 0;

      if (!dbOk) setOverallState("full_outage");
      else if (memPct > 90 || !latencyOk) setOverallState("degraded");
      else setOverallState("healthy");

      setLastChecked(new Date());
    } catch (err) {
      console.error(err);
      setOverallState("full_outage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  if (loading) return <div className="flex-1 flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  // ── Derived values ────────────────────────────────────────────
  const memTotal = parseMB(infra?.total_memory || "0MB");
  const memFree = parseMB(infra?.free_memory || "0MB");
  const memUsed = memTotal - memFree;
  const memPct = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

  const heapUsed = parseMB(infra?.heap_used || "0MB");
  const heapTotal = parseMB(infra?.heap_total || "0MB");
  const heapPct = heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 100) : 0;

  const loadPerCore = infra ? (infra.load_avg[0] / Math.max(1, infra.cpus)) * 100 : 0;

  const overallColor = overallState === "healthy" ? "emerald" : overallState === "degraded" ? "amber" : "red";
  const overallDot = overallState === "healthy" ? "bg-emerald-500" : overallState === "degraded" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500">Resource · Service · Dependency · Business — Production-grade observability</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="px-3 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            ↻ Refresh
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${overallDot} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${overallDot}`} />
            </span>
            <span className={`text-xs font-bold uppercase tracking-widest text-${overallColor}-600`}>
              {overallState === "healthy" ? "All Systems Operational" : overallState === "degraded" ? "Degraded" : "Outage"}
            </span>
          </div>
          {lastChecked && (
            <span className="text-[10px] text-slate-400 font-mono">
              Checked {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── 4-PANEL GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ═══ PANEL 1: INFRA HEALTH ═══════════════════════════ */}
        <Panel
          title="Infrastructure Health"
          icon={Server}
          state={memPct > 90 || loadPerCore > 90 ? "degraded" : "healthy"}
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* CPU */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">CPU</span>
              </div>
              <p className="text-xl font-black text-slate-800">{infra?.cpus || 0} <span className="text-xs font-normal text-slate-400">cores</span></p>
              <p className="text-[10px] text-slate-400 mt-1">Load: {infra?.load_avg?.join(" / ") || "—"}</p>
              {pctBar(loadPerCore, loadPerCore > 80 ? "bg-red-500" : loadPerCore > 50 ? "bg-amber-500" : "bg-emerald-500")}
              <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(loadPerCore)}% per core</p>
            </div>

            {/* Memory */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className="w-4 h-4 text-violet-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Memory</span>
              </div>
              <p className="text-xl font-black text-slate-800">{memUsed} <span className="text-xs font-normal text-slate-400">/ {memTotal} MB</span></p>
              {pctBar(memPct, memPct > 85 ? "bg-red-500" : memPct > 60 ? "bg-amber-500" : "bg-emerald-500")}
              <p className="text-[10px] text-slate-400 mt-0.5">{memPct}% used · {memFree} MB free</p>
            </div>
          </div>

          <MetricRow label="Hostname" value={infra?.hostname || "—"} />
          <MetricRow label="Platform" value={infra?.platform || "—"} />
          <MetricRow label="Uptime" value={fmtUptime(infra?.uptime_seconds || 0)} />
          <MetricRow label="PID" value={infra?.pid || "—"} />
        </Panel>

        {/* ═══ PANEL 2: SERVICE HEALTH (Runtime) ═══════════════ */}
        <Panel
          title="Service Health"
          icon={Zap}
          state={heapPct > 85 ? "degraded" : "healthy"}
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Node.js Runtime */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Node.js Runtime</span>
              </div>
              <p className="text-xl font-black text-slate-800">{infra?.node_version || "—"}</p>
              <p className="text-[10px] text-slate-400 mt-1">RSS: {infra?.rss || "—"}</p>
            </div>

            {/* Heap */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">V8 Heap</span>
              </div>
              <p className="text-xl font-black text-slate-800">{heapUsed} <span className="text-xs font-normal text-slate-400">/ {heapTotal} MB</span></p>
              {pctBar(heapPct, heapPct > 85 ? "bg-red-500" : heapPct > 60 ? "bg-amber-500" : "bg-emerald-500")}
              <p className="text-[10px] text-slate-400 mt-0.5">{heapPct}% heap utilization</p>
            </div>
          </div>

          <MetricRow label="Process Uptime" value={fmtUptime(infra?.uptime_seconds || 0)} />
          <MetricRow label="RSS Memory" value={infra?.rss || "—"} />
          <MetricRow label="Heap Used" value={infra?.heap_used || "—"} />
          <MetricRow label="Heap Total" value={infra?.heap_total || "—"} />
        </Panel>

        {/* ═══ PANEL 3: DEPENDENCY HEALTH ══════════════════════ */}
        <Panel
          title="Dependency Health"
          icon={Database}
          state={
            db?.status !== "ok" ? "full_outage"
            : (db?.latency_ms || 0) > 100 ? "degraded"
            : "healthy"
          }
        >
          {/* DB Status */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
            <StatusDot ok={db?.status === "ok"} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">PostgreSQL</p>
              <p className="text-[10px] text-slate-400">Primary database</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-black ${(db?.latency_ms || 0) > 50 ? "text-amber-600" : "text-emerald-600"}`}>{db?.latency_ms || "—"}<span className="text-xs font-normal text-slate-400">ms</span></p>
              <p className="text-[10px] text-slate-400">latency</p>
            </div>
          </div>

          <MetricRow label="Status" value={db?.status === "ok" ? "Connected" : "Error"} warn={db?.status !== "ok"} />
          <MetricRow label="Active Connections" value={db?.connections?.active || 0} warn={(db?.connections?.active || 0) > 20} />
          <MetricRow label="Total Connections" value={db?.connections?.total || 0} />

          {/* Slow Queries */}
          {db?.slow_queries && db.slow_queries.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Slow Queries (Top 5)</p>
              <div className="space-y-1.5 max-h-32 overflow-auto">
                {db.slow_queries.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-[10px]">
                    <span className="text-slate-500 truncate max-w-[200px] font-mono">{q.query}</span>
                    <span className={`font-bold ${q.avg_ms > 50 ? "text-red-600" : "text-slate-600"}`}>{q.avg_ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table sizes */}
          {db?.table_sizes && db.table_sizes.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Largest Tables</p>
              <div className="space-y-1">
                {db.table_sizes.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5 text-[10px]">
                    <span className="text-slate-500 font-mono">{t.table_name}</span>
                    <span className="font-bold text-slate-700">{t.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* ═══ PANEL 4: BUSINESS HEALTH ═══════════════════════ */}
        <Panel
          title="Business Health"
          icon={BarChart3}
          state={
            (biz?.fraud_rate_percent || 0) > 5 ? "degraded"
            : (biz?.avg_trust_score || 100) < 50 ? "partial_outage"
            : "healthy"
          }
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-cyan-50 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-cyan-700">{fmtNum(biz?.total_scans || 0)}</p>
              <p className="text-[10px] text-cyan-600 font-semibold uppercase">Total Scans</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-emerald-700">{biz?.avg_trust_score || "—"}</p>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Avg Trust</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-red-700">{biz?.fraud_rate_percent || 0}%</p>
              <p className="text-[10px] text-red-600 font-semibold uppercase">Fraud Rate</p>
            </div>
          </div>

          <MetricRow label="Scans Today" value={fmtNum(biz?.scans_today || 0)} />
          <MetricRow label="Total Products" value={fmtNum(biz?.total_products || 0)} />
          <MetricRow label="Active Tenants" value={biz?.active_tenants || 0} />
          <MetricRow label="Total Users" value={fmtNum(biz?.total_users || 0)} />
          <MetricRow label="Total Fraud Alerts" value={fmtNum(biz?.total_fraud_alerts || 0)} />
          <MetricRow label="Open Fraud Alerts" value={biz?.open_fraud_alerts || 0} warn={(biz?.open_fraud_alerts || 0) > 50} />
        </Panel>
      </div>

      {/* ── FOOTER: Health Endpoints ────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Health Check Endpoints</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "/healthz", desc: "Liveness probe (shallow)", type: "GET" },
            { name: "/healthz?deep=true", desc: "Deep check — DB, memory, connections", type: "GET" },
            { name: "/healthz/ready", desc: "Readiness probe — DB connection", type: "GET" },
          ].map((ep) => (
            <div key={ep.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-700">{ep.type}</span>
              <div>
                <p className="text-xs font-mono font-bold text-slate-700">{ep.name}</p>
                <p className="text-[10px] text-slate-400">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
