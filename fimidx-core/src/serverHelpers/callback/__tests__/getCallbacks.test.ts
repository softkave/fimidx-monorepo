import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import type { GetCallbacksEndpointArgs } from "../../../definitions/callback.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addCallback } from "../addCallback.js";
import { getCallbacks } from "../getCallbacks.js";

const defaultProjectId = "test-project-getCallbacks";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeGetCallbacksArgs(
  overrides: Partial<GetCallbacksEndpointArgs> = {}
): GetCallbacksEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      ...overrides.query,
    },
    page: overrides.page,
    limit: overrides.limit,
    sort: overrides.sort,
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

// Helper function to insert objFields for the "name" field
async function insertNameFieldForSorting(params: {
  projectId: string;
  groupId: string;
  tag: string;
}) {
  const { projectId, groupId, tag } = params;
  const now = new Date();

  const nameField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId,
    groupId,
    tag,
    field: "name",
    path: "name",
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    fieldKeys: ["name"],
    fieldKeyTypes: ["string"],
    valueTypes: ["string"],
  };

  // Insert the field definition
  await db.insert(objFieldsTable).values(nameField);

  return nameField;
}

describe("getCallbacks integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Delete all callbacks for all test groups using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-getCallbacks-1",
        "test-project-getCallbacks-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.callback,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test groups
      for (const projectId of testProjectIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, projectId),
              eq(objFieldsTable.groupId, defaultGroupId),
              eq(objFieldsTable.tag, kObjTags.callback)
            )
          );
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  afterEach(async () => {
    // Clean up after each test using hard deletes for complete isolation
    try {
      // Delete all callbacks for all test groups using hard deletes
      const testProjectIds = [
        defaultProjectId,
        "test-project-getCallbacks-1",
        "test-project-getCallbacks-2",
      ];
      for (const projectId of testProjectIds) {
        await storage.bulkDelete({
          query: { projectId },
          tag: kObjTags.callback,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test groups
      for (const projectId of testProjectIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, projectId),
              eq(objFieldsTable.groupId, defaultGroupId),
              eq(objFieldsTable.tag, kObjTags.callback)
            )
          );
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no callbacks exist", async () => {
    const args = makeGetCallbacksArgs();

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it("returns callbacks with default pagination", async () => {
    // Create test callbacks
    const callback1 = await addCallback({
      args: makeTestCallbackArgs("First Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const callback2 = await addCallback({
      args: makeTestCallbackArgs("Second Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetCallbacksArgs();

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);

    // Verify callbacks are returned
    const callbackIds = result.callbacks.map((c) => c.id);
    expect(callbackIds).toContain(callback1.id);
    expect(callbackIds).toContain(callback2.id);
  });

  it("filters callbacks by name", async () => {
    // Create test callbacks with exact names (no unique suffixes)
    await addCallback({
      args: {
        projectId: defaultProjectId,
        url: "https://example.com/webhook",
        method: "POST",
        name: "Alpha Callback",
        description: "Test description",
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: {
        projectId: defaultProjectId,
        url: "https://example.com/webhook",
        method: "POST",
        name: "Beta Callback",
        description: "Test description",
      },
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Alpha Callback" },
      },
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(1);
    expect(result.callbacks[0].name).toBe("Alpha Callback");
  });

  it("filters callbacks by method", async () => {
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

    const args = makeGetCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        method: { eq: "GET" },
      },
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(1);
    expect(result.callbacks[0].method).toBe("GET");
  });

  it("filters callbacks by url", async () => {
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

    const args = makeGetCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        url: { eq: "https://api1.example.com/webhook" },
      },
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(1);
    expect(result.callbacks[0].url).toBe("https://api1.example.com/webhook");
  });

  it("filters callbacks by idempotency key", async () => {
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

    const args = makeGetCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        idempotencyKey: { eq: uniqueKey },
      },
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(1);
    expect(result.callbacks[0].idempotencyKey).toBe(uniqueKey);
  });

  it("handles pagination correctly", async () => {
    // Create 5 test callbacks
    for (let i = 1; i <= 5; i++) {
      await addCallback({
        args: makeTestCallbackArgs(`Callback ${i}`),
        projectId: defaultProjectId,
        groupId: defaultGroupId,
        by: defaultBy,
        byType: defaultByType,
        storage,
      });
    }

    // Test first page with limit 2
    const args1 = makeGetCallbacksArgs({
      page: 1,
      limit: 2,
    });

    const result1 = await getCallbacks({ args: args1, storage });

    expect(result1.callbacks).toHaveLength(2);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.hasMore).toBe(true);

    // Test second page with limit 2
    const args2 = makeGetCallbacksArgs({
      page: 2,
      limit: 2,
    });

    const result2 = await getCallbacks({ args: args2, storage });

    expect(result2.callbacks).toHaveLength(2);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.hasMore).toBe(true);

    // Test third page with limit 2
    const args3 = makeGetCallbacksArgs({
      page: 3,
      limit: 2,
    });

    const result3 = await getCallbacks({ args: args3, storage });

    expect(result3.callbacks).toHaveLength(1);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
    expect(result3.hasMore).toBe(false);
  });

  it("sorts callbacks by name when objFields are set up", async () => {
    // Set up objFields for name sorting
    await insertNameFieldForSorting({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      tag: kObjTags.callback,
    });

    // Create test callbacks
    await addCallback({
      args: makeTestCallbackArgs("Charlie Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("Alpha Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    await addCallback({
      args: makeTestCallbackArgs("Beta Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    const args = makeGetCallbacksArgs({
      sort: [{ field: "name", direction: "asc" }],
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(3);
    expect(result.callbacks[0].name).toContain("Alpha");
    expect(result.callbacks[1].name).toContain("Beta");
    expect(result.callbacks[2].name).toContain("Charlie");
  });

  it("filters callbacks by multiple criteria", async () => {
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

    const args = makeGetCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        method: { eq: "GET" },
        url: { eq: "https://api.example.com/webhook" },
      },
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toHaveLength(1);
    expect(result.callbacks[0].method).toBe("GET");
    expect(result.callbacks[0].url).toBe("https://api.example.com/webhook");
  });

  it("handles empty query results", async () => {
    // Create a callback
    await addCallback({
      args: makeTestCallbackArgs("Test Callback"),
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    // Query for non-existent callback
    const args = makeGetCallbacksArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Non-existent Callback" },
      },
    });

    const result = await getCallbacks({ args, storage });

    expect(result.callbacks).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });
});
