export interface ProfileIdentity {
  id?: string | null;
  email?: string | null;
  city_id?: string | null;
}

/**
 * Resolves a cached profile only when the identity is unambiguous. An exact ID takes
 * precedence; email-only fallback is rejected when cached copies point to distinct
 * accounts or municipalities.
 */
export function findUnambiguousProfileByIdentity<T extends ProfileIdentity>(
  profiles: readonly T[],
  userId?: string | null,
  email?: string | null,
): T | null {
  const normalizedId = normalize(userId);
  if (normalizedId) {
    const idMatches = profiles.filter((profile) => normalize(profile.id) === normalizedId);
    if (idMatches.length > 0) return uniqueIdentityOrNull(idMatches);
  }

  const normalizedEmail = normalize(email);
  if (!normalizedEmail) return null;

  const emailMatches = profiles.filter((profile) => normalize(profile.email) === normalizedEmail);
  return uniqueIdentityOrNull(emailMatches);
}

function uniqueIdentityOrNull<T extends ProfileIdentity>(profiles: readonly T[]): T | null {
  const identities = new Map<string, T>();
  for (const profile of profiles) {
    const id = normalize(profile.id);
    const email = normalize(profile.email);
    const cityId = normalize(profile.city_id);
    const identityKey = `${id || `email:${email}`}\u001f${cityId}`;
    identities.set(identityKey, profile);
  }
  return identities.size === 1 ? identities.values().next().value || null : null;
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || "";
}
