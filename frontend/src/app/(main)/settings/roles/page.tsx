import { serverApi, ApiError } from "@/lib/server/api";
import RoleManagerWrapper from "./RoleManagerWrapper";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchRoleData() {
  try {
    const [rolesRes, permsRes] = await Promise.all([
      serverApi.get('/org-admin/roles'),
      serverApi.get('/org-admin/permissions')
    ]);

    return { roles: rolesRes.roles, matrix: permsRes.matrix };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { error: 'Failed to access governance data. Company Admin/Owner access required.' };
    }
    console.error("[Roles] Error fetching role data:", error);
    return { error: 'Failed to connect to backend engine' };
  }
}

export default async function RolesPage() {
  const data = await fetchRoleData();

  if (!data || data.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="text-3xl mb-4">🛡️</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {data?.error || 'You need elevated organizational privileges to view this section.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RoleManagerWrapper initialRoles={data.roles || []} initialMatrix={data.matrix || []} />
    </div>
  );
}
