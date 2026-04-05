"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RiskEngineLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { id: 'fraud', label: '🚨 Fraud Alerts', href: '/risk-engine/fraud' },
    { id: 'kyc', label: '🛡️ KYC / AML', href: '/risk-engine/kyc' },
    { id: 'evidence', label: '🔒 Evidence Vault', href: '/risk-engine/evidence' }
  ];

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Risk Engine</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor fraud, verify entities, and secure immutable evidence.</p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {tabs.map(tab => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link 
                key={tab.id} 
                href={tab.href}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive 
                  ? 'border-red-500 text-red-600 dark:text-red-400' 
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
