"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { ShieldCheck, ShieldAlert, Key, Users, Loader2, Plus, Edit2, Trash2, X, AlertCircle } from "lucide-react";

interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: string;
  user_type: string;
  mfa_enabled: boolean;
  status?: string;
  created_at: string;
  last_login: string | null;
}

const PLATFORM_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'compliance_officer', label: 'Compliance Officer' },
  { value: 'developer', label: 'Developer' },
  { value: 'platform_devops', label: 'Platform DevOps' }
];

export default function SystemUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected User
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  // Current User (for disabling self-delete)
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Form States
  const [provisionForm, setProvisionForm] = useState({ email: '', password: '', role: 'platform_devops' });
  const [editForm, setEditForm] = useState({ role: '', password: '', status: 'active' });

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('tc_user') || '{}');
      if (u.id) setCurrentUserId(u.id);
    } catch(e) {}
    fetchSystemUsers();
  }, []);

  async function fetchSystemUsers() {
    setIsLoading(true);
    try {
      const res = await fetcher("/api/platform/users");
      setUsers(res.users || []);
    } catch (err) {
      console.error("Failed to fetch system users:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const computedUsername = provisionForm.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000);
      await fetcher("/api/platform/users", {
        method: 'POST',
        body: JSON.stringify({
          ...provisionForm,
          username: computedUsername
        })
      });
      setSuccessMsg('Platform user successfully provisioned.');
      setIsProvisionModalOpen(false);
      setProvisionForm({ email: '', password: '', role: 'platform_devops' });
      fetchSystemUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload: any = { role: editForm.role, status: editForm.status };
      if (editForm.password.trim()) payload.password = editForm.password;
      
      await fetcher(`/api/platform/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSuccessMsg('Platform user successfully updated.');
      setIsEditModalOpen(false);
      fetchSystemUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await fetcher(`/api/platform/users/${selectedUser.id}`, { method: 'DELETE' });
      setSuccessMsg('Platform user successfully deleted.');
      setIsDeleteModalOpen(false);
      fetchSystemUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" />
            System Governance - Platform Ops
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Platform administrators and system agents only. Company users are managed within their respective tenants.
          </p>
        </div>
        <button 
          onClick={() => { setErrorMsg(''); setProvisionForm({ email: '', password: '', role: 'platform_devops' }); setIsProvisionModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Provision Platform User
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Platform Accounts Roster</h2>
          <span className="text-sm font-normal text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Total: {users.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Identity</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Hierarchy Role</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500 text-center">Security</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500">Registered</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">No platform users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300">
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        {u.username}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm bg-slate-800 text-slate-100 dark:bg-slate-100 dark:text-slate-900 border border-slate-700 dark:border-slate-200">
                        {u.role ? u.role.replace(/_/g, ' ') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {(!u.status || u.status === 'active') ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {u.mfa_enabled ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500 font-mono">
                      {u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'Unknown'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setEditForm({ role: u.role, password: '', status: u.status || 'active' });
                            setErrorMsg('');
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setErrorMsg('');
                            setIsDeleteModalOpen(true);
                          }}
                          disabled={u.id === currentUserId}
                          className={`p-1.5 rounded transition-colors ${u.id === currentUserId ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                          title={u.id === currentUserId ? "Cannot delete yourself" : "Delete User"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Provision Platform User</h3>
              <button onClick={() => setIsProvisionModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProvision} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">{errorMsg}</p>
                </div>
              )}
              <div className="space-y-3">

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    required 
                    value={provisionForm.email}
                    onChange={e => setProvisionForm({...provisionForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="admin@trustchecker.org"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Password</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6}
                    value={provisionForm.password}
                    onChange={e => setProvisionForm({...provisionForm, password: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Platform Role</label>
                  <select 
                    value={provisionForm.role}
                    onChange={e => setProvisionForm({...provisionForm, role: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    {PLATFORM_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-none">Edit Platform Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">{selectedUser.username}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">{errorMsg}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Hierarchy Role</label>
                  <select 
                    value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    {PLATFORM_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                  <select 
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    disabled={selectedUser.id === currentUserId}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                  >
                    <option value="active">Active (Operational)</option>
                    <option value="suspended">Suspended (Locked Out)</option>
                  </select>
                  {selectedUser.id === currentUserId && <p className="text-xs text-amber-500 mt-1">You cannot suspend your own account.</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span></label>
                  <input 
                    type="password" 
                    minLength={6}
                    value={editForm.password}
                    onChange={e => setEditForm({...editForm, password: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="New password..."
                  />
                </div>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex justify-center items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Delete Platform Account?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                You are about to permanently delete the platform user <strong className="text-slate-700 dark:text-slate-200">{selectedUser.username}</strong>. This action cannot be undone and will be logged in the global audit trail.
              </p>
              
              {errorMsg && (
                <div className="p-3 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm text-left">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
