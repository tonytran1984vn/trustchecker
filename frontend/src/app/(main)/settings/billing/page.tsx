import { serverApi, ApiError } from "@/lib/server/api";
import BillingManager from "@/components/settings/BillingManager";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBillingData() {
  try {
    // The backend has 3 separate billing endpoints — fetch them all in parallel
    const [plan, usage, invoices] = await Promise.all([
      serverApi.get('/billing/plan').catch((e: any) => {
        console.error("[Billing] plan fetch error:", e.message);
        return null;
      }),
      serverApi.get('/billing/usage').catch((e: any) => {
        console.error("[Billing] usage fetch error:", e.message);
        return null;
      }),
      serverApi.get('/billing/invoices').catch((e: any) => {
        console.error("[Billing] invoices fetch error:", e.message);
        return null;
      }),
    ]);

    // If plan fetch failed with auth error, surface it
    if (!plan) {
      return { error: 'Insufficient permission to view Billing details.' };
    }

    // Merge into a single payload for the BillingManager component
    return {
      plan: plan,
      usage: usage?.usage || usage,
      period: usage?.period || new Date().toISOString().substring(0, 7),
      invoices: invoices?.invoices || invoices || [],
      available: plan?.available_plans || plan?.available || [],
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view Billing details.', status: error.status };
    }
    console.error("[Billing] Error fetching:", error);
    return { error: 'Failed to retrieve billing information.' };
  }
}

export default async function BillingPage() {
  const data = await getBillingData();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-3xl mb-4">💳</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need required administrative permissions to view Billing.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BillingManager initialData={data} />
    </div>
  );
}
