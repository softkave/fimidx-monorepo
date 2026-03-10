import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DeleteCallbacksEndpointArgs } from "../../../definitions/callback.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addCallback } from "../addCallback.js";
import { deleteCallbacks } from "../deleteCallbacks.js";
import { getCallbacks } from "../getCallbacks.js";

const defaultProjectId = "test-project-deleteCallbacks";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";
const defaultClientTokenId = "test-client-token";

// Test counter to ensure unique names
let testCounter = 0;

function makeDeleteCallbacksArgs(
  overrides: Partial<DeleteCallbacksEndpointArgs> = {}
): DeleteCallbacksEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      ...overrides.query,
    },
    deleteMany: overrides.deleteMany,
  };
}

function makeAddCallbackArgs(overrides: any = {}) {
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

describe("deleteCallbacks integration", () => {
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

  it("deletes a single callback by id", async () => {
    // Create test callbacks
    const callback1 = await addCallback({
      args: makeTestCallbackArgs("Callback 1"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const callback2 = await addCallback({
      args: makeTestCallbackArgs("Callback 2"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(2);

    // Delete the first callback
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: callback1.id },
      },
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify only the second callback remains
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(1);
    expect(afterResult.callbacks[0].id).toBe(callback2.id);
  });

  it("deletes multiple callbacks by filter", async () => {
    // Create test callbacks
    await addCallback({
      args: makeTestCallbackArgs("GET Callback", { method: "GET" }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("POST Callback", { method: "POST" }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("Another GET Callback", { method: "GET" }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify all callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(3);

    // Delete all GET callbacks
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        method: { eq: "GET" },
      },
      deleteMany: true,
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify only POST callback remains
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(1);
    expect(afterResult.callbacks[0].method).toBe("POST");
  });

  it("deletes callbacks by name filter", async () => {
    // Create test callbacks
    const alphaCallback = await addCallback({
      args: makeTestCallbackArgs("Alpha Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const betaCallback = await addCallback({
      args: makeTestCallbackArgs("Beta Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(2);

    // Delete callback by name using the actual name from the created callback
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: alphaCallback.name },
      },
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify only Beta callback remains
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(1);
    expect(afterResult.callbacks[0].name).toBe(betaCallback.name);
  });

  it("deletes callbacks by url filter", async () => {
    // Create test callbacks
    await addCallback({
      args: makeTestCallbackArgs("Callback 1", {
        url: "https://api1.example.com/webhook",
      }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("Callback 2", {
        url: "https://api2.example.com/webhook",
      }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(2);

    // Delete callback by URL
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        url: { eq: "https://api1.example.com/webhook" },
      },
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify only second callback remains
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(1);
    expect(afterResult.callbacks[0].url).toBe(
      "https://api2.example.com/webhook"
    );
  });

  it("deletes callbacks by idempotency key", async () => {
    const uniqueKey = `test-key-${Date.now()}`;

    // Create test callbacks
    await addCallback({
      args: makeTestCallbackArgs("Callback 1", { idempotencyKey: uniqueKey }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("Callback 2", {
        idempotencyKey: "different-key",
      }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(2);

    // Delete callback by idempotency key
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        idempotencyKey: { eq: uniqueKey },
      },
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify only second callback remains
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(1);
    expect(afterResult.callbacks[0].idempotencyKey).toBe("different-key");
  });

  it("deletes all callbacks when no filter is provided and deleteMany is true", async () => {
    // Create test callbacks
    await addCallback({
      args: makeTestCallbackArgs("Callback 1"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("Callback 2"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify both callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(2);

    // Delete all callbacks
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
      },
      deleteMany: true,
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify no callbacks remain
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(0);
  });

  it("handles deletion of non-existent callback gracefully", async () => {
    // Try to delete a non-existent callback
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: "non-existent-id" },
      },
    });

    // This should not throw an error
    await expect(
      deleteCallbacks({
        ...deleteArgs,
        clientTokenId: defaultClientTokenId,
        storage,
      })
    ).resolves.not.toThrow();
  });

  it("deletes callbacks by multiple criteria", async () => {
    // Create test callbacks
    await addCallback({
      args: makeTestCallbackArgs("GET Callback", {
        method: "GET",
        url: "https://api.example.com/webhook",
      }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("POST Callback", {
        method: "POST",
        url: "https://api.example.com/webhook",
      }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("GET Different URL", {
        method: "GET",
        url: "https://different.example.com/webhook",
      }),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Verify all callbacks exist
    const beforeResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(beforeResult.callbacks).toHaveLength(3);

    // Delete callbacks by multiple criteria
    const deleteArgs = makeDeleteCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        method: { eq: "GET" },
        url: { eq: "https://api.example.com/webhook" },
      },
      deleteMany: true,
    });

    await deleteCallbacks({
      ...deleteArgs,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify only the matching callback was deleted
    const afterResult = await getCallbacks({
      args: {
        query: { projectId: defaultProjectId },
      },
      storage,
    });
    expect(afterResult.callbacks).toHaveLength(2);

    // Verify the remaining callbacks
    const remainingMethods = afterResult.callbacks.map((c) => c.method);
    const remainingUrls = afterResult.callbacks.map((c) => c.url);
    expect(remainingMethods).toContain("POST");
    expect(remainingMethods).toContain("GET");
    expect(remainingUrls).toContain("https://api.example.com/webhook");
    expect(remainingUrls).toContain("https://different.example.com/webhook");
  });
});
