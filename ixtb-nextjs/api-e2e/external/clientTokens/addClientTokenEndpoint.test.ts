import { kId0 } from "fimidx-core/definitions/system";
import { addMember } from "fimidx-core/serverHelpers/index";
import { describe, expect, it } from "vitest";
import { createTestUserSession } from "../../helpers/auth.js";
import { apiFetch } from "../../helpers/http.js";
import { createTestOrg, createTestProject } from "../../helpers/setup.js";

const ADD_CLIENT_TOKEN_PATH = "/api/client-tokens";

describe("addClientTokenEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(ADD_CLIENT_TOKEN_PATH, {
      method: "POST",
      body: {
        groupId: "some-org",
        projectId: "some-project",
        name: "Token",
      },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const res = await apiFetch(ADD_CLIENT_TOKEN_PATH, {
      method: "POST",
      body: { projectId: "proj" },
      cookie,
    });
    expect(res.status).toBe(400);
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
    const res = await apiFetch(ADD_CLIENT_TOKEN_PATH, {
      method: "POST",
      body: {
        groupId: orgOther.orgId,
        projectId,
        name: "Token",
      },
      cookie,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and creates client token when user has permission", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const name = `E2E Token ${Date.now()}`;
    const res = await apiFetch(ADD_CLIENT_TOKEN_PATH, {
      method: "POST",
      body: {
        groupId: orgId,
        projectId,
        name,
        description: "E2E token",
      },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      clientToken: { id: string; name: string };
    };
    expect(data.clientToken).toBeDefined();
    expect(data.clientToken.name).toBe(name);
    expect(data.clientToken.id).toBeDefined();
  });
});
