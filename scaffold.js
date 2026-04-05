const fs = require('fs');
const path = require('path');

const pages = [
  { dir: 'executive/portfolio', title: 'Portfolio Health', desc: 'Real-time performance and usage metrics across the organization', api: '/api/executive/portfolio' },
  { dir: 'executive/radar', title: 'Macro Radar', desc: 'Systemic risk scanning and global constraint awareness', api: '/api/executive/radar' },
  { dir: 'executive/tcar', title: 'Capital Exposure (TCAR)', desc: 'Trust, Carbon, and Risk algorithmic scoring', api: '/api/executive/tcar' },
  { dir: 'executive/actions', title: 'Strategic Actions', desc: 'High-level strategy execution and pending operations', api: '/api/executive/actions' },
  { dir: 'executive/approvals', title: 'Pending Approvals', desc: 'Time-sensitive authorizations required from the Owner', api: '/api/executive/approvals' },
  { dir: 'risk/scenario', title: 'Scenario Analysis', desc: 'Simulate structural shocks against current exposure', api: '/api/executive/scenario' },
  { dir: 'governance/board', title: 'Board & Committees', desc: 'Oversight management and designated authority', api: '/api/executive/board' },
  { dir: 'governance/reports', title: 'Compliance & Reports', desc: 'Official attestations and audit trail exports', api: '/api/executive/reports' },
  { dir: 'settings/access', title: 'Access & Delegation', desc: 'Multi-tenant identity and hierarchical authorization', api: '/api/executive/access' },
  { dir: 'system/billing', title: 'Organization & Billing', desc: 'Subscription tier, usage metering, and invoices', api: '/api/executive/billing' }
];

const template = (title, desc, api) => `import { serverApi, ApiError } from "@/lib/server/api";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchData() {
  try {
    return await serverApi.get('${api}');
  } catch (error) {
    console.error("[${title}] Error fetching data:", error);
    return null;
  }
}

export default async function Page() {
  const data = await fetchData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">${title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">${desc}.</p>
        </div>
      </div>

      {!data ? (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-500/20 w-full text-center">
          <h2 className="font-semibold text-lg mb-2">Data Load Error</h2>
          <p className="text-sm">Cannot connect to the backend engine to retrieve configuration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
             <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Module Initialized</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                The institutional interface for ${title} is active. Backend data stream has been established via Context Binding.
             </p>
             <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-xs overflow-auto text-emerald-600 dark:text-emerald-400 border border-slate-100 dark:border-slate-800">
                 {JSON.stringify(data, null, 2)}
             </pre>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center text-center h-full min-h-[300px]">
             <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
             </div>
             <h3 className="font-medium text-slate-700 dark:text-slate-300">Awaiting Visualization Render</h3>
             <p className="text-sm text-slate-500 mt-2 max-w-xs">Data is flowing securely. The high-fidelity Chart.js/Recharts layer for this module is scheduled in the next CI deployment.</p>
          </div>
        </div>
      )}
    </div>
  );
}
`;

pages.forEach(p => {
  const fullDir = path.join(__dirname, 'frontend/src/app/(main)', p.dir);
  fs.mkdirSync(fullDir, { recursive: true });
  fs.writeFileSync(path.join(fullDir, 'page.tsx'), template(p.title, p.desc, p.api));
  console.log('Created: ' + fullDir);
});
