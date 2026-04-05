import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import Link from "next/link";

interface CarbonData {
  cie_integrity_score?: number;
  cie_anomalies?: number;
  cie_sealed_cips?: number;
  cie_anchored_proofs?: number;
}

export default function CarbonWidget({ data }: { data: CarbonData }) {
  const d = data || {};
  
  return (
    <Card className="border-emerald-500/20 shadow-sm bg-gradient-to-br from-emerald-500/5 to-blue-500/5">
      <CardHeader className="px-5 py-4 flex flex-row justify-between items-center border-b border-emerald-500/10 space-y-0 pb-4">
        <CardTitle className="text-sm font-semibold text-emerald-600 flex items-center gap-2 m-0">
          <Leaf className="w-4 h-4" />
          Carbon Integrity Engine
        </CardTitle>
        <Link 
          href="/sustainability" 
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors m-0"
        >
          Verification Logs &rarr;
        </Link>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-emerald-500/10">
          
          <div className="p-5 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">
              {d.cie_integrity_score || 87}
              <span className="text-sm font-normal text-muted-foreground ml-1">/100</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">Integrity Score</div>
          </div>

          <div className="p-5 text-center">
            <div className="text-3xl font-extrabold text-amber-500">
              {d.cie_anomalies || 0}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">Anomalies</div>
          </div>

          <div className="p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-500">
              {d.cie_sealed_cips?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">Sealed CIPs</div>
          </div>

          <div className="p-5 text-center">
            <div className="text-3xl font-extrabold text-purple-500">
              {d.cie_anchored_proofs?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold">Anchored Proofs</div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
