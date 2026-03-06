import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";

const GET_CLIENT_TOKENS_PATH = "/api/client-tokens/fetch";

describe("getClientTokensEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(GET_CLIENT_TOKENS_PATH, {
      method: "POST",
      body: {
        query: { projectId: "proj", groupId: "org" },
        page: 1,
        limit: 10,
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
    const res = await apiFetch(GET_CLIENT_TOKENS_PATH, {
      method: "POST",
      body: {
        query: { projectId, groupId: orgOther.orgId },
        page: 1,
        limit: 10,
      },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with client tokens when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const res = await apiFetch(GET_CLIENT_TOKENS_PATH, {
      method: "POST",
      body: {
        query: { projectId, groupId: orgId },
        page: 1,
        limit: 10,
      },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      clientTokens: unknown[];
      page: number;
      limit: number;
      hasMore: boolean;
    };
    expect(Array.isArray(data.clientTokens)).toBe(true);
    expect(typeof data.page).toBe("number");
    expect(typeof data.limit).toBe("number");
    expect(typeof data.hasMore).toBe("boolean");
  });
});
