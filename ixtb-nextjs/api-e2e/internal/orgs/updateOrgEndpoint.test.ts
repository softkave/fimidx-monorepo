import { kId0 } from "fimidx-core/definitions/system";
import { addMember } from "fimidx-core/serverHelpers/index";
import { describe, expect, it } from "vitest";
import { createTestUserSession } from "../../helpers/auth.js";
import { apiFetch } from "../../helpers/http.js";
import { createTestOrg } from "../../helpers/setup.js";

describe("updateOrgEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch("/api/orgs/some-org-id", {
      method: "PATCH",
      body: { name: "New Name" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const res = await apiFetch(`/api/orgs/${orgId}`, {
      method: "PATCH",
      body: { name: 123 },
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when user has no permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const orgOther = await createTestOrg({
      userId: "other-user-no-access",
      userEmail: "other@example.com",
    });
    await addMember({
      by: "other-user-no-access",
      byType: "user",
      args: {
        groupId: orgOther.orgId,
        projectId: kId0,
        meta: {
          userId: process.env.E2E_TEST_USER_EMAIL,
        },
      },
    });
    const res = await apiFetch(`/api/orgs/${orgOther.orgId}`, {
      method: "PATCH",
      body: { name: "Hacked" },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and updates org when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const newName = `Updated Org ${Date.now()}`;
    const res = await apiFetch(`/api/orgs/${orgId}`, {
      method: "PATCH",
      body: { name: newName },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean };
    expect(data.success).toBe(true);
  });
});
