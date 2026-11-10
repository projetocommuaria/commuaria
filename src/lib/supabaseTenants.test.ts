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

test("Araucaria keeps the existing main Supabase project and credentials", () => {
  const config = resolveSupabaseTenantConfig(ARAUCARIA_CITY_ID);
  assert.deepEqual(config, {
    cityId: ARAUCARIA_CITY_ID,
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  });
  assert.equal(isUsableSupabaseTenantConfig(config), true);
});

test("Curitiba uses the same project and Auth credentials as Araucaria", () => {
  const config = resolveSupabaseTenantConfig(CURITIBA_CITY_ID);
  assert.deepEqual(config, {
    cityId: CURITIBA_CITY_ID,
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
  });
  assert.equal(DEFAULT_CURITIBA_SUPABASE_URL, DEFAULT_SUPABASE_URL);
  assert.equal(isUsableSupabaseTenantConfig(config), true);
});

test("legacy Curitiba-specific environment variables are ignored", () => {
  const config = resolveSupabaseTenantConfig(CURITIBA_CITY_ID, {
    VITE_SUPABASE_URL: "https://commuaria-main.supabase.co",
    VITE_SUPABASE_ANON_KEY: "main-publishable-key",
    VITE_SUPABASE_CURITIBA_URL: "https://old-curitiba-project.supabase.co",
    VITE_SUPABASE_CURITIBA_ANON_KEY: "old-curitiba-key",
  });
  assert.equal(config?.url, "https://commuaria-main.supabase.co");
  assert.equal(config?.anonKey, "main-publishable-key");
});

test("valid future city IDs reuse the one project; invalid IDs fail closed", () => {
  const futureCity = resolveSupabaseTenantConfig("campo-largo-pr");
  assert.equal(futureCity?.url, DEFAULT_SUPABASE_URL);
  assert.equal(futureCity?.anonKey, DEFAULT_SUPABASE_ANON_KEY);
  assert.equal(resolveSupabaseTenantConfig(""), null);
  assert.equal(resolveSupabaseTenantConfig("../profiles"), null);
  assert.equal(resolveSupabaseTenantConfig("city name"), null);
});

test("a local override changes the shared project configuration", () => {
  const override = resolveSupabaseTenantConfig(
    CURITIBA_CITY_ID,
    { VITE_SUPABASE_URL: "https://main.supabase.co", VITE_SUPABASE_ANON_KEY: "main-key" },
    { url: "https://local.supabase.co", anonKey: "local-publishable-key" },
  );
  assert.equal(override?.url, "https://local.supabase.co");
  assert.equal(override?.anonKey, "local-publishable-key");
});

test("all cities in the shared project use one Auth storage key", () => {
  assert.equal(
    getSupabaseAuthStorageKey(DEFAULT_SUPABASE_URL),
    getSupabaseAuthStorageKey(DEFAULT_CURITIBA_SUPABASE_URL),
  );
});
