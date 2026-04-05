"use client";

import { useState, useEffect, useRef } from "react";
import { clientApi } from "@/lib/client/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, Plus, Package, X, QrCode } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  manufacturer: string;
  origin_country: string;
  trust_score: number;
  status: string;
}

interface ProductDetail extends Product {
  qr_codes: any[];
}

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeProductDetail, setActiveProductDetail] = useState<ProductDetail | null>(null);
  
  // QR Batch Gen state
  const [qrBatchActive, setQrBatchActive] = useState<{ id: string, name: string, sku: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setQrProgressJob] = useState<any>(null); // Kept for consistency though unused at root

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchProducts(searchTerm);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const searchProducts = async (q: string) => {
    setLoading(true);
    try {
      const res = await clientApi.get(`/products?search=${encodeURIComponent(q)}`);
      setProducts(res.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportProductsCSV = () => {
    if (products.length === 0) return alert("No products to export");
    const BOM = '\uFEFF';
    const header = ['Product Name', 'SKU', 'Category', 'Manufacturer', 'Origin', 'Trust Score', 'Status'];
    const rows = products.map(p => [
      `"${p.name || ''}"`, `"${p.sku || ''}"`, `"${p.category || ''}"`,
      `"${p.manufacturer || ''}"`, `"${p.origin_country || ''}"`,
      Math.round(p.trust_score || 0), p.status || 'active'
    ]);
    const csv = BOM + header.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openProductDetail = async (id: string) => {
    try {
      const res = await clientApi.get(`/products/${id}`);
      setActiveProductDetail({ ...res.product, qr_codes: res.qr_codes || [] });
    } catch (e) {
      alert("Failed to load product details");
    }
  };

  const exportQrCodes = (productId: string, format: string) => {
    window.location.href = `/trustchecker/api/products/${productId}/codes/export?format=${format}`;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search products (Name or SKU)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportProductsCSV} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Grid */}
      <Card className="min-h-[400px] border-border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No products found. Click "Add Product".
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">SKU</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Product Name</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Category</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Manufacturer</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Origin</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Trust</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow 
                    key={p.id} 
                    onClick={() => openProductDetail(p.id)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || '—'}</TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{p.name || '—'}</TableCell>
                    <TableCell className="capitalize text-slate-600 dark:text-slate-400">{(p.category || '').replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-slate-500">{p.manufacturer || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{(p.origin_country || '—').toUpperCase()}</TableCell>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round(p.trust_score || 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wide uppercase ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'}`}>
                        {p.status || 'ACTIVE'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onRefresh={() => searchProducts('')} />}
      {activeProductDetail && (
        <ProductDetailModal 
          detail={activeProductDetail} 
          onClose={() => setActiveProductDetail(null)} 
          onOpenQrBatch={() => {
            setQrBatchActive({ id: activeProductDetail.id, name: activeProductDetail.name, sku: activeProductDetail.sku });
          }}
          onExportQr={(f) => exportQrCodes(activeProductDetail.id, f)}
        />
      )}
      {qrBatchActive && (
        <QrBatchModal 
          product={qrBatchActive}
          onClose={() => setQrBatchActive(null)}
          onSuccess={() => {
            if (activeProductDetail && activeProductDetail.id === qrBatchActive.id) openProductDetail(qrBatchActive.id);
          }}
          onExportQr={(f) => exportQrCodes(qrBatchActive.id, f)}
        />
      )}
    </div>
  );
}

// ---------------- Add Product Modal ----------------
function AddProductModal({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) {
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', manufacturer: '', origin_country: '', weight_kg: '', quantity: '1', price: '', batch: ''
  });
  const [manuallyEditedSku, setManuallyEditedSku] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    if (!manuallyEditedSku) {
      const prefix = val.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PRD';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setFormData(prev => ({ ...prev, name: val, sku: val.trim() ? `${prefix}-${randomNum}` : '' }));
    } else {
      setFormData(prev => ({ ...prev, name: val }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await clientApi.post('/products/ensure', {
        name: formData.name, sku: formData.sku, category: formData.category, manufacturer: formData.manufacturer,
        origin_country: formData.origin_country, weight_kg: parseFloat(formData.weight_kg) || 0, price: parseFloat(formData.price) || 0
      });
      const rawQty = parseInt(formData.quantity) || 1;
      if (rawQty > 0) {
        await clientApi.post('/products/generate-code', {
          product_id: res.product_id, quantity: rawQty, batch_id: formData.batch
        });
      }
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Package className="w-5 h-5 text-indigo-600" />
            Register New Product
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product Name *</label>
              <Input required value={formData.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Premium Coffee" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">SKU *</label>
              <Input required value={formData.sku} onChange={e => { setFormData({...formData, sku: e.target.value}); setManuallyEditedSku(true); }} className="font-mono" placeholder="e.g. COF-1234" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity *</label>
              <Input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Origin Country</label>
              <Input required value={formData.origin_country} onChange={e => setFormData({...formData, origin_country: e.target.value})} placeholder="e.g. VN" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">Select...</option>
                <option value="Coffee">Coffee</option>
                <option value="Electronic">Electronic</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 p-2.5 rounded-md font-medium">
            🌿 Note: Weight & Category are used to automatically calculate carbon footprint.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
              {submitting ? 'Registering...' : 'Register & Generate QR'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Product Detail View ----------------
function ProductDetailModal({ detail, onClose, onOpenQrBatch, onExportQr }: { detail: ProductDetail, onClose: () => void, onOpenQrBatch: () => void, onExportQr: (f:string)=>void }) {
  const codes = detail.qr_codes || [];
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 border-border shadow-xl p-0 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">{detail.name}</DialogTitle>
              <div className="font-mono text-sm text-muted-foreground mt-1">{detail.sku}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 text-sm">
            <div><span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Category</span><span className="font-medium text-foreground">{detail.category || '—'}</span></div>
            <div><span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Manufacturer</span><span className="font-medium text-foreground">{detail.manufacturer || '—'}</span></div>
            <div><span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Origin</span><span className="font-medium text-foreground font-mono">{detail.origin_country || '—'}</span></div>
            <div><span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Trust Score</span><span className="font-bold text-indigo-600">{Math.round(detail.trust_score || 0)}</span></div>
            <div><span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Status</span><span className="font-bold px-2 py-0.5 mt-1 inline-block bg-slate-100 text-slate-700 dark:bg-slate-800 rounded text-[10px] uppercase">{detail.status}</span></div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-500" /> QR Codes <span className="font-normal text-sm text-muted-foreground">({codes.length})</span>
              </h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onOpenQrBatch} className="h-8 text-xs font-semibold">
                  🔄 Generate Batch
                </Button>
                {codes.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => onExportQr('csv')} className="h-8 text-xs font-semibold">
                    📊 CSV
                  </Button>
                )}
              </div>
            </div>

            {codes.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                Click "Generate Batch" to create verification tracking codes for this product.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {codes.slice(0, 50).map((c, i) => (
                  <div key={c.id} className="border border-border rounded-lg p-2 text-center bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center hover:border-indigo-400 transition-colors">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-border rounded mb-2 flex items-center justify-center opacity-70 text-[10px] font-bold text-slate-400">QR</div>
                    <div className="text-[10px] text-muted-foreground font-mono">#{i + 1}</div>
                    <div className="text-[10px] font-bold mt-1 text-emerald-600">{(c.scan_count || 0) > 0 ? `${c.scan_count} scans` : 'Pending'}</div>
                  </div>
                ))}
              </div>
            )}
            {codes.length > 50 && <div className="text-center mt-4 text-xs text-muted-foreground">Showing 50 of {codes.length}. Use export to see all.</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- QR Batch Generator ----------------
function QrBatchModal({ product, onClose, onSuccess, onExportQr }: { product: any, onClose: () => void, onSuccess: () => void, onExportQr: (f:string)=>void }) {
  const [qty, setQty] = useState('10');
  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null); // For polling

  const timerRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await clientApi.post('/products/generate-code', { product_id: product.id, quantity: parseInt(qty) });
      if (res.async && res.job_id) {
        setJobStatus({ pending: true, progress: 0, count: 0 });
        timerRef.current = setInterval(async () => {
          try {
            const poll = await clientApi.get(`/products/jobs/${res.job_id}`);
            setJobStatus({ pending: poll.job.status !== 'completed' && poll.job.status !== 'failed', progress: poll.job.progress || 0, count: poll.job.generated_count || 0, error: poll.job.error_message });
            if (poll.job.status === 'completed' || poll.job.status === 'failed') {
              if (timerRef.current) clearInterval(timerRef.current);
              if (poll.job.status === 'completed') onSuccess();
            }
          } catch(e) {}
        }, 2000);
      } else {
        setJobStatus({ pending: false, progress: 100, count: res.codes?.length || qty });
        onSuccess();
      }
    } catch (e:any) {
      alert(e.message || "Failed");
      setLoading(false);
      setJobStatus(null);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900 border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <QrCode className="w-5 h-5 text-indigo-600" />
            Bulk Generation
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <p className="text-muted-foreground text-sm font-medium mb-4">Product: <span className="text-foreground">{product.name}</span></p>

          {!jobStatus ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Number of Codes *</label>
                <Input type="number" min="1" max="100000" value={qty} onChange={e => setQty(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">≤ 500: instant | &gt; 500: background async job</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button disabled={loading} onClick={handleGenerate} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {loading ? '⏳...' : 'Generate'}
                </Button>
                <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${jobStatus.progress}%` }}></div>
                </div>
                <div className="text-sm font-semibold text-center">{jobStatus.progress}% — {jobStatus.count} codes</div>
              </div>
              
              {jobStatus.pending === false && (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-2 text-center text-sm">✅ Complete</div>
                  <Button variant="outline" onClick={() => { onExportQr('csv'); onClose(); }} className="w-full">
                    ⬇️ Download CSV Matrix
                  </Button>
                  <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
                </div>
              )}
              {jobStatus.error && <div className="text-red-500 text-sm mt-2">Error: {jobStatus.error}</div>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
