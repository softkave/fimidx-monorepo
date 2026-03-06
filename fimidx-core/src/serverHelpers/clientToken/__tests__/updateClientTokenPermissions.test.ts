import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { addClientToken } from "../addClientToken.js";
import { addClientTokenPermissions } from "../addClientTokenPermissions.js";
import { updateClientTokenPermissions } from "../updateClientTokenPermissions.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("updateClientTokenPermissions integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "updateClientTokenPermissions",
  });

  const { projectId, groupId, by, byType } = testData;

  function makeAddClientTokenArgs(overrides: any = {}) {
    const testData = makeTestData({ testName: "token" });
    return {
      groupId,
      name: testData.tokenName,
      description: "Test description",
      projectId,
      permissions: [],
      ...overrides,
    };
  }

  function makeUpdateClientTokenPermissionsArgs(overrides: any = {}) {
    const testData = makeTestData({ testName: "permissions" });
    return {
      query: {
        id: `token-${testData.tokenName}`,
        groupId,
        projectId,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
      ...overrides,
    };
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

  it("updates permissions for a client token successfully", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add initial permissions
    await addClientTokenPermissions({
      by: by,
      byType: byType,
      groupId: groupId,
      projectId: projectId,
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
      clientTokenId: token.clientToken.id,
      storage,
    });

    // Update permissions
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: token.clientToken.id,
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        permissions: [
          {
            entity: "admin",
            action: "write",
            target: "settings",
          },
          {
            entity: "user",
            action: "delete",
            target: "document",
          },
        ],
      },
    });

    const result = await updateClientTokenPermissions({
      args: updateArgs,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken).toBeDefined();
    expect(result.clientToken.permissions).toBeDefined();
    expect(result.clientToken.permissions).toHaveLength(2);

    // Verify the updated permissions
    const permission1 = result.clientToken.permissions![0];
    const permission2 = result.clientToken.permissions![1];

    expect(permission1.entity).toBe(result.clientToken.id);
    expect(permission1.action).toBe("write");
    expect(permission1.target).toBe("settings");

    expect(permission2.entity).toBe(result.clientToken.id);
    expect(permission2.action).toBe("delete");
    expect(permission2.target).toBe("document");
  });

  it("throws error when client token not found", async () => {
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: "non-existent-token",
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        permissions: [
          {
            entity: "user",
            action: "read",
            target: "document",
          },
        ],
      },
    });

    await expect(
      updateClientTokenPermissions({
        args: updateArgs,
        by: by,
        byType: byType,
        storage,
      })
    ).rejects.toThrow("Client token not found");
  });

  it("handles empty permissions array", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add initial permissions
    await addClientTokenPermissions({
      by: by,
      byType: byType,
      groupId: groupId,
      projectId: projectId,
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
      clientTokenId: token.clientToken.id,
      storage,
    });

    // Update with empty permissions
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: token.clientToken.id,
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        permissions: [],
      },
    });

    const result = await updateClientTokenPermissions({
      args: updateArgs,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken).toBeDefined();
    expect(result.clientToken.permissions).toBeDefined();
    expect(result.clientToken.permissions).toHaveLength(0);
  });

  it("handles complex permission objects", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Update with complex permission objects
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: token.clientToken.id,
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        permissions: [
          {
            entity: { type: "user", id: "123" },
            action: { operation: "read", scope: "full" },
            target: { resource: "document", id: "456" },
          },
        ],
      },
    });

    const result = await updateClientTokenPermissions({
      args: updateArgs,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken).toBeDefined();
    expect(result.clientToken.permissions).toBeDefined();
    expect(result.clientToken.permissions).toHaveLength(1);

    const permission = result.clientToken.permissions![0];
    expect(permission.entity).toEqual(token.clientToken.id);
    expect(permission.action).toEqual({ operation: "read", scope: "full" });
    expect(permission.target).toEqual({ resource: "document", id: "456" });
  });
});
