"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Fingerprint, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

export default function PlatformSecurityPage() {
  const [enforceMFA, setEnforceMFA] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeConfirmText, setRevokeConfirmText] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetcher("/api/platform/security/mfa-state");
        setEnforceMFA(res.enforceMFA);
      } catch (err) {
        console.error("Failed to load mfa state", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, []);

  const handleToggleMFA = async () => {
    setIsToggling(true);
    const newState = !enforceMFA;
    try {
      const res = await fetcher("/api/platform/security/enforce-mfa", {
        method: 'PUT',
        body: JSON.stringify({ active: newState })
      });
      setEnforceMFA(res.enforceMFA);
    } catch (err: any) {
      alert(err.message || 'Failed to update MFA policy');
    } finally {
      setIsToggling(false);
    }
  };

  const handleRevokeAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revokeConfirmText !== 'REVOKE_ALL') {
      setErrorMsg("Please type REVOKE_ALL to confirm.");
      return;
    }
    setIsRevoking(true);
    setErrorMsg('');
    try {
      // Execute the logout all
      await fetcher("/api/platform/security/force-logout-all", {
        method: 'POST',
        body: JSON.stringify({ confirmation: revokeConfirmText })
      });
      
      alert("Success: Master session revocation triggered.");
      setShowRevokeConfirm(false);
      setRevokeConfirmText('');
      
      // Simulate self-logout since you just revoked EVERYONE.
      localStorage.removeItem("tc_token");
      localStorage.removeItem("tc_user");
      window.location.href = "/login";
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke sessions');
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-5xl mx-auto mb-10">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-indigo-600" />
          Global Security Policies
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Highly restricted controls for platform-wide enforcement and emergency credential revocation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Enforce MFA Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-indigo-500" /> Platform MFA Enforcement
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Globally enforce mandatory multi-factor authentication for all platform operators on next login.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Current Policy: {enforceMFA ? <span className="text-emerald-500">STRICT</span> : <span className="text-amber-500">RELAXED</span>}
            </span>
            <button 
              disabled={isToggling}
              onClick={handleToggleMFA}
              className={`px-4 py-2 rounded font-bold text-sm transition-colors shadow-sm disabled:opacity-50 ${enforceMFA ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
              {isToggling ? 'Processing...' : enforceMFA ? 'Relax Policy' : 'Enforce Globally'}
            </button>
          </div>
        </div>

        {/* Revoke All Sessions Card */}
        <div className="border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-500" /> Revoke All Active Sessions
              </h2>
              <p className="text-sm text-red-600/80 dark:text-red-300 mt-1">
                Forcefully terminate all active JWT sessions across the entire platform, including your own.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-3">
            <button 
              onClick={() => { setShowRevokeConfirm(true); setRevokeConfirmText(''); setErrorMsg(''); }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" /> INITIATE GLOBAL REVOCATION
            </button>
            <p className="text-xs text-center text-red-500 font-semibold uppercase">Restricted Capability</p>
          </div>
        </div>

      </div>

      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-6 border-b border-red-900/50 bg-red-950/20`}>
              <h3 className={`font-bold text-lg flex items-center gap-2 text-red-400`}>
                <AlertTriangle className="w-5 h-5" />
                Destructive Action: Verify Revocation
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                All platform administrators and tenant users will instantly lose connectivity and be forced to authenticate again.
              </p>
            </div>
            <form onSubmit={handleRevokeAll} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  To execute, please type <span className="font-mono bg-slate-800 px-1 py-0.5 rounded text-white">REVOKE_ALL</span> below:
                </label>
                <input 
                  type="text" 
                  autoFocus
                  required 
                  value={revokeConfirmText}
                  onChange={e => setRevokeConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg text-sm text-white outline-none font-mono tracking-widest text-center"
                  placeholder="REVOKE_ALL"
                  autoComplete="off"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowRevokeConfirm(false)} 
                  disabled={isRevoking}
                  className="flex-1 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isRevoking}
                  className={`flex-1 flex justify-center items-center py-2 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 bg-red-600 hover:bg-red-500`}
                >
                  {isRevoking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Revocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
