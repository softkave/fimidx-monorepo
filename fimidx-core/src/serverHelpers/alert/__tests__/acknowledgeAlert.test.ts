import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { kByTypes } from "../../../definitions/index.js";
import {
  kMonitorResourceTypes,
  kMonitorTimeFields,
} from "../../../definitions/monitor.js";
import { kObjTags } from "../../../definitions/obj.js";
import { createDefaultStorage } from "../../../storage/config.js";
import type { IObjStorage } from "../../../storage/types.js";
import { ingestLogs } from "../../logs/ingestLogs.js";
import { objToLog } from "../../logs/objToLog.js";
import { buildMonitorLogQuery } from "../../monitor/monitorQueryUtils.js";
import { getManyObjs } from "../../obj/getObjs.js";
import { acknowledgeAlert } from "../acknowledgeAlert.js";
import { addAlert } from "../addAlert.js";
import { getAlertById } from "../getAlertById.js";

const defaultProjectId = "test-project-acknowledgeAlert";
const defaultGroupId = "test-group-acknowledgeAlert";
const defaultBy = "tester";
const defaultByType = kByTypes.user;

describe("acknowledgeAlert + getAlertLogs query path", () => {
  let storage: IObjStorage;

  beforeAll(async () => {
    storage = createDefaultStorage();
  });

  beforeEach(async () => {
    for (const tag of [kObjTags.alert, kObjTags.log]) {
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
    for (const tag of [kObjTags.alert, kObjTags.log]) {
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

  it("acknowledges and un-acknowledges an alert", async () => {
    const windowStart = new Date(Date.now() - 60_000);
    const windowEnd = new Date();
    const { alert } = await addAlert({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      record: {
        monitorId: "mon-1",
        monitorName: "m",
        monitorDescription: null,
        resourceType: kMonitorResourceTypes.logs,
        timeField: kMonitorTimeFields.createdAt,
        query: { recordQuery: [{ op: "eq", field: "level", value: "error" }] },
        windowStart,
        windowEnd,
        matchCount: 1,
        alertIfCountGreaterThan: null,
        notifiedUserIds: [],
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
      storage,
    });

    const ack = await acknowledgeAlert({
      alertId: alert.id,
      acknowledged: true,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });
    expect(ack.alert.acknowledgedAt).toBeTruthy();
    expect(ack.alert.acknowledgedBy).toBe(defaultBy);

    const unack = await acknowledgeAlert({
      alertId: alert.id,
      acknowledged: false,
      by: defaultBy,
      byType: defaultByType,
      storage,
    });
    expect(unack.alert.acknowledgedAt).toBeNull();
    expect(unack.alert.acknowledgedBy).toBeNull();
  });

  it("getAlertLogs-style query uses alert snapshot query tree and window", async () => {
    const windowStart = new Date(Date.now() - 5 * 60_000);
    const windowEnd = new Date();

    await ingestLogs({
      args: {
        projectId: defaultProjectId,
        logs: [
          { level: "error", message: "in-window" },
          { level: "info", message: "wrong-level" },
        ],
      },
      by: defaultBy,
      byType: defaultByType,
      groupId: defaultGroupId,
      storage,
    });

    const query = {
      recordQuery: [{ op: "eq" as const, field: "level", value: "error" }],
    };
    const { alert } = await addAlert({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      record: {
        monitorId: "mon-1",
        monitorName: "m",
        monitorDescription: null,
        resourceType: kMonitorResourceTypes.logs,
        timeField: kMonitorTimeFields.createdAt,
        query,
        windowStart,
        windowEnd,
        matchCount: 1,
        alertIfCountGreaterThan: null,
        notifiedUserIds: [],
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
      storage,
    });

    const loaded = await getAlertById({ alertId: alert.id, storage });
    expect(loaded).toBeTruthy();
    expect(loaded!.query).toEqual(query);

    const objQuery = buildMonitorLogQuery({
      projectId: loaded!.projectId,
      query: loaded!.query,
      timeField: loaded!.timeField,
      windowStart: new Date(loaded!.windowStart),
      windowEnd: new Date(loaded!.windowEnd),
    });

    const page1 = await getManyObjs({
      objQuery,
      tag: kObjTags.log,
      page: 0,
      limit: 1,
      storage,
    });
    expect(
      page1.objs.map(objToLog).every((l) => l.data?.level === "error")
    ).toBe(true);
    expect(page1.objs.length).toBe(1);
    expect(page1.hasMore).toBe(true);

    const page2 = await getManyObjs({
      objQuery,
      tag: kObjTags.log,
      page: 1,
      limit: 1,
      storage,
    });
    expect(page2.objs.length).toBe(0);
    expect(page2.hasMore).toBe(false);
  });

  it("objToAlert migrates legacy flat filters into query", async () => {
    const windowStart = new Date(Date.now() - 60_000);
    const windowEnd = new Date();
    const filters = [{ op: "eq" as const, field: "level", value: "error" }];

    // Write legacy shape directly via addAlert with query built from filters
    // after simulating old record through objToAlert path:
    const { alert } = await addAlert({
      projectId: defaultProjectId,
      groupId: defaultGroupId,
      by: defaultBy,
      byType: defaultByType,
      record: {
        monitorId: "mon-legacy",
        monitorName: "legacy",
        monitorDescription: null,
        resourceType: kMonitorResourceTypes.logs,
        timeField: kMonitorTimeFields.createdAt,
        query: { recordQuery: filters },
        windowStart,
        windowEnd,
        matchCount: 1,
        alertIfCountGreaterThan: null,
        notifiedUserIds: [],
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
      storage,
    });

    expect(alert.query).toEqual({ recordQuery: filters });
  });
});
