import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";

const GET_ORGS_PATH = "/api/orgs/fetch";

describe("getOrgsEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(`${GET_ORGS_PATH}?page=1&limit=10`, {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with orgs list when authenticated", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const res = await apiFetch(`${GET_ORGS_PATH}?page=1&limit=10`, {
      method: "POST",
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      orgs: unknown[];
      page: number;
      limit: number;
      hasMore: boolean;
    };
    expect(Array.isArray(data.orgs)).toBe(true);
    expect(typeof data.page).toBe("number");
    expect(typeof data.limit).toBe("number");
    expect(typeof data.hasMore).toBe("boolean");
  });
});
