import { describe, expect, it } from "vitest";
import { apiFetch } from "../../helpers/http.js";
import { createTestUserSession } from "../../helpers/auth.js";

const ADD_ORG_PATH = "/api/orgs";

describe("addOrgEndpoint", () => {
  it("returns 401 when no auth", async () => {
    const res = await apiFetch(ADD_ORG_PATH, {
      method: "POST",
      body: { name: "Test Org", description: "Desc" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const res = await apiFetch(ADD_ORG_PATH, {
      method: "POST",
      body: {}, // missing name
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it("creates org and returns 200 when authenticated", async () => {
    const cookie = await createTestUserSession();
    if (!cookie) return;
    const name = `E2E Org ${Date.now()}`;
    const res = await apiFetch(ADD_ORG_PATH, {
      method: "POST",
      body: { name, description: "E2E test org" },
      cookie,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { org: { id: string; name: string } };
    expect(data.org).toBeDefined();
    expect(data.org.name).toBe(name);
    expect(data.org.id).toBeDefined();
  });
});
