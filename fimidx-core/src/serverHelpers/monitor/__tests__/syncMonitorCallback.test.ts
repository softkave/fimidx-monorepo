import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IMonitor } from "../../../definitions/monitor.js";
import { kMonitorStatus } from "../../../definitions/monitor.js";
import {
  getMonitorCallbackIdempotencyKey,
  syncMonitorCallback,
  syncMonitorCallbacks,
  wrapMonitorCallbackScheduler,
} from "../syncMonitorCallback.js";

vi.mock("../../../common/getCoreConfig.js", () => ({
  getCoreConfig: vi.fn(),
}));

import { getCoreConfig } from "../../../common/getCoreConfig.js";

const getCoreConfigMock = vi.mocked(getCoreConfig);

function makeMonitor(overrides: Partial<IMonitor> = {}): IMonitor {
  return {
    id: "mon-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: "proj-1",
    groupId: "grp-1",
    name: "Test Monitor",
    description: null,
    status: kMonitorStatus.enabled,
    interval: { minutes: 10 },
    cooldown: { minutes: 30 },
    reportsTo: [],
    createdBy: "user",
    createdByType: "user",
    updatedBy: "user",
    updatedByType: "user",
    query: { recordQuery: [{ op: "eq", field: "level", value: "error" }] },
    resourceType: "logs",
    timeField: "createdAt",
    alertIfCountGreaterThan: null,
    muted: false,
    snoozedUntil: null,
    lastRunAt: null,
    lastAlertedAt: null,
    runningAt: null,
    ...overrides,
  } as IMonitor;
}

function makeTrackingScheduler() {
  const deletes: string[][] = [];
  const adds: unknown[][] = [];
  const scheduler = wrapMonitorCallbackScheduler({
    deleteByIdempotencyKeys: async ({ idempotencyKeys }) => {
      deletes.push([...idempotencyKeys]);
    },
    addMany: async ({ items }) => {
      adds.push(items);
      return items.map(() => ({ success: true as const }));
    },
  });
  return { scheduler, deletes, adds };
}

describe("syncMonitorCallback", () => {
  beforeEach(() => {
    getCoreConfigMock.mockReturnValue({
      fimidxInternal: { internalAccessKey: "test-key" },
      app: { publicURL: "https://app.example.com" },
    } as ReturnType<typeof getCoreConfig>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("enabled + publicURL deletes then adds with expected key/url/interval", async () => {
    const { scheduler, deletes, adds } = makeTrackingScheduler();
    const monitor = makeMonitor({ interval: { minutes: 15 } });

    const result = await syncMonitorCallback({
      monitor,
      by: "user-1",
      byType: "user",
      scheduler,
    });

    expect(result.synced).toBe(true);
    expect(deletes).toEqual([
      [getMonitorCallbackIdempotencyKey(monitor.id)],
    ]);
    expect(adds).toHaveLength(1);
    expect(adds[0]).toHaveLength(1);
    const add = adds[0][0] as {
      args: {
        url: string;
        intervalMs: number;
        idempotencyKey: string;
        requestBody: string;
      };
    };
    expect(add.args.idempotencyKey).toBe(
      getMonitorCallbackIdempotencyKey(monitor.id)
    );
    expect(add.args.url).toBe(
      "https://app.example.com/api/internal/monitors/run"
    );
    expect(add.args.intervalMs).toBe(15 * 60 * 1000);
    expect(JSON.parse(add.args.requestBody)).toEqual({
      monitorId: monitor.id,
    });
  });

  it("disabled deletes only and does not add", async () => {
    const { scheduler, deletes, adds } = makeTrackingScheduler();
    const monitor = makeMonitor({ status: kMonitorStatus.disabled });

    const result = await syncMonitorCallback({
      monitor,
      by: "user-1",
      byType: "user",
      scheduler,
    });

    expect(result.synced).toBe(false);
    expect(deletes).toEqual([
      [getMonitorCallbackIdempotencyKey(monitor.id)],
    ]);
    expect(adds).toHaveLength(0);
  });

  it("enabled without publicURL does not delete and throws", async () => {
    getCoreConfigMock.mockReturnValue({
      fimidxInternal: { internalAccessKey: "test-key" },
      app: { publicURL: undefined },
    } as ReturnType<typeof getCoreConfig>);

    const { scheduler, deletes, adds } = makeTrackingScheduler();
    const monitor = makeMonitor();

    await expect(
      syncMonitorCallback({
        monitor,
        by: "user-1",
        byType: "user",
        scheduler,
      })
    ).rejects.toThrow(/publicURL/);

    expect(deletes).toHaveLength(0);
    expect(adds).toHaveLength(0);
  });

  it("retries add once on failure then rethrows", async () => {
    const deletes: string[][] = [];
    let addCalls = 0;
    const scheduler = wrapMonitorCallbackScheduler({
      deleteByIdempotencyKeys: async ({ idempotencyKeys }) => {
        deletes.push([...idempotencyKeys]);
      },
      addMany: async () => {
        addCalls++;
        return [{ success: false, error: new Error("add failed") }];
      },
    });

    await expect(
      syncMonitorCallback({
        monitor: makeMonitor(),
        by: "user-1",
        byType: "user",
        scheduler,
      })
    ).rejects.toThrow("add failed");

    expect(deletes).toHaveLength(1);
    // first add + restore retry
    expect(addCalls).toBe(2);
  });
});

describe("syncMonitorCallbacks", () => {
  beforeEach(() => {
    getCoreConfigMock.mockReturnValue({
      fimidxInternal: { internalAccessKey: "test-key" },
      app: { publicURL: "https://app.example.com" },
    } as ReturnType<typeof getCoreConfig>);
  });

  it("batches deletes and adds for mixed enabled/disabled", async () => {
    const { scheduler, deletes, adds } = makeTrackingScheduler();
    const enabled = makeMonitor({ id: "mon-a" });
    const disabled = makeMonitor({
      id: "mon-b",
      status: kMonitorStatus.disabled,
    });

    const result = await syncMonitorCallbacks({
      monitors: [enabled, disabled],
      by: "user-1",
      byType: "user",
      scheduler,
    });

    expect(result.syncedCount).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(deletes).toEqual([
      [getMonitorCallbackIdempotencyKey("mon-b")],
      [getMonitorCallbackIdempotencyKey("mon-a")],
    ]);
    expect(adds).toHaveLength(1);
    expect(adds[0]).toHaveLength(1);
  });

  it("retries failed adds once and reports remaining errors", async () => {
    let addRound = 0;
    const scheduler = wrapMonitorCallbackScheduler({
      deleteByIdempotencyKeys: async () => undefined,
      addMany: async ({ items }) => {
        addRound++;
        if (addRound === 1) {
          return items.map((_, i) =>
            i === 0
              ? { success: false as const, error: new Error("fail-0") }
              : { success: true as const }
          );
        }
        // retry batch still fails for the one item
        return items.map(() => ({
          success: false as const,
          error: new Error("fail-0-retry"),
        }));
      },
    });

    const result = await syncMonitorCallbacks({
      monitors: [
        makeMonitor({ id: "mon-0" }),
        makeMonitor({ id: "mon-1" }),
      ],
      by: "user-1",
      byType: "user",
      scheduler,
    });

    expect(result.syncedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].monitorId).toBe("mon-0");
  });
});
