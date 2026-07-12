import { first } from "lodash-es";
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
import { getClientTokens } from "../getClientTokens.js";
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
        addPermissions: [{ action: "read", target: "document" }],
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
      permissions: [{ action: "read", target: "document" }],
      clientTokenId: token.clientToken.id,
      storage,
    });

    // Replace permissions: remove all then add new set
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: token.clientToken.id,
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        removeAllPermissions: true,
        addPermissions: [
          { action: "write", target: "settings" },
          { action: "delete", target: "document" },
        ],
      },
    });

    await updateClientTokenPermissions({
      args: updateArgs,
      by: by,
      byType: byType,
      storage,
    });

    const { clientTokens } = await getClientTokens({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: token.clientToken.id },
        },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(clientTokens);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toBeDefined();
    expect(updated!.permissions).toHaveLength(2);

    // Verify the updated permissions
    updated!.permissions!.sort((a, b) => String(a.action).localeCompare(String(b.action)));
    const permission1 = updated!.permissions![0];
    const permission2 = updated!.permissions![1];

    expect(permission1.entity).toBe(updated!.id);
    expect(permission1.action).toBe("delete");
    expect(permission1.target).toBe("document");

    expect(permission2.entity).toBe(updated!.id);
    expect(permission2.action).toBe("write");
    expect(permission2.target).toBe("settings");
  });

  it("throws error when client token not found", async () => {
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: "non-existent-token",
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        addPermissions: [{ action: "read", target: "document" }],
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
      permissions: [{ action: "read", target: "document" }],
      clientTokenId: token.clientToken.id,
      storage,
    });

    // Update with removeAllPermissions
    const updateArgs = makeUpdateClientTokenPermissionsArgs({
      query: {
        id: token.clientToken.id,
        groupId: groupId,
        projectId: projectId,
      },
      update: {
        removeAllPermissions: true,
      },
    });

    await updateClientTokenPermissions({
      args: updateArgs,
      by: by,
      byType: byType,
      storage,
    });

    const { clientTokens } = await getClientTokens({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: token.clientToken.id },
        },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(clientTokens);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toBeFalsy();
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
        addPermissions: [
          {
            action: { operation: "read", scope: "full" },
            target: { resource: "document", id: "456" },
          },
        ],
      },
    });

    await updateClientTokenPermissions({
      args: updateArgs,
      by: by,
      byType: byType,
      storage,
    });

    const { clientTokens } = await getClientTokens({
      args: {
        query: {
          projectId,
          groupId,
          id: { eq: token.clientToken.id },
        },
        includePermissions: true,
      },
      storage,
    });
    const updated = first(clientTokens);
    expect(updated).toBeDefined();
    expect(updated!.permissions).toBeDefined();
    expect(updated!.permissions).toHaveLength(1);

    const permission = updated!.permissions![0];
    expect(permission.entity).toEqual(token.clientToken.id);
    expect(permission.action).toEqual({ operation: "read", scope: "full" });
    expect(permission.target).toEqual({ resource: "document", id: "456" });
  });
});
