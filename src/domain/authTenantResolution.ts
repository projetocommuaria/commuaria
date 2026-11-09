export interface TenantAuthCandidate<T> {
  cityId: string;
  value: T;
}

export type TenantAuthResolution<T> =
  | { kind: "none" }
  | { kind: "unique"; candidate: TenantAuthCandidate<T> }
  | { kind: "ambiguous"; candidates: TenantAuthCandidate<T>[] };

/** Select a tenant only when the credentials match exactly one configured project. */
export function resolveTenantAuthCandidates<T>(
  candidates: readonly TenantAuthCandidate<T>[],
): TenantAuthResolution<T> {
  const byCity = new Map<string, TenantAuthCandidate<T>>();
  for (const candidate of candidates) {
    const cityId = candidate.cityId.trim();
    if (!cityId) continue;
    byCity.set(cityId, { ...candidate, cityId });
  }

  const uniqueCandidates = [...byCity.values()];
  if (uniqueCandidates.length === 0) return { kind: "none" };
  if (uniqueCandidates.length === 1) {
    return { kind: "unique", candidate: uniqueCandidates[0] };
  }
  return { kind: "ambiguous", candidates: uniqueCandidates };
}
