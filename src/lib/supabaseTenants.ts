export const ARAUCARIA_CITY_ID = "araucaria-pr";
export const CURITIBA_CITY_ID = "curitiba-pr";

export const DEFAULT_SUPABASE_URL = "https://jmdwkpuerwoiwrntswhu.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_9jBHjd3XLczKe6bzRo5WJA_Kl5-d0sh";
export const DEFAULT_CURITIBA_SUPABASE_URL = "https://fayqjhaamxpuxrccltsj.supabase.co";

export interface SupabaseTenantEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_CURITIBA_URL?: string;
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
 * Maps a municipality to only its own Supabase project credentials.
 * Curitiba's URL is known, but its public anon key must be supplied by the deployment
 * environment or an explicit city-specific local configuration. There is deliberately
 * no fallback to Araucária's key.
 */
export function resolveSupabaseTenantConfig(
  cityId: string | null | undefined,
  environment: SupabaseTenantEnvironment = {},
  override?: SupabaseTenantOverride | null,
): SupabaseTenantConfig | null {
  const normalizedCityId = cityId?.trim();
  if (!normalizedCityId) return null;

  if (normalizedCityId === ARAUCARIA_CITY_ID) {
    return {
      cityId: normalizedCityId,
      url: clean(override?.url) || clean(environment.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL,
      anonKey:
        clean(override?.anonKey) ||
        clean(environment.VITE_SUPABASE_ANON_KEY) ||
        DEFAULT_SUPABASE_ANON_KEY,
    };
  }

  if (normalizedCityId === CURITIBA_CITY_ID) {
    return {
      cityId: normalizedCityId,
      url:
        clean(override?.url) ||
        clean(environment.VITE_SUPABASE_CURITIBA_URL) ||
        DEFAULT_CURITIBA_SUPABASE_URL,
      anonKey:
        clean(override?.anonKey) || clean(environment.VITE_SUPABASE_CURITIBA_ANON_KEY),
    };
  }

  return null;
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
