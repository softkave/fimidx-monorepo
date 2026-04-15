import { kByTypes } from "fimidx-core/definitions/other";
import { kId0 } from "fimidx-core/definitions/system";
import { addMember } from "fimidx-core/serverHelpers/index";
import { describe, expect, it } from "vitest";
import { createTestUserSession } from "../../helpers/auth.js";
import { apiFetch } from "../../helpers/http.js";
import {
  createTestClientToken,
  createTestOrg,
  createTestProject,
} from "../../helpers/setup.js";

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
