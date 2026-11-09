import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CURITIBA_CITY_ID } from "../lib/supabaseTenants";
import { isProtectedGlobalAdminProfile, parseCuritibaRoleChangeInput } from "./adminRoleChangeValidation";

const profileId = "550e8400-e29b-41d4-a716-446655440000";

describe("Curitiba administrator role-change request validation", () => {
  it("protects every global-admin signal used by the database policy", () => {
    assert.equal(isProtectedGlobalAdminProfile({ role: "admin", is_admin: false }), true);
    assert.equal(isProtectedGlobalAdminProfile({ role: "user", is_admin: true }), true);
    assert.equal(
      isProtectedGlobalAdminProfile({ role: "user", is_admin: false, email: "ANTONIOADM@GMAIL.COM" }),
      true,
    );
    assert.equal(isProtectedGlobalAdminProfile({ role: "supervisor", is_admin: false }), false);
    assert.equal(isProtectedGlobalAdminProfile(null), false);
  });

  it("accepts a valid municipal supervisor role and category", () => {
    assert.deepEqual(
      parseCuritibaRoleChangeInput({
        cityId: CURITIBA_CITY_ID,
        profileId,
        role: "supervisor",
        assignedCategory: "Iluminação Pública",
      }),
      {
        cityId: CURITIBA_CITY_ID,
        profileId,
        email: null,
        role: "supervisor",
        assignedCategory: "Iluminação Pública",
      },
    );
  });

  it("accepts a normalized email when there is no UUID profile id", () => {
    assert.deepEqual(
      parseCuritibaRoleChangeInput({
        cityId: CURITIBA_CITY_ID,
        email: "Supervisora@Example.org",
        role: "funcionario",
        assignedCategory: "Iluminação Pública",
      }),
      {
        cityId: CURITIBA_CITY_ID,
        profileId: null,
        email: "supervisora@example.org",
        role: "funcionario",
        assignedCategory: "Iluminação Pública",
      },
    );
  });

  it("does not accept global-admin promotion or unsupported roles", () => {
    assert.equal(
      parseCuritibaRoleChangeInput({ cityId: CURITIBA_CITY_ID, profileId, role: "admin" }),
      null,
    );
    assert.equal(
      parseCuritibaRoleChangeInput({ cityId: CURITIBA_CITY_ID, profileId, role: "owner" }),
      null,
    );
  });

  it("rejects other municipalities and invalid categories", () => {
    assert.equal(
      parseCuritibaRoleChangeInput({
        cityId: "araucaria-pr",
        profileId,
        role: "supervisor",
        assignedCategory: "Iluminação Pública",
      }),
      null,
    );
    assert.equal(
      parseCuritibaRoleChangeInput({
        cityId: CURITIBA_CITY_ID,
        profileId,
        role: "supervisor",
        assignedCategory: "Administração Global",
      }),
      null,
    );
  });

  it("requires a valid target identity and ignores categories for roles without a sector", () => {
    assert.equal(
      parseCuritibaRoleChangeInput({ cityId: CURITIBA_CITY_ID, role: "diretor" }),
      null,
    );
    assert.deepEqual(
      parseCuritibaRoleChangeInput({
        cityId: CURITIBA_CITY_ID,
        profileId,
        role: "diretor",
        assignedCategory: "Iluminação Pública",
      }),
      {
        cityId: CURITIBA_CITY_ID,
        profileId,
        email: null,
        role: "diretor",
        assignedCategory: null,
      },
    );
  });
});
