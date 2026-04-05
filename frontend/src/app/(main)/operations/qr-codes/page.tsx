import { serverApi, ApiError } from "@/lib/server/api";
import QrCodeManager from "@/components/operations/QrCodeManager";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getQrCodes() {
  try {
    return await serverApi.get('/products/codes/all?limit=50&offset=0');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view QR Codes', status: error.status };
    }
    console.error("[QR Codes] Error fetching:", error);
    return { error: 'Failed to retrieve QR codes' };
  }
}

export default async function QrCodesPage() {
  const data = await getQrCodes();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-3xl mb-4">📱</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need required permissions to view QR Codes.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QrCodeManager initialCodes={data.codes || []} initialTotal={data.total || 0} />
    </div>
  );
}
