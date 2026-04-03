import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";

const PATH = "/api/source-maps/config";

describe("symbolicationConfig endpoints (internal)", () => {
  it("GET returns 401 when no auth", async () => {
    const res = await apiFetch(`${PATH}?projectId=some-project`);
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when no auth", async () => {
    const res = await apiFetch(PATH, {
      method: "PATCH",
      body: {
        projectId: "some-project",
        fieldsToSymbolicate: ["stack"],
        repoIdFields: ["repo"],
        versionFields: ["version"],
      },
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
    const res = await apiFetch(`${PATH}?projectId=${projectId}`, { cookie });
    expect(res.status).toBe(403);
  });

  it("PATCH returns 400 on invalid body", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const res = await apiFetch(PATH, { method: "PATCH", body: { x: 1 }, cookie });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 204 and GET reflects updated config when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });

    const patchRes = await apiFetch(PATH, {
      method: "PATCH",
      body: {
        projectId,
        fieldsToSymbolicate: ["stack"],
        repoIdFields: ["repo"],
        versionFields: ["version"],
      },
      cookie,
    });
    expect(patchRes.status).toBe(204);

    const getRes = await apiFetch(`${PATH}?projectId=${projectId}`, { cookie });
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as { config: any };
    expect(data.config).toBeTruthy();
    expect(Array.isArray(data.config.fieldsToSymbolicate)).toBe(true);
  });
});

