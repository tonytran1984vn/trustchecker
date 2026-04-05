import { serverApi } from "@/lib/server/api";
import PricingCatalog from "@/components/settings/PricingCatalog";

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  return (
    <div className="space-y-6">
      <PricingCatalog />
    </div>
  );
}
