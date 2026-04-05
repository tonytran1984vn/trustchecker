import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity } from "lucide-react";

interface ActivityItem {
  product_name: string;
  result: 'valid' | 'suspicious' | 'counterfeit' | 'warning' | 'pending';
  fraud_score: number;
  trust_score: number;
  scanned_at: string;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

const RESULT_COLORS: Record<string, string> = {
  valid: 'bg-emerald-50 text-emerald-700',
  suspicious: 'bg-amber-50 text-amber-700',
  counterfeit: 'bg-red-50 text-red-700',
  warning: 'bg-orange-50 text-orange-700',
  pending: 'bg-slate-50 text-slate-700',
};

export default function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  const items = activities || [];

  return (
    <Card className="flex flex-col min-h-0 h-full shadow-sm border-border">
      <CardHeader className="px-5 py-4 border-b bg-slate-50/50 rounded-t-xl">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="font-semibold text-xs tracking-wider uppercase">Product</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase">Result</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase">Fraud</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase">Trust</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                  No recent activity found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, i) => (
                <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900">
                    {item.product_name || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${RESULT_COLORS[item.result] || RESULT_COLORS.pending}`}>
                      {item.result}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className={item.fraud_score > 0.5 ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                      {(item.fraud_score * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className={item.trust_score >= 80 ? 'text-emerald-600 font-bold' : item.trust_score >= 50 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold'}>
                      {Math.round(item.trust_score)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {timeAgo(item.scanned_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
