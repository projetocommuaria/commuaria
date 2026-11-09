import { CATEGORIES_CONFIG, type ReportCategory, type UserProfile, type UserRole } from "../types";
import { CURITIBA_CITY_ID } from "../lib/supabaseTenants";
import { isLegacyGlobalTenantAdmin } from "../domain/tenantAccess";

const MANAGEABLE_ROLES = ["user", "funcionario", "supervisor", "diretor"] as const;
const ROLE_SET = new Set<string>(MANAGEABLE_ROLES);
const CATEGORY_SET = new Set<string>(CATEGORIES_CONFIG.map((category) => category.id));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Keep in sync with public.is_global_admin() in the Araucária and Curitiba schemas.
const GLOBAL_ADMIN_EMAILS = new Set([
  "projetocomnuaria@gmail.com",
  "antonioadm@gmail.com",
  "admin@commuaria.com",
]);

export type AdminManagedRole = Exclude<UserRole, "admin">;

export interface CuritibaRoleChangeInput {
  cityId: typeof CURITIBA_CITY_ID;
  profileId: string | null;
  email: string | null;
  role: AdminManagedRole;
  assignedCategory: ReportCategory | null;
}

/** Mirrors the current database global-admin predicate and fails closed for protected profiles. */
export function isProtectedGlobalAdminProfile(
  profile: (Pick<UserProfile, "role" | "is_admin"> & Partial<Pick<UserProfile, "email">>) | null | undefined,
): boolean {
  if (!profile) return false;
  if (isLegacyGlobalTenantAdmin(profile)) return true;
  return typeof profile.email === "string" && GLOBAL_ADMIN_EMAILS.has(profile.email.trim().toLowerCase());
}

/** Validates and narrows the untrusted JSON body accepted by the Curitiba admin endpoint. */
export function parseCuritibaRoleChangeInput(value: unknown): CuritibaRoleChangeInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;

  const cityId = typeof body.cityId === "string" ? body.cityId.trim() : "";
  if (cityId !== CURITIBA_CITY_ID) return null;

  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (!ROLE_SET.has(role)) return null;

  const rawProfileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
  const profileId = UUID_PATTERN.test(rawProfileId) ? rawProfileId : null;
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail ? rawEmail.toLowerCase() : null;
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) return null;
  if (!profileId && !email) return null;

  let assignedCategory: ReportCategory | null = null;
  if (role === "supervisor" || role === "funcionario") {
    const category = typeof body.assignedCategory === "string" ? body.assignedCategory.trim() : "";
    if (!CATEGORY_SET.has(category)) return null;
    assignedCategory = category as ReportCategory;
  }

  return {
    cityId: CURITIBA_CITY_ID,
    profileId,
    email,
    role: role as AdminManagedRole,
    assignedCategory,
  };
}
