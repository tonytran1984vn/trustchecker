import { serverApi, ApiError } from "@/lib/server/api";
import ProductManager from "@/components/operations/ProductManager";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProducts() {
  try {
    return await serverApi.get('/products');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Insufficient permission to view Products', status: error.status };
    }
    console.error("[Products] Error fetching:", error);
    return { error: 'Failed to retrieve products' };
  }
}

export default async function ProductsPage() {
  const data = await getProducts();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-3xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need required permissions to view Products.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductManager initialProducts={data.products || []} />
    </div>
  );
}
