import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptCurrentTerms,
  fetchCurrentTerms,
  hasAcceptedTerms,
  publishTerms,
} from "./termsService";

function installMemoryStorage() {
  const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  const memoryStorage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(String(key), String(value));
    },
  } as Storage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage,
  });

  return () => {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "localStorage", previousDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  };
}

test("local demo terms are accepted once per user and per published version", async () => {
  const restoreStorage = installMemoryStorage();
  try {
    const client = {};
    const terms = await fetchCurrentTerms(client, false);
    assert.ok(terms);
    assert.equal(terms.version, 1);
    assert.match(terms.content, /dados fictícios/);

    assert.equal(await hasAcceptedTerms(client, false, "user-a", terms.version), false);
    await acceptCurrentTerms(client, false, "user-a", terms.version);
    assert.equal(await hasAcceptedTerms(client, false, "user-a", terms.version), true);
    assert.equal(await hasAcceptedTerms(client, false, "user-b", terms.version), false);

    const updated = await publishTerms(client, false, "Termos revisados", "Texto atualizado para teste.");
    assert.equal(updated.version, 2);
    assert.equal((await fetchCurrentTerms(client, false))?.version, 2);
    assert.equal(await hasAcceptedTerms(client, false, "user-a", updated.version), false);
    await assert.rejects(
      () => acceptCurrentTerms(client, false, "user-c", terms.version),
      /não está mais vigente/,
    );
    assert.equal(await hasAcceptedTerms(client, false, "user-c", terms.version), false);

    await acceptCurrentTerms(client, false, "user-a", updated.version);
    assert.equal(await hasAcceptedTerms(client, false, "user-a", updated.version), true);
  } finally {
    restoreStorage();
  }
});

test("local demo publishing rejects blank or oversized terms", async () => {
  const restoreStorage = installMemoryStorage();
  try {
    const client = {};
    await assert.rejects(() => publishTerms(client, false, " ", "valid content"), /título/);
    await assert.rejects(
      () => publishTerms(client, false, "Title", "x".repeat(50001)),
      /50000 caracteres/,
    );
  } finally {
    restoreStorage();
  }
});

test("Supabase acceptance lookup is scoped to the authenticated account and version", async () => {
  const filters: Array<[string, string | number]> = [];
  const query = {
    select: () => query,
    eq: (column: string, value: string | number) => {
      filters.push([column, value]);
      return query;
    },
    maybeSingle: async () => ({ data: { terms_version: 7 }, error: null }),
  };
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "authenticated-account-id" } } },
        error: null,
      }),
    },
    from: (table: string) => {
      assert.equal(table, "terms_acceptances");
      return query;
    },
  };

  assert.equal(await hasAcceptedTerms(client, true, "untrusted-client-id", 7), true);
  assert.deepEqual(filters, [
    ["user_id", "authenticated-account-id"],
    ["terms_version", 7],
  ]);
});

test("Supabase acceptance is recorded through the authenticated-user RPC", async () => {
  let rpcCall: { functionName: string; args: Record<string, unknown> } | null = null;
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "authenticated-account-id" } } },
        error: null,
      }),
    },
    rpc: async (functionName: string, args: Record<string, unknown>) => {
      rpcCall = { functionName, args };
      return { error: null };
    },
  };

  await acceptCurrentTerms(client, true, "untrusted-client-id", 9);
  assert.deepEqual(rpcCall, {
    functionName: "accept_current_terms",
    args: { p_terms_version: 9 },
  });
});
