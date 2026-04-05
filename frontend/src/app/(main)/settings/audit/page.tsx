import { serverApi, ApiError } from "@/lib/server/api";
import AuditLogViewer from "@/components/settings/AuditLogViewer";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAuditLogs() {
  try {
    return await serverApi.get('/audit-log?limit=250');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view Audit Logs', status: error.status };
    }
    console.error("[Audit] Error fetching logs:", error);
    return { error: 'Failed to retrieve audit trail' };
  }
}

export default async function AuditPage() {
  const data = await getAuditLogs();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-3xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need administrator or compliance privileges to view Audit Logs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuditLogViewer 
        initialLogs={data.entries || data.events || data.data || []} 
        totalCount={data.total || 0} 
      />
    </div>
  );
}
