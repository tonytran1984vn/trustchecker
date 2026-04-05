import { ShieldCheck } from "lucide-react";

export default function PlatformCompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Compliance</h1>
          <p className="text-slate-500 mt-1">Monitor cross-tenant compliance status and regulatory controls.</p>
        </div>
      </div>
      <div className="p-12 border border-slate-200 rounded-xl bg-white flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Module Provisioning</h3>
        <p className="text-slate-500 max-w-sm mt-2">
            The platform compliance oversight module will be available in the upcoming release.
        </p>
      </div>
    </div>
  );
}
