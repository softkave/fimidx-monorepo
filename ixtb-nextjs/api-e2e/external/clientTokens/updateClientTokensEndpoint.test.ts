import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import {
  createTestOrg,
  createTestProject,
  createTestClientToken,
} from "../../helpers/setup.js";
import { kByTypes } from "fimidx-core/definitions/other";

const UPDATE_CLIENT_TOKENS_PATH = "/api/client-tokens";

describe("updateClientTokensEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(UPDATE_CLIENT_TOKENS_PATH, {
      method: "PATCH",
      body: {
        query: { projectId: "proj", groupId: "org" },
        update: { name: "New" },
      },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const orgOther = await createTestOrg({
      userId: "other-user-no-access",
      userEmail: "other@example.com",
    });
    const { projectId } = await createTestProject({
      orgId: orgOther.orgId,
      by: "other-user-no-access",
    });
    const { clientToken } = await createTestClientToken({
      projectId,
      groupId: orgOther.orgId,
      by: "other-user-no-access",
      byType: kByTypes.user,
    });
    const res = await apiFetch(UPDATE_CLIENT_TOKENS_PATH, {
      method: "PATCH",
      body: {
        query: {
          projectId,
          groupId: orgOther.orgId,
          id: { eq: clientToken.id },
        },
        update: { name: "Hacked" },
      },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const { clientToken } = await createTestClientToken({
      projectId,
      groupId: orgId,
      by: userId,
      byType: kByTypes.user,
    });
    const newName = `Updated ${Date.now()}`;
    const res = await apiFetch(UPDATE_CLIENT_TOKENS_PATH, {
      method: "PATCH",
      body: {
        query: {
          projectId,
          groupId: orgId,
          id: { eq: clientToken.id },
        },
        update: { name: newName },
      },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean };
    expect(data.success).toBe(true);
  });
});
