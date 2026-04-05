"use client";

import { useEffect, useState, useMemo } from "react";
import { clientApi } from "@/lib/client/api";
import { BadgeDollarSign, TrendingUp, Users, Box, CreditCard, ArrowUpRight, Activity } from "lucide-react";

export default function FinancialsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher();
  }, []);

  const fetcher = async () => {
    try {
      const res = await clientApi.get("/platform/orgs");
      setTenants(res.orgs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    let totalMRR = 0;
    let payingCount = 0;
    let basePlanMRR = 0;
    let addonMRR = 0;
    const planCounts: Record<string, number> = { core: 0, pro: 0, enterprise: 0 };
    const planMRR:     Record<string, number> = { core: 0, pro: 0, enterprise: 0 };

    for (const t of tenants) {
      const plan = (t.mrr_details?.planLabel || t.plan || 'core').toLowerCase();
      
      const pId = plan.includes('enterprise') ? 'enterprise' : plan.includes('pro') ? 'pro' : 'core';
      planCounts[pId] = (planCounts[pId] || 0) + 1;
      
      if (t.mrr_details?.totalMRR > 0) {
        totalMRR += t.mrr_details.totalMRR;
        payingCount++;
        basePlanMRR += t.mrr_details.basePrice || 0;
        addonMRR += t.mrr_details.addonCost || 0;
        planMRR[pId] = (planMRR[pId] || 0) + (t.mrr_details.totalMRR);
      }
    }

    const arpu = payingCount > 0 ? (totalMRR / payingCount).toFixed(0) : "0";

    // Sort top tenants
    const sorted = [...tenants].sort((a,b) => (b.mrr_details?.totalMRR || 0) - (a.mrr_details?.totalMRR || 0));
    
    return {
        totalMRR, payingCount, arpu, basePlanMRR, addonMRR,
        planCounts, planMRR,
        topTenants: sorted.slice(0, 10).filter(t => (t.mrr_details?.totalMRR || 0) > 0)
    };
  }, [tenants]);

  if (loading) {
    return <div className="flex-1 p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans relative">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <BadgeDollarSign className="w-8 h-8 text-emerald-600" /> Financial Control Board
        </h1>
        <p className="text-slate-500">Real-time aggregate view of Monthly Recurring Revenue (MRR), ARPU, and plan distribution.</p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border text-emerald-900 border-emerald-100 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)] relative overflow-hidden">
            <div className="absolute -right-4 -top-8 opacity-10">
                <BadgeDollarSign fill="currentColor" stroke="none" className="w-32 h-32" />
            </div>
            <p className="text-emerald-700/80 font-bold tracking-wider text-xs uppercase mb-2">Total Monthly Revenue</p>
            <h2 className="text-4xl font-black font-mono tracking-tighter">${metrics.totalMRR.toLocaleString()}<span className="text-sm tracking-normal text-emerald-600/70 ml-1">/mo</span></h2>
        </div>
        
        <div className="bg-white border text-indigo-900 border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.03]">
                <Users fill="currentColor" className="w-32 h-32 transform translate-x-4 -translate-y-4" />
            </div>
            <p className="text-indigo-600/80 font-bold tracking-wider text-xs uppercase mb-2">Paying Customers</p>
            <h2 className="text-4xl font-black tracking-tighter">{metrics.payingCount} <span className="text-sm font-semibold tracking-normal text-indigo-400 ml-1">/ {tenants.length} orgs</span></h2>
        </div>

        <div className="bg-white border text-purple-900 border-purple-100 rounded-2xl p-6 shadow-sm">
            <p className="text-purple-600/80 font-bold tracking-wider text-xs uppercase mb-2">ARPU (Avg Revenue)</p>
            <h2 className="text-4xl font-black font-mono tracking-tighter">${metrics.arpu}<span className="text-sm tracking-normal text-purple-600/70 ml-1">/user</span></h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <p className="text-slate-400 font-bold tracking-wider text-xs uppercase mb-2">Revenue Mix</p>
            <div>
                <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-300">Base Plans</span><span className="font-mono text-emerald-400 font-bold">${metrics.basePlanMRR.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs border-t border-slate-700 pt-1.5"><span className="text-slate-300">Expansion Addons</span><span className="font-mono text-blue-400 font-bold">${metrics.addonMRR.toLocaleString()}</span></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Breakdown by Tier */}
        <div className="lg:col-span-1 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Box className="w-4 h-4 text-indigo-500" /> Plan Distribution</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-4">
                
                {/* Enterprise */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-slate-800 tracking-tight">Enterprise</div>
                        <div className="text-xs text-slate-500 font-medium">{metrics.planCounts.enterprise} organizations</div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">${metrics.planMRR.enterprise.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">MRR</div>
                    </div>
                </div>

                {/* Pro */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-blue-900 tracking-tight">Pro</div>
                        <div className="text-xs text-blue-600/70 font-medium">{metrics.planCounts.pro} organizations</div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono font-bold text-blue-900">${metrics.planMRR.pro.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">MRR</div>
                    </div>
                </div>

                {/* Core */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-slate-600 tracking-tight">Core</div>
                        <div className="text-xs text-slate-400 font-medium">{metrics.planCounts.core} organizations</div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono font-bold text-slate-500">${metrics.planMRR.core.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">MRR</div>
                    </div>
                </div>

            </div>
        </div>

        {/* Top Customers */}
        <div className="lg:col-span-2 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-600" /> Top Revenue Contributors</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{metrics.topTenants.length} active</span>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">Organization</th>
                            <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">Allocated Plan</th>
                            <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400 text-right">MRR Invoice</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.topTenants.map((t, idx) => (
                            <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="font-bold text-slate-900">{t.name}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{t.id}</div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                        t.plan?.toLowerCase() === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                        t.plan?.toLowerCase() === 'pro' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {t.plan || 'core'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <div className="font-mono font-black text-slate-900">${t.mrr_details.totalMRR.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1"><ArrowUpRight className="w-3 h-3" /> paid</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
