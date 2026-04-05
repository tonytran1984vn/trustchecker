import { serverApi } from "@/lib/server/api";
import ComplianceManager from "@/components/sustainability/ComplianceManager";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CompliancePage() {
  let initialData = { stats: {}, records: [], policies: [] };
  let productMap: Record<string, string> = {};
  
  try {
    const [comp, prods] = await Promise.all([
      serverApi.get('/compliance/status').catch(() => null),
      serverApi.get('/products').catch(() => null)
    ]);
    
    if (comp) {
        initialData.stats = comp.stats || comp;
        initialData.records = comp.records || [];
        initialData.policies = comp.policies || [];
    }

    if (prods?.products) {
      prods.products.forEach((p: any) => {
        productMap[p.id] = p.name;
      });
    }
  } catch (e) {
    console.error("[Compliance] Error fetching data", e);
  }

  return <ComplianceManager initialData={initialData} productMap={productMap} />;
}
