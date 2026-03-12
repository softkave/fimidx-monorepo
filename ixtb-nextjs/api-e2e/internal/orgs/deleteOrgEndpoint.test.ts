import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg } from "../../helpers/setup.js";

describe("deleteOrgEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch("/api/orgs/some-org-id", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const orgOther = await createTestOrg({
      userId: "other-user-no-access",
      userEmail: "other@example.com",
    });
    const res = await apiFetch(`/api/orgs/${orgOther.orgId}`, {
      method: "DELETE",
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when user has permission and deletes org", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const res = await apiFetch(`/api/orgs/${orgId}`, {
      method: "DELETE",
      cookie,
    });
    expect(res.status).toBe(200);
  });
});
