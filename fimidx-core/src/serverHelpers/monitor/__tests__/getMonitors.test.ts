import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, objFields as objFieldsTable } from "../../../db/fimidx.sqlite.js";
import type {
  AddMonitorEndpointArgs,
  GetMonitorsEndpointArgs,
} from "../../../definitions/monitor.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMonitor } from "../addMonitor.js";
import { getMonitors } from "../getMonitors.js";

const defaultProjectId = "test-project-getMonitors";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeGetMonitorsArgs(
  overrides: Partial<GetMonitorsEndpointArgs> = {}
): GetMonitorsEndpointArgs {
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

function makeAddMonitorArgs(
  overrides: Partial<AddMonitorEndpointArgs> = {}
): AddMonitorEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  return {
    projectId: defaultProjectId,
    name: `Test Monitor ${uniqueId}`,
    description: "Test description",
    status: "enabled",
    reportsTo: ["user1", "user2"],
    interval: { days: 1 },
    query: [{ op: "eq", field: "level", value: "error" }],
    ...overrides,
  };
}

// Helper function to insert objFields for the "name" field
async function insertNameFieldForSorting(params: {
  groupId: string;
  tag: string;
}) {
  const { groupId, tag } = params;
  const now = new Date();

  const nameField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId: defaultProjectId,
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

// Helper function to insert objFields for the "status" field
async function insertStatusFieldForSorting(params: {
  groupId: string;
  tag: string;
}) {
  const { groupId, tag } = params;
  const now = new Date();

  const statusField = {
    id: uuidv7(),
    createdAt: now,
    updatedAt: now,
    projectId: defaultProjectId,
    groupId,
    tag,
    field: "status",
    path: "status",
    type: "string",
    arrayTypes: [],
    isArrayCompressed: false,
    fieldKeys: ["status"],
    fieldKeyTypes: ["string"],
    valueTypes: ["string"],
  };

  // Insert the field definition
  await db.insert(objFieldsTable).values(statusField);

  return statusField;
}

describe("getMonitors integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    // Test will use the default storage type from createDefaultStorage()
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    // Clean up test data before each test using hard deletes for complete isolation
    try {
      // Delete all monitors for all test groups using hard deletes
      const testGroupIds = [
        defaultGroupId,
        "test-group-getMonitors-1",
        "test-group-getMonitors-2",
      ];
      for (const groupId of testGroupIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: defaultProjectId } } },
          tag: kObjTags.monitor,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test groups
      for (const groupId of testGroupIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, defaultProjectId),
              eq(objFieldsTable.groupId, groupId),
              eq(objFieldsTable.tag, kObjTags.monitor)
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
      // Delete all monitors for all test groups using hard deletes
      const testGroupIds = [
        defaultGroupId,
        "test-group-getMonitors-1",
        "test-group-getMonitors-2",
      ];
      for (const groupId of testGroupIds) {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: defaultProjectId } } },
          tag: kObjTags.monitor,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true, // Use hard delete for test cleanup
        });
      }

      // Clean up objFields for test groups
      for (const groupId of testGroupIds) {
        await db
          .delete(objFieldsTable)
          .where(
            and(
              eq(objFieldsTable.projectId, defaultProjectId),
              eq(objFieldsTable.groupId, groupId),
              eq(objFieldsTable.tag, kObjTags.monitor)
            )
          );
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("returns empty array when no monitors exist", async () => {
    const args = makeGetMonitorsArgs();

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it("returns all monitors when no filters are applied", async () => {
    // Create test monitors
    const monitor1 = await addMonitor({
      args: makeAddMonitorArgs({ name: "Monitor 1" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const monitor2 = await addMonitor({
      args: makeAddMonitorArgs({ name: "Monitor 2" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs();

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(2);
    expect(result.monitors.map((m) => m.name)).toContain("Monitor 1");
    expect(result.monitors.map((m) => m.name)).toContain("Monitor 2");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });

  it("filters monitors by name", async () => {
    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({ name: "Error Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({ name: "Success Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Error Monitor" },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].name).toBe("Error Monitor");
  });

  it("filters monitors by status", async () => {
    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({ name: "Enabled Monitor", status: "enabled" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({
        name: "Disabled Monitor",
        status: "disabled",
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        status: { eq: "enabled" },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].name).toBe("Enabled Monitor");
    expect(result.monitors[0].status).toBe("enabled");
  });

  it("filters monitors by reportsTo", async () => {
    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({
        name: "Monitor for User1",
        reportsTo: ["user1"],
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({
        name: "Monitor for User2",
        reportsTo: ["user2"],
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        reportsTo: { eq: "user1" },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].name).toBe("Monitor for User1");
    expect(result.monitors[0].reportsTo).toEqual([{ userId: "user1" }]);
  });

  it("filters monitors by id", async () => {
    // Create test monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({ name: "Test Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].id).toBe(monitor.monitor.id);
  });

  it("filters monitors by createdBy", async () => {
    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({ name: "Monitor 1" }),
      by: "user1",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({ name: "Monitor 2" }),
      by: "user2",
      byType: "user",
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        createdBy: { eq: "user1" },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].name).toBe("Monitor 1");
    expect(result.monitors[0].createdBy).toBe("user1");
  });

  it("handles pagination correctly", async () => {
    // Create multiple monitors
    const monitors = [];
    for (let i = 0; i < 5; i++) {
      const monitor = await addMonitor({
        args: makeAddMonitorArgs({ name: `Monitor ${i + 1}` }),
        by: defaultBy,
        byType: defaultByType,
        groupId: defaultGroupId,
        storage,
      });
      monitors.push(monitor.monitor);
    }

    // Test first page
    const args1 = makeGetMonitorsArgs({
      page: 1,
      limit: 2,
    });

    const result1 = await getMonitors({ args: args1, storage });

    expect(result1.monitors).toHaveLength(2);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.hasMore).toBe(true);

    // Test second page
    const args2 = makeGetMonitorsArgs({
      page: 2,
      limit: 2,
    });

    const result2 = await getMonitors({ args: args2, storage });

    expect(result2.monitors).toHaveLength(2);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.hasMore).toBe(true);

    // Test third page
    const args3 = makeGetMonitorsArgs({
      page: 3,
      limit: 2,
    });

    const result3 = await getMonitors({ args: args3, storage });

    expect(result3.monitors).toHaveLength(1);
    expect(result3.page).toBe(3);
    expect(result3.limit).toBe(2);
    expect(result3.hasMore).toBe(false);
  });

  it("sorts monitors by name when objFields are set up", async () => {
    // Set up objFields for sorting
    await insertNameFieldForSorting({
      groupId: defaultGroupId,
      tag: kObjTags.monitor,
    });

    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({ name: "Zebra Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({ name: "Alpha Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({ name: "Beta Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      sort: [{ field: "name", direction: "asc" }],
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(3);
    expect(result.monitors[0].name).toBe("Alpha Monitor");
    expect(result.monitors[1].name).toBe("Beta Monitor");
    expect(result.monitors[2].name).toBe("Zebra Monitor");
  });

  it("sorts monitors by status when objFields are set up", async () => {
    // Set up objFields for sorting
    await insertStatusFieldForSorting({
      groupId: defaultGroupId,
      tag: kObjTags.monitor,
    });

    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({ name: "Monitor 1", status: "disabled" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({ name: "Monitor 2", status: "enabled" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      sort: [{ field: "status", direction: "desc" }],
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(2);
    expect(result.monitors[0].status).toBe("enabled");
    expect(result.monitors[1].status).toBe("disabled");
  });

  it("combines multiple filters", async () => {
    // Create test monitors
    await addMonitor({
      args: makeAddMonitorArgs({
        name: "Enabled Error Monitor",
        status: "enabled",
        reportsTo: ["user1"],
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({
        name: "Disabled Error Monitor",
        status: "disabled",
        reportsTo: ["user1"],
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    await addMonitor({
      args: makeAddMonitorArgs({
        name: "Enabled Success Monitor",
        status: "enabled",
        reportsTo: ["user2"],
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        status: { eq: "enabled" },
        reportsTo: { eq: "user1" },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].name).toBe("Enabled Error Monitor");
    expect(result.monitors[0].status).toBe("enabled");
    expect(result.monitors[0].reportsTo).toEqual([{ userId: "user1" }]);
  });

  it("handles empty results for non-existent filters", async () => {
    // Create a monitor
    await addMonitor({
      args: makeAddMonitorArgs({ name: "Test Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeGetMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Non-existent Monitor" },
      },
    });

    const result = await getMonitors({ args, storage });

    expect(result.monitors).toHaveLength(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
    expect(result.hasMore).toBe(false);
  });
});
