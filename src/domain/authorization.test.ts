import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReportItem, UserRole } from "../types";
import {
  canAuditAllSectors,
  canDispatchWorkOrders,
  canExecuteWorkOrders,
  canManageAccounts,
  maskCitizenData,
} from "./authorization";

const roles: UserRole[] = ["user", "funcionario", "supervisor", "diretor", "admin"];

function report(overrides: Partial<ReportItem> = {}): ReportItem {
  return {
    id: "report-test-1",
    title: "Buraco na via",
    description: "Relato fictício para teste",
    category: "Pavimentação",
    address: "Rua Fictícia, 1",
    latitude: -25.4,
    longitude: -49.2,
    status: "unresolved",
    user_id: "citizen-test-1",
    user_email: "citizen@example.invalid",
    user_name: "Cidadão de Teste",
    image_url: "data:image/png;base64,test-only",
    ...overrides,
  };
}

describe("application role capabilities", () => {
  it("keeps the existing capability matrix for every role", () => {
    for (const role of roles) {
      assert.equal(canManageAccounts(role), role === "admin");
      assert.equal(canAuditAllSectors(role), role === "admin" || role === "diretor");
      assert.equal(canDispatchWorkOrders(role), role === "admin" || role === "supervisor");
      assert.equal(
        canExecuteWorkOrders(role),
        role === "admin" || role === "supervisor" || role === "funcionario",
      );
    }
  });
});

describe("citizen data masking", () => {
  it("preserves the existing unmasked report for admins", () => {
    const source = report();
    assert.strictEqual(maskCitizenData(source, "admin"), source);
  });

  it("removes citizen identifiers for directors, supervisors, employees, and citizens", () => {
    const source = report();

    for (const role of ["diretor", "supervisor", "funcionario", "user"] as const) {
      const visible = maskCitizenData(source, role);
      assert.equal(visible.user_email, undefined, `${role} must not receive reporter email`);
      assert.equal(visible.user_id, undefined, `${role} must not receive reporter id`);
      if (role === "diretor") {
        // Existing policy intentionally leaves the reporter's display name visible to directors.
        assert.equal(visible.user_name, source.user_name);
      } else {
        assert.equal(visible.user_name, "Cidadão");
      }
    }
  });

  it("hides the image and identifies an anonymous report as anonymous for citizens and directors", () => {
    const source = report({ anonymous: true });

    for (const role of ["diretor", "user"] as const) {
      const visible = maskCitizenData(source, role);
      assert.equal(visible.user_name, "Cidadão Anônimo");
      assert.equal(visible.image_url, undefined);
      assert.equal(visible.user_email, undefined);
      assert.equal(visible.user_id, undefined);
    }
  });

  it("uses the generic citizen label when no viewer role is supplied", () => {
    const visible = maskCitizenData(report(), undefined);

    assert.equal(visible.user_name, "Cidadão");
    assert.equal(visible.user_email, undefined);
    assert.equal(visible.user_id, undefined);
  });
});
