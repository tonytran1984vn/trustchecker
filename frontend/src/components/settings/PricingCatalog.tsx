"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Rocket, Briefcase, Zap, Star, ShieldCheck, Box, Activity, Smartphone } from "lucide-react";

const PLANS = [
  {
    id: 'starter', label: 'Starter', icon: <Rocket className="w-8 h-8 text-cyan-500" />, color: '#06b6d4', gradient: 'linear-gradient(135deg,#06b6d4,#22d3ee)',
    price: { monthly: { from: 49, to: 99 }, annual_discount: '15%' },
    scans: '10,000', overage: '$0.015/scan',
    target: 'Small business, trial',
    features: ['1 brand / 10 SKUs', '10K scans/month', 'Basic dashboard', 'Email alerts', '1 user'],
  },
  {
    id: 'growth', label: 'Growth', icon: <Zap className="w-8 h-8 text-purple-500" />, color: '#8b5cf6', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    price: { monthly: { from: 199, to: 399 }, annual_discount: '15%' },
    scans: '50,000', overage: '$0.012/scan',
    target: 'Mid-size, scaling',
    features: ['5 brands / 100 SKUs', '50K scans/month', 'Risk scoring engine', 'API access', '5 users', 'Custom reports'],
    popular: true,
  },
  {
    id: 'business', label: 'Business', icon: <Briefcase className="w-8 h-8 text-amber-500" />, color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
    price: { monthly: { from: 499, to: 999 }, annual_discount: '20%' },
    scans: '200,000', overage: '$0.008/scan',
    target: 'Medium enterprise, many SKUs',
    features: ['Unlimited brands / 1K SKUs', '200K scans/month', 'Advanced risk engine', 'Multi-region support', '20 users', 'Priority support', 'Webhook integrations'],
  },
  {
    id: 'enterprise', label: 'Enterprise', icon: <Star className="w-8 h-8 text-red-500" />, color: '#ef4444', gradient: 'linear-gradient(135deg,#dc2626,#f97316)',
    price: { monthly: { from: 3000, to: 15000 }, annual_discount: '20–40%', custom: true },
    scans: '1M–10M+', overage: '$0.003–0.006/scan',
    target: 'Large corporations, FMCG',
    features: ['Unlimited everything', 'Dedicated instance', 'SSO / SAML', 'Custom SLA (99.9%+)', 'Unlimited users', '24/7 designated CSM', 'On-premise option'],
  },
];

const ADDONS = [
  { id: 'carbon', name: 'Carbon Tracking & Registry', icon: '🌱', price: '+$0.50/credit or custom package', desc: 'ESG compliance, footprint tracking, registry integration', color: '#22c55e' },
  { id: 'ai_forensic', name: 'AI Forensic & Risk Engine', icon: '🧠', price: '+20–30% subscription', desc: 'Deep learning fraud detection, pattern recognition, analytics', color: '#8b5cf6' },
  { id: 'nft', name: 'Blockchain NFT Certificate', icon: '⛓️', price: '+$1.50/NFT (volume discount)', desc: 'Digital product passport, on-chain verification, tamper-proof', color: '#6366f1' },
  { id: 'support', name: 'Support + On-site Training', icon: '🎧', price: '$2K–$5K/month', desc: 'Dedicated CSM, on-site training, quarterly strategic reviews', color: '#f59e0b' },
];

const PRO_SERVICES = [
  { name: 'Implementation Package', price: '$15K–$30K', duration: '4–8 weeks', desc: 'System setup, configuration, data migration, user training' },
  { name: 'SAP/ERP Integration', price: '$25K–$50K', duration: '6–12 weeks', desc: 'Custom connector, bi-directional sync, middleware setup' },
  { name: 'Enterprise Onboarding', price: '$10K–$20K', duration: '2–4 weeks', desc: 'SSO setup, security audit, compliance mapping, configuration' },
  { name: 'Custom Development', price: '$80K+', duration: '12–24 weeks', desc: 'Bespoke features, white-label UI, API custom endpoints' },
];

const MAC_TIERS = [
  { commitment: '$50K/year', discount: '20%', effective: '~$3,300/mo', sla: '99.5%' },
  { commitment: '$100K/year', discount: '30%', effective: '~$5,800/mo', sla: '99.9%' },
  { commitment: '$200K/year', discount: '40%', effective: '~$10,000/mo', sla: '99.95% + Dedicated' },
];

export default function PricingCatalog() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black flex items-center gap-2 text-foreground mb-3 tracking-tight">
          <Box className="w-8 h-8 text-indigo-600" /> Pricing Plans & Packages
        </h2>
        <p className="text-muted-foreground font-medium text-lg max-w-2xl">
          SaaS usage-based pricing designed for scale with comprehensive tiers, add-on modules, and professional services.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map(p => (
          <Card key={p.id} className={`flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden border-2 ${p.popular ? 'border-purple-400 shadow-lg shadow-purple-500/10' : 'border-border shadow-sm'}`}>
            {p.popular && (
              <div className="absolute top-0 w-full text-center bg-purple-500 text-white text-[10px] font-bold tracking-widest uppercase py-1">
                Most Popular
              </div>
            )}
            
            <CardHeader className={`text-center pb-5 ${p.popular ? 'pt-8' : 'pt-6'}`}>
              <div className="mx-auto flex justify-center items-center w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 shadow-sm mb-4">
                {p.icon}
              </div>
              <CardTitle className="text-2xl font-black bg-clip-text text-transparent" style={{ backgroundImage: p.gradient }}>
                {p.label}
              </CardTitle>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-2 px-4 leading-tight min-h-[30px]">{p.target}</p>
            </CardHeader>

            <div className="py-5 px-6 text-center border-y border-slate-100 dark:border-slate-800 bg-slate-50/50">
              {p.price.custom ? (
                <>
                  <div className="text-3xl font-black font-mono tracking-tighter" style={{ backgroundImage: p.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Custom</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest mt-1 text-muted-foreground">from ${p.price.monthly.from.toLocaleString()}–${p.price.monthly.to.toLocaleString()}/mo</div>
                </>
              ) : (
                 <>
                   <div className="text-3xl font-black font-mono tracking-tighter" style={{ backgroundImage: p.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                     ${p.price.monthly.from}<span className="text-lg">–${p.price.monthly.to}</span>
                   </div>
                   <div className="text-[10px] uppercase font-bold tracking-widest mt-1 text-muted-foreground">/ month</div>
                 </>
              )}
              <div className="mt-3 inline-block bg-slate-100/80 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500">Annual: -{p.price.annual_discount}</div>
            </div>

            <CardContent className="pt-6 pb-6 flex-1 flex flex-col px-6">
              <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted-foreground">Included Scans</span>
                  <span className="font-bold font-mono">{p.scans}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted-foreground">Overage</span>
                  <span className="font-bold font-mono" style={{ color: p.color }}>{p.overage}</span>
                </div>
              </div>
              
              <ul className="space-y-3.5 flex-1 list-none p-0 m-0">
                {p.features.map((f, i) => (
                  <li key={i} className="text-[13px] text-muted-foreground font-medium flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise Add-ons */}
      <section className="pt-6">
        <h3 className="text-xl font-black text-foreground mb-6 tracking-tight flex items-center gap-2">
          🧩 Core Add-on Modules <Badge variant="outline" className="ml-2 font-mono text-[10px] tracking-wider uppercase text-muted-foreground">Enterprise + Business</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ADDONS.map(a => (
            <Card key={a.id} className="border-border shadow-sm flex flex-col hover:border-slate-300 transition-colors" style={{ borderLeftWidth: '4px', borderLeftColor: a.color }}>
              <CardContent className="p-5 flex gap-4 items-start">
                <div className="text-4xl shrink-0 bg-slate-50 rounded-xl p-2 border border-slate-100 shadow-sm">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-foreground mb-1 pr-2 leading-tight">{a.name}</div>
                  <div className="text-xs font-black font-mono tracking-tight mb-2" style={{ color: a.color }}>{a.price}</div>
                  <div className="text-sm text-muted-foreground font-medium leading-snug">{a.desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* MAC Tiers */}
      <section className="pt-2">
        <h3 className="text-xl font-black text-foreground mb-1 tracking-tight flex items-center gap-2">
          📋 Minimum Annual Commitment (MAC) <Badge variant="outline" className="ml-2 font-mono text-[10px] tracking-wider uppercase text-muted-foreground">Enterprise Exclusive</Badge>
        </h3>
        <p className="text-sm text-muted-foreground font-medium mb-6 max-w-3xl">Annual commitment yields larger discount brackets and elevated SLA guarantees. Includes 90-day exit clause.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MAC_TIERS.map((m, i) => (
            <Card key={i} className="border-border shadow-sm text-center hover:border-slate-300 transition-colors">
              <CardContent className="p-6">
                <div className="text-sm font-black text-indigo-600 uppercase tracking-widest">{m.commitment}</div>
                <div className="text-4xl font-black text-emerald-500 my-4 tracking-tighter">-{m.discount}</div>
                <div className="text-sm font-semibold text-muted-foreground">Effective: <span className="font-mono text-foreground font-bold">{m.effective}</span></div>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> SLA {m.sla}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pro Services */}
      <section className="pt-2">
        <h3 className="text-xl font-black text-foreground mb-6 tracking-tight flex items-center gap-2">
          🛠️ Professional Services <Badge variant="outline" className="ml-2 font-mono text-[10px] tracking-wider uppercase text-muted-foreground">One-Time Capital Exp</Badge>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRO_SERVICES.map((s, i) => (
            <Card key={i} className="border-border shadow-sm text-center flex flex-col hover:border-slate-300 transition-colors">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="text-sm font-bold text-foreground mb-3 leading-tight">{s.name}</div>
                <div className="text-2xl font-black text-emerald-600 font-mono tracking-tighter mb-2">{s.price}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center justify-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Est {s.duration}
                </div>
                <div className="text-xs text-muted-foreground font-medium leading-relaxed mt-auto pt-4 border-t border-slate-100">{s.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      {/* Public Scan Note */}
      <Card className="border-border shadow-md bg-gradient-to-r from-blue-50 to-indigo-50/30 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-blue-500"></div>
        <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 shrink-0">
            <Smartphone className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <div className="text-lg font-black text-blue-900 mb-2">Public / Consumer Scan — <span className="text-emerald-600 font-mono tracking-tight">$0.00 FOREVER</span></div>
            <p className="text-sm text-blue-800/80 font-medium leading-relaxed max-w-3xl">
              Always free for end-users. Scans drive brand recognition and populate your institutional data lake. 
              Each consumer interaction serves as a marketing touchpoint and a high-fidelity data asset for your organization.
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
