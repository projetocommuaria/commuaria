export interface CityScopedRow {
  city_id?: string | null;
}

/**
 * Checks a row's municipality without implicit defaults.
 * Legacy municipality fallback must be supplied explicitly by the caller (currently Araucária).
 */
export function rowBelongsToCity<T extends CityScopedRow>(
  row: T,
  cityId: string | null | undefined,
  legacyCityId?: string | null,
): boolean {
  const requestedCityId = normalizeCityId(cityId);
  if (!requestedCityId) return false;

  const rowCityId = normalizeCityId(row.city_id) ?? normalizeCityId(legacyCityId);
  return rowCityId === requestedCityId;
}

export function rowsForCity<T extends CityScopedRow>(
  rows: readonly T[],
  cityId: string | null | undefined,
  legacyCityId?: string | null,
): T[] {
  return rows.filter((row) => rowBelongsToCity(row, cityId, legacyCityId));
}

/** Replaces one municipality's cache rows while preserving every other municipality's rows. */
export function replaceCityRows<T extends CityScopedRow>(
  existingRows: readonly T[],
  updatedCityRows: readonly T[],
  cityId: string | null | undefined,
  legacyCityId?: string | null,
): T[] {
  const normalizedCityId = normalizeCityId(cityId);
  if (!normalizedCityId) return [...existingRows];

  const otherCityRows = existingRows.filter(
    (row) => !rowBelongsToCity(row, normalizedCityId, legacyCityId),
  );
  const currentCityRows = rowsForCity(updatedCityRows, normalizedCityId, legacyCityId).map((row) => {
    if (normalizeCityId(row.city_id)) return row;
    return { ...row, city_id: normalizedCityId } as T;
  });

  return [...otherCityRows, ...currentCityRows];
}

function normalizeCityId(cityId: string | null | undefined): string | null {
  const normalized = cityId?.trim();
  return normalized || null;
}
