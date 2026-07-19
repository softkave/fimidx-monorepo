import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getMongoConnection, getObjModel } from "../../../db/fimidx.mongo.js";
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
import { getMonitorById } from "../getMonitorById.js";
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

async function upsertTestUser(params: { id: string; email: string }) {
  const { promise, connection } = getMongoConnection();
  await promise;
  const db = connection?.db;
  if (!db) throw new Error("Mongo connection is not available");
  await db.collection("user").updateOne(
    { id: params.id },
    {
      $set: {
        id: params.id,
        email: params.email,
        name: "Monitor Test User",
      },
    },
    { upsert: true }
  );
}

async function deleteTestUser(id: string) {
  const { promise, connection } = getMongoConnection();
  await promise;
  const db = connection?.db;
  if (!db) return;
  await db.collection("user").deleteMany({ id });
}

describe("runMonitor integration", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    for (const tag of [
      kObjTags.monitor,
      kObjTags.alert,
      kObjTags.monitorRun,
      kObjTags.log,
    ]) {
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
    for (const tag of [
      kObjTags.monitor,
      kObjTags.alert,
      kObjTags.monitorRun,
      kObjTags.log,
    ]) {
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

  it("concurrent runs: one succeeds, one is concurrent; runningAt null after", async () => {
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

    const [a, b] = await Promise.all([
      runMonitor({
        monitorId: monitor.id,
        by: defaultBy,
        byType: defaultByType,
        storage,
      }),
      runMonitor({
        monitorId: monitor.id,
        by: defaultBy,
        byType: defaultByType,
        storage,
      }),
    ]);

    const reasons = [a.suppressedReason, b.suppressedReason];
    expect(reasons).toContain(kMonitorRunSuppressedReasons.concurrent);

    const after = await getMonitorById({ monitorId: monitor.id, storage });
    expect(after?.runningAt).toBeNull();
  });

  it("stale runningAt allows a second run to acquire", async () => {
    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs(),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const stale = new Date(Date.now() - 16 * 60 * 1000);
    await getObjModel().updateOne(
      { id: monitor.id, tag: kObjTags.monitor },
      { $set: { "objRecord.runningAt": stale } }
    );

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.suppressedReason).not.toBe(
      kMonitorRunSuppressedReasons.concurrent
    );
    const after = await getMonitorById({ monitorId: monitor.id, storage });
    expect(after?.runningAt).toBeNull();
  });

  it("skips when monitor is deleted after acquire", async () => {
    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs(),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const monitorId = monitor.id;
    const result = await runMonitor({
      monitorId,
      by: defaultBy,
      byType: defaultByType,
      storage,
      afterLockAcquired: async () => {
        await getObjModel().deleteOne({ id: monitorId, tag: kObjTags.monitor });
      },
    });

    expect(result.error).toBe("Monitor not found");
    expect(result.skipped).toBe(true);
    const leftover = await getObjModel()
      .findOne({ id: monitorId, tag: kObjTags.monitor })
      .lean();
    expect(leftover).toBeNull();
  });

  it("does not advance lastRunAt on evaluation failure", async () => {
    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs(),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const knownLastRun = new Date("2026-01-01T00:00:00.000Z");
    // Corrupt interval so computeMonitorWindow → getMsFromDuration throws.
    await getObjModel().updateOne(
      { id: monitor.id, tag: kObjTags.monitor },
      {
        $set: {
          "objRecord.lastRunAt": knownLastRun,
          "objRecord.interval": null,
        },
      }
    );

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.error).toBeTruthy();
    const after = await getMonitorById({ monitorId: monitor.id, storage });
    expect(after?.lastRunAt?.getTime()).toBe(knownLastRun.getTime());
    expect(after?.runningAt).toBeNull();

    const runs = await getMonitorRuns({
      args: {
        query: {
          projectId: defaultProjectId,
          monitorId: { eq: monitor.id },
        },
      },
      storage,
    });
    expect(runs.monitorRuns.some((r) => r.error != null)).toBe(true);
  });

  it("ownership: release with wrong claimedRunningAt does not clear holder lock", async () => {
    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs(),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    const holderAt = new Date();
    await getObjModel().updateOne(
      { id: monitor.id, tag: kObjTags.monitor },
      { $set: { "objRecord.runningAt": holderAt } }
    );

    const wrongClaim = new Date(holderAt.getTime() - 1000);
    await getObjModel().findOneAndUpdate(
      {
        id: monitor.id,
        tag: kObjTags.monitor,
        "objRecord.runningAt": wrongClaim,
      },
      { $set: { "objRecord.runningAt": null } }
    );

    const stillHeld = await getObjModel()
      .findOne({ id: monitor.id, tag: kObjTags.monitor })
      .lean();
    expect(
      (stillHeld as unknown as { objRecord: { runningAt: Date } }).objRecord
        .runningAt
    ).toBeTruthy();

    await getObjModel().findOneAndUpdate(
      {
        id: monitor.id,
        tag: kObjTags.monitor,
        "objRecord.runningAt": holderAt,
      },
      { $set: { "objRecord.runningAt": null } }
    );

    const cleared = await getMonitorById({ monitorId: monitor.id, storage });
    expect(cleared?.runningAt).toBeNull();
  });

  it("suppresses when snoozed until future", async () => {
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
      args: makeAddMonitorArgs({
        snoozedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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

    expect(result.alertCreated).toBe(false);
    expect(result.suppressedReason).toBe(kMonitorRunSuppressedReasons.snoozed);
  });

  it("suppresses when in cooldown after prior alert", async () => {
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
      args: makeAddMonitorArgs({ cooldown: { minutes: 60 } }),
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
      skipReportsToValidation: true,
    });

    await getObjModel().updateOne(
      { id: monitor.id, tag: kObjTags.monitor },
      { $set: { "objRecord.lastAlertedAt": new Date() } }
    );

    const result = await runMonitor({
      monitorId: monitor.id,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });

    expect(result.alertCreated).toBe(false);
    expect(result.suppressedReason).toBe(kMonitorRunSuppressedReasons.cooldown);
  });

  it("disabled early-exit writes run history and no alert", async () => {
    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs({ status: kMonitorStatus.disabled }),
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

    expect(result.skipped).toBe(true);
    expect(result.suppressedReason).toBe(kMonitorRunSuppressedReasons.disabled);
    expect(result.alertCreated).toBe(false);
    expect(result.monitorRunId).toBeTruthy();
  });

  it("email send failure still creates alert and records run", async () => {
    const userId = `runMonitor-email-user-${Date.now()}`;
    await upsertTestUser({ id: userId, email: "alert@example.com" });

    try {
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
        args: makeAddMonitorArgs({
          reportsTo: [{ type: "user", userId }],
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
        sendAlertEmail: async () => {
          throw new Error("smtp down");
        },
      });

      expect(result.alertCreated).toBe(true);
      expect(result.error).toBeFalsy();
      expect(result.monitorRunId).toBeTruthy();
    } finally {
      await deleteTestUser(userId);
    }
  });

  it("timeField timestamp matches on ingested timestamps", async () => {
    // ingestLogs defaults to ms numbers; window bounds are also compared as ms.
    const ts = Date.now();
    await ingestLogs({
      args: {
        projectId: defaultProjectId,
        logs: [
          { level: "error", message: "boom", timestamp: ts },
          { level: "info", message: "ok", timestamp: ts },
        ],
      },
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const { monitor } = await addMonitor({
      args: makeAddMonitorArgs({
        timeField: kMonitorTimeFields.timestamp,
        query: { recordQuery: [{ op: "eq", field: "level", value: "error" }] },
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

    expect(result.matchCount).toBe(1);
    expect(result.alertCreated).toBe(true);
  });
});
