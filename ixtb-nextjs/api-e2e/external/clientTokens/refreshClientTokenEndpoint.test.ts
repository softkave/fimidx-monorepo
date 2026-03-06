import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import {
  createTestOrg,
  createTestProject,
  createTestClientToken,
} from "../../helpers/setup.js";
import { bearerHeaders } from "../../helpers/auth.js";
import { kByTypes } from "fimidx-core/definitions/other";
import { encodeClientTokenJWT } from "fimidx-core/serverHelpers/index";

const REFRESH_PATH = "/api/client-tokens/refresh";

describe("refreshClientTokenEndpoint", () => {
  it("returns 401 when no Bearer auth", async () => {
    const res = await apiFetch(REFRESH_PATH, {
      method: "POST",
      body: { refreshToken: "some-refresh-token" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with new tokens when Bearer has refresh token", async () => {
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
    const { token: bearerToken, refreshToken } = await encodeClientTokenJWT({
      id: clientToken.id,
      groupId: clientToken.groupId,
      projectId: clientToken.projectId,
      args: { id: clientToken.id, refresh: true },
    });
    if (!refreshToken) throw new Error("expected refreshToken");
    const res = await apiFetch(REFRESH_PATH, {
      method: "POST",
      body: { refreshToken },
      headers: bearerHeaders(bearerToken),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { token: string; refreshToken: string };
    expect(data.token).toBeDefined();
    expect(data.refreshToken).toBeDefined();
  });
});
