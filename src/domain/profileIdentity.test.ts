import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findUnambiguousProfileByIdentity } from "./profileIdentity";

type TestProfile = {
  id: string;
  email: string;
  city_id?: string | null;
  role: string;
};

describe("municipality-aware cached profile identity", () => {
  it("prefers an exact user ID over an email collision in another city", () => {
    const araucaria: TestProfile = {
      id: "auth-user-1",
      email: "person@example.invalid",
      city_id: "araucaria-pr",
      role: "user",
    };
    const curitiba: TestProfile = {
      id: "other-user-2",
      email: "person@example.invalid",
      city_id: "curitiba-pr",
      role: "supervisor",
    };

    assert.strictEqual(
      findUnambiguousProfileByIdentity([araucaria, curitiba], "auth-user-1", araucaria.email),
      araucaria,
    );
  });

  it("uses a unique case-insensitive email match when no ID matches", () => {
    const profile: TestProfile = {
      id: "legacy-profile-1",
      email: "person@example.invalid",
      city_id: "curitiba-pr",
      role: "user",
    };

    assert.strictEqual(
      findUnambiguousProfileByIdentity([profile], "different-auth-id", " PERSON@example.invalid "),
      profile,
    );
  });

  it("accepts duplicated cache copies of the same account in the same municipality", () => {
    const profileCopy: TestProfile = {
      id: "user-a",
      email: "person@example.invalid",
      city_id: "araucaria-pr",
      role: "user",
    };
    const userCopy: TestProfile = { ...profileCopy };

    assert.ok(findUnambiguousProfileByIdentity([profileCopy, userCopy], null, profileCopy.email));
  });

  it("fails closed when email-only lookup finds profiles in multiple municipalities", () => {
    const profiles: TestProfile[] = [
      { id: "user-a", email: "person@example.invalid", city_id: "araucaria-pr", role: "user" },
      { id: "user-b", email: "person@example.invalid", city_id: "curitiba-pr", role: "supervisor" },
    ];

    assert.equal(findUnambiguousProfileByIdentity(profiles, "unknown-id", "person@example.invalid"), null);
  });

  it("fails closed when one identity has conflicting municipality copies", () => {
    const profiles: TestProfile[] = [
      { id: "user-a", email: "person@example.invalid", city_id: null, role: "user" },
      { id: "user-a", email: "person@example.invalid", city_id: "araucaria-pr", role: "supervisor" },
    ];

    assert.equal(findUnambiguousProfileByIdentity(profiles, "user-a", "person@example.invalid"), null);
  });
});
