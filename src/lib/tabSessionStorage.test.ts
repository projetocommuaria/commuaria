import assert from "node:assert/strict";
import test from "node:test";
import {
  createTabAuthStorage,
  createTabSessionStore,
  type KeyValueStorage,
} from "./tabSessionStorage";

class MemoryStorage implements KeyValueStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("legacy app session is migrated into one tab and no longer shared", () => {
  const sharedStorage = new MemoryStorage();
  const firstTabStorage = new MemoryStorage();
  const secondTabStorage = new MemoryStorage();
  sharedStorage.setItem("commuaria_active_session", JSON.stringify({ id: "legacy-user" }));
  sharedStorage.setItem("commuaria_auth_city_id", "araucaria-pr");

  const firstTab = createTabSessionStore(firstTabStorage, sharedStorage);
  assert.equal(
    firstTab.getItem("commuaria_active_session"),
    JSON.stringify({ id: "legacy-user" }),
  );
  assert.equal(firstTab.getItem("commuaria_auth_city_id"), "araucaria-pr");
  assert.equal(sharedStorage.getItem("commuaria_active_session"), null);
  assert.equal(sharedStorage.getItem("commuaria_auth_city_id"), null);

  const secondTab = createTabSessionStore(secondTabStorage, sharedStorage);
  assert.equal(secondTab.getItem("commuaria_active_session"), null);
  assert.equal(secondTab.getItem("commuaria_auth_city_id"), null);
});

test("active session writes and logout are isolated between tabs", () => {
  const sharedStorage = new MemoryStorage();
  const firstTab = createTabSessionStore(new MemoryStorage(), sharedStorage);
  const secondTab = createTabSessionStore(new MemoryStorage(), sharedStorage);

  firstTab.setItem("commuaria_active_session", JSON.stringify({ id: "account-a" }));
  secondTab.setItem("commuaria_active_session", JSON.stringify({ id: "account-b" }));
  firstTab.setItem("commuaria_auth_city_id", "araucaria-pr");
  secondTab.setItem("commuaria_auth_city_id", "curitiba-pr");
  assert.equal(firstTab.getItem("commuaria_active_session"), JSON.stringify({ id: "account-a" }));
  assert.equal(secondTab.getItem("commuaria_active_session"), JSON.stringify({ id: "account-b" }));
  assert.equal(firstTab.getItem("commuaria_auth_city_id"), "araucaria-pr");
  assert.equal(secondTab.getItem("commuaria_auth_city_id"), "curitiba-pr");

  firstTab.removeItem("commuaria_active_session");
  assert.equal(firstTab.getItem("commuaria_active_session"), null);
  assert.equal(secondTab.getItem("commuaria_active_session"), JSON.stringify({ id: "account-b" }));
});

test("Supabase runtime keys stay isolated while each tab survives reload", () => {
  const persistentKey = "sb-project-auth-token";
  const firstTabStorage = new MemoryStorage();
  const secondTabStorage = new MemoryStorage();
  const firstRuntimeKey = `${persistentKey}-page-one`;
  const reloadedRuntimeKey = `${persistentKey}-page-after-reload`;
  const secondRuntimeKey = `${persistentKey}-page-two`;
  const firstToken = JSON.stringify({ access_token: "access-a", refresh_token: "refresh-a" });
  const secondToken = JSON.stringify({ access_token: "access-b", refresh_token: "refresh-b" });

  const firstPageAuth = createTabAuthStorage(firstTabStorage, firstRuntimeKey, persistentKey);
  firstPageAuth.setItem(firstRuntimeKey, firstToken);
  firstPageAuth.setItem(`${firstRuntimeKey}-code-verifier`, "pkce-a");

  const reloadedFirstPageAuth = createTabAuthStorage(
    firstTabStorage,
    reloadedRuntimeKey,
    persistentKey,
  );
  assert.equal(reloadedFirstPageAuth.getItem(reloadedRuntimeKey), firstToken);
  assert.equal(reloadedFirstPageAuth.getItem(`${reloadedRuntimeKey}-code-verifier`), "pkce-a");

  const secondPageAuth = createTabAuthStorage(secondTabStorage, secondRuntimeKey, persistentKey);
  assert.equal(secondPageAuth.getItem(secondRuntimeKey), null);
  secondPageAuth.setItem(secondRuntimeKey, secondToken);
  assert.equal(reloadedFirstPageAuth.getItem(reloadedRuntimeKey), firstToken);
  assert.equal(secondPageAuth.getItem(secondRuntimeKey), secondToken);

  reloadedFirstPageAuth.removeItem(reloadedRuntimeKey);
  assert.equal(reloadedFirstPageAuth.getItem(reloadedRuntimeKey), null);
  assert.equal(secondPageAuth.getItem(secondRuntimeKey), secondToken);
});

test("a pre-upgrade Supabase token migrates to only the first requesting tab", () => {
  const persistentKey = "sb-project-auth-token";
  const runtimeKeyA = `${persistentKey}-page-a`;
  const runtimeKeyB = `${persistentKey}-page-b`;
  const sharedStorage = new MemoryStorage();
  const firstTabStorage = new MemoryStorage();
  const secondTabStorage = new MemoryStorage();
  const legacyToken = JSON.stringify({ access_token: "legacy-access", refresh_token: "legacy-refresh" });
  const legacyCodeVerifier = "legacy-pkce-verifier";
  sharedStorage.setItem(persistentKey, legacyToken);
  sharedStorage.setItem(`${persistentKey}-code-verifier`, legacyCodeVerifier);

  const firstTabAuth = createTabAuthStorage(
    firstTabStorage,
    runtimeKeyA,
    persistentKey,
    sharedStorage,
  );
  const secondTabAuth = createTabAuthStorage(
    secondTabStorage,
    runtimeKeyB,
    persistentKey,
    sharedStorage,
  );

  assert.equal(firstTabAuth.getItem(runtimeKeyA), legacyToken);
  assert.equal(firstTabAuth.getItem(`${runtimeKeyA}-code-verifier`), legacyCodeVerifier);
  assert.equal(secondTabAuth.getItem(runtimeKeyB), null);
  assert.equal(secondTabAuth.getItem(`${runtimeKeyB}-code-verifier`), null);
  assert.equal(firstTabStorage.getItem(persistentKey), legacyToken);
  assert.equal(firstTabStorage.getItem(`${persistentKey}-code-verifier`), legacyCodeVerifier);
  assert.equal(secondTabStorage.getItem(persistentKey), null);
  assert.equal(sharedStorage.getItem(persistentKey), null);
  assert.equal(sharedStorage.getItem(`${persistentKey}-code-verifier`), null);
});
