import { Layers } from "lucide-react";

export default function DataClassificationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Classification</h1>
          <p className="text-slate-500 mt-1">Manage platform-wide data classification schemas and taxonomies.</p>
        </div>
      </div>
      <div className="p-12 border border-slate-200 rounded-xl bg-white flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Module Provisioning</h3>
        <p className="text-slate-500 max-w-sm mt-2">
            The multi-tenant data classification module is currently being configured for deployment.
        </p>
      </div>
    </div>
  );
}
