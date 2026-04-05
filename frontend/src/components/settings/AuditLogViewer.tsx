"use client";

import { useState } from "react";
import { clientApi, ApiError } from "@/lib/client/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Download, RefreshCcw, FileJson, Calendar } from "lucide-react";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  org_id: string | null;
  changes: any;
  trace_id?: string;
}

function formatTime(ts: string) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function renderActionBadge(action: string) {
  let color = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
  
  if (action === 'CREATE') color = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
  else if (action === 'UPDATE') color = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
  else if (action === 'DELETE') color = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400';
  else if (action === 'LOGIN') color = 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400';
  else if (action === 'LOGOUT') color = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
  else if (action === 'SCAN') color = 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400';

  return (
    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase border ${color}`}>
      {action}
    </span>
  );
}

function summarizeChanges(changes: any) {
  if (!changes) return '—';
  try {
    const obj = typeof changes === 'string' ? JSON.parse(changes) : changes;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '—';
    if (keys.length <= 2) return keys.join(', ');
    return `${keys.slice(0, 2).join(', ')} +${keys.length - 2} more`;
  } catch (e) {
    return typeof changes === 'string' ? changes.slice(0, 30) : '—';
  }
}

export default function AuditLogViewer({ initialLogs, totalCount }: { initialLogs: AuditEntry[], totalCount: number }) {
  const [logs, setLogs] = useState<AuditEntry[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<AuditEntry | null>(null);

  const [filters, setFilters] = useState({
    action: 'all_actions',
    entity: 'all_entities',
    from: '',
    to: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const qAction = filters.action === 'all_actions' ? '' : filters.action;
      const qEntity = filters.entity === 'all_entities' ? '' : filters.entity;
      const data = await clientApi.get('/audit-log', { params: { ...filters, action: qAction, entity: qEntity, limit: '250' } });
      setLogs(data.entries || data.events || data.data || []);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const qAction = filters.action === 'all_actions' ? '' : filters.action;
    const qEntity = filters.entity === 'all_entities' ? '' : filters.entity;
    const params = new URLSearchParams({ ...filters, action: qAction, entity: qEntity });
    window.location.href = `/trustchecker/api/audit-log/export?${params.toString()}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Select value={filters.action} onValueChange={(val) => handleFilterChange('action', val || '')}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-semibold">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_actions">All Actions</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="LOGIN">LOGIN</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.entity} onValueChange={(val) => handleFilterChange('entity', val || '')}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-semibold">
               <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all_entities">All Entities</SelectItem>
               <SelectItem value="User">User</SelectItem>
               <SelectItem value="Role">Role</SelectItem>
               <SelectItem value="Product">Product</SelectItem>
               <SelectItem value="Organization">Organization</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 items-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground mr-auto">
            <Calendar className="w-3.5 h-3.5" />
            <span>From</span>
            <Input 
              type="date" 
              value={filters.from} onChange={e => handleFilterChange('from', e.target.value)}
              className="h-9 w-[130px] font-semibold text-xs"
            />
          </div>

          <Button 
            onClick={fetchLogs} 
            disabled={loading}
            className="h-9 text-xs font-semibold px-4 bg-indigo-600 hover:bg-indigo-700 ml-auto"
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant="outline"
            onClick={exportCSV} 
            className="h-9 text-xs font-semibold px-4"
          >
            <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border shadow-sm flex flex-col min-h-[400px] overflow-hidden">
        <CardHeader className="p-4 border-b bg-slate-50/50 space-y-0 pb-4">
           <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
             <History className="w-5 h-5 text-indigo-600" /> System Audit Trail
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
             <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
               <TableRow>
                 <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Time</TableHead>
                 <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Action</TableHead>
                 <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Entity</TableHead>
                 <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Entity ID</TableHead>
                 <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">User</TableHead>
                 <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Changes</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {logs.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm font-medium">
                     No audit logs match criteria.
                   </TableCell>
                 </TableRow>
               ) : (
                 logs.map(log => (
                   <TableRow 
                     key={log.id} 
                     onClick={() => setSelectedTrace(log)}
                     className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                   >
                     <TableCell className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide whitespace-nowrap">
                       {formatTime(log.timestamp)}
                     </TableCell>
                     <TableCell>
                       {renderActionBadge(log.action)}
                     </TableCell>
                     <TableCell className="text-xs font-bold text-foreground">
                       {log.entity_type || '—'}
                     </TableCell>
                     <TableCell className="text-xs font-mono text-muted-foreground">
                       {log.entity_id ? log.entity_id.slice(0, 12) + '…' : '—'}
                     </TableCell>
                     <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                       {log.user_id ? log.user_id.slice(0, 8) + '…' : 'System'}
                     </TableCell>
                     <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                       {summarizeChanges(log.changes)}
                     </TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedTrace && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedTrace(null)}>
          <DialogContent className="sm:max-w-2xl bg-white border-border shadow-xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600" /> Trace Detail
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-xs sm:text-sm mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mt-1">Action</div>
                <div>{renderActionBadge(selectedTrace.action)}</div>
                
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mt-1">Entity Type</div>
                <div className="font-bold text-foreground">{selectedTrace.entity_type}</div>
                
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mt-1">Entity ID</div>
                <div className="font-mono text-xs text-indigo-600">{selectedTrace.entity_id}</div>
                
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mt-1">Time</div>
                <div className="text-foreground font-medium">{formatTime(selectedTrace.timestamp)}</div>
                
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mt-1">User ID</div>
                <div className="font-mono text-xs">{selectedTrace.user_id || 'System'}</div>
                
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mt-1">Trace ID</div>
                <div className="font-mono text-xs opacity-70">{selectedTrace.trace_id || '—'}</div>
              </div>

              <div>
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">Changes Vector</h4>
                <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[10px] sm:text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap word-break shadow-inner">
                  {JSON.stringify(typeof selectedTrace.changes === 'string' ? JSON.parse(selectedTrace.changes) : selectedTrace.changes, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
