import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addCallback } from "../addCallback.js";
import { addCallbackExecution } from "../addCallbackExecution.js";
import { getCallbackExecutions } from "../getCallbackExecutions.js";

const defaultProjectId = "test-project-addCallbackExecution";
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

describe("addCallbackExecution integration", () => {
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
        query: { projectId: defaultProjectId },
        tag: kObjTags.callback,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });

      // Clean up callback executions
      await storage.bulkDelete({
        query: { projectId: defaultProjectId },
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
        query: { projectId: defaultProjectId },
        tag: kObjTags.callback,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });

      // Clean up callback executions
      await storage.bulkDelete({
        query: { projectId: defaultProjectId },
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

  it("creates a callback execution successfully", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();
    const responseHeaders = { "content-type": "application/json" };
    const responseBody = '{"status": "success"}';
    const responseStatusCode = 200;

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders,
      responseBody,
      responseStatusCode,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.callbackId).toBe(callback.id);
    expect(execution.error).toBeNull();
    expect(execution.responseHeaders).toEqual(responseHeaders);
    expect(execution.responseBodyRaw).toBe(responseBody);
    expect(execution.responseStatusCode).toBe(responseStatusCode);
    expect(execution.executedAt).toEqual(executedAt);
    expect(execution.responseBodyJson).toEqual({ status: "success" });
  });

  it("creates a callback execution with error", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();
    const error = "Network timeout";

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error,
      responseHeaders: null,
      responseBody: null,
      responseStatusCode: null,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.callbackId).toBe(callback.id);
    expect(execution.error).toBe(error);
    expect(execution.responseHeaders).toBeNull();
    expect(execution.responseBodyRaw).toBeNull();
    expect(execution.responseStatusCode).toBeNull();
    expect(execution.executedAt).toEqual(executedAt);
    expect(execution.responseBodyJson).toBeNull();
  });

  it("handles JSON response body correctly", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();
    const responseHeaders = { "content-type": "application/json" };
    const responseBody = '{"data": {"id": 123, "name": "test"}}';

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders,
      responseBody,
      responseStatusCode: 200,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created with parsed JSON
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.responseBodyJson).toEqual({
      data: { id: 123, name: "test" },
    });
  });

  it("handles non-JSON response body correctly", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();
    const responseHeaders = { "content-type": "text/plain" };
    const responseBody = "Hello, World!";

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders,
      responseBody,
      responseStatusCode: 200,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created with null JSON
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.responseBodyJson).toBeNull();
    expect(execution.responseBodyRaw).toBe(responseBody);
  });

  it("handles case-insensitive content-type detection", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();
    const responseHeaders = { "Content-Type": "APPLICATION/JSON" };
    const responseBody = '{"test": "data"}';

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders,
      responseBody,
      responseStatusCode: 200,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created with parsed JSON
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.responseBodyJson).toEqual({ test: "data" });
  });

  it("handles invalid JSON gracefully", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();
    const responseHeaders = { "content-type": "application/json" };
    const responseBody = '{"invalid": json}'; // Invalid JSON

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders,
      responseBody,
      responseStatusCode: 200,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created with null JSON due to parsing error
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.responseBodyJson).toBeNull();
    expect(execution.responseBodyRaw).toBe(responseBody);
  });

  it("creates multiple executions for the same callback", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt1 = new Date(Date.now() - 1000);
    const executedAt2 = new Date();

    // Create first execution
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

    // Create second execution
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

    // Verify both executions were created
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(2);

    // Verify the executions are different
    const successExecution = result.executions.find((e) => e.error === null);
    const errorExecution = result.executions.find(
      (e) => e.error === "Network error"
    );

    expect(successExecution).toBeDefined();
    expect(errorExecution).toBeDefined();
    expect(successExecution?.responseStatusCode).toBe(200);
    expect(errorExecution?.responseStatusCode).toBe(500);
  });

  it("handles null and undefined values correctly", async () => {
    // Create a callback first
    const callback = await addCallback({
      args: makeAddCallbackArgs(),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const executedAt = new Date();

    await addCallbackExecution({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      callbackId: callback.id,
      error: null,
      responseHeaders: null,
      responseBody: null,
      responseStatusCode: null,
      executedAt,
      clientTokenId: defaultClientTokenId,
      storage,
    });

    // Verify the execution was created with null values
    const result = await getCallbackExecutions({
      args: {
        callbackId: callback.id,
      },
      projectId: defaultProjectId,
      storage,
    });

    expect(result.executions).toHaveLength(1);
    const execution = result.executions[0];
    expect(execution.error).toBeNull();
    expect(execution.responseHeaders).toBeNull();
    expect(execution.responseBodyRaw).toBeNull();
    expect(execution.responseStatusCode).toBeNull();
    expect(execution.responseBodyJson).toBeNull();
  });
});
