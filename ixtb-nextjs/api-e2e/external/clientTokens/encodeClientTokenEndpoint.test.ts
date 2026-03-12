import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession, bearerHeaders } from "../../helpers/auth.js";
import {
  createTestOrg,
  createTestProject,
  createTestClientToken,
} from "../../helpers/setup.js";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";

describe("encodeClientTokenEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch("/api/client-tokens/some-token-id/encode", {
      method: "POST",
      body: { id: "some-token-id", projectId: "some-project-id" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no permission on token", async () => {
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
    const res = await apiFetch(
      `/api/client-tokens/${clientToken.id}/encode`,
      {
        method: "POST",
        body: { id: clientToken.id, projectId },
        cookie,
      }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with token when user has permission", async () => {
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
    const res = await apiFetch(
      `/api/client-tokens/${clientToken.id}/encode`,
      {
        method: "POST",
        body: { id: clientToken.id, projectId },
        cookie,
      }
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { token: string; refreshToken?: string };
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe("string");
  });

  it("returns 200 with JWT when using Bearer token with permission", async () => {
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const { clientToken, bearerToken } = await createTestClientToken({
      projectId,
      groupId: orgId,
      by: userId,
      byType: kByTypes.user,
      permissions: [
        {
          action: kFimidxPermissions.clientToken.read,
          target: projectId,
        },
      ],
    });
    const res = await apiFetch(
      `/api/client-tokens/${clientToken.id}/encode`,
      {
        method: "POST",
        body: { id: clientToken.id, projectId },
        headers: bearerHeaders(bearerToken),
      }
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { token: string };
    expect(data.token).toBeDefined();
  });
});
