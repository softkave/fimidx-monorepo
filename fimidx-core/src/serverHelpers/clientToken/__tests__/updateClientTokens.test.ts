import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { UpdateClientTokensEndpointArgs } from "../../../definitions/clientToken.js";
import type { IPermissionAtom } from "../../../definitions/permission.js";
import { addClientToken } from "../addClientToken.js";
import { getClientTokens } from "../getClientTokens.js";
import { updateClientTokens } from "../updateClientTokens.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("updateClientTokens integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "updateClientTokens",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddClientTokenArgs(overrides: any = {}) {
    const testData = makeTestData({ testName: "token" });
    return {
      groupId,
      name: testData.tokenName,
      description: "Test description",
      meta: { key: "value" },
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
        {
          entity: "admin",
          action: "write",
          target: "settings",
        },
      ],
      projectId: overrides.projectId || projectId,
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
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanup();
  });

  it("updates a single token by name", async () => {
    // Create a test token
    const token = await createTestToken("Original Token", {
      description: "Original description",
      meta: { type: "user" },
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    // First, let's verify the token was created with 1 permission
    const beforeUpdate = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          name: {
            eq: "Original Token",
          },
        },
        includePermissions: true,
      },
      storage,
    });

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Original Token",
        },
      },
      update: {
        name: "Updated Token",
        description: "Updated description",
        meta: { type: "admin" },
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
          {
            entity: "admin",
            action: "write",
            target: "settings",
          },
          {
            entity: "admin",
            action: "delete",
            target: "document",
          },
        ],
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify the update
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          name: {
            eq: "Updated Token",
          },
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    const updatedToken = result.clientTokens[0];
    expect(updatedToken.name).toBe("Updated Token");
    expect(updatedToken.description).toBe("Updated description");
    expect(updatedToken.meta).toEqual({ type: "admin" });
    expect(updatedToken.permissions).toHaveLength(3);
    updatedToken.permissions?.sort(
      (a: IPermissionAtom, b: IPermissionAtom) =>
        String(a.entity).localeCompare(String(b.entity)) ||
        String(a.action).localeCompare(String(b.action)) ||
        String(a.target).localeCompare(String(b.target))
    );
    expect(updatedToken.permissions![0].entity).toBe("admin");
    expect(updatedToken.permissions![0].action).toBe("delete");
    expect(updatedToken.permissions![0].target).toBe("document");
    expect(updatedToken.permissions![1].entity).toBe("admin");
    expect(updatedToken.permissions![1].action).toBe("write");
    expect(updatedToken.permissions![1].target).toBe("settings");
    expect(updatedToken.permissions![2].entity).toBe("user");
    expect(updatedToken.permissions![2].action).toBe("read");
    expect(updatedToken.permissions![2].target).toBe("document");
    expect(updatedToken.updatedBy).toBe(by);
    expect(updatedToken.updatedByType).toBe(byType);
  });

  it("updates multiple tokens when updateMany is true", async () => {
    // Create multiple test tokens
    await createTestToken("Token 1", { meta: { type: "user" } });
    await createTestToken("Token 2", { meta: { type: "user" } });
    await createTestToken("Token 3", { meta: { type: "admin" } });

    const args: UpdateClientTokensEndpointArgs = {
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
      update: {
        meta: { type: "updated", status: "active" },
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
          {
            entity: "admin",
            action: "write",
            target: "settings",
          },
        ],
      },
      updateMany: true,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify the updates
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          meta: [
            {
              op: "eq",
              field: "type",
              value: "updated",
            },
          ],
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(2);
    expect(result.clientTokens.every((t) => t.meta?.type === "updated")).toBe(
      true
    );
    expect(result.clientTokens.every((t) => t.meta?.status === "active")).toBe(
      true
    );
    expect(
      result.clientTokens.every((t) =>
        t.permissions?.some((p) => p.entity === "user" && p.action === "read")
      )
    ).toBe(true);
    expect(
      result.clientTokens.every((t) =>
        t.permissions?.some((p) => p.entity === "admin" && p.action === "write")
      )
    ).toBe(true);
  });

  it("updates only one token when updateMany is false", async () => {
    // Create multiple test tokens
    await createTestToken("Token 1", { meta: { type: "user" } });
    await createTestToken("Token 2", { meta: { type: "user" } });

    const args: UpdateClientTokensEndpointArgs = {
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
      update: {
        meta: { type: "updated" },
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only one token was updated
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          meta: [
            {
              op: "eq",
              field: "type",
              value: "updated",
            },
          ],
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
  });

  it("updates token by id", async () => {
    // Create a test token
    const token = await createTestToken("Test Token");

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        id: {
          eq: token.id,
        },
      },
      update: {
        name: "Updated by ID",
        description: "Updated via ID query",
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify the update
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          id: {
            eq: token.id,
          },
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].name).toBe("Updated by ID");
    expect(result.clientTokens[0].description).toBe("Updated via ID query");
  });

  it("updates token by createdBy", async () => {
    // Create a test token
    await createTestToken("Test Token");

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        createdBy: {
          eq: by,
        },
      },
      update: {
        meta: { updated: "true" },
      },
      updateMany: true,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify the update
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          meta: [
            {
              op: "eq",
              field: "updated",
              value: "true",
            },
          ],
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens.length).toBeGreaterThan(0);
    expect(result.clientTokens.every((t) => t.meta?.updated === "true")).toBe(
      true
    );
  });

  it("updates only specific fields", async () => {
    // Create a test token
    const token = await createTestToken("Test Token", {
      description: "Original description",
      meta: { type: "user" },
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Test Token",
        },
      },
      update: {
        description: "Updated description only",
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only the description was updated
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          name: {
            eq: "Test Token",
          },
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    const updatedToken = result.clientTokens[0];
    expect(updatedToken.name).toBe("Test Token"); // Unchanged
    expect(updatedToken.description).toBe("Updated description only"); // Changed
    expect(updatedToken.meta).toEqual({ type: "user" }); // Unchanged
    expect(updatedToken.permissions).toHaveLength(1);
    expect(updatedToken.permissions![0].entity).toBe("user");
    expect(updatedToken.permissions![0].action).toBe("read");
    expect(updatedToken.permissions![0].target).toBe("document");
  });

  it("updates meta field completely", async () => {
    // Create a test token with complex meta
    const token = await createTestToken("Test Token", {
      meta: { type: "user", status: "active", nested: { key: "value" } },
    });

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Test Token",
        },
      },
      update: {
        meta: { newType: "admin", newStatus: "inactive" },
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify meta was completely replaced
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          name: {
            eq: "Test Token",
          },
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].meta).toEqual({
      newType: "admin",
      newStatus: "inactive",
    });
  });

  it("updates permissions field", async () => {
    // Create a test token
    const token = await createTestToken("Test Token", {
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Test Token",
        },
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
          {
            entity: "admin",
            action: "write",
            target: "settings",
          },
          {
            entity: "admin",
            action: "delete",
            target: "document",
          },
        ],
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify permissions were updated
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          name: {
            eq: "Test Token",
          },
        },
        includePermissions: true,
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].permissions).toHaveLength(3);
    result.clientTokens[0].permissions?.sort(
      (a: IPermissionAtom, b: IPermissionAtom) =>
        String(a.entity).localeCompare(String(b.entity)) ||
        String(a.action).localeCompare(String(a.action)) ||
        String(a.target).localeCompare(String(b.target))
    );
    expect(result.clientTokens[0].permissions![0].entity).toBe("admin");
    expect(result.clientTokens[0].permissions![0].action).toBe("delete");
    expect(result.clientTokens[0].permissions![0].target).toBe("document");
    expect(result.clientTokens[0].permissions![1].entity).toBe("admin");
    expect(result.clientTokens[0].permissions![1].action).toBe("write");
    expect(result.clientTokens[0].permissions![1].target).toBe("settings");
    expect(result.clientTokens[0].permissions![2].entity).toBe("user");
    expect(result.clientTokens[0].permissions![2].action).toBe("read");
    expect(result.clientTokens[0].permissions![2].target).toBe("document");
  });

  it("sets permissions to null", async () => {
    // Create a test token
    const token = await createTestToken("Test Token", {
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
        {
          entity: "admin",
          action: "write",
          target: "settings",
        },
      ],
    });

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: projectId,
        groupId,
        name: {
          eq: "Test Token",
        },
      },
      update: {
        permissions: undefined,
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify permissions were set to null
    const result = await getClientTokens({
      args: {
        query: {
          projectId: projectId,
          groupId,
          name: {
            eq: "Test Token",
          },
        },
      },
      storage,
    });

    expect(result.clientTokens).toHaveLength(1);
    expect(result.clientTokens[0].permissions).toBeNull();
  });

  it("updates tokens across different projects", async () => {
    // Create tokens in different projects
    await createTestToken("Token 1 - updateClientTokens", {
      projectId: "project1",
    });
    await createTestToken("Token 2 - updateClientTokens", {
      projectId: "project2",
    });

    const args: UpdateClientTokensEndpointArgs = {
      query: {
        projectId: "project1",
        groupId,
        name: {
          eq: "Token 1 - updateClientTokens",
        },
      },
      update: {
        meta: { updated: "true" },
      },
      updateMany: false,
    };

    await updateClientTokens({
      args,
      by: by,
      byType: byType,
      storage,
    });

    // Verify only the token in project1 was updated
    const result1 = await getClientTokens({
      args: {
        query: {
          projectId: "project1",
          groupId,
        },
      },
      storage,
    });

    const result2 = await getClientTokens({
      args: {
        query: {
          projectId: "project2",
          groupId,
        },
      },
      storage,
    });

    expect(result1.clientTokens[0].meta?.updated).toBe("true");
    expect(result2.clientTokens[0].meta?.updated).toBeUndefined();
  });
});
