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
import { checkClientTokenPermissions } from "../checkClientTokenPermissions.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("checkClientTokenPermissions integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "checkClientTokenPermissions",
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

  function makeAddClientTokenPermissionsArgs(overrides: any = {}) {
    const testData = makeTestData({ testName: "permissions" });
    return {
      by,
      byType,
      groupId,
      projectId,
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
      clientTokenId: `token-${testData.tokenName}`,
      ...overrides,
    };
  }

  function makeCheckClientTokenPermissionsArgs(overrides: any = {}) {
    return {
      projectId,
      clientTokenId: "test-token-id",
      groupId,
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
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

  it("returns true for permissions that exist", async () => {
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

    await addClientTokenPermissions(permissionsArgs);

    // Check if the client token has the permissions
    const checkArgs = makeCheckClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      items: [
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

    const result = await checkClientTokenPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].hasPermission).toBe(true);
    expect(result.results[1].hasPermission).toBe(true);
  });

  it("returns false for permissions that don't exist", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add some permissions to the client token
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    await addClientTokenPermissions(permissionsArgs);

    // Check for permissions that don't exist
    const checkArgs = makeCheckClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      items: [
        {
          entity: "user",
          action: "write",
          target: "document",
        },
        {
          entity: "admin",
          action: "delete",
          target: "settings",
        },
      ],
    });

    const result = await checkClientTokenPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].hasPermission).toBe(false);
    expect(result.results[1].hasPermission).toBe(false);
  });

  it("handles mixed permissions (some exist, some don't)", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add some permissions to the client token
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
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

    await addClientTokenPermissions(permissionsArgs);

    // Check for mixed permissions
    const checkArgs = makeCheckClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
        {
          entity: "user",
          action: "write",
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
          target: "settings",
        },
      ],
    });

    const result = await checkClientTokenPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(4);
    expect(result.results[0].hasPermission).toBe(true); // user:read:document
    expect(result.results[1].hasPermission).toBe(false); // user:write:document
    expect(result.results[2].hasPermission).toBe(true); // admin:write:settings
    expect(result.results[3].hasPermission).toBe(false); // admin:delete:settings
  });

  it("handles empty items array", async () => {
    const checkArgs = makeCheckClientTokenPermissionsArgs({
      items: [],
    });

    const result = await checkClientTokenPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(0);
  });

  it("handles object-based permission entities, actions, and targets", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add permissions with object-based entities, actions, and targets
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      permissions: [
        {
          entity: { type: "user", id: "123" },
          action: { operation: "read", scope: "full" },
          target: { resource: "document", id: "doc-1" },
        },
      ],
    });

    await addClientTokenPermissions(permissionsArgs);

    // Check for the same object-based permissions
    const checkArgs = makeCheckClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      items: [
        {
          entity: { type: "user", id: "123" },
          action: { operation: "read", scope: "full" },
          target: { resource: "document", id: "doc-1" },
        },
        {
          entity: { type: "user", id: "456" },
          action: { operation: "read", scope: "full" },
          target: { resource: "document", id: "doc-1" },
        },
      ],
    });

    const result = await checkClientTokenPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].hasPermission).toBe(true);
    expect(result.results[1].hasPermission).toBe(false);
  });

  it("handles different group IDs correctly", async () => {
    // First create a client token
    const tokenArgs = makeAddClientTokenArgs();
    const token = await addClientToken({
      args: tokenArgs,
      by: by,
      byType: byType,
      storage,
    });

    // Add permissions to the client token in the default group
    const permissionsArgs = makeAddClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      permissions: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    await addClientTokenPermissions(permissionsArgs);

    // Check for permissions in a different group
    const checkArgs = makeCheckClientTokenPermissionsArgs({
      clientTokenId: token.clientToken.id,
      groupId: "different-group",
      items: [
        {
          entity: "user",
          action: "read",
          target: "document",
        },
      ],
    });

    const result = await checkClientTokenPermissions({
      args: checkArgs,
      storage,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].hasPermission).toBe(false);
  });
});
