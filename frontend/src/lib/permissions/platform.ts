export type PlatformRole = "sovereign_operator" | "safety_officer" | "model_governor" | "super_admin";

export const PLATFORM_MODULES = {
  command: ["sovereign_operator", "safety_officer", "super_admin"],
  control: ["sovereign_operator", "super_admin"],
  observability: ["sovereign_operator", "safety_officer", "model_governor", "super_admin"],
  models: ["model_governor", "super_admin"],
  platform: ["sovereign_operator", "super_admin"],
};

export type PlatformModuleId = keyof typeof PLATFORM_MODULES;

export function canAccessModule(moduleId: PlatformModuleId, role?: string): boolean {
  if (!role) return false;
  
  // Implicitly, basic super_admin without a sub-role can act as sovereign_operator
  const activeRole = role === 'super_admin' ? 'sovereign_operator' : role;
  
  return PLATFORM_MODULES[moduleId].includes(activeRole);
}

export function getUserPlatformRole(user: any): string {
  if (!user) return "";
  // Resolve sub-role if present, otherwise fallback to standard role
  return user.platform_role || user.sub_role || user.role;
}
