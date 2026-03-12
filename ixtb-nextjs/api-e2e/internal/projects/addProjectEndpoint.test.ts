import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg } from "../../helpers/setup.js";

const ADD_PROJECT_PATH = "/api/projects";

describe("addProjectEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(ADD_PROJECT_PATH, {
      method: "POST",
      body: { orgId: "some-org", name: "Proj" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const res = await apiFetch(ADD_PROJECT_PATH, {
      method: "POST",
      body: { orgId: "some-org" },
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when user has no permission on org", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const orgOther = await createTestOrg({
      userId: "other-user-no-access",
      userEmail: "other@example.com",
    });
    const res = await apiFetch(ADD_PROJECT_PATH, {
      method: "POST",
      body: {
        orgId: orgOther.orgId,
        name: "Proj",
        description: "Desc",
      },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and creates project when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const name = `E2E Project ${Date.now()}`;
    const res = await apiFetch(ADD_PROJECT_PATH, {
      method: "POST",
      body: { orgId, name, description: "E2E project" },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { project: { id: string; name: string } };
    expect(data.project).toBeDefined();
    expect(data.project.name).toBe(name);
    expect(data.project.id).toBeDefined();
  });
});
