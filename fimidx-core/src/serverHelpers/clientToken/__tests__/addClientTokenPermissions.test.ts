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
  AddClientTokenPermissionsEndpointArgs,
} from "../../../definitions/clientToken.js";
import { addClientToken } from "../addClientToken.js";
import { addClientTokenPermissions } from "../addClientTokenPermissions.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("addClientTokenPermissions integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "addClientTokenPermissions",
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
      projectId,
      permissions: [],
      ...overrides,
    };
  }

  function makeAddClientTokenPermissionsArgs(
    overrides: Partial<AddClientTokenPermissionsEndpointArgs> = {}
  ): AddClientTokenPermissionsEndpointArgs {
    const testData = makeTestData({ testName: "permissions" });
    return {
      groupId,
      projectId,
      permissions: [
        {
          action: "read",
          target: "document",
        },
      ],
      clientTokenId: `token-${testData.tokenName}`,
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

  it("adds permissions to a client token successfully", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add permissions to the client token
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
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
    });

    const result = await addClientTokenPermissions({
      ...permissionsArgs,
      by,
      byType,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(2);

    // Verify the permissions are properly managed with client token-specific metadata
    const permission1 = result.permissions[0];
    const permission2 = result.permissions[1];

    expect(permission1.meta).toBeDefined();
    expect(permission1.meta?.__fimidx_managed_clientTokenId).toBe(
      token.clientToken.id
    );
    expect(permission1.meta?.__fimidx_managed_groupId).toBe(groupId);

    expect(permission2.meta).toBeDefined();
    expect(permission2.meta?.__fimidx_managed_clientTokenId).toBe(
      token.clientToken.id
    );
    expect(permission2.meta?.__fimidx_managed_groupId).toBe(groupId);

    // Entity is stored as client token id; action and target as-is
    expect(permission1.entity).toBe(token.clientToken.id);
    expect(permission1.action).toBe("read");
    expect(permission1.target).toBe("document");

    expect(permission2.entity).toBe(token.clientToken.id);
    expect(permission2.action).toBe("write");
    expect(permission2.target).toBe("settings");
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

    // Add empty permissions array
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      permissions: [],
    });

    const result = await addClientTokenPermissions({
      ...permissionsArgs,
      by,
      byType,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(0);
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

    // Add permissions with complex objects
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      permissions: [
        {
          action: { operation: "read", scope: "full" },
          target: { resource: "document", id: "456" },
        },
      ],
    });

    const result = await addClientTokenPermissions({
      ...permissionsArgs,
      by,
      byType,
    });

    expect(result.permissions).toBeDefined();
    expect(result.permissions).toHaveLength(1);

    const permission = result.permissions[0];
    expect(permission.meta).toBeDefined();
    expect(permission.meta?.__fimidx_managed_clientTokenId).toBe(
      token.clientToken.id
    );
    expect(permission.meta?.__fimidx_managed_groupId).toBe(groupId);

    // Entity is stored as client token id; object action/target keep clientTokenId key
    expect(permission.entity).toBe(token.clientToken.id);
    expect(permission.action).toHaveProperty(
      "__fimidx_managed_permission_action_clientTokenId"
    );
    expect(permission.target).toHaveProperty(
      "__fimidx_managed_permission_target_clientTokenId"
    );
  });

  it("handles multiple client tokens with different permissions", async () => {
    // Create two client tokens
    const token1Args = makeAddClientTokenArgs({ name: "Token 1" });
    const token1 = await addClientToken({
      args: token1Args,
      by: by,
      byType: byType,
      storage,
    });

    const token2Args = makeAddClientTokenArgs({ name: "Token 2" });
    const token2 = await addClientToken({
      args: token2Args,
      by: by,
      byType: byType,
      storage,
    });

    // Add different permissions to each token
    const permissions1Args = makeAddClientTokenPermissionsArgs({
      clientTokenId: token1.clientToken.id,
      permissions: [
        {
          action: "read",
          target: "document",
        },
      ],
    });

    const permissions2Args = makeAddClientTokenPermissionsArgs({
      clientTokenId: token2.clientToken.id,
      permissions: [
        {
          action: "write",
          target: "settings",
        },
      ],
    });

    const result1 = await addClientTokenPermissions({
      ...permissions1Args,
      by,
      byType,
    });
    const result2 = await addClientTokenPermissions({
      ...permissions2Args,
      by,
      byType,
    });

    expect(result1.permissions).toHaveLength(1);
    expect(result2.permissions).toHaveLength(1);

    // Verify permissions are isolated between tokens
    expect(result1.permissions[0].meta?.__fimidx_managed_clientTokenId).toBe(
      token1.clientToken.id
    );
    expect(result2.permissions[0].meta?.__fimidx_managed_clientTokenId).toBe(
      token2.clientToken.id
    );
  });
});
