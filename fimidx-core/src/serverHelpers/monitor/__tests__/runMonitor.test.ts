import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kByTypes } from "../../../definitions/index.js";
import type { AddMonitorEndpointArgs } from "../../../definitions/monitor.js";
import {
  kMonitorResourceTypes,
  kMonitorStatus,
  kMonitorTimeFields,
} from "../../../definitions/monitor.js";
import { kMonitorRunSuppressedReasons } from "../../../definitions/monitorRun.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { ingestLogs } from "../../logs/ingestLogs.js";
import { getMonitorRuns } from "../../monitorRun/getMonitorRuns.js";
import { addMonitor } from "../addMonitor.js";
import { runMonitor } from "../runMonitor.js";

const defaultProjectId = "test-project-runMonitor";
const defaultGroupId = "test-group-runMonitor";
const defaultBy = "tester";
const defaultByType = kByTypes.user;

let testCounter = 0;

function makeAddMonitorArgs(
  overrides: Partial<AddMonitorEndpointArgs> = {}
): AddMonitorEndpointArgs {
  testCounter++;
  const uniqueId = `${testCounter}_${Date.now()}`;
  return {
    projectId: defaultProjectId,
    name: `Run Monitor ${uniqueId}`,
    description: "Run monitor test",
    status: kMonitorStatus.enabled,
    reportsTo: [],
    interval: { minutes: 10 },
    cooldown: { minutes: 30 },
    query: { recordQuery: [{ op: "eq", field: "level", value: "error" }] },
    resourceType: kMonitorResourceTypes.logs,
    timeField: kMonitorTimeFields.createdAt,
    ...overrides,
  };
}

describe("runMonitor integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    for (const tag of [kObjTags.monitor, kObjTags.alert, kObjTags.monitorRun, kObjTags.log]) {
      try {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: defaultProjectId } } },
          tag,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
      } catch {
        // ignore
      }
    }
  });

  afterEach(async () => {
    for (const tag of [kObjTags.monitor, kObjTags.alert, kObjTags.monitorRun, kObjTags.log]) {
      try {
        await storage.bulkDelete({
          query: { metaQuery: { projectId: { eq: defaultProjectId } } },
          tag,
          deletedBy: defaultBy,
          deletedByType: defaultByType,
          deleteMany: true,
          hardDelete: true,
        });
      } catch {
        // ignore
      }
    }
  });

  it("writes run history with no_matches when nothing matches", async () => {
    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs(),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.alertCreated).toBe(false);
    expect(result.matchCount).toBe(0);
    expect(result.suppressedReason).toBe(
      kMonitorRunSuppressedReasons.no_matches
    );

    const runs = await getMonitorRuns({
      args: {
        query: {
          projectId: defaultProjectId,
          monitorId: { eq: monitor.id },
        },
      },
      storage,
    });
    expect(runs.monitorRuns.length).toBeGreaterThanOrEqual(1);
    expect(runs.monitorRuns[0].suppressedReason).toBe(
      kMonitorRunSuppressedReasons.no_matches
    );
  });

  it("creates alert when matches exceed threshold (null = any match)", async () => {
    await ingestLogs({
      args: {
        projectId: defaultProjectId,
        logs: [
          { level: "error", message: "boom1" },
          { level: "error", message: "boom2" },
          { level: "info", message: "ok" },
        ],
      },
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs({
        alertIfCountGreaterThan: null,
      }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.matchCount).toBe(2);
    expect(result.alertCreated).toBe(true);
    expect(result.alertId).toBeTruthy();
  });

  it("suppresses alert when muted but still writes run history", async () => {
    await ingestLogs({
      args: {
        projectId: defaultProjectId,
        logs: [{ level: "error", message: "boom" }],
      },
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs({ muted: true }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.matchCount).toBe(1);
    expect(result.alertCreated).toBe(false);
    expect(result.suppressedReason).toBe(kMonitorRunSuppressedReasons.muted);
  });

  it("suppresses below threshold", async () => {
    await ingestLogs({
      args: {
        projectId: defaultProjectId,
        logs: [{ level: "error", message: "boom" }],
      },
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs({ alertIfCountGreaterThan: 5 }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.matchCount).toBe(1);
    expect(result.alertCreated).toBe(false);
    expect(result.suppressedReason).toBe(
      kMonitorRunSuppressedReasons.below_threshold
    );
  });

  it("dryRun does not create alerts", async () => {
    await ingestLogs({
      args: {
        projectId: defaultProjectId,
        logs: [{ level: "error", message: "boom" }],
      },
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs(),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
      dryRun: true,
    });

    expect(result.matchCount).toBe(1);
    expect(result.alertCreated).toBe(false);
  });
});
