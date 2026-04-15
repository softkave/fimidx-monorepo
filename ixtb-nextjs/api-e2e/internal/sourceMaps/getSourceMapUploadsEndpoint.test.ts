import { describe, expect, it } from "vitest";
import { createTestUserSession } from "../../helpers/auth.js";
import { apiFetch } from "../../helpers/http.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";
import { kId0 } from "fimidx-core/definitions/system";
import { addMember } from "fimidx-core/serverHelpers/index";

const PATH = "/api/source-maps/uploads";

describe("getSourceMapUploadsEndpoint (internal)", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(`${PATH}?projectId=some-project`);
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
    const res = await apiFetch(`${PATH}?projectId=${projectId}`, { cookie });
    expect(res.status).toBe(403);
  });

  it("returns 200 with uploads when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const res = await apiFetch(`${PATH}?projectId=${projectId}`, { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { uploads: unknown[] };
    expect(Array.isArray(data.uploads)).toBe(true);
  });
});
