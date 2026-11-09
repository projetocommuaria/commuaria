import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTenantAuthCandidates } from "./authTenantResolution";

describe("municipal login tenant resolution", () => {
  it("returns no match when no configured tenant accepted the credentials", () => {
    assert.deepEqual(resolveTenantAuthCandidates([]), { kind: "none" });
  });

  it("selects the city automatically for a single successful tenant", () => {
    const candidate = { cityId: "curitiba-pr", value: { id: "user-1" } };
    assert.deepEqual(resolveTenantAuthCandidates([candidate]), {
      kind: "unique",
      candidate,
    });
  });

  it("requests a city choice only when multiple tenants accepted the credentials", () => {
    const candidates = [
      { cityId: "araucaria-pr", value: "session-a" },
      { cityId: "curitiba-pr", value: "session-c" },
    ];
    assert.deepEqual(resolveTenantAuthCandidates(candidates), {
      kind: "ambiguous",
      candidates,
    });
  });

  it("deduplicates city identifiers and ignores empty identifiers", () => {
    assert.deepEqual(resolveTenantAuthCandidates([
      { cityId: "curitiba-pr", value: "first" },
      { cityId: " curitiba-pr ", value: "second" },
      { cityId: "  ", value: "invalid" },
    ]), {
      kind: "unique",
      candidate: { cityId: "curitiba-pr", value: "second" },
    });
  });
});
