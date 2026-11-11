import assert from "node:assert/strict";
import test from "node:test";
import {
  getCityTableName,
  getCityTablePrefix,
} from "./tenantTables";

const cityTables = [
  "profiles",
  "reports",
  "news",
  "work_orders",
  "work_order_history",
] as const;

test("Araucaria continues to use the existing public table names", () => {
  for (const table of cityTables) {
    assert.equal(getCityTableName("araucaria-pr", table), table);
  }
});

test("Curitiba uses dedicated tables inside the same project", () => {
  for (const table of cityTables) {
    assert.equal(getCityTableName("curitiba-pr", table), `curitiba_${table}`);
  }
});

test("future cities use deterministic city-specific table prefixes", () => {
  assert.equal(getCityTablePrefix("campo-largo-pr"), "campo_largo");
  assert.equal(getCityTablePrefix("futurecity"), "futurecity");
  assert.equal(getCityTableName("campo-largo-pr", "work_orders"), "campo_largo_work_orders");
  assert.equal(getCityTableName("sao-jose-dos-pinhais-pr", "profiles"), "sao_jose_dos_pinhais_profiles");
});

test("shared and unknown tables are never tenant-prefixed", () => {
  assert.equal(getCityTableName("curitiba-pr", "cities"), "cities");
  assert.equal(getCityTableName("curitiba-pr", "city_memberships"), "city_memberships");
  assert.equal(getCityTableName("curitiba-pr", "auth.users"), "auth.users");
});

test("invalid or empty city IDs fail closed instead of falling back to Araucaria", () => {
  assert.equal(getCityTableName("", "profiles"), "__invalid_tenant__profiles");
  assert.equal(getCityTableName("../profiles", "profiles"), "__invalid_tenant__profiles");
  assert.equal(getCityTablePrefix("../profiles"), "");
});
