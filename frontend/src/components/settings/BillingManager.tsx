"use client";

import { useState } from "react";
import { clientApi } from "@/lib/client/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Rocket, Box, Sparkles, CheckCircle2, ChevronRight, XCircle, Loader2, AlertTriangle, AlertCircle, RefreshCcw, DollarSign, BatteryWarning, ShieldCheck } from "lucide-react";

// Same Constants
const PLAN_BASE_PRICES: Record<string, number> = { core: 0, pro: 299, enterprise: 5000 };

const PLAN_DEFAULTS: Record<string, string[]> = {
  core: ['qr', 'products'],
  pro: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'inventory'],
  enterprise: ['qr', 'products', 'scm_tracking', 'support', 'partners', 'inventory', 'governance'],
};

const FEATURE_LIST = [
  // Core Platform
  { id: 'qr', label: 'QR Traceability', price: 0, minTier: 'core' },
  { id: 'products', label: 'Product Catalog', price: 0, minTier: 'core' },
  { id: 'inventory', label: 'Inventory Management', price: 49, minTier: 'core' },
  { id: 'partners', label: 'Partner Portal', price: 49, minTier: 'core', usageLabel: 'Max 3 Partners' },

  // Operating System Backbone
  { id: 'scm_tracking', label: 'Supply Chain Tracking', price: 99, minTier: 'pro' },
  { id: 'support', label: 'Premium Support', price: 199, minTier: 'pro' },

  // Intelligence Layer
  { id: 'carbon', label: 'Carbon Tracking', price: 199, minTier: 'pro' },
  { id: 'risk_radar', label: 'Risk Radar', price: 99, minTier: 'pro', usageLabel: '+ $1.5/alert' },
  { id: 'ai_forecast', label: 'AI Forecaster', price: 199, minTier: 'pro', usageLabel: '+ $2/1k predicts' },
  { id: 'digital_twin', label: 'Digital Twin', price: 149, minTier: 'pro' },

  // Compliance Layer
  { id: 'kyc', label: 'KYC / AML', price: 249, minTier: 'pro' },
  { id: 'blockchain', label: 'Blockchain Anchoring', price: 199, minTier: 'pro' },
  { id: 'nft', label: 'NFT Certificates', price: 99, minTier: 'pro' },

  // Enterprise Add-ons
  { id: 'governance', label: 'Advanced Governance', price: 299, minTier: 'enterprise' },
  { id: 'overclaim', label: 'Overclaim Detection', price: 399, minTier: 'enterprise' },
  { id: 'lineage', label: 'Lineage Replay', price: 499, minTier: 'enterprise' },
  { id: 'exec_dashboard', label: 'Exec Risk Dashboard', price: 199, minTier: 'enterprise' },
  { id: 'registry_export', label: 'Registry Export API', price: 599, minTier: 'enterprise' },
  { id: 'erp_integration', label: 'ERP Integration', price: 999, minTier: 'enterprise' },
  { id: 'ivu_cert', label: 'IVU Premium Audit', price: 499, minTier: 'enterprise' },

  // Enterprise Suites
  { id: 'compliance_suite', label: 'Compliance Suite', price: 2499, minTier: 'enterprise', isBundle: true, includes: ['governance', 'ivu_cert', 'registry_export', 'exec_dashboard'] },
  { id: 'integration_suite', label: 'Integration Suite', price: 1499, minTier: 'enterprise', isBundle: true, includes: ['erp_integration', 'blockchain', 'digital_twin'] }
];

const TIER_RANK: Record<string, number> = { core: 1, pro: 2, enterprise: 3 };
const TIER_LABELS: Record<string, string> = { core: 'Core', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLORS: Record<string, string> = { core: '#06b6d4', pro: '#8b5cf6', enterprise: '#f59e0b' };

function projectPlanSwitch(targetPlan: string, currentActiveIds: string[], currentAddons: string[]) {
  const targetDefaults = PLAN_DEFAULTS[targetPlan] || [];
  const baseCost = PLAN_BASE_PRICES[targetPlan] || 0;

  let addonCost = 0;
  const compatibleAddons = [];
  const strippedFeatures = [];

  for (const addonId of currentAddons) {
    const feat = FEATURE_LIST.find(f => f.id === addonId);
    if (!feat) continue;
    if (TIER_RANK[feat.minTier] > TIER_RANK[targetPlan]) {
      strippedFeatures.push(feat);
    } else if (targetDefaults.includes(addonId)) {
      compatibleAddons.push({ ...feat, becomesDefault: true });
    } else {
      addonCost += feat.price || 0;
      compatibleAddons.push({ ...feat, becomesDefault: false });
    }
  }

  const currentPlanDefaults = currentActiveIds.filter(id => !currentAddons.includes(id));
  for (const featureId of currentPlanDefaults) {
    if (targetDefaults.includes(featureId)) continue;
    const feat = FEATURE_LIST.find(f => f.id === featureId);
    if (!feat) continue;
    if (TIER_RANK[feat.minTier] > TIER_RANK[targetPlan]) {
      strippedFeatures.push(feat);
    } else {
      addonCost += feat.price || 0;
    }
  }

  return { baseCost, addonCost, totalMRR: baseCost + addonCost, compatibleAddons, strippedFeatures };
}

export default function BillingManager({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [activeModal, setActiveModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const plan = data?.plan || {};
  const currentSlug = plan.slug || 'core';
  const currentMRR = plan.price_monthly ?? 0;
  const currentActiveIds = plan.active_features || PLAN_DEFAULTS[currentSlug] || [];
  const currentActiveAddons = plan.addons ? plan.addons.map((a:any) => a.id) : [];

  const usageBar = (used: number | string, limit: number | string, label: string) => {
    const isUnlimited = limit === '∞' || limit === -1;
    const usedNum = typeof used === 'number' ? used : 0;
    const limitNum = typeof limit === 'number' ? limit : 1;
    const pct = isUnlimited ? 5 : Math.min((usedNum / limitNum) * 100, 100);
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500';
    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{label}</span>
          <span className="text-xs text-muted-foreground font-mono">{typeof used === 'number' ? used.toLocaleString() : used} / {isUnlimited ? '∞' : (typeof limit === 'number' ? limit.toLocaleString() : limit)}</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const handleSwitchPlan = async (targetSlug: string) => {
    setLoading(true);
    try {
      const isTierLower = TIER_RANK[targetSlug] < TIER_RANK[currentSlug];
      const preview = await clientApi.get(`/billing/proration-preview?target_plan=${targetSlug}`);
      setActiveModal({
        type: isTierLower ? 'downgrade' : 'upgrade',
        targetSlug,
        preview,
        label: TIER_LABELS[targetSlug]
      });
    } catch(e) {
      alert("Failed to preview plan change");
    } finally {
      setLoading(false);
    }
  };

  const executePlanChange = async (targetPlanName: string, keepAddonIds?: string[]) => {
    try {
      const res = await clientApi.post('/billing/upgrade', { targetPlanName, keepAddonIds });
      if (res.action === 'checkout_required' && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      alert(`Successfully changed plan to ${targetPlanName}`);
      window.location.reload();
    } catch(e:any) {
      alert(e.message || "Failed to switch plan");
    }
  };

  const handleAddonToggle = async (id: string, currentlyActive: boolean, label: string) => {
    if (currentlyActive) {
      if(confirm(`Remove ${label}? Credit for unused days will be added to your balance.`)) {
        try {
          await clientApi.post('/billing/addon/toggle', { feature_id: id });
          window.location.reload();
        } catch(e:any){ alert(e.message); }
      }
      return;
    }
    
    // Preview Adding Addon
    setLoading(true);
    try {
      const preview = await clientApi.get(`/billing/proration-preview?feature_id=${id}`);
      setActiveModal({ type: 'addon', featureId: id, label, preview });
    } catch(e){ alert("Failed to fetch addon preview"); }
    finally { setLoading(false); }
  };

  const executeAddon = async (feature_id: string) => {
    try {
      const res = await clientApi.post('/billing/addon/toggle', { feature_id });
      if (res.action === 'checkout_required' && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      window.location.reload();
    } catch(e:any){ alert(e.message); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {plan?.pending_downgrade && (
        <div className="bg-yellow-50 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex gap-4 items-center">
            <BatteryWarning className="w-8 h-8 text-yellow-500" />
            <div>
              <h4 className="font-bold text-yellow-800 dark:text-yellow-500">Downgrade Scheduled</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-600">Your plan will switch to {TIER_LABELS[plan.pending_downgrade]} on {new Date(plan.downgrade_at).toLocaleDateString()}. Features retained until then.</p>
            </div>
          </div>
          <Button 
            variant="outline"
            onClick={async () => {
              if(!confirm('Cancel the scheduled downgrade?')) return;
              try { await clientApi.post('/billing/cancel-downgrade'); window.location.reload(); } catch(e){}
            }} 
            className="text-yellow-800 border-yellow-300 font-bold"
          >
            <XCircle className="w-4 h-4 mr-2" /> Cancel Downgrade
          </Button>
        </div>
      )}

      {plan?.credit_balance > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <DollarSign className="w-8 h-8 text-emerald-500" />
          <div className="text-sm font-medium text-emerald-800">
            Credit Balance: <span className="font-mono font-bold">${plan.credit_balance.toFixed(2)}</span> — applied to your next upgrade or invoice.
          </div>
        </div>
      )}

      {/* Active Plan Card */}
      <Card className="shadow-sm border-2 overflow-hidden relative" style={{ borderColor: PLAN_COLORS[currentSlug] || '#e2e8f0' }}>
        <div className="absolute top-0 w-full h-1.5" style={{ backgroundColor: PLAN_COLORS[currentSlug] }}></div>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border">
                  <Rocket className="w-8 h-8" style={{ color: PLAN_COLORS[currentSlug] }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-3xl font-black tracking-tight" style={{ color: PLAN_COLORS[currentSlug] }}>{plan.name || 'Core'}</h2>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-200">Current Plan</span>
                </div>
                <div className="text-4xl font-black font-mono tracking-tighter text-slate-900 dark:text-white">
                  ${currentMRR} <span className="text-base font-medium text-muted-foreground tracking-normal">/mo</span>
                </div>
              </div>
            </div>

            {plan.addons?.length > 0 && (
              <div className="md:border-l border-border md:pl-8 text-sm text-muted-foreground min-w-[200px]">
                <div className="flex justify-between mb-1.5"><span className="font-semibold uppercase text-[10px] tracking-wider">Base Plan</span><span className="font-bold text-foreground font-mono text-xs">${plan.base_price}/mo</span></div>
                <div className="flex justify-between"><span className="font-semibold uppercase text-[10px] tracking-wider">Active Add-ons</span><span className="font-bold text-blue-600 font-mono text-xs">+${plan.addon_cost}/mo</span></div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">✓ Included Features</div>
            <div className="flex flex-wrap gap-2">
              {FEATURE_LIST.filter(f => currentActiveIds.includes(f.id) && !currentActiveAddons.includes(f.id)).map(f => (
                <div key={f.id} className="inline-flex items-center px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold shadow-sm">
                  {f.label} <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2" />
                </div>
              ))}
            </div>
          </div>

          {currentActiveAddons.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3 px-1">★ Active Upgrades (Click to remove)</div>
              <div className="flex flex-wrap gap-2">
                {FEATURE_LIST.filter(f => currentActiveAddons.includes(f.id)).map(f => (
                  <button key={f.id} onClick={() => handleAddonToggle(f.id, true, f.label)} className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-semibold hover:bg-blue-100 hover:border-blue-300 transition shadow-sm group">
                    {f.label} <XCircle className="w-3.5 h-3.5 text-blue-400 group-hover:text-red-500 ml-2 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Available Upgrades */}
          {(() => {
            const activeSet = new Set(currentActiveIds);
            const availableFeatures = FEATURE_LIST.filter(f => !activeSet.has(f.id));
            if (availableFeatures.length === 0) return null;

            const sameTier = availableFeatures.filter(f => TIER_RANK[f.minTier] <= TIER_RANK[currentSlug]);
            const needsUpgrade = availableFeatures.filter(f => TIER_RANK[f.minTier] > TIER_RANK[currentSlug]);

            return (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">+ Available Upgrades</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {sameTier.map(f => (
                    <button key={f.id} onClick={() => handleAddonToggle(f.id, false, f.label)} disabled={loading} className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold hover:border-blue-400 hover:bg-slate-50 transition shadow-sm group">
                      {f.label} <span className="text-muted-foreground group-hover:text-blue-600 font-mono text-[10px] ml-2 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">+${f.price} {f.usageLabel && <span className="text-orange-500 font-bold ml-1">{f.usageLabel}</span>}</span>
                    </button>
                  ))}
                </div>
                {needsUpgrade.length > 0 && (
                  <>
                    <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
                      <Sparkles className="w-3.5 h-3.5" /> Higher Tier Features <span className="text-muted-foreground lowercase opacity-80">(auto-upgrades plan)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {needsUpgrade.map(f => (
                        <button key={f.id} onClick={() => handleAddonToggle(f.id, false, f.label)} disabled={loading} className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold hover:border-purple-400 hover:bg-slate-50 transition shadow-sm group">
                          {f.label} 
                          <span className="text-muted-foreground group-hover:text-purple-600 font-mono text-[10px] mx-1.5 bg-slate-100 dark:bg-slate-800 px-1 rounded">+${f.price} {f.usageLabel && <span className="text-orange-500 font-bold ml-1">{f.usageLabel}</span>}</span>
                          <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 pb-0.5 rounded uppercase tracking-wider border border-purple-200">⬆ {TIER_LABELS[f.minTier]}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t border-border p-4 px-6 md:px-8 text-[11px] uppercase tracking-wider font-bold text-muted-foreground justify-center gap-6">
            <span>📱 {(plan.limits?.scans ?? 0) < 0 ? 'Unlimited' : (plan.limits?.scans ?? 0).toLocaleString()} scans</span>
            <span>🔌 {(plan.limits?.api_calls ?? 0) < 0 ? 'Unlimited' : (plan.limits?.api_calls ?? 0).toLocaleString()} API</span>
            <span>💾 {(plan.limits?.storage_mb ?? 0) < 0 ? 'Unlimited' : (plan.limits?.storage_mb ?? 0).toLocaleString()} MB</span>
        </CardFooter>
      </Card>

      {/* Compare Plans Matrix */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <Box className="w-4 h-4" /> Compare Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(data.available || []).filter((p:any) => p.slug !== currentSlug).map((p:any) => {
            const defaults = PLAN_DEFAULTS[p.slug] || [];
            const includedFeatures = FEATURE_LIST.filter(f => defaults.includes(f.id));
            const projected = projectPlanSwitch(p.slug, currentActiveIds, currentActiveAddons);
            const priceDiff = projected.totalMRR - currentMRR;
            const isTierHigher = TIER_RANK[p.slug] > TIER_RANK[currentSlug];

            return (
              <Card key={p.slug} onClick={() => handleSwitchPlan(p.slug)} className="flex flex-col relative cursor-pointer hover:shadow-xl hover:border-slate-300 transition-all group overflow-hidden">
                <div className={`absolute top-0 w-full h-1 ${isTierHigher ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-yellow-500'}`}></div>
                <div className={`absolute top-4 right-4 text-[9px] px-2 py-0.5 rounded-sm font-bold tracking-wider uppercase border shadow-sm ${isTierHigher ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                  {isTierHigher ? '⬆ UPGRADE' : '⬇ DOWNGRADE'}
                </div>
                
                <CardHeader className="text-center pt-8 pb-4">
                  <div className="w-12 h-12 mx-auto bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                    <Rocket className="w-6 h-6" style={{ color: PLAN_COLORS[p.slug] }} />
                  </div>
                  <CardTitle className="font-black text-2xl" style={{ color: PLAN_COLORS[p.slug] }}>{p.name}</CardTitle>
                  <div className="text-sm font-bold mt-2 text-muted-foreground tracking-wider uppercase">Base: ${PLAN_BASE_PRICES[p.slug]}/mo</div>
                </CardHeader>

                <CardContent className="flex-grow">
                  <div className="mb-6">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-3">✓ Includes {includedFeatures.length} Features</div>
                    <div className="flex flex-wrap gap-1.5">
                      {includedFeatures.slice(0,6).map(f=><span key={f.id} className="text-[10px] px-2 py-1 bg-slate-50 font-semibold text-slate-600 rounded-md border border-slate-200">{f.label}</span>)}
                      {includedFeatures.length > 6 && <span className="text-[10px] px-2 py-1 font-bold text-muted-foreground tracking-wider uppercase">+{includedFeatures.length - 6} more</span>}
                    </div>
                  </div>

                  {priceDiff !== 0 && (
                    <div className={`p-4 rounded-xl text-xs font-medium border ${priceDiff < 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-red-50/50 border-red-100 text-red-900'} mb-4`}>
                      <div className="flex justify-between mb-1.5"><span className="opacity-80">Base Plan</span><span className="font-mono">${projected.baseCost}/mo</span></div>
                      {projected.addonCost > 0 && <div className="flex justify-between mb-1.5"><span className="opacity-80">Carried Add-ons</span><span className="text-blue-600 font-mono">+${projected.addonCost}/mo</span></div>}
                      <div className="flex justify-between border-t border-black/10 mt-3 pt-3">
                        <span className="font-bold tracking-wider uppercase text-[10px] mt-0.5">Projected Total</span>
                        <span className={`font-black font-mono text-sm ${priceDiff < 0 ? 'text-emerald-600' : 'text-red-600'}`}>${projected.totalMRR}/mo <span className="text-[10px] tracking-normal border border-current rounded px-1 ml-1 opacity-80">({priceDiff>0?'+':''}{priceDiff})</span></span>
                      </div>
                    </div>
                  )}

                  {projected.strippedFeatures.length > 0 && (
                    <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                      <div className="font-bold text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Features to be removed:</div>
                      {projected.strippedFeatures.map(f => <div key={f.id} className="pl-5 relative before:content-['•'] before:absolute before:left-2 before:top-0"> {f.label}</div>)}
                    </div>
                  )}
                </CardContent>
                <div className="bg-slate-50 border-t border-border p-3 text-center transition-colors group-hover:bg-slate-100">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1 group-hover:text-indigo-600">
                    Switch Plan <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4 border-b bg-slate-50/50">
            <CardTitle className="text-base font-bold text-foreground">Current Usage ({data.period})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {data.usage ? (
              <>
                {usageBar(data.usage.scans.used, data.usage.scans.limit, 'Scans')}
                {usageBar(data.usage.api_calls.used, data.usage.api_calls.limit, 'API Calls')}
                {usageBar(data.usage.storage_mb.used, data.usage.storage_mb.limit, 'Storage (MB)')}
              </>
            ) : <div className="text-center text-muted-foreground text-sm font-medium py-4">No usage data available</div>}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-4 border-b bg-slate-50/50">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan</TableHead>
                  <TableHead className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                  <TableHead className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices?.length > 0 ? data.invoices.map((inv:any) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/50">
                    <TableCell className="px-5 font-bold capitalize text-foreground">{inv.plan_name}</TableCell>
                    <TableCell className="px-5 font-mono text-xs font-semibold">${inv.amount}</TableCell>
                    <TableCell className="px-5">
                      {inv.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-red-50 text-red-600 border border-red-200 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-widest">PENDING</span>
                          <button onClick={async() => { if(confirm('Simulate pay?')){ await clientApi.post(`/billing/pay/${inv.id}`); window.location.reload();} }} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Pay Now</button>
                        </div>
                      ) : <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-widest">{inv.status}</span>}
                    </TableCell>
                    <TableCell className="px-5 text-xs text-muted-foreground font-medium">{inv.period_start?.substring(0,7)}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm font-medium">No invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* UPGRADE INTERACTIVE MODAL */}
      {activeModal && activeModal.type === 'upgrade' && (
        <UpgradeModal 
          activeModal={activeModal} 
          currentMRR={currentMRR} 
          onClose={() => setActiveModal(null)} 
          onConfirm={(keptIds) => executePlanChange(activeModal.targetSlug, keptIds)} 
        />
      )}

      {/* DOWNGRADE MODAL */}
      {activeModal && activeModal.type === 'downgrade' && (() => {
        const p = activeModal.preview;
        return (
          <Dialog open={true} onOpenChange={(open) => !open && setActiveModal(null)}>
            <DialogContent className="sm:max-w-sm border-border shadow-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-yellow-500" /> Downgrade to {activeModal.label}
                </DialogTitle>
                <DialogDescription>
                  Review your downgrade preview below.
                </DialogDescription>
              </DialogHeader>
              
              <div className="text-sm text-foreground space-y-3 my-4">
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium text-slate-700">⚡ Takes effect immediately. Monthly savings: <strong className="text-emerald-600 font-mono text-base">${Math.abs(currentMRR - p.new_mrr)}/mo</strong>.</p>
                {p.proration?.credit_cents > 0 && <p className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-emerald-800">💰 Credit for unused days: <strong className="font-mono text-base">${p.proration.credit_dollars.toFixed(2)}</strong>. Will be applied to future invoices.</p>}
                {p.stripped_features?.length > 0 && (
                  <div className="text-red-700 text-xs bg-red-50 border border-red-100 p-4 rounded-xl font-medium">
                    <strong className="flex items-center gap-1.5 mb-2 uppercase tracking-wide text-[10px]"><AlertTriangle className="w-3.5 h-3.5" /> Features removed now:</strong>
                    <div className="space-y-1 ml-1">
                      {p.stripped_features.map((f:any) => <div key={f.id} className="relative pl-4 before:content-['✖'] before:absolute before:left-0 before:text-red-400 before:text-[10px] before:top-0.5">{f.label}</div>)}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <Button variant="outline" onClick={() => setActiveModal(null)} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={() => executePlanChange(activeModal.targetSlug, [])} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">Verify Downgrade</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ADDON MODAL */}
      {activeModal && activeModal.type === 'addon' && (() => {
        const p = activeModal.preview;
        const msg = p.target_plan && TIER_RANK[p.target_plan] > TIER_RANK[currentSlug] 
          ? `Adding "${activeModal.label}" requires upgrading to ${TIER_LABELS[p.target_plan]} plan.`
          : `Add ${activeModal.label}`;
          
        return (
          <Dialog open={true} onOpenChange={(open) => !open && setActiveModal(null)}>
            <DialogContent className="sm:max-w-sm border-border shadow-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                   <Box className="w-5 h-5 text-indigo-500" /> Add Feature
                </DialogTitle>
                <DialogDescription>
                  {msg}
                </DialogDescription>
              </DialogHeader>
              
              <div className="my-4">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-center mb-4">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">New Total MRR</div>
                  <div className="text-3xl font-black font-mono text-blue-700">${p.new_mrr}<span className="text-sm font-medium text-blue-500/80 tracking-normal">/mo</span></div>
                </div>

                {p.proration?.charge_cents > 0 && (
                  <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                    <div className="flex justify-between items-center text-slate-800">
                      <span>Proration ({p.proration.days_remaining} remaining days)</span>
                      <strong className="font-mono text-sm">${p.proration.charge_dollars.toFixed(2)}</strong>
                    </div>
                    {p.credit_balance_cents > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 border-t border-black/5 pt-2">
                        <span>Credits applied</span>
                        <strong className="font-mono">-${p.credit_balance_dollars.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <Button variant="outline" onClick={() => setActiveModal(null)} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={() => executeAddon(activeModal.featureId)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">Confirm & Pay</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

    </div>
  );
}

// Custom icon for downgrade as it wasn't imported from lucide-react in initial code
function ArrowDownCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l4 4 4-4" />
      <path d="M12 8v8" />
    </svg>
  );
}

function UpgradeModal({ activeModal, currentMRR, onClose, onConfirm }: { activeModal: any, currentMRR: number, onClose: () => void, onConfirm: (kept: string[]) => void }) {
  const tSlug = activeModal.targetSlug;
  const tLabel = activeModal.label;
  const initialPreview = activeModal.preview;

  // React state for kept addons
  const [keptExtras, setKeptExtras] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState(initialPreview);
  const [loading, setLoading] = useState(false);

  const analysis = preview.addon_analysis || { absorbed: [], extra: [], dropped: [] };
  const p = preview.proration;
  const creditBal = preview.credit_balance_cents || 0;
  const netCharge = Math.max(0, (p?.charge_cents || 0) - creditBal);
  const creditUsed = Math.min(creditBal, p?.charge_cents || 0);

  const toggleAddon = async (id: string, checked: boolean) => {
    setLoading(true);
    const newSet = new Set(keptExtras);
    if(checked) newSet.add(id); else newSet.delete(id);
    setKeptExtras(newSet);
    try {
      const keepParam = [...newSet].join(',');
      const np = await clientApi.get(`/billing/proration-preview?target_plan=${tSlug}&keep_addons=${keepParam}`);
      setPreview(np);
    } catch(e) { alert("Failed to re-calculate"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 border-border shadow-2xl bg-white overflow-hidden">
        
        <DialogHeader className="p-6 border-b bg-slate-50/50 pb-5">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Rocket className="w-6 h-6 text-indigo-600" /> Upgrade to {tLabel}
          </DialogTitle>
          <DialogDescription>
            Review your new plan configuration before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6 bg-white">
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">📊 Pricing Breakdown</div>
            <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium"><span>Current Plan</span><span className="font-mono">${currentMRR}/mo</span></div>
            <div className="flex justify-between text-sm text-foreground mb-2 font-semibold"><span>{tLabel} Base Plan</span><span className="text-blue-600 font-mono">${preview.new_base_price}/mo</span></div>
            {preview.new_addon_cost > 0 && <div className="flex justify-between text-sm text-foreground mb-3 font-semibold"><span>+ Kept Add-ons</span><span className="text-yellow-600 font-mono">+${preview.new_addon_cost}/mo</span></div>}
            
            <div className="flex justify-between items-center text-lg font-black text-foreground border-t border-border pt-3 mt-1">
              <span>New Total MRR</span>
              <span className="text-blue-600 font-mono text-2xl">${preview.new_mrr}<span className="text-sm font-medium opacity-80 tracking-normal">/mo</span></span>
            </div>
          </div>

          {analysis.absorbed.length > 0 && (
             <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-sm">
                <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest text-emerald-800 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Now Included FREE in {tLabel}</div>
                <div className="space-y-1.5">
                  {analysis.absorbed.map((a:any) => (
                    <div key={a.id} className="flex justify-between items-center text-xs text-emerald-700 font-semibold bg-emerald-100/50 px-3 py-2 rounded-lg">
                      <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{a.label}</span>
                      <span className="line-through opacity-60 font-mono">${a.price}/mo</span>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {analysis.extra.length > 0 && (
             <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-5 shadow-sm">
                <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest mb-1 flex items-center gap-1.5"><RefreshCcw className="w-3.5 h-3.5" /> Extra Add-ons</div>
                <p className="text-[10px] text-yellow-700 mb-4 font-medium opacity-80">These are not included in {tLabel} by default. Keep them or drop them.</p>
                <div className="space-y-2">
                  {analysis.extra.map((a:any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-yellow-200/60 bg-white shadow-sm hover:shadow transition-shadow">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{a.label}</span>
                        <span className="text-[10px] font-mono text-yellow-600 font-bold uppercase tracking-wider">+${a.price}/mo</span>
                      </div>
                      <Checkbox 
                        id={`keep-${a.id}`}
                        checked={keptExtras.has(a.id)} 
                        onCheckedChange={(checked) => toggleAddon(a.id, checked === true)}
                        disabled={loading}
                        className="w-5 h-5 border-2 border-yellow-400 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-white"
                      />
                    </div>
                  ))}
                </div>
             </div>
          )}

          {p?.charge_cents > 0 && (
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700">
               <div className="font-bold text-slate-900 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider"><CreditCard className="w-4 h-4" /> Proration ({p.days_remaining} days remaining)</div>
               
               <div className="space-y-2 text-xs font-medium border-l-2 border-slate-200 pl-3 ml-1">
                 <div className="flex justify-between"><span className="text-muted-foreground">Daily rate shift</span><span>${p.daily_old.toFixed(2)} → ${p.daily_new.toFixed(2)}/day</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">Delta × {p.days_remaining} days</span><span className="font-bold text-slate-900 font-mono">${p.charge_dollars.toFixed(2)}</span></div>
                 {creditBal > 0 && <div className="flex justify-between text-emerald-600"><span>Credits applied</span><span className="font-bold font-mono">-${(creditUsed/100).toFixed(2)}</span></div>}
               </div>
               
               <div className={`mt-4 pt-3 border-t border-slate-200 flex justify-between items-center ${netCharge>0?'text-red-600':'text-emerald-600'}`}>
                 <span className="font-bold text-[10px] uppercase tracking-widest">{netCharge>0 ? 'Net Immediate Charge' : 'Total Covered By Credits'}</span>
                 <span className="font-black text-lg font-mono">
                   {netCharge>0 ? `$${(netCharge/100).toFixed(2)}` : '$0.00'}
                 </span>
               </div>
             </div>
          )}

        </div>

        <DialogFooter className="p-4 sm:p-5 border-t bg-slate-50/50 justify-between sm:justify-end gap-3 rounded-b-xl border-border">
          <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto font-semibold">Cancel</Button>
          <Button 
            onClick={() => onConfirm([...keptExtras])} 
            disabled={loading} 
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 font-bold min-w-[150px]"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {loading ? 'Calculating...' : (netCharge <= 0 && p?.charge_cents >= 0 ? '✅ Confirm Upgrade' : '💳 Pay & Upgrade')}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
