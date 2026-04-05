"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientApi, ApiError } from "@/lib/client/api";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";

const ROLES = [
  'org_owner', 'company_admin', 'admin', 'security_officer', 
  'manager', 'operator', 'viewer', 'executive', 
  'ops_manager', 'risk_officer', 'compliance_officer', 'developer'
];

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'operator'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await clientApi.post('/admin/users', {
        username: formData.username || formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error creating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="w-5 h-5 text-indigo-600" /> Create New User
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                <Input 
                  type="text" 
                  autoFocus
                  placeholder="john.doe" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="font-semibold text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
                <Input 
                  type="email" 
                  required
                  placeholder="user@company.com" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="font-semibold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                <Input 
                  type="password" 
                  required
                  minLength={8}
                  placeholder="Min 8 characters" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="font-semibold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Role</label>
                <Select 
                  value={formData.role}
                  onValueChange={val => setFormData({...formData, role: val || ''})}
                >
                  <SelectTrigger className="w-full text-sm font-semibold uppercase tracking-wider">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r} className="text-xs font-bold uppercase tracking-wider">
                        {r.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </div>
        
        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="create-user-form"
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
