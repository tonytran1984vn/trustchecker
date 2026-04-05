"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const isPlatformUser = user?.role === 'super_admin' || user?.user_type === 'platform';

  const rawTabs = [
    { id: 'users', label: '👥 User Management', href: '/settings/users', hideForPlatform: true },
    { id: 'roles', label: '🛡️ Role & Permission Manager', href: '/settings/roles' },
    { id: 'audit', label: '📜 Global Audit Logs', href: '/settings/audit' },
    { id: 'billing', label: '💳 Billing & Subscriptions', href: '/settings/billing', hideForPlatform: true },
    { id: 'developers', label: '💻 Developers & APIs', href: '/settings/developers', hideForPlatform: true },
    { id: 'pricing', label: '🏷️ SaaS Pricing Models', href: '/settings/pricing', requiresPlatform: true }
  ];

  const tabs = rawTabs.filter(tab => {
    if (tab.hideForPlatform && isPlatformUser) return false;
    if (tab.requiresPlatform && !isPlatformUser) return false;
    return true;
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black w-full min-w-0">
      
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isPlatformUser ? "Platform Governance" : "Workspace Settings"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isPlatformUser 
              ? "Configure system-wide identity, security policies, and global SaaS engines." 
              : "Configure your institutional identity, users, and governance rules."}
          </p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800 scrollbar-hide overflow-x-auto">
          {tabs.map(tab => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link 
                key={tab.id} 
                href={tab.href}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
        {children}
      </div>
      
    </div>
  );
}
