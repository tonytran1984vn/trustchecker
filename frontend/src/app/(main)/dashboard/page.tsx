
import { redirect } from "next/navigation";
import { serverApi, ApiError } from "@/lib/server/api";
import StatsGrid from "@/components/dashboard/StatsGrid";
import RecentActivity from "@/components/dashboard/RecentActivity";
import LiveEvents from "@/components/dashboard/LiveEvents";
import DonutChart from "@/components/dashboard/DonutChart";
import SeverityBars from "@/components/dashboard/SeverityBars";
import CarbonWidget from "@/components/dashboard/CarbonWidget";

// Opt out of static generation, data is highly dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDashboardStats() {
  try {
    return await serverApi.get('/qr/dashboard-stats');
  } catch (error) {
    // NOTE: Do NOT redirect to /login here — middleware handles auth gating.
    // Redirecting here causes an infinite loop: middleware sees cookie → /dashboard → API 401 → /login → middleware → /dashboard...
    console.error("[Dashboard] Error fetching stats:", error);
    return null;
  }
}


export default async function DashboardPage() {
  const stats = await getDashboardStats();

  if (!stats) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-500/20 max-w-md w-full text-center">
          <h2 className="font-semibold text-lg mb-2">Data Load Error</h2>
          <p className="text-sm">Cannot connect to the backend engine to retrieve dashboard statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Governance Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Institutional real-time trust metrics and network activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-gray-600 dark:text-gray-300 font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <StatsGrid stats={stats} />

      {/* Secondary Main Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
        <div className="lg:col-span-2 h-[400px]">
          <RecentActivity activities={stats.recent_activity} />
        </div>
        <div className="h-[400px]">
          <LiveEvents />
        </div>
      </div>

      {/* Tertiary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
        <div className="h-[300px]">
          <DonutChart data={stats.scans_by_result} />
        </div>
        <div className="h-[300px]">
          <SeverityBars data={stats.alerts_by_severity} />
        </div>
      </div>

      {/* Bottom Focus Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
        <CarbonWidget data={stats} />
      </div>

    </div>
  );
}
