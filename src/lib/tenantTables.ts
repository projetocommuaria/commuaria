import { ARAUCARIA_CITY_ID } from "./supabaseTenants";

export const CITY_SCOPED_TABLES = [
  "profiles",
  "reports",
  "news",
  "work_orders",
  "work_order_history",
] as const;

export type CityScopedTable = (typeof CITY_SCOPED_TABLES)[number];

const CITY_SCOPED_TABLE_SET = new Set<string>(CITY_SCOPED_TABLES);
const SHARED_TABLES = new Set(["cities", "city_memberships"]);

/**
 * Maps a logical table to the physical table for one city in the unified Supabase
 * project. Araucaria keeps using its current tables; other cities use a dedicated
 * table set (for example, curitiba_profiles and curitiba_reports).
 */
export function getCityTableName(cityId: string, tableName: string): string {
  if (SHARED_TABLES.has(tableName) || !CITY_SCOPED_TABLE_SET.has(tableName)) {
    return tableName;
  }

  const normalizedCityId = cityId.trim().toLowerCase();
  if (normalizedCityId === ARAUCARIA_CITY_ID) return tableName;

  const prefix = getCityTablePrefix(normalizedCityId);
  // Never fall back to Araucaria's table when a tenant id is invalid or absent.
  return prefix ? `${prefix}_${tableName}` : `__invalid_tenant__${tableName}`;
}

/** Stable SQL-safe prefix used by the client and the database's tenant-table helper. */
export function getCityTablePrefix(cityId: string): string {
  const normalizedCityId = cityId.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedCityId)) return "";

  const withoutState = normalizedCityId.replace(/-[a-z]{2}$/, "");
  const prefix = withoutState.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z][a-z0-9_]*$/.test(prefix) ? prefix : "";
}

export function isKnownCityScopedTable(tableName: string): tableName is CityScopedTable {
  return CITY_SCOPED_TABLE_SET.has(tableName);
}
