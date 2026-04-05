import { PlatformModuleId } from "@/lib/permissions/platform";

// Roles from ROLE_REGISTRY.md v2.1
export type PlatformRole = 
  | "super_admin" 
  | "platform_security" 
  | "data_gov_officer";

export type CompanyRole = 
  | "ggc_member"
  | "risk_committee"
  | "compliance_officer"
  | "ivu_validator"
  | "org_owner"
  | "company_admin"
  | "executive"
  | "carbon_officer"
  | "ops_manager"
  | "risk_officer"
  | "scm_analyst"
  | "developer"
  | "blockchain_operator"
  | "operator"
  | "auditor"
  | "viewer";

export type Role = PlatformRole | CompanyRole;

export type MenuItem = {
  id: string;
  label: string;
  path: string;
  iconName: string;
  roles: Role[];
  contextScope?: "platform" | "company";
  feature_flag?: string;
  badge?: string;
  danger?: boolean;
};

export type MenuCategory = {
  label: string;
  moduleId?: PlatformModuleId; 
  danger?: boolean;
  items: MenuItem[];
};

// Common tenant operational roles
const ALL_OPS_ROLES: Role[] = ["org_owner", "company_admin", "ops_manager", "risk_officer", "scm_analyst", "developer", "operator"];

export const COMPANY_NAV_CONFIG: MenuCategory[] = [
  {
    label: "Overview",
    items: [
      { id: "executive_dashboard", label: "Executive Dashboard", iconName: "LayoutDashboard", path: "/dashboard", roles: ["org_owner", "executive"], contextScope: "company" },
      { id: "portfolio_health", label: "Portfolio Health", iconName: "BadgeDollarSign", path: "/executive/portfolio", roles: ["org_owner", "executive"], contextScope: "company" },
      { id: "dashboard", label: "Operations Overview", iconName: "LayoutDashboard", path: "/dashboard", roles: ["company_admin", "ops_manager", "risk_officer", "auditor"], contextScope: "company" },
    ]
  },
  {
    label: "Applications",
    items: [
      { id: "operations", label: "Operations", iconName: "PackageSearch", path: "/operations/products", roles: ALL_OPS_ROLES, contextScope: "company" },
      { id: "risk_engine", label: "Risk Engine", iconName: "ShieldAlert", path: "/risk-engine/fraud", roles: ["org_owner", "company_admin", "risk_committee", "compliance_officer", "ops_manager", "risk_officer", "ivu_validator"], contextScope: "company" },
      { id: "sustainability", label: "Sustainability", iconName: "Leaf", path: "/sustainability/impact", roles: ["org_owner", "company_admin", "carbon_officer", "executive", "ops_manager"], contextScope: "company" },
    ]
  },
  {
    label: "Intelligence & Risk",
    items: [
      { id: "macro_radar", label: "Macro Radar", iconName: "Globe", path: "/executive/radar", roles: ["org_owner", "executive", "risk_committee"], contextScope: "company" },
      { id: "tcar", label: "Capital Exposure (TCAR)", iconName: "AlertTriangle", path: "/executive/tcar", roles: ["org_owner", "executive", "risk_committee"], contextScope: "company" },
      { id: "scenario", label: "Scenario Analysis", iconName: "Play", path: "/risk/scenario", roles: ["org_owner", "risk_committee"], contextScope: "company" }
    ]
  },
  {
    label: "Decisions",
    items: [
      { id: "strategic_actions", label: "Strategic Actions", iconName: "Rocket", path: "/executive/actions", roles: ["org_owner", "executive", "company_admin"], contextScope: "company" },
      { id: "approvals", label: "Approvals", iconName: "Lock", path: "/executive/approvals", badge: "3", roles: ["org_owner", "company_admin"], contextScope: "company" }
    ]
  },
  {
    label: "Governance",
    items: [
      { id: "board_committee", label: "Board & Committees", iconName: "Users", path: "/governance/board", roles: ["org_owner", "executive", "ggc_member"], contextScope: "company" },
      { id: "reports", label: "Reports", iconName: "FileText", path: "/governance/reports", roles: ["org_owner", "executive", "company_admin", "compliance_officer", "carbon_officer", "auditor"], contextScope: "company" }
    ]
  },
  {
    label: "System",
    items: [
      { id: "access_delegation", label: "Access & Delegation", iconName: "Key", path: "/settings/access", roles: ["org_owner", "company_admin"], contextScope: "company" },
      { id: "org_billing", label: "Organization & Billing", iconName: "Building", path: "/ca-settings", roles: ["org_owner", "company_admin"], contextScope: "company" },
      { id: "settings", label: "Workspace Settings", iconName: "Settings", path: "/settings/users", roles: ["org_owner", "company_admin"], contextScope: "company" },
    ]
  }
];

export const PLATFORM_NAV_CONFIG: MenuCategory[] = [
  {
    label: "Global Command",
    items: [
      { id: "crisis", label: "Crisis Engine", iconName: "Activity", path: "/platform/command/crisis", roles: ["super_admin", "platform_security"], contextScope: "platform" },
      { id: "stress", label: "Systemic Stress", iconName: "AlertTriangle", path: "/platform/command/stress", roles: ["super_admin", "platform_security"], contextScope: "platform" },
      { id: "killswitch", label: "Kill Switch", iconName: "Power", path: "/platform/command/killswitch", roles: ["super_admin"], contextScope: "platform" },
      { id: "lock", label: "Integration Locking", iconName: "Lock", path: "/platform/command/lock", roles: ["super_admin", "platform_security"], contextScope: "platform" }
    ]
  },
  {
    label: "Control Plane",
    items: [
      { id: "features", label: "Feature Flags", iconName: "Flag", path: "/platform/control/features", roles: ["super_admin"], contextScope: "platform" },
      { id: "rollouts", label: "Rollouts", iconName: "Rocket", path: "/platform/control/rollouts", roles: ["super_admin"], contextScope: "platform" },
      { id: "policies", label: "Policies", iconName: "FileWarning", path: "/platform/control/policies", roles: ["super_admin", "platform_security"], contextScope: "platform" }
    ]
  },
  {
    label: "Observability",
    items: [
      { id: "health", label: "System Health", iconName: "HeartPulse", path: "/platform/observability/health", roles: ["super_admin", "platform_security"], contextScope: "platform" },
      { id: "metrics", label: "Metrics", iconName: "BarChart3", path: "/platform/observability/metrics", roles: ["super_admin", "data_gov_officer", "platform_security"], contextScope: "platform" },
      { id: "audit", label: "Audit", iconName: "FileText", path: "/platform/observability/audit", roles: ["super_admin", "platform_security"], contextScope: "platform" },
      { id: "diff", label: "Diff", iconName: "GitCompare", path: "/platform/observability/diff", roles: ["super_admin", "platform_security"], contextScope: "platform" }
    ]
  },
  {
    label: "Data & Governance",
    items: [
      { id: "classification", label: "Data Classification", iconName: "Layers", path: "/platform/data/classification", roles: ["super_admin", "data_gov_officer"], contextScope: "platform" },
      { id: "retention", label: "Retention Policies", iconName: "Clock", path: "/platform/data/retention", roles: ["super_admin", "data_gov_officer"], contextScope: "platform" },
      { id: "compliance", label: "Platform Compliance", iconName: "ShieldCheck", path: "/platform/data/compliance", roles: ["super_admin", "data_gov_officer"], contextScope: "platform" }
    ]
  },
  {
    label: "Platform",
    items: [
      { id: "risk", label: "Risk Overview", iconName: "ShieldAlert", path: "/platform/platform/risk", roles: ["super_admin", "platform_security"], contextScope: "platform" },
      { id: "tenants", label: "Tenants", iconName: "Building", path: "/platform/organizations", roles: ["super_admin"], contextScope: "platform" },
      { id: "security", label: "Security", iconName: "Key", path: "/platform/platform/security", roles: ["super_admin", "platform_security"], contextScope: "platform" }
    ]
  }
];

// Helper to filter config
export function getFilteredMenu(config: MenuCategory[], userRole: Role, featureFlags: any[] = []): MenuCategory[] {
  return config.map(category => {
    // Filter items inside category
    let filteredItems = category.items.filter(item => {
      // 1. Role match
      const hasRole = item.roles.includes(userRole);
      
      // 2. Feature flag match (if specified)
      const hasFeature = item.feature_flag ? featureFlags.includes(item.feature_flag) : true;
      
      return hasRole && hasFeature;
    });

    return {
      ...category,
      items: filteredItems
    };
  }).filter(category => category.items.length > 0); // Remove empty categories
}
