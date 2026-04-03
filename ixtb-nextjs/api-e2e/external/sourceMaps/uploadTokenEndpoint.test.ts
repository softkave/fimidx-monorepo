import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { describe, expect, it } from "vitest";
import { bearerHeaders } from "../../helpers/auth.js";
import { apiFetch } from "../../helpers/http.js";
import {
  createTestClientToken,
  createTestOrg,
  createTestProject,
} from "../../helpers/setup.js";

const PATH = "/api/source-maps/upload-token";

describe("uploadTokenEndpoint (source maps)", () => {
  it("returns 401 when no Bearer auth", async () => {
    const res = await apiFetch(PATH, {
      method: "POST",
      body: { projectId: "p", repoIdentifier: "r", version: "v" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when token has no sourceMap:upload permission", async () => {
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const { bearerToken } = await createTestClientToken({
      projectId,
      groupId: orgId,
      by: userId,
      byType: kByTypes.user,
      permissions: [{ action: kFimidxPermissions.log.read, target: projectId }],
    });
    const res = await apiFetch(PATH, {
      method: "POST",
      body: { projectId, repoIdentifier: "repo", version: "v1" },
      headers: bearerHeaders(bearerToken),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with token and filePath when permission is present", async () => {
    const email = process.env.E2E_TEST_USER_EMAIL;
    const userId = process.env.E2E_TEST_USER_ID ?? email;
    if (!userId || !email) return;
    const { orgId } = await createTestOrg({ userId, userEmail: email });
    const { projectId } = await createTestProject({ orgId, by: userId });
    const { bearerToken } = await createTestClientToken({
      projectId,
      groupId: orgId,
      by: userId,
      byType: kByTypes.user,
      permissions: [
        { action: kFimidxPermissions.sourceMap.upload, target: projectId },
      ],
    });
    const repoIdentifier = `e2e_repo_${Date.now()}`;
    const version = `e2e_ver_${Date.now()}`;
    const res = await apiFetch(PATH, {
      method: "POST",
      body: { projectId, repoIdentifier, version },
      headers: bearerHeaders(bearerToken),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { token: string; filePath: string };
    expect(typeof data.token).toBe("string");
    expect(data.token.length).toBeGreaterThan(10);
    expect(typeof data.filePath).toBe("string");
    expect(data.filePath).toContain(projectId);
  });
});
