"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  PackageSearch, 
  ShieldAlert, 
  Leaf, 
  Settings,
  Building,
  Flag,
  Power,
  Activity,
  BarChart3,
  Layers,
  Users,
  LogOut,
  HeartPulse,
  FileText,
  BadgeDollarSign,
  AlertTriangle,
  Lock,
  Rocket,
  FileWarning,
  GitCompare,
  Cpu,
  TestTube,
  Play,
  Key
} from "lucide-react";
import Link from "next/link";
import TrustCheckerLogo from "@/components/TrustCheckerLogo";
import { canAccessModule, getUserPlatformRole, PlatformModuleId } from "@/lib/permissions/platform";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const router = useRouter();

  const isPlatformUser = user?.role === 'super_admin' || user?.user_type === 'platform';

  const tenantNavGroups = [
    {
      label: "Applications",
      items: [
        { id: "dashboard", label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
        { id: "operations", label: "Operations", icon: PackageSearch, path: "/operations/products" },
        { id: "risk", label: "Risk Engine", icon: ShieldAlert, path: "/risk-engine/fraud" },
        { id: "sustainability", label: "Sustainability", icon: Leaf, path: "/sustainability/impact" },
        { id: "settings", label: "Workspace Settings", icon: Settings, path: "/settings/users" },
      ]
    }
  ];

  const platformNavGroups: any[] = [
    {
      label: "Global Command",
      moduleId: "command" as const,
      items: [
        { id: "crisis", label: "Crisis Engine", icon: Activity, path: "/platform/command/crisis" },
        { id: "stress", label: "Systemic Stress", icon: AlertTriangle, path: "/platform/command/stress" },
        { id: "killswitch", label: "Kill Switch", icon: Power, path: "/platform/command/killswitch" },
        { id: "lock", label: "Integration Locking", icon: Lock, path: "/platform/command/lock" }
      ]
    },
    {
      label: "Control Plane",
      moduleId: "control" as const,
      items: [
        { id: "features", label: "Feature Flags", icon: Flag, path: "/platform/control/features" },
        { id: "rollouts", label: "Rollouts", icon: Rocket, path: "/platform/control/rollouts" },
        { id: "policies", label: "Policies", icon: FileWarning, path: "/platform/control/policies" }
      ]
    },
    {
      label: "Observability",
      moduleId: "observability" as const,
      items: [
        { id: "health", label: "System Health", icon: HeartPulse, path: "/platform/observability/health" },
        { id: "metrics", label: "Metrics", icon: BarChart3, path: "/platform/observability/metrics" },
        { id: "audit", label: "Audit", icon: FileText, path: "/platform/observability/audit" },
        { id: "diff", label: "Diff", icon: GitCompare, path: "/platform/observability/diff" }
      ]
    },
    {
      label: "Model Governance",
      moduleId: "models" as const,
      items: [
        { id: "models", label: "Models", icon: Cpu, path: "/platform/models/registry" },
        { id: "validation", label: "Validation", icon: TestTube, path: "/platform/models/validation" },
        { id: "simulation", label: "Simulation", icon: Play, path: "/platform/models/simulation" }
      ]
    },
    {
      label: "Platform",
      moduleId: "platform" as const,
      items: [
        { id: "risk", label: "Risk Overview", icon: ShieldAlert, path: "/platform/platform/risk" },
        { id: "tenants", label: "Tenants", icon: Building, path: "/platform/organizations" },
        { id: "security", label: "Security", icon: Key, path: "/platform/platform/security" }
      ]
    }
  ];

  const role = getUserPlatformRole(user);
  const filteredPlatformGroups = platformNavGroups.filter(g => canAccessModule(g.moduleId as PlatformModuleId, role));
  const navGroups = isPlatformUser ? filteredPlatformGroups : tenantNavGroups;


  const handleNav = (n: { id: string; path: string }) => {
    router.push(n.path);
  };

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
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNav(n)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] transition-all focus:outline-none relative group ${
                    isActive 
                      ? (group.danger ? "text-red-600 bg-red-50 font-bold" : "text-slate-900 bg-slate-50 font-bold")
                      : (group.danger ? "text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium")
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive 
                      ? (group.danger ? "text-red-500" : "text-slate-900")
                      : (group.danger ? "text-red-400 group-hover:text-red-500" : "text-slate-400 group-hover:text-slate-900")
                  }`} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{n.label}</span>
                </button>
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
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-slate-500" strokeWidth={2} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
