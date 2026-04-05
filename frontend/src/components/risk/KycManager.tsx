"use client";

import { useState } from "react";
import { clientApi } from "@/lib/client/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Search, CheckCircle2, XCircle, Users, Settings2, Trash2 } from "lucide-react";

type KycData = {
  stats: {
    total_businesses: number;
    verified: number;
    pending: number;
    high_risk: number;
    pending_sanctions: number;
    verification_rate: string;
  };
  businesses: any[];
};

export default function KycManager({ initialData, isSuperAdmin, initialApprovers }: { initialData: KycData, isSuperAdmin: boolean, initialApprovers: any[] }) {
  const [d, setD] = useState<KycData>(initialData);
  const [approvers, setApprovers] = useState<any[]>(initialApprovers);
  const [modal, setModal] = useState<string | null>(null); // 'submit' | 'verify' | 'addApprover' | null

  // Form states
  const [subForm, setSubForm] = useState({ name: '', registration_number: '', country: '', industry: '', contact_email: '', notes: '' });
  const [verForm, setVerForm] = useState({ name: '', registration_number: '', country: '', industry: '', contact_email: '' });
  const [uidForm, setUidForm] = useState('');

  const submitKycBusiness = async () => {
    if (!subForm.name || !subForm.registration_number || !subForm.country) {
      return alert('Name, registration number, and country are required');
    }
    try {
      await clientApi.post('/kyc/businesses/submit', subForm);
      alert('Business submitted for KYC review ✅');
      setModal(null);
      window.location.reload();
    } catch(e:any) { alert(e.message || 'Submission failed'); }
  };

  const submitKycVerify = async () => {
    if (!verForm.name) return alert('Business name required');
    try {
      const res = await clientApi.post('/kyc/verify', verForm);
      alert(`KYC submitted – Risk: ${res.risk_level}, Score: ${res.avg_score}`);
      setModal(null);
      window.location.reload();
    } catch(e:any) { alert(e.message || 'Verification failed'); }
  };

  const kycApprove = async (id: string) => {
    if(!confirm("Approve this business?")) return;
    try {
      await clientApi.post(`/kyc/businesses/${id}/approve`);
      window.location.reload();
    } catch(e:any) { alert(e.message); }
  };

  const kycReject = async (id: string) => {
    if(!confirm("Reject this business?")) return;
    try {
      await clientApi.post(`/kyc/businesses/${id}/reject`);
      window.location.reload();
    } catch(e:any) { alert(e.message); }
  };

  const submitAddApprover = async () => {
    if (!uidForm) return alert('User ID required');
    try {
      await clientApi.post('/kyc/approvers', { userId: uidForm });
      alert('Approver added ✅');
      setModal(null);
      window.location.reload();
    } catch(e:any) { alert(e.message); }
  };

  const removeApproverHandler = async (userId: string) => {
    if (!confirm('Remove this approver?')) return;
    try {
      await clientApi.delete(`/kyc/approvers/${userId}`);
      window.location.reload();
    } catch(e:any) { alert(e.message); }
  };

  const kycSanctionCheck = async (id: string) => {
    try {
      const res = await clientApi.post('/kyc/sanction-check', { business_id: id });
       alert(res.clean ? "✅ No sanctions found" : `⚠️ ${res.hits?.length} sanction hit(s)`);
      window.location.reload();
    } catch(e:any) { alert('Sanction check failed'); }
  };

  const s = d.stats;

  const statsMap = [
    { label: 'Businesses', value: s.total_businesses, color: 'text-slate-900 dark:text-white', dot: 'bg-indigo-500' },
    { label: 'Verified', value: s.verified, color: 'text-emerald-600', dot: 'bg-emerald-500' },
    { label: 'Pending', value: s.pending, color: 'text-orange-500', dot: 'bg-orange-500' },
    { label: 'High Risk', value: s.high_risk, color: 'text-red-500', dot: 'bg-red-500' },
    { label: 'Sanctions', value: s.pending_sanctions, color: 'text-red-500', dot: 'bg-red-500' },
    { label: 'Verified Rate', value: `${s.verification_rate}%`, color: 'text-indigo-600', dot: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
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

      {/* Main Table */}
      <Card className="border-border shadow-sm overflow-hidden flex flex-col min-h-0">
        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row justify-between items-center space-y-0">
          <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Registered Businesses
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setModal('submit')} className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-semibold px-3">
              📝 Submit Business
            </Button>
            <Button variant="outline" onClick={() => setModal('verify')} className="h-8 text-xs font-semibold px-3">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Quick Verify
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {d.businesses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No registered businesses</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Business</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Reg #</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Country</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Industry</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Risk</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Checks</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Sanctions</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.businesses.map(b => (
                  <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-foreground">{b.name}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{b.registration_number || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{b.country}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{b.industry}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                        b.risk_level === 'low' ? 'bg-emerald-50 text-emerald-700' :
                        b.risk_level === 'high' || b.risk_level === 'critical' ? 'bg-red-50 text-red-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>{b.risk_level}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                        b.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                        b.verification_status === 'rejected' ? 'bg-red-50 text-red-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>{b.verification_status}</span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-[10px]">{b.check_count || 0}</TableCell>
                    <TableCell className={`text-center font-bold text-xs ${b.pending_sanctions > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      <button onClick={() => kycSanctionCheck(b.id)} title="Run Sanction Check" className="hover:underline">{b.pending_sanctions || 0}</button>
                    </TableCell>
                    <TableCell className="text-right">
                      {b.verification_status === 'pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => kycApprove(b.id)} className="h-6 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-2 font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => kycReject(b.id)} className="h-6 text-[10px] border-red-200 text-red-700 hover:bg-red-50 px-2 font-bold">
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approvers (Super Admin Only) */}
      {isSuperAdmin && (
        <Card className="border-border shadow-sm overflow-hidden flex flex-col min-h-0">
          <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row justify-between items-center space-y-0">
            <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
              <Users className="w-5 h-5 text-indigo-600" />
              KYC Approvers
            </CardTitle>
            <Button variant="outline" onClick={() => setModal('addApprover')} className="h-8 text-xs font-semibold px-3">
              + Add Approver
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {approvers.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">User</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Email</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Role</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Added</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvers.map((a, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-900">{a.username}</TableCell>
                      <TableCell className="text-muted-foreground text-[10px]">{a.email || '—'}</TableCell>
                      <TableCell>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">{a.role}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px]">{a.added_at ? new Date(a.added_at).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeApproverHandler(a.user_id)} className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 font-bold px-2">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <div className="p-8 text-center text-muted-foreground text-sm">No approvers configured — only super admins can approve.</div>}
          </CardContent>
        </Card>
      )}

      {/* MODALS */}
      {modal === 'submit' && (
        <Dialog open={true} onOpenChange={(open) => !open && setModal(null)}>
          <DialogContent className="sm:max-w-md bg-white border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Submit Business for KYC
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Business Name *</label>
                <Input autoFocus value={subForm.name} onChange={e=>setSubForm({...subForm, name:e.target.value})} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Registration # *</label>
                <Input value={subForm.registration_number} onChange={e=>setSubForm({...subForm, registration_number:e.target.value})} placeholder="Registration Number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Country *</label>
                  <Input value={subForm.country} onChange={e=>setSubForm({...subForm, country:e.target.value})} placeholder="US, VN, SG" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Industry</label>
                  <Input value={subForm.industry} onChange={e=>setSubForm({...subForm, industry:e.target.value})} placeholder="Finance, Logistics..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Contact Email</label>
                <Input type="email" value={subForm.contact_email} onChange={e=>setSubForm({...subForm, contact_email:e.target.value})} placeholder="contact@acme.com" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={submitKycBusiness} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Submit for Review</Button>
              <Button variant="outline" onClick={() => setModal(null)} className="px-6">Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {modal === 'verify' && (
        <Dialog open={true} onOpenChange={(open) => !open && setModal(null)}>
          <DialogContent className="sm:max-w-md bg-white border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Search className="w-5 h-5 text-indigo-600" />
                Quick Verify Business
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Business Name *</label>
                <Input autoFocus value={verForm.name} onChange={e=>setVerForm({...verForm, name:e.target.value})} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Registration #</label>
                <Input value={verForm.registration_number} onChange={e=>setVerForm({...verForm, registration_number:e.target.value})} placeholder="Registration Number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Country</label>
                  <Input value={verForm.country} onChange={e=>setVerForm({...verForm, country:e.target.value})} placeholder="US, VN, SG" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Industry</label>
                  <Input value={verForm.industry} onChange={e=>setVerForm({...verForm, industry:e.target.value})} placeholder="Finance, Logistics..." />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={submitKycVerify} className="flex-1 bg-emerald-600 hover:bg-emerald-700">Run Verification</Button>
              <Button variant="outline" onClick={() => setModal(null)} className="px-6">Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {modal === 'addApprover' && (
        <Dialog open={true} onOpenChange={(open) => !open && setModal(null)}>
          <DialogContent className="sm:max-w-sm bg-white border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                Add KYC Approver
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-4">Enter the User UUID to grant them KYC approval rights.</p>
              <Input autoFocus value={uidForm} onChange={e=>setUidForm(e.target.value)} placeholder="User UUID..." className="mb-6" />
              <div className="flex gap-2">
                <Button onClick={submitAddApprover} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Add Approver</Button>
                <Button variant="outline" onClick={() => setModal(null)} className="px-6">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
