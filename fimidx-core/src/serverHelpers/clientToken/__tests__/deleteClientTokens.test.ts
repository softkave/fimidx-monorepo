import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type {
  AddClientTokenEndpointArgs,
  DeleteClientTokensEndpointArgs,
  IClientToken,
} from "../../../definitions/clientToken.js";
import { addClientToken } from "../addClientToken.js";
import { deleteClientTokens } from "../deleteClientTokens.js";
import { getClientTokens } from "../getClientTokens.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("deleteClientTokens integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "deleteClientTokens",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddClientTokenArgs(
    overrides: Partial<AddClientTokenEndpointArgs> = {}
  ): AddClientTokenEndpointArgs {
    const testData = makeTestData({ testName: "token" });
    return {
      groupId,
      name: testData.tokenName,
      description: "Test description",
      meta: { key: "value" },
      permissions: [
        {
          action: "read",
          target: "document",
        },
        {
          action: "write",
          target: "settings",
        },
      ],
      projectId: overrides.projectId || projectId,
      ...overrides,
    };
  }

  async function createTestToken(
    name: string,
    overrides: Partial<AddClientTokenEndpointArgs> = {}
  ): Promise<IClientToken> {
    const args = makeAddClientTokenArgs({
      name,
      ...overrides,
    });

    const result = await addClientToken({
      args,
      by,
      byType,
      storage,
    });

    return result.clientToken;
  }

  beforeAll(async () => {
    // Storage is already created by createTestSetup
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanup();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanup();
  });

  it("deletes a single token by name", async () => {
    // Create a test token
    const token = await createTestToken("Token to Delete");

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Token to Delete",
        },
      },
      deleteMany: false,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify the token was deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(0);
  });

  it("deletes multiple tokens when deleteMany is true", async () => {
    // Create multiple test tokens
    await createTestToken("Token 1", { meta: { type: "user" } });
    await createTestToken("Token 2", { meta: { type: "user" } });
    await createTestToken("Token 3", { meta: { type: "admin" } });

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        meta: [
          {
            op: "eq",
            field: "type",
            value: "user",
          },
        ],
      },
      deleteMany: true,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only user tokens were deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].meta?.type).toBe("admin");
  });

  it("deletes only one token when deleteMany is false", async () => {
    // Create multiple test tokens
    await createTestToken("Token 1", { meta: { type: "user" } });
    await createTestToken("Token 2", { meta: { type: "user" } });

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId,
        groupId,
        meta: [
          {
            op: "eq",
            field: "type",
            value: "user",
          },
        ],
      },
      deleteMany: false,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only one token was deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
  });

  it("deletes token by id", async () => {
    // Create a test token
    const token = await createTestToken("Test Token");

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        id: {
          eq: token.id,
        },
      },
      deleteMany: false,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify the token was deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(0);
  });

  it("deletes tokens by createdBy", async () => {
    // Create test tokens
    await createTestToken("Token 1");
    await createTestToken("Token 2");

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        createdBy: {
          eq: by,
        },
      },
      deleteMany: true,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify all tokens were deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(0);
  });

  it("deletes tokens by multiple criteria", async () => {
    // Create tokens with different characteristics
    await createTestToken("Admin Token", {
      meta: { type: "admin", status: "active" },
    });
    await createTestToken("User Token", {
      meta: { type: "user", status: "active" },
    });
    await createTestToken("Admin Token 2", {
      meta: { type: "admin", status: "inactive" },
    });

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        meta: [
          {
            op: "eq",
            field: "type",
            value: "admin",
          },
          {
            op: "eq",
            field: "status",
            value: "active",
          },
        ],
      },
      deleteMany: true,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only admin tokens with active status were deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(
      result.clientTokens.every(
        (t) => !(t.meta?.type === "admin" && t.meta?.status === "active")
      )
    ).toBe(true);
  });

  it("deletes tokens across different projects", async () => {
    // Create tokens in different projects
    await createTestToken("Token 1 - deleteClientTokens - across projects", {
      projectId: "project1 - deleteClientTokens - across projects",
    });
    await createTestToken("Token 2 - deleteClientTokens - across projects", {
      projectId: "project2 - deleteClientTokens - across projects",
    });

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: "project1 - deleteClientTokens - across projects",
        groupId,
        name: {
          eq: "Token 1 - deleteClientTokens - across projects",
        },
      },
      deleteMany: false,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only the token in project1 was deleted
    const result1 = await getClientTokens({
      args: {
        query: {
          projectId: "project1 - deleteClientTokens - across projects",
          groupId,
        },
      },
      storage,
    });

    const result2 = await getClientTokens({
      args: {
        query: {
          projectId: "project2 - deleteClientTokens - across projects",
          groupId,
        },
      },
      storage,
    });

    expect(result1.clientTokens).toHaveLength(0);
    expect(result2.clientTokens).toHaveLength(1);
  });

  it("deletes tokens by name pattern", async () => {
    // Create tokens with different names
    await createTestToken("Admin Token 1");
    await createTestToken("Admin Token 2");
    await createTestToken("User Token 1");

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          in: ["Admin Token 1", "Admin Token 2"],
        },
      },
      deleteMany: true,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only admin tokens were deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].name).toBe("User Token 1");
  });

  it("deletes tokens by date range", async () => {
    // Create tokens at different times
    const token1 = await createTestToken("Token 1");
    const token2 = await createTestToken("Token 2");
    const token3 = await createTestToken("Token 3");

    // Get the creation time of the second token
    const targetTime = token2.createdAt;

    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        createdAt: {
          eq: targetTime.toISOString(),
        },
      },
      deleteMany: true,
    };

    await deleteClientTokens({
      ...args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only the token with matching creation time was deleted
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.clientTokens.every((t) => t.id !== token2.id)).toBe(true);
  });

  it("handles deletion of non-existent tokens gracefully", async () => {
    const args: DeleteClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Non-existent Token",
        },
      },
      deleteMany: false,
    };

    // This should not throw an error
    await expect(
      deleteClientTokens({
        ...args,
        by: by,
        byType: byType,
        storage,
      })
    ).resolves.not.toThrow();
  });
});
