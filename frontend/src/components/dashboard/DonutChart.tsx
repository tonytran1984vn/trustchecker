import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";

interface ScanResult {
  result: 'valid' | 'suspicious' | 'counterfeit' | 'warning' | 'pending';
  count: number;
}

const SCAN_COLORS: Record<string, { color: string; bg: string }> = {
  valid: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  suspicious: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  counterfeit: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  pending: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

export default function DonutChart({ data }: { data: ScanResult[] }) {
  const scans = data || [];
  const total = scans.reduce((acc, curr) => acc + curr.count, 0);
  
  if (total === 0) {
    return (
      <Card className="h-full flex flex-col shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            Scan Results
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No data
        </CardContent>
      </Card>
    );
  }

  const R = 54;
  const C = 2 * Math.PI * R;
  let offset = 0;

  // Calculate SVG arcs
  const arcs = scans.map((d) => {
    const pct = total > 0 ? d.count / total : 0;
    const len = pct * C;
    const currentOffset = offset;
    offset += len;
    
    return {
      ...d,
      len,
      currentOffset,
      pct: (pct * 100).toFixed(0)
    };
  });

  return (
    <Card className="h-full flex flex-col shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-600" />
          Scan Results
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col md:flex-row items-center gap-6 flex-1 pt-4">
        
        {/* SVG Donut */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 128 128" className="w-full h-full transform -rotate-90">
            <circle 
              cx="64" cy="64" r={R} 
              fill="none" 
              className="stroke-slate-100" 
              strokeWidth="11" 
            />
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx="64" cy="64" r={R}
                fill="none"
                stroke={SCAN_COLORS[arc.result]?.color || '#64748b'}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${arc.len > 2 ? arc.len - 2 : 0} ${C - arc.len + 2}`}
                strokeDashoffset={-arc.currentOffset}
                className="transition-all duration-700 ease-in-out"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground leading-none">{total}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">scans</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2 w-full">
          {arcs.map((arc, i) => {
            const color = SCAN_COLORS[arc.result]?.color || '#64748b';
            return (
              <div key={i} className="flex items-center text-sm">
                <span className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: color }}></span>
                <span className="text-foreground capitalize flex-1">{arc.result}</span>
                <span className="font-semibold text-foreground mr-3">{arc.count}</span>
                <span className="text-muted-foreground w-8 text-right text-xs bg-slate-50 rounded px-1">{arc.pct}%</span>
              </div>
            );
          })}
        </div>
        
      </CardContent>
    </Card>
  );
}
