import { mapSupabaseAuthStorageKey } from "./supabaseTenants";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const LEGACY_APP_SESSION_KEYS = [
  "commuaria_active_session",
  "commuaria_auth_city_id",
  "commuaria_session_user",
] as const;
const LEGACY_APP_SESSION_KEY_SET = new Set<string>(LEGACY_APP_SESSION_KEYS);
const APP_SESSION_MIGRATION_MARKER = "commuaria_tab_session_migrated_v1";
const AUTH_MIGRATION_MARKER_PREFIX = "commuaria_tab_auth_migrated_v1:";

function getBrowserStorage(name: "sessionStorage" | "localStorage"): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window[name];
  } catch {
    return null;
  }
}

/**
 * Creates app-session accessors over one tab's sessionStorage. The optional
 * sharedStorage is only used once to migrate the old localStorage session keys;
 * all subsequent reads and writes are tab-scoped.
 */
export function createTabSessionStore(
  tabStorage: KeyValueStorage,
  sharedStorage?: KeyValueStorage | null,
) {
  const migrateLegacySession = () => {
    if (!sharedStorage) return;

    try {
      if (sharedStorage.getItem(APP_SESSION_MIGRATION_MARKER) === "1") return;

      const legacyValues = LEGACY_APP_SESSION_KEYS.map((key) => [
        key,
        sharedStorage.getItem(key),
      ] as const);

      for (const [key, value] of legacyValues) {
        if (value !== null && tabStorage.getItem(key) === null) {
          tabStorage.setItem(key, value);
        }
      }

      // Mark the migration before removing shared values so a newly opened tab
      // cannot adopt a later session from another tab or an older app instance.
      sharedStorage.setItem(APP_SESSION_MIGRATION_MARKER, "1");
      for (const [key] of legacyValues) sharedStorage.removeItem(key);
    } catch {
      // Storage may be blocked or temporarily unavailable; keep this tab usable.
    }
  };

  return {
    getItem(key: string): string | null {
      if (LEGACY_APP_SESSION_KEY_SET.has(key)) migrateLegacySession();
      try {
        return tabStorage.getItem(key);
      } catch {
        return null;
      }
    },

    setItem(key: string, value: string): void {
      try {
        tabStorage.setItem(key, value);
      } catch {
        return;
      }
      if (LEGACY_APP_SESSION_KEY_SET.has(key)) {
        try {
          sharedStorage?.removeItem(key);
        } catch {
          // The tab-local value remains authoritative.
        }
      }
    },

    removeItem(key: string): void {
      try {
        tabStorage.removeItem(key);
      } catch {
        // Continue to retire any obsolete shared copy below.
      }
      if (LEGACY_APP_SESSION_KEY_SET.has(key)) {
        try {
          sharedStorage?.removeItem(key);
        } catch {
          // The tab-local value remains authoritative.
        }
      }
    },
  };
}

/**
 * Supabase Auth uses storageKey both as a storage namespace and as its
 * BroadcastChannel name. A fresh runtime key prevents Supabase's cross-tab
 * broadcasts, while mapping it to a stable sessionStorage key keeps this tab's
 * login available after reloads (including tabs opened from an existing tab).
 */
export function createTabAuthStorage(
  tabStorage: KeyValueStorage,
  runtimeStorageKey: string,
  persistentStorageKey: string,
  sharedStorage?: KeyValueStorage | null,
): KeyValueStorage {
  const resolveKey = (key: string) =>
    mapSupabaseAuthStorageKey(key, runtimeStorageKey, persistentStorageKey);
  const isAuthStorageKey = (key: string) =>
    key === persistentStorageKey || key.startsWith(`${persistentStorageKey}-`);
  const getMigrationMarker = (key: string) => `${AUTH_MIGRATION_MARKER_PREFIX}${key}`;

  const retireLegacySharedSession = (key: string) => {
    if (!sharedStorage || !isAuthStorageKey(key)) return;
    try {
      const migrationMarker = getMigrationMarker(key);
      if (sharedStorage.getItem(migrationMarker) !== "1") {
        sharedStorage.setItem(migrationMarker, "1");
      }
      if (sharedStorage.getItem(key) !== null) sharedStorage.removeItem(key);
    } catch {
      // The per-tab Auth storage remains usable if legacy storage is blocked.
    }
  };

  const migrateLegacySharedSession = (key: string): string | null => {
    if (!sharedStorage || !isAuthStorageKey(key)) return null;
    try {
      if (sharedStorage.getItem(getMigrationMarker(key)) === "1") return null;

      const legacyValue = sharedStorage.getItem(key);
      if (legacyValue !== null) tabStorage.setItem(key, legacyValue);
      retireLegacySharedSession(key);
      return legacyValue;
    } catch {
      return null;
    }
  };

  return {
    getItem(key: string): string | null {
      const tabKey = resolveKey(key);
      try {
        const value = tabStorage.getItem(tabKey);
        if (value !== null) return value;
        return isAuthStorageKey(tabKey) ? migrateLegacySharedSession(tabKey) : null;
      } catch {
        return null;
      }
    },

    setItem(key: string, value: string): void {
      const tabKey = resolveKey(key);
      try {
        tabStorage.setItem(tabKey, value);
        if (isAuthStorageKey(tabKey)) retireLegacySharedSession(tabKey);
      } catch {
        // Keep Auth running in-memory if browser storage becomes unavailable.
      }
    },

    removeItem(key: string): void {
      const tabKey = resolveKey(key);
      try {
        tabStorage.removeItem(tabKey);
      } catch {
        // Continue to retire an obsolete shared copy below.
      }
      if (isAuthStorageKey(tabKey)) retireLegacySharedSession(tabKey);
    },
  };
}

let authRuntimeInstanceId: string | null = null;

/** A per-page Supabase namespace, intentionally regenerated on every reload. */
export function getSupabaseAuthInstanceId(): string {
  if (authRuntimeInstanceId) return authRuntimeInstanceId;

  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      authRuntimeInstanceId = globalThis.crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    // Use the fallback below in restricted browser contexts.
  }

  if (!authRuntimeInstanceId) {
    authRuntimeInstanceId = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2)}`;
  }
  return authRuntimeInstanceId;
}

function getTabSessionStore() {
  const tabStorage = getBrowserStorage("sessionStorage");
  if (!tabStorage) return null;
  return createTabSessionStore(tabStorage, getBrowserStorage("localStorage"));
}

/** Read app authentication metadata from this tab, migrating legacy state once. */
export function getTabSessionValue(key: string): string | null {
  return getTabSessionStore()?.getItem(key) ?? null;
}

/** Store app authentication metadata in this tab only. */
export function setTabSessionValue(key: string, value: string): void {
  getTabSessionStore()?.setItem(key, value);
}

/** Clear app authentication metadata in this tab only. */
export function removeTabSessionValue(key: string): void {
  getTabSessionStore()?.removeItem(key);
}
