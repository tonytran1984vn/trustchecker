import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Building, CreditCard, Receipt, Target, Package, Zap, ArrowRight, ShieldCheck } from "lucide-react";

interface InvoiceItem {
  id?: string;
  date?: string;
  amount?: number;
  status?: string;
  [key: string]: any;
}

interface BillingData {
  plans: any[];
  current_tier: string;
  invoices: InvoiceItem[];
}

export default function OrganizationBilling({ data }: { data: BillingData }) {
    const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const currentTier = data?.current_tier || "Enterprise";
  const invoices = data?.invoices || [];
  const hasInvoices = invoices.length > 0;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-4 duration-300 max-w-md">{toast}</div>}

      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-md flex flex-col justify-center p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="absolute -right-4 -top-6 opacity-[0.02] dark:opacity-[0.04] text-slate-900 dark:text-white">
             <Building className="w-32 h-32" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] font-serif text-slate-500 dark:text-slate-400 mb-4 relative z-10">Current Plan</p>
          <div className="flex items-center gap-4 relative z-10 mb-4">
             <div className="w-10 h-10 rounded border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Target className="w-5 h-5" />
             </div>
             <h3 className="text-4xl font-serif text-slate-900 dark:text-white capitalize tracking-tight">{currentTier}</h3>
          </div>
          <p className="text-sm font-serif text-slate-500 dark:text-slate-400 relative z-10">Billed annually • Renews Jan 15th, 2027</p>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center p-6 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MRR Burn</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">$4,850.00</div>
          <p className="text-xs text-slate-500 mt-2">Current monthly run rate</p>
        </Card>

        <Card className="border-border shadow-sm flex flex-col justify-center p-6 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usage Cap</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">42%</div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
             <div className="bg-indigo-500 h-full rounded-full w-[42%]"></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
        
        {/* Billing & Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
           <Card className="border-border shadow-sm">
             <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4">
                <CardTitle className="text-lg">Payment Methods</CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-indigo-200 bg-indigo-50/30 rounded-xl">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold italic shadow">
                         VISA
                      </div>
                      <div>
                         <h4 className="font-bold text-slate-900">Visa ending in **** 4242</h4>
                         <p className="text-xs text-slate-500">Expires 04/2028</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Default</span>
                      <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition">Edit</button>
                   </div>
                </div>

                <div className="mt-4">
                   <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Add Payment Method
                   </button>
                </div>
             </CardContent>
           </Card>

           <Card className="border-border shadow-sm">
             <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Billing History</CardTitle>
                <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-xs font-medium text-slate-500 hover:text-slate-900 transition uppercase tracking-wider">Download All</button>
             </CardHeader>
             <CardContent className="p-0">
               {!hasInvoices ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-[200px]">
                     <Receipt className="w-10 h-10 text-slate-300 mb-4" />
                     <h3 className="font-bold text-slate-900">No Invoices</h3>
                     <p className="text-sm text-slate-500">Your institutional billing history will appear here.</p>
                  </div>
               ) : (
                  <div className="divide-y divide-slate-100">
                     {invoices.map((inv, i) => (
                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                 <Receipt className="w-5 h-5" />
                              </div>
                              <div>
                                 <h4 className="font-semibold text-sm text-slate-900">{inv.amount ? `$${inv.amount.toLocaleString()}` : "$0.00"}</h4>
                                 <p className="text-xs text-slate-500">{new Date(inv.date || Date.now()).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Paid</span>
                              <ArrowRight className="w-4 h-4 text-slate-300" />
                           </div>
                        </div>
                     ))}
                  </div>
               )}
             </CardContent>
           </Card>
        </div>

        {/* Organization Details */}
        <div className="space-y-6">
           <Card className="border-border shadow-sm">
             <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4">
                <CardTitle className="text-lg">Organization Legal</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
                <div>
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Company Name</label>
                   <div className="font-medium text-slate-900">Sovereign OS Inc.</div>
                </div>
                <div>
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Tax ID / EIN</label>
                   <div className="font-medium text-slate-900">83-xxxxxx29</div>
                </div>
                <div>
                   <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Billing Address</label>
                   <div className="text-sm text-slate-600 leading-relaxed">
                      123 Corporate Blvd, Suite 400<br/>
                      Singapore 100232<br/>
                      Singapore
                   </div>
                </div>
                <div className="pt-2">
                   <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-sm font-medium border border-slate-200 rounded-md px-4 py-2 w-full hover:bg-slate-50 transition">
                      Edit Organization Details
                   </button>
                </div>
             </CardContent>
           </Card>

           <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 text-sm mb-1">Enterprise Support</h4>
              <p className="text-xs text-slate-500 mb-4">You have access to 24/7 dedicated institutional support channels.</p>
              <button onClick={() => showToast('Chi tiết đang được xây dựng (Enterprise Feature)')} className="text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-widest transition">
                 Contact Support
              </button>
           </div>
        </div>

      </div>
    </div>
  )
}
