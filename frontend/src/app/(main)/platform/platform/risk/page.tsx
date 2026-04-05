"use client";

import {
  Activity, Server, Users, AlertTriangle, Loader2,
  ShieldCheck, Ban, Leaf, BarChart3, ScanLine,
  Package, TrendingUp, Zap, Globe, AlertCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

interface KPI {
  active_tenants: number; suspended_tenants: number;
  total_users: number; platform_admins: number; org_users: number;
  total_products: number; new_products_30d: number;
  total_scans: number; scans_today: number; scans_7d: number; scans_30d: number;
  total_fraud_alerts: number; open_fraud_alerts: number;
  fraud_rate_percent: number; avg_fraud_score: number;
  total_carbon_kgco2e: number; avg_sustainability_score: number;
  sustainability_assessed_products: number;
  avg_trust_score: number; open_anomalies: number; system_health: number;
}

interface Anomaly { id: string; type: string; tenant: string; time: string; status: string; severity: string; }
interface TopOrg { name: string; plan: string; product_count: number; }

export default function PlatformDashboard() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [scanBreakdown, setScanBreakdown] = useState<Record<string, number>>({});
  const [riskDecisions, setRiskDecisions] = useState<{ decision: string; count: number }[]>([]);
  const [topOrgs, setTopOrgs] = useState<TopOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetcher("/api/platform/dashboard-stats");
        if (d.kpi) setKpi(d.kpi);
        if (d.anomalies) setAnomalies(d.anomalies);
        if (d.scan_breakdown) setScanBreakdown(d.scan_breakdown);
        if (d.risk_decisions) setRiskDecisions(d.risk_decisions);
        if (d.top_orgs) setTopOrgs(d.top_orgs);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, []);

  if (isLoading) return <div className="flex-1 flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!kpi) return <div className="flex-1 flex justify-center items-center p-8 text-slate-500">Failed to load dashboard.</div>;

  // ── Derived ──────────────────────────────────────────────────────
  const healthPct = kpi.open_anomalies === 0 ? 100 : Math.max(10, Math.round(100 - Math.log2(kpi.open_anomalies + 1) * 12));
  const healthColor = healthPct >= 90 ? "emerald" : healthPct >= 60 ? "amber" : "red";
  const healthDot = healthPct >= 90 ? "bg-emerald-500" : healthPct >= 60 ? "bg-amber-500" : "bg-red-500";
  const healthText = healthPct >= 90 ? "All Systems Operational" : healthPct >= 60 ? "Degraded Performance" : "Critical — Action Required";

  const scanTotal = Object.values(scanBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Operations Center</h1>
          <p className="text-sm text-slate-500">Cross-engine telemetry · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${healthDot} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${healthDot}`} />
          </span>
          <span className={`text-xs font-bold uppercase tracking-widest text-${healthColor}-600`}>{healthText}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          HERO ROW — 3 anchor KPIs (large, gradient)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Tenants */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 shadow-lg">
          <div className="absolute -right-4 -top-4 opacity-10"><Server className="w-28 h-28" /></div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Multi-Tenant Foundation</p>
          <p className="text-4xl font-black mt-2">{kpi.active_tenants}</p>
          <p className="text-sm text-indigo-200 mt-1">active tenants</p>
          <div className="flex gap-4 mt-4 text-xs">
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{kpi.suspended_tenants} suspended</span>
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{fmtNum(kpi.total_users)} users</span>
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{fmtNum(kpi.total_products)} products</span>
          </div>
        </div>

        {/* Total Scans */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 text-white p-6 shadow-lg">
          <div className="absolute -right-4 -top-4 opacity-10"><ScanLine className="w-28 h-28" /></div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Scan Intelligence</p>
          <p className="text-4xl font-black mt-2">{fmtNum(kpi.total_scans)}</p>
          <p className="text-sm text-cyan-200 mt-1">lifetime verifications</p>
          <div className="flex gap-4 mt-4 text-xs">
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{fmtNum(kpi.scans_today)} today</span>
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{fmtNum(kpi.scans_7d)} 7d</span>
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{fmtNum(kpi.scans_30d)} 30d</span>
          </div>
        </div>

        {/* System Health */}
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${
          healthPct >= 90 ? "from-emerald-600 to-emerald-700" : healthPct >= 60 ? "from-amber-600 to-amber-700" : "from-red-600 to-red-700"
        } text-white p-6 shadow-lg`}>
          <div className="absolute -right-4 -top-4 opacity-10"><Zap className="w-28 h-28" /></div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">System Health Index</p>
          <p className="text-4xl font-black mt-2">{healthPct}%</p>
          <p className="text-sm text-white/70 mt-1">{healthText.toLowerCase()}</p>
          <div className="flex gap-4 mt-4 text-xs">
            <span className="bg-white/15 px-2.5 py-1 rounded-md">{kpi.open_anomalies} anomalies</span>
            <span className="bg-white/15 px-2.5 py-1 rounded-md">Trust avg {kpi.avg_trust_score}</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          INTELLIGENCE GRID — 3 analytical columns
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Column 1: Scan Breakdown ───────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-cyan-100"><ScanLine className="w-4 h-4 text-cyan-600" /></div>
            <h3 className="text-sm font-bold text-slate-800">Scan Results Breakdown</h3>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(scanBreakdown).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No scan data</p>
            ) : (
              Object.entries(scanBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([result, count]) => {
                  const pct = scanTotal > 0 ? Math.round((count / scanTotal) * 100) : 0;
                  const barColor =
                    result === "authentic" || result === "valid" ? "bg-emerald-500"
                    : result === "suspicious" || result === "warning" ? "bg-amber-500"
                    : "bg-red-500";
                  return (
                    <div key={result}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 capitalize">{result}</span>
                        <span className="text-slate-400 font-mono">{fmtNum(count)} <span className="text-slate-300">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`${barColor} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* ── Column 2: Fraud & Risk ────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-red-100"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
            <h3 className="text-sm font-bold text-slate-800">Fraud & Risk Intelligence</h3>
          </div>
          <div className="p-5">
            {/* Key metrics row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center">
                <p className="text-2xl font-black text-red-600">{fmtNum(kpi.total_fraud_alerts)}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Alerts</p>
              </div>
              <div className="text-center border-x border-slate-100">
                <p className="text-2xl font-black text-amber-600">{kpi.fraud_rate_percent}%</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Fraud Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-slate-700">{kpi.open_fraud_alerts}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Open</p>
              </div>
            </div>

            {/* Risk decisions */}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Engine Decisions</p>
            <div className="space-y-2">
              {riskDecisions.length === 0 ? (
                <p className="text-xs text-slate-400">No data</p>
              ) : (
                riskDecisions.map(d => {
                  const total = riskDecisions.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                  const c: Record<string, string> = {
                    NORMAL: "bg-emerald-500", ALLOW: "bg-emerald-400",
                    SUSPICIOUS: "bg-amber-500", REVIEW: "bg-violet-500",
                    SOFT_BLOCK: "bg-orange-500", HARD_BLOCK: "bg-red-600",
                  };
                  return (
                    <div key={d.decision} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c[d.decision] || "bg-slate-400"}`} />
                      <span className="text-xs font-semibold text-slate-600 w-24 truncate">{d.decision}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className={`${c[d.decision] || "bg-slate-400"} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-10 text-right">{fmtNum(d.count)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Column 3: Carbon & ESG ────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-100"><Leaf className="w-4 h-4 text-emerald-600" /></div>
            <h3 className="text-sm font-bold text-slate-800">Carbon & ESG Overview</h3>
          </div>
          <div className="p-5">
            {/* Primary metric */}
            <div className="text-center mb-5">
              <p className="text-3xl font-black text-emerald-700">{fmtNum(Math.round(kpi.total_carbon_kgco2e))}<span className="text-lg font-semibold text-slate-400 ml-1">kg</span></p>
              <p className="text-xs text-slate-400 mt-1">Total CO₂e emissions across all tenants</p>
            </div>

            {/* Sub metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-700">{kpi.avg_sustainability_score || "—"}</p>
                <p className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5">Avg ESG Score</p>
              </div>
              <div className="bg-sky-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-sky-700">{kpi.sustainability_assessed_products}</p>
                <p className="text-[10px] text-sky-600 font-semibold uppercase mt-0.5">Assessed</p>
              </div>
            </div>

            {/* ESG gauge bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                <span>ESG Rating</span>
                <span>{kpi.avg_sustainability_score >= 80 ? "A" : kpi.avg_sustainability_score >= 60 ? "B" : "C"} Grade</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                  style={{ width: `${Math.min(100, kpi.avg_sustainability_score || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OPERATIONS — Top Orgs + Anomalies
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Orgs */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Tenants by Products</h3>
            </div>
            <span className="text-[10px] text-slate-400">{kpi.active_tenants} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {topOrgs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No data</div>
            ) : (
              topOrgs.map((org, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <span className="text-sm font-semibold text-slate-800">{org.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                      org.plan === "enterprise" ? "bg-purple-100 text-purple-700"
                      : org.plan === "pro" ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{org.plan || "core"}</span>
                    <span className="text-xs font-mono font-bold text-slate-600 w-14 text-right">{fmtNum(org.product_count)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Anomalies */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Anomalies</h3>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              kpi.open_anomalies > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>{kpi.open_anomalies} open</span>
          </div>
          <div className="divide-y divide-slate-50">
            {anomalies.length === 0 ? (
              <div className="p-6 text-center text-emerald-600 text-sm font-semibold">✅ No anomalies</div>
            ) : (
              anomalies.map((a, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-mono font-bold text-slate-300 w-16 truncate">{a.id}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{a.type}</p>
                      <p className="text-[10px] text-slate-400">{a.tenant}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                    a.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{a.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
