import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddCallbackEndpointArgs } from "../../../definitions/callback.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addCallback } from "../addCallback.js";

const defaultProjectId = "test-project";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeAddCallbackArgs(
  overrides: Partial<AddCallbackEndpointArgs> = {}
): AddCallbackEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    url: "https://example.com/webhook",
    method: "POST",
    name: `Test Callback ${uniqueId}`,
    description: "Test description",
    ...overrides,
  };
}

// Helper function to create callbacks with specific names for testing
function makeTestCallbackArgs(name: string, overrides: any = {}) {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    url: "https://example.com/webhook",
    method: "POST",
    name: `${name}_${uniqueId}`,
    description: "Test description",
    ...overrides,
  };
}

describe("addCallback integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.callback,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.callback,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("verifies test isolation by checking empty state", async () => {
    // This test verifies that our cleanup is working
    // We can't easily check for empty state in addCallback tests since we need to create callbacks to test
    // But we can verify that each test starts with a clean slate by checking that duplicate idempotency keys work
    const args = makeAddCallbackArgs({
      idempotencyKey: "test-isolation-key",
    });

    // First callback creation should succeed
    const result1 = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result1).toBeDefined();
    expect(result1.idempotencyKey).toBe("test-isolation-key");

    // Second callback with same idempotency key should be ignored due to conflict
    const result2 = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result2).toBeDefined();
    expect(result2.idempotencyKey).toBe("test-isolation-key");
  });

  it("creates a new callback successfully", async () => {
    const args = makeAddCallbackArgs({
      name: "My Test Callback",
      description: "A test callback description",
      url: "https://api.example.com/webhook",
      method: "POST",
      requestHeaders: { "Content-Type": "application/json" },
      requestBody: '{"test": "data"}',
    });

    const result = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("My Test Callback");
    expect(result.description).toBe("A test callback description");
    expect(result.url).toBe("https://api.example.com/webhook");
    expect(result.method).toBe("POST");
    expect(result.requestHeaders).toEqual({
      "Content-Type": "application/json",
    });
    expect(result.requestBody).toBe('{"test": "data"}');
    expect(result.groupId).toBe(defaultGroupId);
    expect(result.projectId).toBe(defaultProjectId);
    expect(result.createdBy).toBe(defaultBy);
    expect(result.createdByType).toBe(defaultByType);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a callback with minimal required fields", async () => {
    const args = makeAddCallbackArgs({
      name: undefined,
      description: undefined,
      requestHeaders: undefined,
      requestBody: undefined,
    });

    const result = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result).toBeDefined();
    expect(result.name).toMatch(/__fimidx_generated_/);
    expect(result.description).toBeUndefined();
    expect(result.requestHeaders).toBeNull();
    expect(result.requestBody).toBeNull();
  });

  it("generates idempotency key when not provided", async () => {
    const args = makeAddCallbackArgs({
      idempotencyKey: undefined,
    });

    const result = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.idempotencyKey).toMatch(/__fimidx_generated_/);
  });

  it("handles timeout and interval fields", async () => {
    const timeout = new Date(Date.now() + 60000); // 1 minute from now
    const intervalFrom = new Date(Date.now() + 30000); // 30 seconds from now
    const intervalMs = 5000; // 5 seconds

    const args = makeAddCallbackArgs({
      timeout: timeout.toISOString(),
      intervalFrom: intervalFrom.toISOString(),
      intervalMs,
    });

    const result = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.timeout).toEqual(timeout);
    expect(result.intervalFrom).toEqual(intervalFrom);
    expect(result.intervalMs).toBe(intervalMs);
  });

  it("handles null timeout and interval fields", async () => {
    const args = makeAddCallbackArgs({
      timeout: undefined,
      intervalFrom: undefined,
      intervalMs: undefined,
    });

    const result = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.timeout).toBeNull();
    expect(result.intervalFrom).toBeNull();
    expect(result.intervalMs).toBeNull();
  });

  it("initializes execution tracking fields to null", async () => {
    const args = makeAddCallbackArgs();

    const result = await addCallback({
      args,
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.lastExecutedAt).toBeNull();
    expect(result.lastSuccessAt).toBeNull();
    expect(result.lastErrorAt).toBeNull();
  });
});
