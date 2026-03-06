import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import {
  createTestOrg,
  createTestProject,
  createTestClientToken,
} from "../../helpers/setup.js";
import { kByTypes } from "fimidx-core/definitions/other";

const DELETE_CLIENT_TOKENS_PATH = "/api/client-tokens";

describe("deleteClientTokensEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(DELETE_CLIENT_TOKENS_PATH, {
      method: "DELETE",
      body: { query: { projectId: "proj", groupId: "org" } },
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
    const res = await apiFetch(DELETE_CLIENT_TOKENS_PATH, {
      method: "DELETE",
      body: {
        query: {
          projectId,
          groupId: orgOther.orgId,
          id: { eq: clientToken.id },
        },
      },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when user has permission and deletes", async () => {
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
    const res = await apiFetch(DELETE_CLIENT_TOKENS_PATH, {
      method: "DELETE",
      body: {
        query: {
          projectId,
          groupId: orgId,
          id: { eq: clientToken.id },
        },
      },
      cookie,
    });
    expect(res.status).toBe(200);
  });
});
