export type ReportDeletionMarker =
  | string
  | { id: string; city_id: string };

/** Legacy string markers are interpreted as Araucária only; new markers always carry city_id. */
export function isReportDeletedInCity(
  markers: readonly ReportDeletionMarker[],
  reportId: string,
  cityId: string | null | undefined,
  legacyCityId?: string | null,
): boolean {
  const normalizedCityId = cityId?.trim();
  const normalizedLegacyCityId = legacyCityId?.trim();
  if (!reportId || !normalizedCityId) return false;

  return markers.some((marker) => {
    if (typeof marker === "string") {
      return marker === reportId && normalizedCityId === normalizedLegacyCityId;
    }
    return marker.id === reportId && marker.city_id === normalizedCityId;
  });
}

export function addReportDeletionMarker(
  markers: readonly ReportDeletionMarker[],
  reportId: string,
  cityId: string | null | undefined,
  legacyCityId?: string | null,
): ReportDeletionMarker[] {
  const normalizedCityId = cityId?.trim();
  if (!reportId || !normalizedCityId) return [...markers];
  if (isReportDeletedInCity(markers, reportId, normalizedCityId, legacyCityId)) return [...markers];
  return [...markers, { id: reportId, city_id: normalizedCityId }];
}
