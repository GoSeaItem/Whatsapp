import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSION_KEYS, ROLE_PERMISSION_MATRIX } from "./permissions.js";

describe("V4-D advanced permission matrix", () => {
  it("gives owner every permission", () => {
    for (const permission of PERMISSION_KEYS) {
      expect(hasPermission("owner", permission)).toBe(true);
    }
  });

  it("limits manager, sales and support according to default V4-D rules", () => {
    expect(hasPermission("manager", "organization.delete")).toBe(false);
    expect(hasPermission("manager", "export.sensitiveFields")).toBe(false);
    expect(hasPermission("manager", "report.viewTeam")).toBe(true);
    expect(hasPermission("sales", "report.viewTeam")).toBe(false);
    expect(hasPermission("sales", "customer.viewOwn")).toBe(true);
    expect(hasPermission("sales", "customer.viewTeam")).toBe(false);
    expect(hasPermission("support", "export.create")).toBe(false);
    expect(hasPermission("support", "quote.create")).toBe(false);
    expect(ROLE_PERMISSION_MATRIX.support.has("followup.create")).toBe(true);
  });
});
