import type { UserProfile, UserRole } from "../types";

export type MunicipalRole = Exclude<UserRole, "admin">;

export interface GlobalTenantPrincipal {
  scope: "global";
  userId: string;
  role: "admin";
  defaultCityId: string | null;
}

export interface MunicipalTenantPrincipal {
  scope: "municipal";
  userId: string;
  role: MunicipalRole;
  /** Legacy profiles currently represent one municipal membership through profiles.city_id. */
  cityIds: readonly string[];
  defaultCityId: string | null;
}

export type TenantPrincipal = GlobalTenantPrincipal | MunicipalTenantPrincipal;

export function isLegacyGlobalTenantAdmin(
  profile: Pick<UserProfile, "role" | "is_admin"> | null | undefined,
): boolean {
  return Boolean(profile && (profile.is_admin === true || profile.role === "admin"));
}

/**
 * Compatibility boundary for the current profile schema.
 * Both legacy admin signals are intentionally preserved until the approved role migration.
 * This client-side context is not an authorization boundary; Supabase RLS must enforce access.
 */
export function resolveLegacyTenantPrincipal(
  profile: Pick<UserProfile, "id" | "role" | "is_admin" | "city_id">,
): TenantPrincipal {
  const defaultCityId = normalizeCityId(profile.city_id);

  if (isLegacyGlobalTenantAdmin(profile)) {
    return {
      scope: "global",
      userId: profile.id,
      role: "admin",
      defaultCityId,
    };
  }

  return {
    scope: "municipal",
    userId: profile.id,
    role: profile.role as MunicipalRole,
    cityIds: defaultCityId ? [defaultCityId] : [],
    defaultCityId,
  };
}

/**
 * Resolves the operational city for the current user.
 * `selectableCityIds` must come from the authenticated session's permitted/active city list.
 * A global admin may select any listed city; a municipal user is fixed to their membership.
 * Returns null on missing, inactive, unknown, or unauthorized city selections (fail closed).
 */
export function resolveActiveCityId(
  principal: TenantPrincipal,
  requestedCityId: string | null | undefined,
  selectableCityIds: ReadonlySet<string>,
): string | null {
  const candidateCityId =
    requestedCityId === null || requestedCityId === undefined
      ? principal.defaultCityId
      : normalizeCityId(requestedCityId);
  if (!candidateCityId || !selectableCityIds.has(candidateCityId)) return null;

  if (principal.scope === "global") return candidateCityId;
  return principal.cityIds.includes(candidateCityId) ? candidateCityId : null;
}

/**
 * Resolves the tenant for a new row, optionally cross-checking a related row's city.
 * Municipal users can only write within their membership. Global admins must provide
 * an explicit city or a city-scoped related row; their default city is not a safe selector.
 */
export function resolveExistingTenantCityId(
  principal: TenantPrincipal,
  rowCityId: string | null | undefined,
): string | null {
  const explicitCityId = normalizeCityId(rowCityId);
  if (!explicitCityId) return null;
  return resolveWritableTenantCityId(principal, explicitCityId);
}

export function resolveWritableTenantCityId(
  principal: TenantPrincipal,
  requestedCityId?: string | null,
  relatedCityId?: string | null,
): string | null {
  const requested = normalizeCityId(requestedCityId);
  const related = normalizeCityId(relatedCityId);
  if (requested && related && requested !== related) return null;

  const candidate = requested ?? related;
  if (principal.scope === "global") return candidate;

  const municipalCityId = principal.defaultCityId;
  if (!municipalCityId || !principal.cityIds.includes(municipalCityId)) return null;
  if (candidate && !principal.cityIds.includes(candidate)) return null;
  return candidate ?? municipalCityId;
}

function normalizeCityId(cityId: string | null | undefined): string | null {
  const normalized = cityId?.trim();
  return normalized || null;
}
