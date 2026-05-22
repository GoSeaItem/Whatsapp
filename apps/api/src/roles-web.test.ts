import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Role management web page wiring", () => {
  it("renders the Roles entry and disables role writes for non-owner users", async () => {
    const app = await readFile(new URL("../../web/src/App.tsx", import.meta.url), "utf8");

    expect(app).toContain('navButton("roles", "角色")');
    expect(app).toContain("function renderRoles()");
    expect(app).toContain('selectedOrganization?.currentUserRole !== "owner"');
    expect(app).toContain("getRoles");
    expect(app).toContain("createRole");
    expect(app).toContain("updateRole");
    expect(app).toContain("deleteRole");
  });
});
