import { serverApi, ApiError } from "@/lib/server/api";
import KycManager from "@/components/risk/KycManager";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkIsSuperAdmin() {
  try {
    const me = await serverApi.get('/auth/me');
    return me?.user?.role === 'super_admin';
  } catch(e) {
    return false;
  }
}

async function getKycData() {
  try {
    return await serverApi.get('/kyc/status');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view KYC details.', status: error.status };
    }
    console.error("[KYC] Error fetching:", error);
    return { error: 'Failed to retrieve KYC information.' };
  }
}

async function getKycApprovers(isSup: boolean) {
  try {
    if (!isSup) return [];
    return await serverApi.get('/kyc/approvers');
  } catch (error) {
    return [];
  }
}

export default async function KycPage() {
  const isSup = await checkIsSuperAdmin();
  
  const [data, approvers] = await Promise.all([
    getKycData(),
    getKycApprovers(isSup)
  ]);

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need required permissions to view KYC / AML Management.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KycManager 
        initialData={data} 
        isSuperAdmin={isSup} 
        initialApprovers={approvers || []} 
      />
    </div>
  );
}
