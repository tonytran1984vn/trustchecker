"use client";

import { useState } from "react";
import RoleMatrix from "./RoleMatrix";
import { clientApi, ApiError } from "@/lib/client/api";

interface Role {
  id: string;
  name: string;
  display_name: string;
  is_system: boolean;
  permissions: string[];
  user_count: number;
}

export default function RoleManagerWrapper({ initialRoles, initialMatrix }: { initialRoles: Role[], initialMatrix: any[] }) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const refreshRoles = async () => {
    try {
      const data = await clientApi.get('/org-admin/roles');
      setRoles(data.roles || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    try {
      await clientApi.delete(`/org-admin/roles/${roleId}`);
      refreshRoles();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Error deleting role');
    }
  };

  if (editingRole) {
    return (
      <RoleMatrix 
        role={editingRole} 
        matrix={initialMatrix} 
        onBack={() => { setEditingRole(null); refreshRoles(); }} 
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-0">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📋 Roles in Organization
        </h3>
        {/* We stub out create role here for this stage */}
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          onClick={() => alert('Create Role Modal TBD')}
        >
          + Create Role
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium text-center">Permissions</th>
              <th className="px-5 py-3 font-medium text-center">Users</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                  No custom roles found.
                </td>
              </tr>
            ) : (
              roles.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-2">
                    {r.display_name || r.name}
                    {r.is_system && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                        SYSTEM
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {r.name}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 font-semibold px-2.5 py-0.5 rounded-full text-xs">
                      {r.permissions?.length || 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-400">
                    {r.user_count || 0}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingRole(r)}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit Permissions"
                      >
                        ✏️ Edit
                      </button>
                      {!r.is_system && (
                        <button 
                          onClick={() => handleDelete(r.id, r.display_name || r.name)}
                          className="text-gray-400 hover:text-rose-500 transition-colors"
                          title="Delete Role"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
