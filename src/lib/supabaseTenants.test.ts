import assert from "node:assert/strict";
import test from "node:test";
import {
  ARAUCARIA_CITY_ID,
  CURITIBA_CITY_ID,
  DEFAULT_CURITIBA_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
  getSupabaseAuthStorageKey,
  isUsableSupabaseTenantConfig,
  resolveSupabaseTenantConfig,
} from "./supabaseTenants";

test("Araucária keeps the existing Supabase project and credentials", () => {
  const config = resolveSupabaseTenantConfig(ARAUCARIA_CITY_ID);
  assert.deepEqual(config, {
    cityId: ARAUCARIA_CITY_ID,
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  });
  assert.equal(isUsableSupabaseTenantConfig(config), true);
});

test("Curitiba routes to its project and never inherits Araucária credentials", () => {
  const config = resolveSupabaseTenantConfig(CURITIBA_CITY_ID);
  assert.deepEqual(config, {
    cityId: CURITIBA_CITY_ID,
    url: DEFAULT_CURITIBA_SUPABASE_URL,
    anonKey: "",
  });
  assert.equal(isUsableSupabaseTenantConfig(config), false);
});

test("Curitiba accepts only its own environment or city-specific override", () => {
  const fromEnvironment = resolveSupabaseTenantConfig(CURITIBA_CITY_ID, {
    VITE_SUPABASE_ANON_KEY: "araucaria-key-must-not-be-used",
    VITE_SUPABASE_CURITIBA_ANON_KEY: "curitiba-publishable-key",
  });
  assert.equal(fromEnvironment?.url, DEFAULT_CURITIBA_SUPABASE_URL);
  assert.equal(fromEnvironment?.anonKey, "curitiba-publishable-key");

  const fromOverride = resolveSupabaseTenantConfig(
    CURITIBA_CITY_ID,
    { VITE_SUPABASE_CURITIBA_ANON_KEY: "environment-curitiba-key" },
    { url: "https://curitiba-custom.supabase.co", anonKey: "local-curitiba-key" },
  );
  assert.equal(fromOverride?.url, "https://curitiba-custom.supabase.co");
  assert.equal(fromOverride?.anonKey, "local-curitiba-key");
  assert.equal(isUsableSupabaseTenantConfig(fromOverride), true);
});

test("unknown or empty municipalities fail closed", () => {
  assert.equal(resolveSupabaseTenantConfig(" "), null);
  assert.equal(resolveSupabaseTenantConfig("another-city-pr"), null);
});

test("auth storage keys stay separated by project", () => {
  assert.notEqual(
    getSupabaseAuthStorageKey(DEFAULT_SUPABASE_URL),
    getSupabaseAuthStorageKey(DEFAULT_CURITIBA_SUPABASE_URL),
  );
});
