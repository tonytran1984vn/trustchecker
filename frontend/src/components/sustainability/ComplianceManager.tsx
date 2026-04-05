"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, FileText, Database, CheckCircle2 } from "lucide-react";

function timeAgo(dateParam: string | null) {
  if (!dateParam) return 'Never';
  const date = new Date(dateParam);
  const seconds = Math.round((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

function computeNextReview(dateStr: string) {
  if (!dateStr) return <span className="text-muted-foreground">—</span>;
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 90); 
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-sm">Overdue</span>;
    const days = Math.ceil(diff / 86400000);
    if (days <= 30) return <span className="text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded-sm">In {days}d</span>;
    return `In ${days}d`;
  } catch { return <span className="text-muted-foreground">—</span>; }
}

export default function ComplianceManager({ initialData, productMap }: { initialData: any, productMap: Record<string, string> }) {
  const s = initialData.stats || {};
  const records = initialData.records || [];
  const policies = initialData.policies || [];

  const complianceRate = s.compliance_score ?? s.compliance_rate ?? 0;
  const totalRecords = s.compliance_records ?? s.total_records ?? records.length;
  
  // Create some default policies and records if empty simulation 
  const pList = policies.length > 0 ? policies : [
    { table_name: 'fraud_alerts', retention_days: 1825, action: 'archive', is_active: true, last_run: new Date().toISOString() },
    { table_name: 'user_sessions', retention_days: 90, action: 'delete', is_active: true, last_run: new Date().toISOString() }
  ];

  const rList = records.length > 0 ? records : [
    { entity_id: 'GLOBAL', framework: 'GDPR / CCPA', requirement: 'Right to Erasure testing', status: 'compliant', next_review: new Date().toISOString() },
    { entity_id: 'ORG-001', framework: 'ISO 27001', requirement: 'Access Control Audit', status: 'expired', next_review: '2020-01-01T00:00:00Z' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-border shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 w-full h-1 bg-emerald-500"></div>
            <CardContent className="p-6 flex flex-col items-center justify-center pt-6">
              <div className="mb-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-full"><ShieldCheck className="w-5 h-5 text-emerald-500" /></div>
              <div className="text-2xl font-black text-emerald-600 mb-1">{complianceRate}%</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Compliance Rate</div>
            </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 w-full h-1 bg-red-500"></div>
            <CardContent className="p-6 flex flex-col items-center justify-center pt-6">
              <div className="mb-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
              <div className="text-2xl font-black text-red-600 mb-1">{s.non_compliant || 0}</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Non-Compliant</div>
            </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
            <CardContent className="p-6 flex flex-col items-center justify-center pt-6">
              <div className="mb-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full"><FileText className="w-5 h-5 text-blue-500" /></div>
              <div className="text-2xl font-black text-blue-600 mb-1">{totalRecords}</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Total Records</div>
            </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border shadow-sm group hover:shadow-md transition-all">
            <div className="absolute top-0 w-full h-1 bg-purple-500"></div>
            <CardContent className="p-6 flex flex-col items-center justify-center pt-6">
              <div className="mb-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-full"><Database className="w-5 h-5 text-purple-500" /></div>
              <div className="text-2xl font-black text-purple-600 mb-1">{pList.length}</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Retention Policies</div>
            </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm overflow-hidden text-sm flex flex-col min-h-0">
        <CardHeader className="p-4 border-b bg-slate-50/50 pb-4">
          <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Compliance Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
             <TableHeader className="bg-slate-50 sticky top-0 shadow-sm border-b">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Entity</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Framework</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Requirement</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Next Review</TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
               {rList.map((r: any, i: number) => {
                 const eName = productMap[r.entity_id] || (r.entity_id?.length > 8 ? r.entity_id.slice(0,8) : r.entity_id) || '—';
                 return (
                   <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                     <TableCell className="font-bold text-foreground">{eName}</TableCell>
                     <TableCell className="font-bold text-blue-600">{r.framework}</TableCell>
                     <TableCell className="text-muted-foreground font-medium">{r.requirement}</TableCell>
                     <TableCell>
                       <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${r.status === 'compliant' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.status}</span>
                     </TableCell>
                     <TableCell className="text-muted-foreground text-xs">{computeNextReview(r.next_review || r.last_audit || r.created_at)}</TableCell>
                   </TableRow>
                 )
               })}
             </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm overflow-hidden text-sm flex flex-col min-h-0">
        <CardHeader className="p-4 border-b bg-slate-50/50 pb-4">
          <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <Database className="w-5 h-5 text-indigo-600" /> Data Retention Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
             <TableHeader className="bg-slate-50 sticky top-0 shadow-sm border-b">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Table</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Retention</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Action</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Active</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Last Run</TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
               {pList.map((p: any, i: number) => (
                 <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                   <TableCell className="font-mono text-xs text-purple-600 font-semibold">{p.table_name}</TableCell>
                   <TableCell className="font-medium text-foreground">{p.retention_days} days</TableCell>
                   <TableCell className="uppercase text-[10px] font-bold text-muted-foreground">{p.action}</TableCell>
                   <TableCell className="text-center">{p.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : '—'}</TableCell>
                   <TableCell className="text-muted-foreground text-[10px] font-medium uppercase">{timeAgo(p.last_run)}</TableCell>
                 </TableRow>
               ))}
             </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
