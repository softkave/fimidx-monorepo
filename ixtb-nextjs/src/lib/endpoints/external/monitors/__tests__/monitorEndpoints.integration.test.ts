import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OwnServerError } from "fimidx-core/common/error";
import { getObjModel } from "fimidx-core/db/fimidx.mongo";
import { kMemberStatus } from "fimidx-core/definitions/member";
import { kMonitorStatus } from "fimidx-core/definitions/monitor";
import { kObjTags } from "fimidx-core/definitions/obj";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { kId0 } from "fimidx-core/definitions/system";
import {
  addGroup,
  addMember,
  addMonitor,
  addProject,
  getMonitors,
} from "fimidx-core/serverHelpers/index";
import { wrapMonitorCallbackScheduler } from "fimidx-core/serverHelpers/monitor/syncMonitorCallback";

const { schedulerAddMany, schedulerDeleteMany } = vi.hoisted(() => ({
  schedulerAddMany: vi.fn(),
  schedulerDeleteMany: vi.fn(),
}));

vi.mock("../../../../serverHelpers/nodeServerCallbacks", () => ({
  nodeMonitorCallbackScheduler: wrapMonitorCallbackScheduler({
    addMany: (...args: unknown[]) => schedulerAddMany(...args),
    deleteByIdempotencyKeys: (...args: unknown[]) =>
      schedulerDeleteMany(...args),
  }),
}));

vi.mock("../../../utils/sanitizeKId0", () => ({
  sanitizeAddMonitorInput: vi.fn(),
  sanitizeUpdateMonitorsInput: vi.fn(),
}));

import { addMonitorEndpoint } from "../addMonitorEndpoint";
import { updateMonitorsEndpoint } from "../updateMonitorsEndpoint";

const userId = "monitor-endpoint-test-user";
const userEmail = "monitor-endpoint@example.com";

describe("monitor endpoints sync (real DB, mock HTTP scheduler only)", () => {
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    schedulerDeleteMany.mockResolvedValue(undefined);
    schedulerAddMany.mockImplementation(async ({ items }: { items: unknown[] }) =>
      items.map(() => ({ success: true }))
    );

    const { group } = await addGroup({
      args: {
        projectId: kId0,
        name: `Org ${Date.now()}`,
        description: "test",
      },
      by: userId,
      byType: kByTypes.user,
      groupId: kId0,
    });
    orgId = group.id;

    await addMember({
      args: {
        projectId: kId0,
        groupId: orgId,
        meta: {
          userId,
          status: kMemberStatus.accepted,
          statusUpdatedAt: new Date().toISOString(),
          email: userEmail,
          name: "Test",
        },
        permissions: [{ action: kFimidxPermissions.wildcard, target: orgId }],
      },
      by: userId,
      byType: kByTypes.user,
    });

    const { project } = await addProject({
      args: {
        name: `Project ${Date.now()}`,
        description: "test",
        orgId,
      },
      by: userId,
      byType: kByTypes.user,
    });
    projectId = project.id;
  });

  afterEach(async () => {
    await getObjModel().deleteMany({
      tag: { $in: [kObjTags.monitor, kObjTags.project] },
      projectId,
    });
    await getObjModel().deleteMany({
      tag: { $in: [kObjTags.member, kObjTags.group, kObjTags.permission] },
      $or: [{ groupId: orgId }, { id: orgId }, { projectId: kId0 }],
    });
  });

  it("addMonitorEndpoint throws when scheduler sync fails and monitor remains in DB", async () => {
    schedulerAddMany.mockResolvedValue([
      { success: false, error: new Error("node down") },
    ]);

    const req = {
      json: async () => ({
        projectId,
        name: `Monitor ${Date.now()}`,
        status: kMonitorStatus.enabled,
        reportsTo: [],
        interval: { minutes: 10 },
        query: { recordQuery: [{ op: "eq", field: "level", value: "error" }] },
      }),
    };

    await expect(
      addMonitorEndpoint({
        req: req as never,
        session: {
          clientToken: null,
          userId,
          getBy: () => ({ by: userId, byType: kByTypes.user }),
        },
      } as never)
    ).rejects.toBeInstanceOf(OwnServerError);

    const { monitors } = await getMonitors({
      args: { query: { projectId } },
    });
    expect(monitors.length).toBe(1);
    expect(schedulerDeleteMany).toHaveBeenCalled();
    // delete + add + restore add
    expect(schedulerAddMany.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("updateMonitorsEndpoint pages past 100 and syncs every monitor", async () => {
    for (let i = 0; i < 105; i++) {
      await addMonitor({
        args: {
          projectId,
          name: `Bulk ${i} ${Date.now()}`,
          status: kMonitorStatus.enabled,
          reportsTo: [],
          interval: { minutes: 10 },
          query: {
            recordQuery: [{ op: "eq", field: "level", value: "error" }],
          },
        },
        by: userId,
        byType: kByTypes.user,
        groupId: orgId,
        skipReportsToValidation: true,
      });
    }

    const req = {
      json: async () => ({
        query: { projectId },
        update: { muted: true },
      }),
    };

    const result = await updateMonitorsEndpoint({
      req: req as never,
      session: {
        clientToken: null,
        userId,
        getBy: () => ({ by: userId, byType: kByTypes.user }),
      },
    } as never);

    expect(result.success).toBe(true);
    const addedCount = schedulerAddMany.mock.calls.reduce(
      (sum, [arg]) => sum + ((arg as { items: unknown[] }).items?.length ?? 0),
      0
    );
    expect(addedCount).toBeGreaterThanOrEqual(105);
    // At least two pages (100 + 5)
    expect(schedulerAddMany.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
