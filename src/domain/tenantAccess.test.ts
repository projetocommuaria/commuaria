import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAuditAllSectors,
  canDispatchWorkOrders,
  canExecuteWorkOrders,
  canManageAccounts,
  type UserProfile,
} from "../types";
import {
  resolveActiveCityId,
  isLegacyGlobalTenantAdmin,
  resolveLegacyTenantPrincipal,
  resolveExistingTenantCityId,
  resolveWritableTenantCityId,
} from "./tenantAccess";

const selectableCities = new Set(["araucaria-pr", "curitiba-pr"]);

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "test-user",
    name: "Test User",
    email: "test@example.invalid",
    role: "user",
    city_id: "araucaria-pr",
    ...overrides,
  };
}

describe("legacy tenant access compatibility", () => {
  it("treats a missing profile as non-admin instead of throwing", () => {
    assert.equal(isLegacyGlobalTenantAdmin(null), false);
    assert.equal(isLegacyGlobalTenantAdmin(undefined), false);
  });

  it("keeps role=admin profiles global and preserves current admin capabilities", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "admin", is_admin: true }));

    assert.equal(principal.scope, "global");
    assert.equal(principal.role, "admin");
    assert.equal(isLegacyGlobalTenantAdmin({ role: "admin", is_admin: false }), true);
    assert.equal(isLegacyGlobalTenantAdmin({ role: "user", is_admin: true }), true);
    assert.equal(resolveActiveCityId(principal, "curitiba-pr", selectableCities), "curitiba-pr");
    assert.equal(canManageAccounts(principal.role), true);
    assert.equal(canAuditAllSectors(principal.role), true);
    assert.equal(canDispatchWorkOrders(principal.role), true);
    assert.equal(canExecuteWorkOrders(principal.role), true);
  });

  it("keeps role=admin globally privileged even when the legacy boolean is false", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "admin", is_admin: false }));

    assert.equal(principal.scope, "global");
    assert.equal(principal.role, "admin");
  });

  it("preserves the confirmed legacy global-admin case role=user plus is_admin=true", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "user", is_admin: true }));

    assert.equal(principal.scope, "global");
    assert.equal(principal.role, "admin");
    assert.equal(resolveActiveCityId(principal, "araucaria-pr", selectableCities), "araucaria-pr");
    assert.equal(resolveActiveCityId(principal, "curitiba-pr", selectableCities), "curitiba-pr");
    assert.equal(canManageAccounts(principal.role), true);
    assert.equal(canAuditAllSectors(principal.role), true);
    assert.equal(canDispatchWorkOrders(principal.role), true);
    assert.equal(canExecuteWorkOrders(principal.role), true);
  });

  it("keeps municipal roles restricted to their assigned city", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "supervisor" }));

    assert.equal(principal.scope, "municipal");
    assert.equal(principal.role, "supervisor");
    assert.equal(resolveActiveCityId(principal, null, selectableCities), "araucaria-pr");
    assert.equal(resolveActiveCityId(principal, "araucaria-pr", selectableCities), "araucaria-pr");
    assert.equal(resolveActiveCityId(principal, "curitiba-pr", selectableCities), null);
  });

  it("fails closed for missing, unknown, or non-selectable city ids", () => {
    const noCity = resolveLegacyTenantPrincipal(profile({ role: "user", city_id: undefined }));
    const globalAdmin = resolveLegacyTenantPrincipal(profile({ role: "admin" }));

    assert.equal(resolveActiveCityId(noCity, null, selectableCities), null);
    assert.equal(resolveActiveCityId(globalAdmin, "unknown-pr", selectableCities), null);
    assert.equal(resolveActiveCityId(globalAdmin, "curitiba-pr", new Set(["araucaria-pr"])), null);
  });

  it("does not silently fall back to the principal default for an explicitly empty city selection", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "admin" }));

    assert.equal(resolveActiveCityId(principal, "", selectableCities), null);
  });

  it("requires global administrators to choose a city for new rows", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "admin" }));

    assert.equal(resolveWritableTenantCityId(principal), null);
    assert.equal(resolveWritableTenantCityId(principal, "curitiba-pr"), "curitiba-pr");
    assert.equal(resolveWritableTenantCityId(principal, null, "curitiba-pr"), "curitiba-pr");
    assert.equal(resolveWritableTenantCityId(principal, "araucaria-pr", "curitiba-pr"), null);
  });

  it("keeps municipal writes in the assigned city and fails closed without a membership", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "supervisor" }));
    const noCity = resolveLegacyTenantPrincipal(profile({ role: "supervisor", city_id: null }));

    assert.equal(resolveWritableTenantCityId(principal), "araucaria-pr");
    assert.equal(resolveWritableTenantCityId(principal, "araucaria-pr"), "araucaria-pr");
    assert.equal(resolveWritableTenantCityId(principal, "curitiba-pr"), null);
    assert.equal(resolveWritableTenantCityId(noCity), null);
  });

  it("requires an existing work order to have its own municipality before updates", () => {
    const municipal = resolveLegacyTenantPrincipal(profile({ role: "supervisor" }));
    const global = resolveLegacyTenantPrincipal(profile({ role: "admin" }));

    assert.equal(resolveExistingTenantCityId(municipal, null), null);
    assert.equal(resolveExistingTenantCityId(municipal, "   "), null);
    assert.equal(resolveExistingTenantCityId(municipal, "araucaria-pr"), "araucaria-pr");
    assert.equal(resolveExistingTenantCityId(municipal, "curitiba-pr"), null);
    assert.equal(resolveExistingTenantCityId(global, "curitiba-pr"), "curitiba-pr");
    assert.equal(resolveExistingTenantCityId(global, undefined), null);
  });

  it("preserves the confirmed is_admin global-admin signal for explicit tenant writes", () => {
    const principal = resolveLegacyTenantPrincipal(profile({ role: "user", is_admin: true }));

    assert.equal(resolveWritableTenantCityId(principal), null);
    assert.equal(resolveWritableTenantCityId(principal, "curitiba-pr"), "curitiba-pr");
  });
});
