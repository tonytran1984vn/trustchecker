"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { getUserPlatformRole } from "@/lib/permissions/platform";
import { PLATFORM_NAV_CONFIG, COMPANY_NAV_CONFIG, Role } from "@/config/menu.config";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc_user");
      if (!stored) {
        setIsAuthorized(false);
        router.replace("/login");
        return;
      }
      const user = JSON.parse(stored);
      
      const isPlatformUser = user?.role === 'super_admin' || user?.user_type === 'platform';
      let userRole: Role = "viewer";
      if (isPlatformUser) {
        userRole = (getUserPlatformRole(user) as Role) || "super_admin";
      } else {
        userRole = (user?.role as Role) || "viewer";
      }

      // Allowed routes for this role
      let allowedPaths = new Set<string>();
      
      const compilePaths = (categoryList: any[]) => {
        categoryList.forEach(cat => {
          cat.items.forEach((item: any) => {
            if (item.roles.includes(userRole)) {
              allowedPaths.add(item.path);
            }
          });
        });
      };

      if (isPlatformUser) compilePaths(PLATFORM_NAV_CONFIG);
      else compilePaths(COMPANY_NAV_CONFIG);

      // Add wildcard allowed prefixes or exactly matched paths
      // Note: We're doing a simple access check. For nested dynamic routes, we might need a prefix match
      let hasAccess = false;
      for (let path of Array.from(allowedPaths)) {
        if (pathname === path || pathname.startsWith(path + '/')) {
          hasAccess = true;
          break;
        }
      }

      // Fallback for dashboard/root or if they have NO matching menu items
      if (pathname === '/' || pathname === '/dashboard' || pathname === '/platform/command/crisis') {
        hasAccess = true; // Typical landing pages are often exceptions, but ideally matching the menu config
      }

      if (!hasAccess) {
        // Redirect unauthorized access to a safe default page based on role
        if (isPlatformUser) {
          router.replace('/platform/command/crisis');
        } else {
          router.replace('/dashboard');
        }
      } else {
        setIsAuthorized(true);
      }
    } catch (e) {
      setIsAuthorized(false);
      router.replace("/login");
    }
  }, [pathname, router]);

  if (isAuthorized === null || isAuthorized === false) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin"></div></div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 relative overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in zoom-in-95 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
