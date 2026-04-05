"use client";

import { useState } from "react";
import { clientApi } from "@/lib/client/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Download, Plus, Search, FileJson, Copy } from "lucide-react";

type EvidenceData = {
  stats: any;
  items: any[];
};

function formatSize(bytes: number) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function timeAgo(dateParam: string | null) {
  if (!dateParam) return '—';
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

export default function EvidenceVault({ initialData }: { initialData: EvidenceData }) {
  const [d] = useState<EvidenceData>(initialData);
  const [modal, setModal] = useState<string | null>(null); // 'upload' | 'verify' | 'export' | 'forensic'
  const [activeItem, setActiveItem] = useState<any>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Forms
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', entity_type: '', entity_id: '' });

  const items = d.items || [];
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  const s = d.stats || {};

  const submitEvidence = async () => {
    if (!uploadForm.title) return alert('Title required');
    try {
      const res = await clientApi.post('/evidence/upload', uploadForm);
      alert('Evidence anchored – Block #' + (res.block_index || ''));
      window.location.reload();
    } catch(e:any) { alert(e.message || 'Upload failed'); }
  };

  const verifyEvidence = async (id: string) => {
    try {
      const res = await clientApi.get(`/evidence/${id}/verify`);
      setActiveItem({ ...res, isVerify: true });
      setModal('verify');
    } catch(e:any) { alert('Verify failed: ' + e.message); }
  };

  const exportEvidenceReport = async (id: string, type: 'export' | 'forensic') => {
    try {
      const report = await clientApi.get(`/evidence/${id}/export`);
      setActiveItem({ report, isForensic: type === 'forensic' });
      setModal(type);
    } catch(e:any) { alert('Export failed: ' + e.message); }
  };

  const downloadJson = () => {
    if (!activeItem?.report) return;
    const blob = new Blob([JSON.stringify(activeItem.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${activeItem.report.evidence?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = () => {
    if (!activeItem?.report) return;
    navigator.clipboard.writeText(JSON.stringify(activeItem.report, null, 2))
      .then(() => alert('Copied to clipboard'))
      .catch(() => alert('Copy failed'));
  };

  const exportCsv = () => {
    if (!items.length) return alert('No evidence to export');
    const csv = 'Title,Description,Type,Size,SHA-256,Status,Uploaded\n' + items.map(e => 
      `"${(e.title||'').replace(/"/g,'""')}","${(e.description||'').replace(/"/g,'""')}","${e.file_type||''}","${e.file_size||0}","${e.sha256_hash||''}","${e.verification_status||''}","${e.created_at||''}"`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statsMap = [
    { label: 'Total Evidence', value: s.total_items, color: 'text-slate-900 dark:text-white', dot: 'bg-indigo-500' },
    { label: 'Anchored', value: s.anchored, color: 'text-emerald-600', dot: 'bg-emerald-500' },
    { label: 'Verified', value: s.verified, color: 'text-blue-600', dot: 'bg-blue-500' },
    { label: 'Tampered', value: s.tampered, color: 'text-red-500', dot: 'bg-red-500' },
    { label: 'Pending', value: s.pending || 0, color: 'text-orange-500', dot: 'bg-orange-500' },
    { label: 'Integrity Rate', value: `${s.integrity_rate ?? 0}%`, color: 'text-emerald-600', dot: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsMap.map((stat, i) => (
          <Card key={i} className="relative overflow-hidden border-border shadow-sm">
            <div className={`absolute top-0 w-full h-1 ${stat.dot}`}></div>
            <CardContent className="p-4 flex flex-col items-center justify-center pt-6">
              <div className={`text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-sm overflow-hidden text-sm flex flex-col min-h-0">
        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Evidence Items
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 text-xs font-semibold px-3 w-full sm:w-auto">
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setModal('upload')} className="h-8 text-xs font-semibold px-3 bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
              <Plus className="w-3.5 h-3.5 mr-1" /> Upload Evidence
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No evidence found</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Title</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Description</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Type</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Size</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">SHA-256</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Uploaded</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map(e => (
                  <TableRow key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-foreground">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate" title={e.description}>{e.description || '—'}</TableCell>
                    <TableCell>
                      <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-sm font-semibold">{e.file_type?.split('/')[1] || 'file'}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatSize(e.file_size)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-indigo-500">{e.sha256_hash?.substring(0, 12)}…</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wide ${e.verification_status === 'anchored' || e.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {e.verification_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-medium uppercase">{timeAgo(e.created_at)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => verifyEvidence(e.id)} className="h-6 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 mr-1">
                        Verify
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => exportEvidenceReport(e.id, 'export')} className="h-6 text-[10px] font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2 mr-1">
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => exportEvidenceReport(e.id, 'forensic')} className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2">
                        Forensic
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */ }
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-slate-50/50 space-y-2 sm:space-y-0">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select value={perPage} onChange={e => {setPerPage(Number(e.target.value)); setPage(1);}} className="bg-transparent border border-input rounded p-1 focus:outline-none">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>Showing {start + (items.length > 0 ? 1 : 0)}–{Math.min(start + perPage, totalItems)} of {totalItems}</span>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1.5 items-center">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p=>p-1)} className="h-7 text-[10px]">Prev</Button>
              <span className="px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p=>p+1)} className="h-7 text-[10px]">Next</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Upload Modal */}
      {modal === 'upload' && (
        <Dialog open={true} onOpenChange={(open) => !open && setModal(null)}>
          <DialogContent className="sm:max-w-lg bg-white border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="w-5 h-5 text-indigo-600" /> Upload Evidence
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground font-medium">Upload a document or file to anchor it on the blockchain for tamper-proof verification.</p>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title *</label>
                <Input autoFocus value={uploadForm.title} onChange={e=>setUploadForm({...uploadForm,title:e.target.value})} placeholder="Document Title" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                <Textarea rows={3} value={uploadForm.description} onChange={e=>setUploadForm({...uploadForm,description:e.target.value})} placeholder="Description details..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entity Type</label>
                  <Input placeholder="product, shipment..." value={uploadForm.entity_type} onChange={e=>setUploadForm({...uploadForm,entity_type:e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entity ID</label>
                  <Input placeholder="Related ID" value={uploadForm.entity_id} onChange={e=>setUploadForm({...uploadForm,entity_id:e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={submitEvidence} className="flex-1 bg-indigo-600 hover:bg-indigo-700">⚡ Upload & Anchor</Button>
              <Button variant="outline" onClick={() => setModal(null)} className="px-5 text-slate-700">Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Verify Modal */}
      {modal === 'verify' && activeItem?.isVerify && (() => {
        const ok = activeItem.integrity === 'verified' || activeItem.integrity === 'valid';
        return (
          <Dialog open={true} onOpenChange={(open) => !open && setModal(null)}>
            <DialogContent className="sm:max-w-sm bg-white border-border shadow-xl text-center">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-lg font-bold text-left flex items-center gap-2">
                  <Search className="w-5 h-5 text-slate-500" /> Verification Result
                </DialogTitle>
              </DialogHeader>
              <div className="py-6">
                <div className="text-5xl mb-2">{ok ? '✅' : '⚠️'}</div>
                <div className={`text-xl font-black mb-1 ${ok ? 'text-emerald-500' : 'text-orange-500'}`}>{(activeItem.integrity || 'unknown').toUpperCase()}</div>
                <div className="text-xs text-muted-foreground mb-4 font-medium">Block Index: <strong className="text-foreground">#{activeItem.block_index || '—'}</strong></div>
                
                <div className="bg-slate-50 rounded-lg p-4 text-xs mb-4 shadow-inner border border-border">
                  <div className="flex justify-between mb-3 text-muted-foreground font-medium"><span>Hash Match</span><strong className={ok ? 'text-emerald-600' : 'text-red-500'}>{ok ? '✓ Match' : '✗ Mismatch'}</strong></div>
                  <div className="flex justify-between mb-3 text-muted-foreground font-medium"><span>Chain Link</span><strong className="text-emerald-600">✓ Valid</strong></div>
                  <div className="flex justify-between text-muted-foreground font-medium"><span>Timestamp</span><strong className="text-slate-900">{activeItem.sealed_at ? new Date(activeItem.sealed_at).toLocaleString() : '—'}</strong></div>
                </div>
              </div>
              <Button onClick={() => setModal(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800">Close</Button>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Export / Forensic Modal */}
      {(modal === 'export' || modal === 'forensic') && activeItem?.report && (() => {
        const ev = activeItem.report.evidence || {};
        const seal = activeItem.report.blockchain_seal || {};
        const isForensic = activeItem.isForensic;

        return (
          <Dialog open={true} onOpenChange={(open) => !open && setModal(null)}>
            <DialogContent className="sm:max-w-xl bg-white border-border shadow-xl p-0 overflow-hidden">
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    {isForensic ? <ShieldCheck className="w-5 h-5 text-purple-600" /> : <FileJson className="w-5 h-5 text-indigo-600" />}
                    {isForensic ? 'Forensic Analysis' : 'Evidence Export'}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground truncate pt-1">{ev.title || 'Report'}</p>
                </DialogHeader>

                {isForensic ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 shadow-sm"><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">File Type</div><div className="font-semibold text-sm text-slate-800">{ev.file_type||'—'}</div></div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 shadow-sm"><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Size</div><div className="font-semibold text-sm text-slate-800">{ev.file_size ? formatSize(ev.file_size) : '—'}</div></div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 shadow-sm"><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</div><div className="font-semibold text-sm text-emerald-600">{ev.verification_status||'—'}</div></div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 shadow-sm"><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Block #</div><div className="font-semibold text-sm text-indigo-600">{seal.block_index||'—'}</div></div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 text-[10px] sm:text-xs text-slate-300 font-mono shadow-inner border border-slate-800">
                      <div className="mb-3"><span className="text-slate-500 font-bold block mb-1">SHA-256:</span><code className="text-blue-400 break-all">{ev.sha256_hash||'—'}</code></div>
                      <div className="mb-3"><span className="text-slate-500 font-bold block mb-1">Data Hash:</span><code className="text-purple-400 break-all">{seal.data_hash||'—'}</code></div>
                      <div><span className="text-slate-500 font-bold block mb-1">Merkle Root:</span><code className="text-amber-400 break-all">{seal.merkle_root||'—'}</code></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto shadow-inner border border-slate-800">
                    <pre className="text-[10px] font-mono text-emerald-400">
                      {JSON.stringify(activeItem.report, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                  {!isForensic && (
                    <Button onClick={copyJson} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                      <Copy className="w-4 h-4 mr-2" /> Copy JSON
                    </Button>
                  )}
                  <Button variant={isForensic ? "default" : "outline"} onClick={downloadJson} className={isForensic ? "flex-1 bg-indigo-600 hover:bg-indigo-700" : "flex-1"}>
                    <Download className="w-4 h-4 mr-2" /> Download JSON
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

    </div>
  );
}
