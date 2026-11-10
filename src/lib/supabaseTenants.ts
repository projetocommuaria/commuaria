export const ARAUCARIA_CITY_ID = "araucaria-pr";
export const CURITIBA_CITY_ID = "curitiba-pr";

/** The one Supabase project used by all municipal tenants. */
export const DEFAULT_SUPABASE_URL = "https://jmdwkpuerwoiwrntswhu.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_9jBHjd3XLczKe6bzRo5WJA_Kl5-d0sh";

/** @deprecated Kept as a compatibility alias; Curitiba now shares the main project. */
export const DEFAULT_CURITIBA_SUPABASE_URL = DEFAULT_SUPABASE_URL;

export interface SupabaseTenantEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  /** @deprecated Ignored: city-specific Supabase projects are no longer supported. */
  VITE_SUPABASE_CURITIBA_URL?: string;
  /** @deprecated Ignored: city-specific Supabase keys are no longer supported. */
  VITE_SUPABASE_CURITIBA_ANON_KEY?: string;
}

export interface SupabaseTenantOverride {
  url?: string | null;
  anonKey?: string | null;
}

export interface SupabaseTenantConfig {
  cityId: string;
  url: string;
  anonKey: string;
}

/**
 * Every valid municipality uses the same Supabase project and Auth session. The
 * city-specific table boundary is applied separately by tenantTables.ts; no city
 * receives a separate URL or inherits a second project's credentials.
 */
export function resolveSupabaseTenantConfig(
  cityId: string | null | undefined,
  environment: SupabaseTenantEnvironment = {},
  override?: SupabaseTenantOverride | null,
): SupabaseTenantConfig | null {
  const normalizedCityId = cityId?.trim().toLowerCase();
  if (!normalizedCityId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedCityId)) {
    return null;
  }

  return {
    cityId: normalizedCityId,
    url: clean(override?.url) || clean(environment.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL,
    anonKey:
      clean(override?.anonKey) ||
      clean(environment.VITE_SUPABASE_ANON_KEY) ||
      DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function isUsableSupabaseTenantConfig(
  config: SupabaseTenantConfig | null | undefined,
): config is SupabaseTenantConfig {
  return Boolean(
    config &&
      config.url.startsWith("https://") &&
      config.anonKey.length > 10 &&
      config.url !== "https://YOUR_SUPABASE_URL" &&
      config.anonKey !== "YOUR_SUPABASE_ANON_KEY",
  );
}

export function getSupabaseAuthStorageKey(url: string): string {
  try {
    const projectRef = new URL(url).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "supabase.auth.token";
  }
}

function clean(value: string | null | undefined): string {
  return (value || "").replace(/^['\"]|['\"]$/g, "").trim();
}
