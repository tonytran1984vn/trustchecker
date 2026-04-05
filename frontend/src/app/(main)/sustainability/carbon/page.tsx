import { serverApi } from "@/lib/server/api";
import CarbonEngine from "@/components/sustainability/CarbonEngine";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CarbonIntegrityPage() {
  let initialData = { summary: null, passports: null, benchmarks: null, ingestion: null };
  
  try {
    const [summary, passports, benchmarks, ingestion] = await Promise.all([
        serverApi.get('/scm/carbon-credit/balance').catch(() => null),
        serverApi.get('/scm/carbon-credit/registry?limit=20').catch(() => null),
        serverApi.get('/scm/carbon-credit/risk-score').catch(() => null),
        serverApi.get('/scm/carbon-credit/market-stats').catch(() => null),
    ]);
    initialData = { summary, passports, benchmarks, ingestion };
  } catch (e) {
    console.error("[Carbon] Error fetching data", e);
  }

  return <CarbonEngine initialData={initialData} />;
}
