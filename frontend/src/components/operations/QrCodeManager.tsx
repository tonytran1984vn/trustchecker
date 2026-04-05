"use client";

import { useState, useEffect } from "react";
import { clientApi } from "@/lib/client/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Copy, QrCode } from "lucide-react";

interface QrEntry {
  id: string;
  qr_data?: string;
  code?: string;
  image_key?: string;
  product_name?: string;
  product_sku?: string;
  batch_id?: string;
  status: string;
  scan_count: number;
  generated_at: string;
}

function timeAgo(dateParam: string | Date | number): string {
  if (!dateParam) return '—';
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  if (isNaN(date.getTime())) return '—';
  const today = new Date();
  const seconds = Math.round((today.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);
  
  if (seconds < 60) return 'Just now';
  else if (minutes < 60) return `${minutes} min ago`;
  else if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  else if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  else if (months < 12) return `${months} mo${months > 1 ? 's' : ''} ago`;
  else return `${years} yr${years > 1 ? 's' : ''} ago`;
}

export default function QrCodeManager({ initialCodes, initialTotal }: { initialCodes: QrEntry[], initialTotal: number }) {
  const [codes, setCodes] = useState<QrEntry[]>(initialCodes);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  
  const [filters, setFilters] = useState({ search: '', batch: '', status: '' });
  const [activeFilters, setActiveFilters] = useState({ search: '', batch: '', status: '' });

  useEffect(() => {
    // Skip initial render if we have initial data and it matches default state
    if (page === 1 && perPage === 50 && !activeFilters.search && !activeFilters.batch && !activeFilters.status && initialCodes === codes) {
      return;
    }
    fetchCodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, activeFilters]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * perPage;
      let url = `/products/codes/all?limit=${perPage}&offset=${offset}`;
      if (activeFilters.search) url += `&search=${encodeURIComponent(activeFilters.search)}`;
      if (activeFilters.batch) url += `&batch_id=${encodeURIComponent(activeFilters.batch)}`;
      if (activeFilters.status) url += `&status=${encodeURIComponent(activeFilters.status)}`;

      const res = await clientApi.get(url);
      setCodes(res.codes || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      setCodes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    setPage(1);
    setActiveFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters({ search: '', batch: '', status: '' });
    setActiveFilters({ search: '', batch: '', status: '' });
    setPage(1);
  };

  const handleCopyLink = async (qrData: string) => {
    try {
      const origin = window.location.origin;
      const baseUrl = window.location.pathname.startsWith('/trustchecker') ? `${origin}/trustchecker` : origin;
      const link = `${baseUrl}/check?code=${encodeURIComponent(qrData)}`;
      await navigator.clipboard.writeText(link);
      alert('Copied verification link');
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <Card className="border-border shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search product, SKU..." 
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
              className="pl-9 h-9"
            />
          </div>
          <Input 
            placeholder="Batch ID..." 
            value={filters.batch}
            onChange={e => setFilters(prev => ({ ...prev, batch: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            className="w-full sm:w-40 h-9"
          />
          <select 
            value={filters.status}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="flex h-9 w-full sm:w-40 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="scanned">Scanned</option>
            <option value="not_scanned">Not Scanned</option>
            <option value="deleted">Deleted</option>
          </select>

          <Button 
            onClick={applySearch}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
          >
            Search
          </Button>

          {(activeFilters.search || activeFilters.batch || activeFilters.status) && (
            <Button 
              variant="ghost"
              onClick={clearFilters}
              className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto justify-end">
            <span>Show</span>
            <select 
              value={perPage} 
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="flex h-8 items-center justify-between rounded-md border border-input bg-transparent px-2 py-1 text-xs focus:outline-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border shadow-sm overflow-hidden bg-white dark:bg-slate-900 border-none sm:border-solid">
        <div className="border border-border rounded-xl sm:border-none min-h-[400px]">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground">Loading codes...</div>
          ) : codes.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">No QR codes found.</div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] border-b">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-center w-20">QR</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider">Product</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider">SKU</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider">Batch</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider w-32">Status</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider">Created</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map(c => {
                    const isScanned = (c.scan_count || 0) > 0;
                    const _appPrefix = typeof window !== 'undefined' && window.location.pathname.startsWith('/trustchecker') ? '/trustchecker' : '';
                    
                    return (
                      <TableRow key={c.id} className={`${c.status === 'deleted' ? 'opacity-50' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                        <TableCell className="text-center">
                          {c.image_key ? (
                            <img src={`${_appPrefix}/qr/${c.image_key}`} className="w-10 h-10 border border-border rounded-md shadow-sm mx-auto object-cover" alt="QR" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-50 border border-dashed border-border rounded-md mx-auto flex items-center justify-center text-[10px] text-muted-foreground">
                              <QrCode className="w-4 h-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{c.product_name || '—'}</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded px-1.5 py-0.5">{c.product_sku || '—'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{c.batch_id ? c.batch_id : 'N/A'}</TableCell>
                        <TableCell>
                          {c.status === 'deleted' ? (
                            <span className="text-red-600 font-bold text-[10px] uppercase tracking-wide bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-sm">Deleted</span>
                          ) : isScanned ? (
                            <div>
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span> Scanned
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 ml-3.5 font-medium">{c.scan_count} verifications</div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> PENDING
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-medium uppercase">{timeAgo(c.generated_at)}</TableCell>
                        <TableCell className="text-right flex items-center justify-end h-full">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleCopyLink(c.qr_data || c.code || c.id)}
                            title="Copy Link"
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          <div className="p-4 flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-slate-50/50">
            <div>
              Showing <span className="text-foreground">{(page - 1) * perPage + (codes.length > 0 ? 1 : 0)}</span> to <span className="text-foreground">{(page - 1) * perPage + codes.length}</span> of <span className="text-foreground">{total}</span> codes
            </div>
            {totalPages > 1 && (
              <div className="flex gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page <= 1} 
                  onClick={() => setPage(page-1)} 
                  className="h-7 text-[10px]"
                >
                  Prev
                </Button>
                <div className="flex items-center px-2 text-[10px] font-medium">{page} / {totalPages}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(page+1)} 
                  className="h-7 text-[10px]"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
