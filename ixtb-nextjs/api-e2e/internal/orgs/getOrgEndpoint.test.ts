import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg } from "../../helpers/setup.js";

describe("getOrgEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch("/api/orgs/some-org-id", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent org", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const res = await apiFetch("/api/orgs/non-existent-org-id-12345", {
      method: "GET",
      cookie,
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user has no permission on org", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const orgOther = await createTestOrg({
      userId: "other-user-id-with-no-access",
      userEmail: "other@example.com",
    });
    const res = await apiFetch(`/api/orgs/${orgOther.orgId}`, {
      method: "GET",
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with org when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId, name } = await createTestOrg({ userId, userEmail: email });
    const res = await apiFetch(`/api/orgs/${orgId}`, {
      method: "GET",
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { org: { id: string; name: string } };
    expect(data.org).toBeDefined();
    expect(data.org.id).toBe(orgId);
    expect(data.org.name).toBe(name);
  });
});
