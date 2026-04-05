"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { id: 'products', label: '📦 Product Catalog', href: '/operations/products' },
    { id: 'qr-codes', label: '📱 QR Codes', href: '/operations/qr-codes' },
    { id: 'scans', label: '🔍 Global Scans', href: '/legacy-dashboard?page=scans' } // Keep legacy route as placeholder until migrated
  ];

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Operations Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage physical products, digital twins, and scanning infrastructure.</p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {tabs.map(tab => {
            // Because legacy placeholder handles via query param, match accordingly:
            const isActive = tab.href.includes('legacy') ? false : pathname.startsWith(tab.href);
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
