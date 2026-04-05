import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface SeverityResult {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
}

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-indigo-500',
  low: 'bg-blue-500',
};

const SEV_TEXT: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-indigo-600',
  low: 'text-blue-600',
};

export default function SeverityBars({ data }: { data: SeverityResult[] }) {
  const alerts = data || [];
  
  if (alerts.length === 0) {
    return (
      <Card className="h-full flex flex-col shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-indigo-600" />
            Alert Severity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No alerts
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(...alerts.map(d => d.count), 1);

  return (
    <Card className="h-full flex flex-col shadow-sm border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-indigo-600" />
          Alert Severity
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-center gap-5 pt-0">
        {alerts.map((alert, i) => {
          const pct = ((alert.count / maxVal) * 100).toFixed(0);
          
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${SEV_COLORS[alert.severity] || 'bg-slate-500'}`}></span>
                  <span className="text-foreground capitalize">{alert.severity}</span>
                </div>
                <span className={SEV_TEXT[alert.severity] || 'text-muted-foreground'}>{alert.count}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${SEV_COLORS[alert.severity] || 'bg-slate-500'}`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
