import { kId0 } from "fimidx-core/definitions/system";
import { addMember } from "fimidx-core/serverHelpers/index";
import { describe, expect, it } from "vitest";
import { createTestUserSession } from "../../helpers/auth.js";
import { apiFetch } from "../../helpers/http.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";

const GET_PROJECTS_PATH = "/api/projects/fetch";

describe("getProjectsEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(GET_PROJECTS_PATH, {
      method: "POST",
      body: { query: { orgId: "some-org" }, page: 1, limit: 10 },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no permission on org", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const orgOther = await createTestOrg({
      userId: "other-user-no-access",
      userEmail: "other@example.com",
    });
    await createTestProject({
      orgId: orgOther.orgId,
      by: "other-user-no-access",
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
    const res = await apiFetch(GET_PROJECTS_PATH, {
      method: "POST",
      body: { query: { orgId: orgOther.orgId }, page: 1, limit: 10 },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with projects when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({
      orgId,
      by: userId,
    });
    const res = await apiFetch(GET_PROJECTS_PATH, {
      method: "POST",
      body: { query: { orgId, id: { eq: projectId } }, page: 1, limit: 10 },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      projects: { id: string; name: string }[];
      page: number;
      limit: number;
      hasMore: boolean;
    };
    expect(Array.isArray(data.projects)).toBe(true);
    expect(typeof data.page).toBe("number");
    expect(typeof data.limit).toBe("number");
    expect(typeof data.hasMore).toBe("boolean");
    expect(data.projects.length).toBe(1);
    expect(data.projects[0].id).toBe(projectId);
  });
});
