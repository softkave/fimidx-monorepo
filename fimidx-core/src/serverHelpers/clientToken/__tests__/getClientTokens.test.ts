import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import type { GetClientTokensEndpointArgs } from "../../../definitions/clientToken.js";
import { kObjTags } from "../../../definitions/obj.js";
import { addClientToken } from "../addClientToken.js";
import { getClientTokens } from "../getClientTokens.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("getClientTokens integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "getClientTokens",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddClientTokenArgs(overrides: any = {}) {
    const testData = makeTestData({ testName: "token" });
    return {
      name: testData.tokenName,
      description: "Test description",
      meta: { key: "value" },
      permissions: [
        { action: "read", target: "document" },
        { action: "write", target: "settings" },
      ],
      projectId: overrides.projectId || projectId,
      groupId,
      ...overrides,
    };
  }

  async function createTestToken(name: string, overrides: any = {}) {
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

    // Clean up objFields for test project
    try {
      await db
        .delete(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, projectId),
            eq(objFieldsTable.tag, kObjTags.clientToken)
          )
        );
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanup();

    // Clean up objFields for test project
    try {
      await db
        .delete(objFieldsTable)
        .where(
          and(
            eq(objFieldsTable.projectId, projectId),
            eq(objFieldsTable.tag, kObjTags.clientToken)
          )
        );
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no tokens exist", async () => {
    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("retrieves all tokens for an project", async () => {
    // Create test tokens
    const token1 = await createTestToken("Token 1");
    const token2 = await createTestToken("Token 2");
    const token3 = await createTestToken("Token 3");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);

    // Verify all tokens are returned
    const tokenNames = result.clientTokens.map((t) => t.name).sort();
    expect(tokenNames).toEqual(["Token 1", "Token 2", "Token 3"].sort());
  });

  it("filters tokens by name", async () => {
    // Create test tokens
    await createTestToken("Apple Token");
    await createTestToken("Banana Token");
    await createTestToken("Cherry Token");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Apple Token",
        },
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].name).toBe("Apple Token");
  });

  it("filters tokens by name with in", async () => {
    // Create test tokens
    await createTestToken("Apple Token");
    await createTestToken("Banana Token");
    await createTestToken("Cherry Token");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          in: ["Apple Token", "Banana Token"],
        },
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(
      result.clientTokens.every((t) =>
        ["Apple Token", "Banana Token"].includes(t.name)
      )
    ).toBe(true);
  });

  it("filters tokens by meta field", async () => {
    // Create test tokens with different meta
    await createTestToken("Token 1", { meta: { type: "admin" } });
    await createTestToken("Token 2", { meta: { type: "user" } });
    await createTestToken("Token 3", { meta: { type: "admin" } });

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        meta: [
          {
            op: "eq",
            field: "type",
            value: "admin",
          },
        ],
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.clientTokens.every((t) => t.meta?.type === "admin")).toBe(
      true
    );
  });

  it("filters tokens by permission action", async () => {
    // Create test tokens with different permissions
    await createTestToken("Token 1", {
      permissions: [
        { action: "read", target: "document" },
        { action: "write", target: "settings" },
      ],
    });
    await createTestToken("Token 2", {
      permissions: [{ action: "read", target: "document" }],
    });
    await createTestToken("Token 3", {
      permissions: [{ action: "delete", target: "document" }],
    });

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        permissionAction: {
          in: ["read", "write"],
        },
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    // Verify that the returned tokens have read or write permissions
    expect(
      result.clientTokens.every((token) =>
        token.permissions?.some((permission) =>
          ["read", "write"].includes(permission.action as string)
        )
      )
    ).toBe(true);
  });

  it("filters tokens by permission target", async () => {
    // Create test tokens with different permissions
    await createTestToken("Token 1", {
      permissions: [{ action: "read", target: "document" }],
    });
    await createTestToken("Token 2", {
      permissions: [{ action: "write", target: "settings" }],
    });
    await createTestToken("Token 3", {
      permissions: [{ action: "read", target: "public" }],
    });

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        permissionTarget: {
          in: ["document", "settings"],
        },
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    // Verify that the returned tokens have document or settings as targets
    expect(
      result.clientTokens.every((token) =>
        token.permissions?.some((permission) =>
          ["document", "settings"].includes(permission.target as string)
        )
      )
    ).toBe(true);
  });

  it("filters tokens by multiple permission criteria", async () => {
    // Create test tokens with different permissions
    await createTestToken("Token 1", {
      permissions: [
        { action: "read", target: "document" },
      ],
    });
    await createTestToken("Token 2", {
      permissions: [
        { action: "write", target: "settings" },
      ],
    });
    await createTestToken("Token 3", {
      permissions: [
        { action: "write", target: "document" },
      ],
    });

    const args: GetClientTokensEndpointArgs = {
      query: {
        groupId,
        projectId: projectId,
        permissionAction: { eq: "read" },
        permissionTarget: { eq: "document" },
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].permissions?.[0].action).toBe("read");
    expect(result.clientTokens[0].permissions?.[0].target).toBe("document");
  });

  it("handles pagination correctly", async () => {
    // Create 5 test tokens
    for (let i = 1; i <= 5; i++) {
      await createTestToken(`Token ${i}`);
    }

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
      page: 1,
      limit: 2,
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
  });

  it("handles second page correctly", async () => {
    // Create 5 test tokens
    for (let i = 1; i <= 5; i++) {
      await createTestToken(`Token ${i}`);
    }

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
      page: 2,
      limit: 2,
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
  });

  it("handles last page correctly", async () => {
    // Create 5 test tokens
    for (let i = 1; i <= 5; i++) {
      await createTestToken(`Token ${i}`);
    }

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
      page: 3,
      limit: 2,
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(2);
  });

  it("sorts tokens by name ascending", async () => {
    // Insert the name field definition for sorting
    await insertNameFieldForSorting({
      projectId: projectId,
      groupId: groupId,
      tag: kObjTags.clientToken,
    });

    // Create test tokens in random order
    await createTestToken("Zebra Token");
    await createTestToken("Apple Token");
    await createTestToken("Banana Token");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
      sort: [
        {
          field: "name",
          direction: "asc",
        },
      ],
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(3);
    expect(result.clientTokens[0].name).toBe("Apple Token");
    expect(result.clientTokens[1].name).toBe("Banana Token");
    expect(result.clientTokens[2].name).toBe("Zebra Token");
  });

  it("sorts tokens by name descending", async () => {
    // Insert the name field definition for sorting
    await insertNameFieldForSorting({
      projectId: projectId,
      groupId: groupId,
      tag: kObjTags.clientToken,
    });

    // Create test tokens in random order
    await createTestToken("Apple Token");
    await createTestToken("Zebra Token");
    await createTestToken("Banana Token");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
      sort: [
        {
          field: "name",
          direction: "desc",
        },
      ],
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(3);
    expect(result.clientTokens[0].name).toBe("Zebra Token");
    expect(result.clientTokens[1].name).toBe("Banana Token");
    expect(result.clientTokens[2].name).toBe("Apple Token");
  });

  it("filters tokens by createdBy", async () => {
    // Create tokens with different creators
    await createTestToken("Token 1");
    await createTestToken("Token 2");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        createdBy: {
          eq: by,
        },
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.clientTokens.every((t) => t.createdBy === by)).toBe(true);
  });

  it("filters tokens by multiple criteria", async () => {
    // Create tokens with different characteristics
    await createTestToken("Admin Token", { meta: { type: "admin" } });
    await createTestToken("User Token", { meta: { type: "user" } });
    await createTestToken("Admin Token 2", { meta: { type: "admin" } });

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          in: ["Admin Token", "Admin Token 2"],
        },
        meta: [
          {
            op: "eq",
            field: "type",
            value: "admin",
          },
        ],
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.clientTokens.every((t) => t.name.includes("Admin"))).toBe(
      true
    );
    expect(result.clientTokens.every((t) => t.meta?.type === "admin")).toBe(
      true
    );
  });

  it("uses default pagination when not specified", async () => {
    // Create test tokens
    await createTestToken("Token 1");
    await createTestToken("Token 2");

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("filters tokens by projectId correctly", async () => {
    // Create tokens in different projects
    await createTestToken("Token 1 - getClientTokens", {
      projectId: "project1 - getClientTokens",
    });
    await createTestToken("Token 2 - getClientTokens", {
      projectId: "project2 - getClientTokens",
    });
    await createTestToken("Token 3 - getClientTokens", {
      projectId: "project1 - getClientTokens",
    });

    const args: GetClientTokensEndpointArgs = {
      query: {
        projectId: "project1 - getClientTokens",
        groupId,
      },
    };

    const result = await getClientTokens({
      args,
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(
      result.clientTokens.every(
        (t) => t.projectId === "project1 - getClientTokens"
      )
    ).toBe(true);
  });
});

// Helper function to insert objFields for the "name" field
async function insertNameFieldForSorting(params: {
  projectId: string;
  groupId: string;
  tag: string;
}) {
  const { projectId, groupId, tag } = params;
  const now = new Date();

  const nameField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId,
    groupId,
    tag,
    field: "name",
    path: "name",
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    fieldKeys: ["name"],
    fieldKeyTypes: ["string"],
    valueTypes: ["string"],
  };

  // Insert the field definition
  await db.insert(objFieldsTable).values(nameField);

  return nameField;
}
