import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";

const DELETE_PROJECTS_PATH = "/api/projects";

describe("deleteProjectsEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(DELETE_PROJECTS_PATH, {
      method: "DELETE",
      body: { query: { orgId: "some-org" } },
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
    const res = await apiFetch(DELETE_PROJECTS_PATH, {
      method: "DELETE",
      body: { query: { orgId: orgOther.orgId, id: { eq: projectId } } },
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
    const res = await apiFetch(DELETE_PROJECTS_PATH, {
      method: "DELETE",
      body: { query: { orgId, id: { eq: projectId } } },
      cookie,
    });
    expect(res.status).toBe(200);
  });
});
