import { Card, CardContent } from "@/components/ui/card";
import { Package, Smartphone, AlertOctagon, TrendingUp, Link } from "lucide-react";

interface StatsData {
  total_products: number;
  total_scans: number;
  today_scans: number;
  open_alerts: number;
  avg_trust_score: number;
  total_blockchain_seals: number;
}

export default function StatsGrid({ stats }: { stats: StatsData }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <Card className="border-border shadow-sm">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Products</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.total_products?.toLocaleString() || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Scans</span>
          </div>
          <div className="text-2xl font-bold text-foreground flex items-end justify-between">
            <span>{stats.total_scans?.toLocaleString() || 0}</span>
            {stats.today_scans > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                ↗ {stats.today_scans} today
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={`border-border shadow-sm ${stats.open_alerts > 0 ? 'border-red-200' : ''}`}>
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.open_alerts > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              <AlertOctagon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Alerts</span>
          </div>
          <div className={`text-2xl font-bold ${stats.open_alerts > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {stats.open_alerts?.toLocaleString() || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Trust Score</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.avg_trust_score || 0}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Link className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blockchain Seals</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.total_blockchain_seals?.toLocaleString() || 0}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
