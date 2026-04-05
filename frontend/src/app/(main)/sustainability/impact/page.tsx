import { serverApi } from "@/lib/server/api";
import ImpactDashboard from "@/components/sustainability/ImpactDashboard";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ImpactPage() {
  let initialData = { stats: {}, leaderboard: [] };
  
  try {
    const [stats, lb] = await Promise.all([
      serverApi.get('/sustainability/stats').catch(() => null),
      serverApi.get('/sustainability/leaderboard').catch(() => null)
    ]);
    if (stats) initialData.stats = stats;
    if (lb?.leaderboard) initialData.leaderboard = lb.leaderboard;
  } catch (e) {
    console.error("[Sustainability] Error fetching impact data", e);
  }

  return <ImpactDashboard initialData={initialData} />;
}
