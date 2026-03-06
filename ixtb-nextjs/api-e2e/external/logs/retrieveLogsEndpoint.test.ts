import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";

const RETRIEVE_LOGS_PATH = "/api/logs/fetch";

describe("retrieveLogsEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(RETRIEVE_LOGS_PATH, {
      method: "POST",
      body: { query: { projectId: "some-project" }, page: 1, limit: 10 },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no permission on project", async () => {
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
    const res = await apiFetch(RETRIEVE_LOGS_PATH, {
      method: "POST",
      body: { query: { projectId }, page: 1, limit: 10 },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with logs when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const res = await apiFetch(RETRIEVE_LOGS_PATH, {
      method: "POST",
      body: { query: { projectId }, page: 1, limit: 10 },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      logs: unknown[];
      page: number;
      limit: number;
      hasMore: boolean;
    };
    expect(Array.isArray(data.logs)).toBe(true);
    expect(typeof data.page).toBe("number");
    expect(typeof data.limit).toBe("number");
    expect(typeof data.hasMore).toBe("boolean");
  });
});
