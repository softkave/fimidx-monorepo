import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addCallback } from "../addCallback.js";
import { addCallbackExecution } from "../addCallbackExecution.js";
import { getCallbackExecutions } from "../getCallbackExecutions.js";

const defaultProjectId = "test-project-getCallbackExecutions";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";
const defaultClientTokenId = "test-client-token";

// Test counter to ensure unique names
let testCounter = 0;

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

describe("getCallbackExecutions integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Clean up callbacks
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.callback,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });

      // Clean up callback executions
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.callbackExecution,
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
      // Clean up callbacks
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.callback,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });

      // Clean up callback executions
      await storage.bulkDelete({
        query: { metaQuery: { projectId: { eq: defaultProjectId } } },
        tag: kObjTags.callbackExecution,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no executions exist", async () => {
    // Create a callback but no executions
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it("returns executions with default pagination", async () => {
    // Create a callback
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Create two executions
    const executedAt1 = new Date(Date.now() - 1000);
    const executedAt2 = new Date();

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"status": "success"}',
      responseStatusCode: 200,
      executedAt: executedAt1,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: "Network error",
      responseHeaders: null,
      responseBody: null,
      responseStatusCode: 500,
      executedAt: executedAt2,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);

    // Verify executions are returned
    const successExecution = result.executions.find((e) => e.error === null);
    const errorExecution = result.executions.find(
      (e) => e.error === "Network error"
    );

    expect(successExecution).toBeDefined();
    expect(errorExecution).toBeDefined();
    expect(successExecution?.responseStatusCode).toBe(200);
    expect(errorExecution?.responseStatusCode).toBe(500);
  });

  it("handles pagination correctly", async () => {
    // Create a callback
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Create 5 executions
    for (let i = 1; i <= 5; i++) {
      await addCallbackExecution({
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        callbackId: callback.id,
        error: i % 2 === 0 ? "Error" : null,
        responseHeaders: { "content-type": "application/json" },
        responseBody: `{"execution": ${i}}`,
        responseStatusCode: i % 2 === 0 ? 500 : 200,
        executedAt: new Date(Date.now() + i * 1000), // Different timestamps
        clientTokenId: defaultClientTokenId,
        storage,
      });
    }

    // Test first page with limit 2
    const result1 = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
        page: 1,
        limit: 2,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result1.executions).toHaveLength(2);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.hasMore).toBe(true);

    // Test second page with limit 2
    const result2 = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
        page: 2,
        limit: 2,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result2.executions).toHaveLength(2);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.hasMore).toBe(true);

    // Test third page with limit 2
    const result3 = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
        page: 3,
        limit: 2,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result3.executions).toHaveLength(1);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
    expect(result3.hasMore).toBe(false);
  });

  it("sorts executions by executedAt when sort is provided", async () => {
    // Create a callback
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Create executions with different timestamps
    const executedAt1 = new Date(Date.now() - 2000);
    const executedAt2 = new Date(Date.now() - 1000);
    const executedAt3 = new Date();

    // Create executions in reverse order to test sorting
    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"execution": 3}',
      responseStatusCode: 200,
      executedAt: executedAt3,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Add a small delay to ensure different createdAt timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"execution": 2}',
      responseStatusCode: 200,
      executedAt: executedAt2,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Add a small delay to ensure different createdAt timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"execution": 1}',
      responseStatusCode: 200,
      executedAt: executedAt1,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Test ascending sort by executedAt (should be oldest first)
    const resultAsc = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
        sort: [{ field: "executedAt", direction: "asc" }],
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(resultAsc.executions).toHaveLength(3);
    // Should be sorted by executedAt ASC, so execution 1 (oldest) should be first
    expect(resultAsc.executions[0].responseBodyJson).toEqual({ execution: 1 });
    expect(resultAsc.executions[1].responseBodyJson).toEqual({ execution: 2 });
    expect(resultAsc.executions[2].responseBodyJson).toEqual({ execution: 3 });

    // Test descending sort by executedAt (should be newest first)
    const resultDesc = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
        sort: [{ field: "executedAt", direction: "desc" }],
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(resultDesc.executions).toHaveLength(3);
    // Should be sorted by executedAt DESC, so execution 3 (newest) should be first
    expect(resultDesc.executions[0].responseBodyJson).toEqual({ execution: 3 });
    expect(resultDesc.executions[1].responseBodyJson).toEqual({ execution: 2 });
    expect(resultDesc.executions[2].responseBodyJson).toEqual({ execution: 1 });
  });

  it("returns only executions for the specified callback", async () => {
    // Create two callbacks
    const callback1 = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const callback2 = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Create executions for both callbacks
    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback1.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"callback": 1}',
      responseStatusCode: 200,
      executedAt: new Date(),
      clientTokenId: defaultClientTokenId,
      storage,
    });

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback2.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"callback": 2}',
      responseStatusCode: 200,
      executedAt: new Date(),
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Get executions for callback1
    const result1 = await getCallbackExecutions({
      args: {
        callbackId: callback1.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result1.executions).toHaveLength(1);
    expect(result1.executions[0].callbackId).toBe(callback1.id);

    // Get executions for callback2
    const result2 = await getCallbackExecutions({
      args: {
        callbackId: callback2.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result2.executions).toHaveLength(1);
    expect(result2.executions[0].callbackId).toBe(callback2.id);
  });

  it("handles executions with different response types", async () => {
    // Create a callback
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Create executions with different response types
    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: { "content-type": "application/json" },
      responseBody: '{"data": "json"}',
      responseStatusCode: 200,
      executedAt: new Date(),
      clientTokenId: defaultClientTokenId,
      storage,
    });

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: { "content-type": "text/plain" },
      responseBody: "plain text response",
      responseStatusCode: 200,
      executedAt: new Date(),
      clientTokenId: defaultClientTokenId,
      storage,
    });

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: "Network timeout",
      responseHeaders: null,
      responseBody: null,
      responseStatusCode: null,
      executedAt: new Date(),
      clientTokenId: defaultClientTokenId,
      storage,
    });

    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(3);

    const jsonExecution = result.executions.find(
      (e) => e.responseBodyJson !== null
    );
    const textExecution = result.executions.find(
      (e) =>
        e.responseBodyJson === null &&
        e.responseBodyRaw === "plain text response"
    );
    const errorExecution = result.executions.find(
      (e) => e.error === "Network timeout"
    );

    expect(jsonExecution).toBeDefined();
    expect(jsonExecution?.responseBodyJson).toEqual({ data: "json" });

    expect(textExecution).toBeDefined();
    expect(textExecution?.responseBodyJson).toBeNull();

    expect(errorExecution).toBeDefined();
    expect(errorExecution?.responseBodyJson).toBeNull();
    expect(errorExecution?.responseBodyRaw).toBeNull();
  });

  it("handles empty query results for non-existent callback", async () => {
    const result = await getCallbackExecutions({
      args: {
        callbackId: "non-existent-callback-id",
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });
});
