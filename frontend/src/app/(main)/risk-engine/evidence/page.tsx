import { serverApi, ApiError } from "@/lib/server/api";
import EvidenceVault from "@/components/risk/EvidenceVault";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEvidenceData() {
  try {
    return await serverApi.get('/evidence/vault');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view Evidence Vault.', status: error.status };
    }
    console.error("[Evidence] Error fetching:", error);
    return { error: 'Failed to retrieve evidence data.' };
  }
}

export default async function EvidencePage() {
  const data = await getEvidenceData();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need required permissions to view Evidence Vault.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EvidenceVault initialData={data} />
    </div>
  );
}
