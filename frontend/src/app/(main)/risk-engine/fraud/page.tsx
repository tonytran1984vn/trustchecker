import { serverApi, ApiError } from "@/lib/server/api";
import FraudMonitor from "@/components/risk/FraudMonitor";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getFraudAlerts() {
  try {
    return await serverApi.get('/scm/risk/alerts');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view Fraud Alerts.', status: error.status };
    }
    console.error("[Fraud] Error fetching:", error);
    return { error: 'Failed to retrieve fraud alerts.' };
  }
}

export default async function FraudAlertsPage() {
  const data = await getFraudAlerts();

  if (data?.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-4xl mb-4">🚨</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data.error || 'You need required permissions to view Fraud Alerts.'}
        </p>
      </div>
    );
  }

  // The existing server endpoint occasionally wraps data, or just returns naked arrays. Handle gracefully.
  const alerts = Array.isArray(data) ? data : (data?.alerts || []);

  return (
    <div className="space-y-6">
      <FraudMonitor initialAlerts={alerts} />
    </div>
  );
}
