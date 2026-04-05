"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { canAccessModule, getUserPlatformRole, PlatformModuleId } from "@/lib/permissions/platform";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid hydration mismatch

  const role = getUserPlatformRole(user);
  
  // Parse moduleId from pathname: e.g. /platform/command/crisis -> "command"
  const getModuleFromPath = (path: string): PlatformModuleId | null => {
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'platform' && segments.length > 1) {
      const mod = segments[1];
      // Note: checking explicitly or just cast it
      if (['command', 'control', 'observability', 'models', 'platform'].includes(mod)) {
        return mod as PlatformModuleId;
      }
    }
    return null;
  };

  const currentModule = getModuleFromPath(pathname);
  const hasAccess = currentModule ? canAccessModule(currentModule, role) : true; // allow neutral routes

  // Format display role text
  const roleDisplayMap: Record<string, string> = {
    'sovereign_operator': 'Sovereign Operator',
    'safety_officer': 'Safety Officer',
    'model_governor': 'Model Governor',
    'super_admin': 'Sovereign Operator' // Implicit
  };
  const roleText = roleDisplayMap[role] || role || 'Platform Access';

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Top Global Context Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
            Internal Platform Ops
          </span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
            {roleText}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] uppercase" title={roleText}>
            {roleText.substring(0, 2)}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-black relative">
        {!hasAccess ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-black">
            <div className="p-8 flex flex-col items-center justify-center text-center max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Restricted Protocol</h2>
              <p className="text-slate-500 text-sm">
                Your structural authority level ({roleText}) does not grant access to the <strong>{currentModule}</strong> plane. Return to an authorized module.
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
