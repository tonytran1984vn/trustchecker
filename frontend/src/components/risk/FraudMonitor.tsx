"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, CheckCircle2 } from "lucide-react";

interface FraudAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  alert_type: string;
  product_name?: string;
  description: string;
  created_at: string;
}

export default function FraudMonitor({ initialAlerts }: { initialAlerts: FraudAlert[] }) {
  const [alerts] = useState<FraudAlert[]>(initialAlerts);

  const getSeverityStyle = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30';
      case 'high': return 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      case 'medium': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30';
      case 'low': return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getSeverityCount = (severity: string) => alerts.filter(a => a.severity === severity).length;

  const exportCsv = () => {
    if (!alerts.length) return alert('No alerts to export');
    const csv = 'Severity,Type,Product,Description,Time\n' + alerts.map(a => 
      `"${a.severity}","${a.alert_type}","${a.product_name || ''}","${a.description.replace(/"/g, '""')}","${a.created_at}"`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fraud-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: 'Critical', value: getSeverityCount('critical'), color: 'text-red-600', dot: 'bg-red-500' },
    { label: 'High', value: getSeverityCount('high'), color: 'text-orange-600', dot: 'bg-orange-500' },
    { label: 'Medium', value: getSeverityCount('medium'), color: 'text-indigo-600', dot: 'bg-indigo-500' },
    { label: 'Low', value: getSeverityCount('low'), color: 'text-blue-600', dot: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="relative overflow-hidden border-border shadow-sm group hover:shadow-md transition-all">
            <div className={`absolute top-0 w-full h-1 ${stat.dot}`}></div>
            <CardContent className="p-6 flex flex-col items-center justify-center pt-8">
              <div className={`text-4xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-sm flex flex-col min-h-[400px]">
        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row justify-between items-center space-y-0">
          <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <AlertCircle className="w-5 h-5 text-red-500" /> Active Fraud Alerts
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 text-xs font-semibold px-3">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-x-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 h-full min-h-[300px]">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Clear</h3>
              <p className="text-muted-foreground text-sm">No active fraud alerts at this time.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Severity</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Type</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Product</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Description</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map(a => (
                  <TableRow key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${getSeverityStyle(a.severity)}`}>
                        {a.severity}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{a.alert_type}</TableCell>
                    <TableCell className="px-4 py-3 font-medium text-foreground">{a.product_name || '—'}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground text-sm max-w-xs truncate" title={a.description}>{a.description}</TableCell>
                    <TableCell className="px-4 py-3 text-[10px] text-muted-foreground uppercase font-medium">{new Date(a.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
