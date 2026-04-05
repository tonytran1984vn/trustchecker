"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import TrustCheckerLogo from "@/components/TrustCheckerLogo";
import { canAccessModule, getUserPlatformRole, PlatformModuleId } from "@/lib/permissions/platform";
import { PLATFORM_NAV_CONFIG, COMPANY_NAV_CONFIG, getFilteredMenu, Role } from "@/config/menu.config";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const isPlatformUser = user?.role === 'super_admin' || user?.user_type === 'platform';
  
  // Resolve Role
  let userRole: Role = "viewer"; // default
  if (isPlatformUser) {
    userRole = getUserPlatformRole(user) as Role || "super_admin";
  } else {
    userRole = (user?.role as Role) || "viewer";
  }

  // Feature flags extraction
  const featureFlags = user?.feature_flags || [];

  // Filter Menus
  let navGroups = [];
  if (isPlatformUser) {
    // Original platform logic included canAccessModule filtering per category
    const filteredPlatformConfig = PLATFORM_NAV_CONFIG.filter(g => canAccessModule(g.moduleId as PlatformModuleId, userRole));
    navGroups = getFilteredMenu(filteredPlatformConfig, userRole, featureFlags);
  } else {
    navGroups = getFilteredMenu(COMPANY_NAV_CONFIG, userRole, featureFlags);
  }

  const handleLogout = () => {
    localStorage.removeItem("tc_token");
    localStorage.removeItem("tc_user");
    router.push("/login");
  };

  return (
    <div className="w-[260px] h-screen bg-white border-r border-slate-200 flex flex-col text-slate-700 font-sans shadow-[2px_0_10px_0_rgba(0,0,0,0.02)] z-40 fixed md:relative shrink-0 hidden md:flex">
      <Link href={isPlatformUser ? "/platform/command/crisis" : "/dashboard"} className="px-5 flex items-center gap-2.5 border-b border-slate-100 h-16 shrink-0 cursor-pointer">
        <TrustCheckerLogo size={34} className="shrink-0" />
        <div className="overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 leading-none truncate">
            {isPlatformUser ? "TrustChecker OS" : "TrustChecker"}
          </h2>
          <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide font-semibold truncate hover:text-clip">
            {isPlatformUser ? "Production Control Tower" : "Digital Trust Infrastructure"}
          </p>
        </div>
      </Link>

      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {navGroups.map((group: any) => (
          <div key={group.label} className="space-y-1.5">
            <div className={`text-[11px] font-bold uppercase tracking-[0.5px] mb-2 px-3 ${
              group.danger ? 'text-red-500' : 'text-slate-500'
            }`}>
              {group.label}
            </div>
            {group.items.map((n: any) => {
              const isActive = pathname === n.path || pathname.startsWith(n.path + '/');
              const IconComponent = (Icons as any)[n.iconName] || Icons.Circle; // Map string to icon, fallback to Circle
              
              return (
                <Link
                  key={n.id}
                  href={n.path}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] transition-all focus:outline-none relative group ${
                    isActive 
                      ? (group.danger ? "text-red-600 bg-red-50 font-bold" : "text-slate-900 bg-slate-50 font-bold")
                      : (group.danger ? "text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium")
                  }`}
                >
                  <IconComponent className={`w-5 h-5 shrink-0 ${
                    isActive 
                      ? (group.danger ? "text-red-500" : "text-slate-900")
                      : (group.danger ? "text-red-400 group-hover:text-red-500" : "text-slate-400 group-hover:text-slate-900")
                  }`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="flex-1 text-left">{n.label}</span>
                  {n.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      {n.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 flex-shrink-0">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium transition-all focus:outline-none group"
        >
          <Icons.LogOut className="w-5 h-5 text-slate-400 group-hover:text-slate-500" strokeWidth={2} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
