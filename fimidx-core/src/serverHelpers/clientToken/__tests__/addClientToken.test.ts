import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { AddClientTokenEndpointArgs } from "../../../definitions/clientToken.js";
import { addClientToken } from "../addClientToken.js";
import { createTestSetup, makeTestData } from "./testUtils.js";

describe("addClientToken integration", () => {
  const { storage, cleanup, testData } = createTestSetup({
    testName: "addClientToken",
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
      ...overrides,
    };
  }

  // Helper function to create tokens with specific names for testing
  function makeTestTokenArgs(name: string, overrides: any = {}) {
    const testData = makeTestData({ testName: "token" });
    return {
      name: `${name}_${testData.tokenName}`,
      description: "Test description",
      projectId,
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

  it("verifies test isolation by checking empty state", async () => {
    // This test verifies that our cleanup is working
    // We can't easily check for empty state in addClientToken tests since we need to create tokens to test
    // But we can verify that each test starts with a clean slate by checking that duplicate names work
    const args = makeAddClientTokenArgs({
      name: "Isolation Test Token",
    });

    // First token creation should succeed
    const result1 = await addClientToken({
      args,
      by,
      byType,
      storage,
    });

    expect(result1.clientToken).toBeDefined();
    expect(result1.clientToken.name).toBe("Isolation Test Token");

    // Second token with same name should fail due to conflict
    await expect(
      addClientToken({
        args,
        by,
        byType,
        storage,
      })
    ).rejects.toThrow("Failed to add client token");
  });

  it("creates a new client token successfully", async () => {
    const args = makeAddClientTokenArgs({
      name: "My Test Token",
      description: "A test token description",
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
    });

    const result = await addClientToken({
      args,
      by,
      byType,
      storage,
    });

    expect(result.clientToken).toBeDefined();
    expect(result.clientToken.name).toBe("My Test Token");
    expect(result.clientToken.description).toBe("A test token description");
    expect(result.clientToken.permissions).toHaveLength(3);
    expect(result.clientToken.permissions![0].entity).toBe("user");
    expect(result.clientToken.permissions![0].action).toBe("read");
    expect(result.clientToken.permissions![0].target).toBe("document");
    expect(result.clientToken.projectId).toBe(projectId);
    expect(result.clientToken.createdBy).toBe(by);
    expect(result.clientToken.createdByType).toBe(byType);
    expect(result.clientToken.id).toBeDefined();
    expect(result.clientToken.createdAt).toBeInstanceOf(Date);
    expect(result.clientToken.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a token with minimal required fields", async () => {
    const args = makeAddClientTokenArgs({
      name: "Minimal Token",
      description: undefined,
      meta: undefined,
      permissions: undefined,
    });

    const result = await addClientToken({
      args,
      by,
      byType,
      storage,
    });

    expect(result.clientToken).toBeDefined();
    expect(result.clientToken.name).toBe("Minimal Token");
    expect(result.clientToken.description).toBeUndefined();
    expect(result.clientToken.meta).toBeUndefined();
    expect(result.clientToken.permissions).toBeNull();
  });

  it("fails when trying to create a token with duplicate name in same project", async () => {
    const args = makeAddClientTokenArgs({
      name: "Duplicate Name Token",
    });

    // First token creation should succeed
    const result1 = await addClientToken({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result1.clientToken).toBeDefined();
    expect(result1.clientToken.name).toBe("Duplicate Name Token");

    // Second token with same name should fail due to conflict
    await expect(
      addClientToken({
        args,
        by: by,
        byType: byType,
        storage,
      })
    ).rejects.toThrow("Failed to add client token");
  });

  it("allows tokens with same name in different projects", async () => {
    const args1 = makeAddClientTokenArgs({
      name: "Same Name Token",
      projectId: "project1",
    });

    const args2 = makeAddClientTokenArgs({
      name: "Same Name Token",
      projectId: "project2",
    });

    // Both tokens should succeed since they're in different projects
    const result1 = await addClientToken({
      args: args1,
      by: by,
      byType: byType,
      storage,
    });

    const result2 = await addClientToken({
      args: args2,
      by: by,
      byType: byType,
      storage,
    });

    expect(result1.clientToken.name).toBe("Same Name Token");
    expect(result1.clientToken.projectId).toBe("project1");
    expect(result2.clientToken.name).toBe("Same Name Token");
    expect(result2.clientToken.projectId).toBe("project2");
  });

  it("generates name when not provided", async () => {
    const args = makeAddClientTokenArgs({
      name: undefined,
    });

    const result = await addClientToken({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken.name).toMatch(/^token-\d+-\d+-\d+-\d+$/);
  });

  it("handles meta field correctly", async () => {
    const meta = {
      key1: "value1",
      key2: "123",
      nested: "bar",
    };

    const args = makeAddClientTokenArgs({
      meta,
    });

    const result = await addClientToken({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken.meta).toEqual(meta);
  });

  it("handles permissions field correctly", async () => {
    const permissions = [
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
        action: "admin",
        target: "system",
      },
    ];

    const args = makeAddClientTokenArgs({
      permissions,
    });

    const result = await addClientToken({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken.permissions).toHaveLength(3);
    expect(result.clientToken.permissions![0].entity).toBe("user");
    expect(result.clientToken.permissions![0].action).toBe("read");
    expect(result.clientToken.permissions![0].target).toBe("document");
  });

  it("sets null permissions when not provided", async () => {
    const args = makeAddClientTokenArgs({
      permissions: undefined,
    });

    const result = await addClientToken({
      args,
      by: by,
      byType: byType,
      storage,
    });

    expect(result.clientToken.permissions).toBeNull();
  });
});
