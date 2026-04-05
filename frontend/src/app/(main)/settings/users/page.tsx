
import { serverApi, ApiError } from "@/lib/server/api";
import UserListTable from "@/components/settings/UserListTable";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getUsers() {
  try {
    return await serverApi.get('/admin/users');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: error.data?.error || 'Admin access required', status: error.status };
    }
    console.error("[Users] Error fetching users:", error);
    return { error: 'Failed to connect to backend engine' };
  }
}

export default async function UsersPage() {
  const data = await getUsers();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-3xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need administrator privileges to view this section.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserListTable initialUsers={data.users || []} totalCount={data.total || data.users?.length || 0} />
    </div>
  );
}
