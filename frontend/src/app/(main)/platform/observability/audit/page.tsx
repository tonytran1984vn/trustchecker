"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, FileText, Search, Loader2, ChevronLeft, ChevronRight, Filter, Eye, X } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null); // State for JSON modal

  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Just for actor filter input
  const [debouncedAction, setDebouncedAction] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [limit, offset, actorFilter, actionFilter]);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      if (actionFilter) query.append('action', actionFilter);
      if (actorFilter) query.append('actor', actorFilter);

      const res = await fetcher(`/api/platform/audit-logs?${query.toString()}`);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActorFilter(searchInput);
    setOffset(0);
  };

  const formatActionName = (action: string) => {
    if (!action) return 'UNKNOWN';
    return action.replace(/_/g, ' ');
  };

  const getLogStyle = (action: string) => {
    if (!action) return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (action.includes('DELETE') || action.includes('KILL') || action.includes('FORCE') || action.includes('SUSPEND')) {
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800';
    }
    if (action.includes('CREATE') || action.includes('MINT') || action.includes('ACTIVATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const renderDetails = (details: any) => {
    if (!details) return '-';
    if (typeof details === 'object') return JSON.stringify(details);
    if (String(details) === '[object Object]') return 'No verbose payload'; // Handled legacy bad insertions
    try {
      const parsed = JSON.parse(details);
      if (typeof parsed === 'object' && parsed) return JSON.stringify(parsed);
    } catch(e) {}
    return String(details);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.ceil(offset / limit) + 1;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto mb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-indigo-600" />
            Global Audit Trail
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Immutable operation log for all central platform and environment mutations.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <form onSubmit={handleSearch} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filter by Actor (email/name)..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-sm text-slate-900 dark:text-white w-64 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </form>
            
            <div className="flex items-center gap-2 relative">
                <Filter className="w-4 h-4 text-slate-400 absolute left-3" />
                <select 
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setOffset(0);
                  }}
                  className="pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="">All Action Types</option>
                  <option value="PLATFORM_USER_CREATED">Created Platform User</option>
                  <option value="PLATFORM_USER_DELETED">Deleted Platform User</option>
                  <option value="ORG_ACTIVATED">Org Activated</option>
                  <option value="ORG_SUSPENDED">Org Suspended</option>
                  <option value="FEATURE_FLAG_TOGGLED">Feature Flag Toggled</option>
                  <option value="FORCE_LOGOUT_ALL">Force Logout All</option>
                  <option value="ENFORCE_MFA">MFA Enforcement Toggled</option>
                </select>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Show</span>
                <select 
                    value={limit}
                    onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setOffset(0);
                    }}
                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded py-1 px-2 outline-none text-slate-900 dark:text-white"
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span>/ page</span>
            </div>
          </div>
          <span className="text-sm font-normal text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            {isLoading ? 'Syncing...' : `Showing ${logs.length > 0 ? offset + 1 : 0} - ${Math.min(offset + logs.length, total)} of ${total}`}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Action Type</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Actor Identity</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Target Entity</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Details Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (!Array.isArray(logs) || logs.length === 0) ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">No verifiable audit records active.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  try {
                    return (
                      <tr key={log.id || Math.random()} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300">
                        <td className="px-6 py-3 font-mono text-xs text-slate-500">
                           {log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', { timeZoneName: 'short' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${getLogStyle(String(log.action || ''))}`}>
                            {formatActionName(String(log.action || ''))}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-white">{log.actor_name || 'System / Auto'}</div>
                            <div className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">{log.actor_email || 'Internal RPC'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                            {String(log.entity_type || 'Unknown')} {log.entity_id ? `:${String(log.entity_id).substring(0, 8)}...` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {(() => {
                            const raw = renderDetails(log.details);
                            if (raw === '-' || raw === '{}') return <span className="text-slate-400 font-mono text-xs">-</span>;
                            return (
                              <button 
                                onClick={() => setSelectedLog(log)} 
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:border-indigo-800 dark:hover:bg-indigo-900/30 transition-all font-medium"
                              >
                                <Eye className="w-3.5 h-3.5" /> Payload
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  } catch (err) {
                    console.error("Render row error:", err, log);
                    return null;
                  }
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {!isLoading && total > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <button 
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
            </span>
            <button 
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className={`inline-flex w-2 h-2 rounded-full ${getLogStyle(selectedLog.action).split(' ')[0]}`}></span>
                  Target Reference Payload
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1">Audit ID: {selectedLog.id}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-950 dark:bg-black font-mono text-xs text-indigo-300">
              <pre className="whitespace-pre-wrap break-words">
                {(() => {
                  try {
                    const parsed = typeof selectedLog.details === 'string' ? JSON.parse(selectedLog.details) : selectedLog.details;
                    return JSON.stringify(parsed, null, 2);
                  } catch(e) {
                    return String(selectedLog.details);
                  }
                })()}
              </pre>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-right">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Close Output
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
