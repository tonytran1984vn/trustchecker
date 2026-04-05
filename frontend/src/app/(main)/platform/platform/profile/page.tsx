"use client";

import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, UserCog, AlertCircle, CheckCircle2, Loader2, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

export default function PlatformProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Navigation State
  const [activeView, setActiveView] = useState<'overview' | 'password' | 'mfa'>('overview');

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: "", type: "" });

  // MFA State
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupState, setMfaSetupState] = useState<"idle" | "setup" | "verifying">("idle");
  const [mfaData, setMfaData] = useState<{ secret: string; otpauth_url: string; backup_codes: string[] } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaMessage, setMfaMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    async function init() {
      try {
        const { user: me } = await fetcher("/api/auth/me");
        setUser(me);
        setMfaEnabled(me.mfa_enabled);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage({ text: "", type: "" });
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdMessage({ text: "Please fill all fields", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage({ text: "New passwords do not match", type: "error" });
      return;
    }
    setPwdLoading(true);
    try {
      await fetcher("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      setPwdMessage({ text: "Password changed successfully.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdMessage({ text: err.message || "Failed to change password", type: "error" });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSetupMFA = async () => {
    setMfaLoading(true);
    setMfaMessage({ text: "", type: "" });
    try {
      const res = await fetcher("/api/auth/mfa/setup", { method: "POST" });
      setMfaData(res);
      setMfaSetupState("setup");
    } catch (err: any) {
      setMfaMessage({ text: err.message || "Failed to initiate MFA", type: "error" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaMessage({ text: "", type: "" });
    try {
      await fetcher("/api/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: mfaCode })
      });
      setMfaEnabled(true);
      setMfaSetupState("idle");
      setMfaMessage({ text: "MFA enabled successfully.", type: "success" });
      setMfaData(null);
      setMfaCode("");
    } catch (err: any) {
      setMfaMessage({ text: err.message || "Invalid code", type: "error" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      setMfaMessage({ text: "Password is required to disable MFA", type: "error" });
      return;
    }
    setMfaLoading(true);
    setMfaMessage({ text: "", type: "" });
    try {
      await fetcher("/api/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ password: disablePassword })
      });
      setMfaEnabled(false);
      setDisablePassword("");
      setMfaMessage({ text: "MFA has been disabled.", type: "success" });
    } catch (err: any) {
      setMfaMessage({ text: err.message || "Failed to disable MFA", type: "error" });
    } finally {
      setMfaLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-12 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 py-10 md:py-16 px-4 sm:px-6 lg:px-8 min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-[1100px] mx-auto">
        {/* Header Hero */}
        <div className="flex flex-col gap-2 mb-10 animate-in slide-in-from-bottom-4 duration-500 fade-in">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[18px] flex items-center justify-center text-white mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <UserCog className="w-6 h-6 outline-none" strokeWidth={1.5} />
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-[800] text-slate-900 tracking-[-0.03em] leading-tight">
            Profile & Security
          </h1>
          <p className="text-[16px] text-slate-500 max-w-2xl leading-relaxed">
            Manage your personal security credentials, authentication preferences, and multi-factor settings.
          </p>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-[minmax(0,auto)] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
          
          {/* CELL 1: Security Posture Status (Spans 4 cols, top row) */}
          <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-[24px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors duration-500"></div>
            <div>
              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Security Posture
              </h2>
              <p className="text-[14.5px] text-slate-500 mt-3 leading-relaxed">
                {mfaEnabled 
                  ? "Your account is robustly protected by two-factor authentication." 
                  : "Your account is secured with a standard password. Enable 2FA for maximum protection."}
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between z-10">
              <span className="text-[11px] font-[800] uppercase tracking-[0.1em] text-slate-400">Status</span>
              {mfaEnabled ? (
                 <span className="flex items-center gap-1.5 text-[12.5px] font-[700] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/> Highly Secure</span>
              ) : (
                 <span className="flex items-center gap-1.5 text-[12.5px] font-[700] text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full shadow-sm"><AlertCircle className="w-3.5 h-3.5 text-amber-600"/> Needs Attention</span>
              )}
            </div>
          </div>

          {/* CELL 2: Password Reset Engine (Spans 8 cols) */}
          <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl rounded-[24px] p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-slate-400" strokeWidth={2.5}/> Change Password
                </h2>
                <p className="text-[14.5px] text-slate-500 mt-1.5">Create a strong, unique password to secure your institutional access.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6 max-w-xl">
              {pwdMessage.text && (
                <div className={`p-4 text-[13.5px] font-medium rounded-xl flex items-center gap-3 ${pwdMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {pwdMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {pwdMessage.text}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-[700] text-slate-600 mb-2">CURRENT PASSWORD</label>
                  <input 
                    type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                    className="w-full h-[50px] bg-slate-50/50 hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-[12px] px-4 text-[15px] outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/10 focus:bg-white transition-all" 
                    placeholder="Enter current password"
                  />
                </div>
                <div className="sm:col-span-1 relative">
                  <label className="block text-[12px] font-[700] text-slate-600 mb-2">NEW PASSWORD</label>
                  <input 
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={12}
                    className="w-full h-[50px] bg-slate-50/50 hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-[12px] px-4 text-[15px] outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/10 focus:bg-white transition-all" 
                    placeholder="Minimum 12 characters"
                  />
                </div>
                <div className="sm:col-span-1 relative">
                  <label className="block text-[12px] font-[700] text-slate-600 mb-2">CONFIRM PASSWORD</label>
                  <input 
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={12}
                    className="w-full h-[50px] bg-slate-50/50 hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-[12px] px-4 text-[15px] outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/10 focus:bg-white transition-all" 
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={pwdLoading} className="h-[54px] px-10 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-[16px] text-[17px] font-[700] font-serif tracking-tight shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                  {pwdLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                </button>
              </div>
            </form>
          </div>

          {/* CELL 3: Multi-Factor Authentication (Spans full width 12 cols, distinct layout) */}
          <div className="lg:col-span-12 bg-white/80 backdrop-blur-xl rounded-[24px] p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left Context */}
              <div className="lg:w-1/3 shrink-0">
                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mb-6 shadow-sm border ${mfaEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-[#2563EB]'}`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight mb-2">Two-Factor Authentication</h2>
                <p className="text-[14.5px] text-slate-500 leading-relaxed mb-6">
                  Add an extra layer of security to your account. Once configured, you'll be required to enter both your password and an authentication code from your mobile device to sign in.
                </p>
                {mfaEnabled ? (
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-[14px]">
                    <span className="flex items-center gap-2 text-[13px] font-[700] text-emerald-700 uppercase tracking-wider"><CheckCircle2 className="w-4 h-4"/> Active & Protecting</span>
                  </div>
                ) : mfaSetupState === "idle" && (
                  <button onClick={handleSetupMFA} disabled={mfaLoading} className="h-[54px] px-10 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-[16px] text-[17px] font-[700] font-serif tracking-tight shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                    {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Configure 2FA"}
                  </button>
                )}
              </div>

              {/* Right Context - Actions & Setup */}
              <div className="lg:w-2/3 lg:border-l border-slate-100 lg:pl-10 flex flex-col justify-center">
                {mfaMessage.text && (
                  <div className={`p-4 text-[13.5px] font-medium rounded-xl flex items-center gap-3 mb-8 ${mfaMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                    {mfaMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {mfaMessage.text}
                  </div>
                )}

                {mfaEnabled ? (
                  <form onSubmit={handleDisableMFA} className="bg-slate-50 border border-slate-100 rounded-[20px] p-8">
                    <h3 className="text-[16px] font-[700] text-slate-900 mb-2">Disable Authentication</h3>
                    <p className="text-[14px] text-slate-500 mb-6">We highly recommend keeping 2FA enabled. To proceed with disabling, please confirm your password.</p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <input 
                        type="password" required value={disablePassword} onChange={e => setDisablePassword(e.target.value)}
                        className="w-full sm:flex-1 max-w-[300px] h-[50px] bg-white border border-slate-200 text-slate-900 rounded-[12px] px-4 text-[15px] outline-none focus:border-red-400 focus:ring-[3px] focus:ring-red-100 transition-all shadow-sm" 
                        placeholder="Verify password"
                      />
                      <button type="submit" disabled={mfaLoading} className="w-full sm:w-auto h-[50px] px-8 bg-red-600 hover:bg-red-700 text-white rounded-[12px] text-[14.5px] font-[600] shadow-sm transition-all disabled:opacity-50 whitespace-nowrap">
                        {mfaLoading ? "Processing..." : "Remove 2FA"}
                      </button>
                    </div>
                  </form>
                ) : mfaSetupState === "setup" && mfaData ? (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                      <div>
                        <div className="bg-white p-4 border border-slate-100 rounded-[20px] w-fit shadow-sm mb-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mfaData.otpauth_url)}`} alt="QR Code" className="w-[140px] h-[140px] rounded-lg" />
                        </div>
                        <h4 className="font-[700] text-slate-900 text-[15px] mb-1">1. Scan with App</h4>
                        <p className="text-[13.5px] text-slate-500">Use Google Authenticator or Authy to scan the QR code.</p>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <h4 className="font-[700] text-slate-900 text-[15px] mb-1">Manual Entry Code</h4>
                        <p className="text-[13.5px] text-slate-500 mb-3">If you can't scan the QR code, manually enter this code instead.</p>
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-[12px] text-sm font-mono text-slate-700 shadow-inner">
                          <span className="tracking-wider">{mfaData.secret}</span>
                          <button onClick={() => navigator.clipboard.writeText(mfaData.secret)} className="text-slate-400 hover:text-slate-900 p-2 bg-white border border-slate-200 rounded-md shadow-sm transition-colors" title="Copy to clipboard">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 rounded-[20px] p-6 sm:p-8 mb-10 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-slate-300"></div>
                      <h4 className="font-[700] text-slate-900 text-[15px] mb-1">Emergency Backup Codes</h4>
                      <p className="text-[13.5px] text-slate-500 mb-5">Save these codes in a secure location. They are required to recover your account if you lose access to your authenticator device.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {mfaData.backup_codes.map((code, idx) => (
                          <div key={idx} className="font-mono text-[13.5px] tracking-widest bg-white font-medium px-4 py-3 rounded-[10px] text-center border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.01)] text-slate-700">{code}</div>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleVerifyMFA} className="p-8 border border-slate-200 bg-white shadow-sm rounded-[20px]">
                      <h4 className="font-[700] text-slate-900 text-[16px] mb-2">2. Verify & Activate</h4>
                      <p className="text-[14px] text-slate-500 mb-6">Enter the 6-digit code currently provided by your authenticator app to complete setup.</p>
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <input 
                          type="text" required placeholder="000000" maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full sm:flex-1 max-w-[200px] h-[50px] bg-slate-50 hover:bg-slate-50/50 border border-slate-200 text-slate-900 rounded-[12px] px-4 text-center tracking-[0.5em] text-[18px] font-mono font-bold outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/10 transition-all focus:bg-white" 
                        />
                        <button type="submit" disabled={mfaLoading || mfaCode.length !== 6} className="h-[54px] px-10 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-[16px] w-full sm:w-auto text-[17px] font-[700] font-serif tracking-tight shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_25px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 whitespace-nowrap flex justify-center items-center gap-2">
                          {mfaLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify Setup"}
                        </button>
                        <button type="button" onClick={() => { setMfaSetupState("idle"); setMfaData(null); }} className="h-[54px] px-8 rounded-[16px] text-[15px] font-[600] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors w-full sm:w-auto">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
