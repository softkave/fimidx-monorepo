import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  AddMonitorEndpointArgs,
  UpdateMonitorsEndpointArgs,
} from "../../../definitions/monitor.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { addMonitor } from "../addMonitor.js";
import { getMonitors } from "../getMonitors.js";
import { updateMonitors } from "../updateMonitors.js";

const defaultProjectId = "test-project-updateMonitors";
const defaultGroupId = "test-group";
const defaultBy = "tester";
const defaultByType = "user";

// Test counter to ensure unique names
let testCounter = 0;

function makeUpdateMonitorsArgs(
  overrides: Partial<UpdateMonitorsEndpointArgs> = {}
): UpdateMonitorsEndpointArgs {
  return {
    query: {
      projectId: defaultProjectId,
      ...overrides.query,
    },
    update: {
      ...overrides.update,
    },
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
    query: {
      and: [
        {
          op: "eq",
          field: "level",
          value: "error",
        },
      ],
    },
    ...overrides,
  };
}

describe("updateMonitors integration", () => {
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
        tag: kObjTags.monitor,
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
        tag: kObjTags.monitor,
        deletedBy: defaultBy,
        deletedByType: defaultByType,
        deleteMany: true,
        hardDelete: true, // Use hard delete for test cleanup
      });
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  it("updates a single monitor by id", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({ name: "Original Name" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
      update: {
        name: "Updated Name",
        description: "Updated description",
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].name).toBe("Updated Name");
    expect(result.monitors[0].description).toBe("Updated description");
    expect(result.monitors[0].updatedBy).toBe("updater");
    expect(result.monitors[0].updatedByType).toBe("user");
  });

  it("updates monitor status", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({ name: "Test Monitor", status: "enabled" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
      update: {
        status: "disabled",
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].status).toBe("disabled");
  });

  it("updates monitor reportsTo", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({
        name: "Test Monitor",
        reportsTo: ["user1", "user2"],
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
      update: {
        reportsTo: ["user3", "user4"],
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].reportsTo).toEqual([
      { userId: "user3" },
      { userId: "user4" },
    ]);
  });

  it("updates monitor interval", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({
        name: "Test Monitor",
        interval: { days: 1 },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
      update: {
        interval: { hours: 6 },
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].interval).toEqual({ hours: 6 });
  });

  it("updates monitor query", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({
        name: "Test Monitor",
        query: {
          and: [
            {
              op: "eq",
              field: "level",
              value: "error",
            },
          ],
        },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const newLogsQuery = {
      or: [
        {
          op: "eq" as const,
          field: "level",
          value: "error",
        },
        {
          op: "eq" as const,
          field: "level",
          value: "warn",
        },
      ],
    };

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
      update: {
        query: newLogsQuery,
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].query).toEqual(newLogsQuery);
  });

  it("updates monitors by name filter", async () => {
    // Create monitors
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

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Error Monitor" },
      },
      update: {
        description: "Updated error monitor",
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    const errorMonitor = result.monitors.find(
      (m) => m.name === "Error Monitor"
    );
    const successMonitor = result.monitors.find(
      (m) => m.name === "Success Monitor"
    );

    expect(errorMonitor?.description).toBe("Updated error monitor");
    expect(successMonitor?.description).toBe("Test description"); // Should be unchanged
  });

  it("updates monitors by createdBy filter", async () => {
    // Create monitors with different creators
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

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        createdBy: { eq: "user1" },
      },
      update: {
        description: "Updated by user1",
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    const monitor1 = result.monitors.find((m) => m.name === "Monitor 1");
    const monitor2 = result.monitors.find((m) => m.name === "Monitor 2");

    expect(monitor1?.description).toBe("Updated by user1");
    expect(monitor2?.description).toBe("Test description"); // Should be unchanged
  });

  it("updates multiple fields at once", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({
        name: "Original Name",
        description: "Original description",
        status: "enabled",
        reportsTo: ["user1"],
        interval: { days: 1 },
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
      update: {
        name: "Updated Name",
        description: "Updated description",
        status: "disabled",
        reportsTo: ["user2", "user3"],
        interval: { hours: 12 },
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify the update
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    const updatedMonitor = result.monitors[0];
    expect(updatedMonitor.name).toBe("Updated Name");
    expect(updatedMonitor.description).toBe("Updated description");
    expect(updatedMonitor.status).toBe("disabled");
    expect(updatedMonitor.reportsTo).toEqual([
      { userId: "user2" },
      { userId: "user3" },
    ]);
    expect(updatedMonitor.interval).toEqual({ hours: 12 });
  });

  it("does not update monitors when no matches found", async () => {
    // Create a monitor
    const monitor = await addMonitor({
      args: makeAddMonitorArgs({ name: "Test Monitor" }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const args = makeUpdateMonitorsArgs({
      query: {
        projectId: defaultProjectId,
        name: { eq: "Non-existent Monitor" },
      },
      update: {
        description: "This should not be updated",
      },
    });

    await updateMonitors({
      args,
      by: "updater",
      byType: "user",
      storage,
    });

    // Verify no changes were made
    const getArgs = {
      query: {
        projectId: defaultProjectId,
        id: { eq: monitor.monitor.id },
      },
    };

    const result = await getMonitors({ args: getArgs, storage });

    expect(result.monitors).toHaveLength(1);
    expect(result.monitors[0].description).toBe("Test description"); // Should be unchanged
  });
});
