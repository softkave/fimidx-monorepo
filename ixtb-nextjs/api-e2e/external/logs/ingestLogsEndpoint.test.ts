import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import {
  createTestOrg,
  createTestProject,
  createTestClientToken,
} from "../../helpers/setup.js";
import { bearerHeaders } from "../../helpers/auth.js";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";

const INGEST_LOGS_PATH = "/api/logs";

describe("ingestLogsEndpoint", () => {
  it("returns 401 when no Bearer auth", async () => {
    const res = await apiFetch(INGEST_LOGS_PATH, {
      method: "POST",
      body: {
        projectId: "some-project",
        logs: [{ message: "test" }],
      },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when token has no log:ingest permission", async () => {
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
        { entity: "client-token", action: kFimidxPermissions.log.read, target: projectId },
      ],
    });
    const res = await apiFetch(INGEST_LOGS_PATH, {
      method: "POST",
      body: { projectId, logs: [{ message: "test" }] },
      headers: bearerHeaders(bearerToken),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when Bearer has log:ingest permission", async () => {
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
        { entity: "client-token", action: kFimidxPermissions.log.ingest, target: projectId },
      ],
    });
    const res = await apiFetch(INGEST_LOGS_PATH, {
      method: "POST",
      body: { projectId, logs: [{ message: "e2e test log" }] },
      headers: bearerHeaders(bearerToken),
    });
    expect(res.status).toBe(200);
  });
});
