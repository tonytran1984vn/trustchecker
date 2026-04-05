"use client";

import { useState } from "react";
import CreateUserModal from "./CreateUserModal";
import { clientApi, ApiError } from "@/lib/client/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, RefreshCcw, Trash2, ShieldCheck } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  mfa_enabled: boolean;
  last_login: string | null;
}

const ROLES = [
  'org_owner', 'company_admin', 'admin', 'security_officer', 
  'manager', 'operator', 'viewer', 'executive', 
  'ops_manager', 'risk_officer', 'compliance_officer', 'developer'
];

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

export default function UserListTable({ initialUsers, totalCount }: { initialUsers: User[], totalCount: number }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // We read the global tc_user to understand if a row is 'self'
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('tc_user') : null;
  const currentUserId = currentUserStr ? JSON.parse(currentUserStr).id : null;

  const refreshUsers = async () => {
    setIsRefreshing(true);
    try {
      const data = await clientApi.get('/admin/users');
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await clientApi.put(`/admin/users/${userId}/role`, { role: newRole });
      refreshUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Error updating role');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Activate'} this user?`)) return;

    try {
      await clientApi.put(`/admin/users/${userId}/status`, { status: newStatus });
      refreshUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Error updating status');
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`⚠️ Delete user "${username}"?\nThis action cannot be undone.`)) return;

    try {
      await clientApi.delete(`/admin/users/${userId}`);
      refreshUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Error deleting user');
    }
  };

  return (
    <Card className="border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
      <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row justify-between items-center space-y-0 pb-4">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" /> User Management
          {isRefreshing && <RefreshCcw className="w-4 h-4 ml-2 text-indigo-500 animate-spin" />}
        </CardTitle>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-semibold px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Create User
        </Button>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 shadow-sm border-b">
            <TableRow>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">User</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Email</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Role</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">MFA</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Last Login</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-8 text-center text-muted-foreground font-medium text-sm">
                  No users found in your organization.
                </TableCell>
              </TableRow>
            ) : (
              users.map(u => {
                const isSelf = u.id === currentUserId;
                const statusColor = u.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                  : u.status === 'suspended' 
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100';

                return (
                  <TableRow key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.status === 'suspended' ? 'opacity-60' : ''}`}>
                    <TableCell className="font-bold text-foreground">
                      {u.username}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={u.role || 'operator'} 
                        onValueChange={(val) => handleRoleChange(u.id, val || '')}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="h-7 text-[10px] font-semibold w-[140px] uppercase tracking-wider">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => (
                            <SelectItem key={r} value={r} className="text-[10px] font-bold uppercase tracking-wider">
                              {r.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleToggleStatus(u.id, u.status || 'active')}
                        disabled={isSelf}
                        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors disabled:cursor-not-allowed ${statusColor}`}
                      >
                        {u.status || 'active'}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      {u.mfa_enabled ? <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">
                      {timeAgo(u.last_login)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-1 rounded-sm">You</span>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(u.id, u.username)}
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      <CardFooter className="px-4 py-3 bg-slate-50/50 border-t border-border mt-auto">
        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          Total: {totalCount} users
        </div>
      </CardFooter>

      {showCreate && (
        <CreateUserModal 
          onClose={() => setShowCreate(false)} 
          onSuccess={() => { setShowCreate(false); refreshUsers(); }} 
        />
      )}
    </Card>
  );
}
