import { describe, expect, it } from "vitest";
import { extractMonitorFilters } from "../../../common/monitor.js";
import type { IMonitor } from "../../../definitions/monitor.js";
import {
  kMonitorResourceTypes,
  kMonitorStatus,
  kMonitorTimeFields,
} from "../../../definitions/monitor.js";
import {
  buildMonitorLogQuery,
  computeMonitorWindow,
  kMonitorMaxWindowMultiplier,
  shouldAlertForMatchCount,
} from "../monitorQueryUtils.js";

function makeMonitor(
  overrides: Partial<IMonitor> & { interval: IMonitor["interval"] }
): IMonitor {
  return {
    id: "m1",
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: "p1",
    groupId: "g1",
    name: "m",
    description: null,
    status: kMonitorStatus.enabled,
    reportsTo: [],
    createdBy: "u",
    createdByType: "user",
    updatedBy: "u",
    updatedByType: "user",
    query: undefined as never,
    resourceType: kMonitorResourceTypes.logs,
    timeField: kMonitorTimeFields.createdAt,
    alertIfCountGreaterThan: null,
    cooldown: { minutes: 30 },
    muted: false,
    snoozedUntil: null,
    lastRunAt: null,
    lastAlertedAt: null,
    runningAt: null,
    ...overrides,
  } as IMonitor;
}

describe("computeMonitorWindow", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("uses interval lookback when no lastRunAt", () => {
    const monitor = makeMonitor({ interval: { minutes: 10 } });
    const { windowStart, windowEnd } = computeMonitorWindow({ monitor, now });
    expect(windowEnd).toEqual(now);
    expect(windowStart).toEqual(new Date(now.getTime() - 10 * 60 * 1000));
  });

  it("uses lastRunAt when within cap", () => {
    const lastRunAt = new Date(now.getTime() - 5 * 60 * 1000);
    const monitor = makeMonitor({
      interval: { minutes: 10 },
      lastRunAt,
    });
    const { windowStart } = computeMonitorWindow({ monitor, now });
    expect(windowStart).toEqual(lastRunAt);
  });

  it("clamps when lastRunAt is older than 2x interval", () => {
    const intervalMs = 10 * 60 * 1000;
    const lastRunAt = new Date(
      now.getTime() - intervalMs * kMonitorMaxWindowMultiplier - 60_000
    );
    const monitor = makeMonitor({
      interval: { minutes: 10 },
      lastRunAt,
    });
    const { windowStart } = computeMonitorWindow({ monitor, now });
    expect(windowStart).toEqual(
      new Date(now.getTime() - intervalMs * kMonitorMaxWindowMultiplier)
    );
  });
});

describe("shouldAlertForMatchCount", () => {
  it("returns false for zero matches", () => {
    expect(
      shouldAlertForMatchCount({ matchCount: 0, alertIfCountGreaterThan: null })
    ).toBe(false);
  });

  it("returns true for any match when threshold null", () => {
    expect(
      shouldAlertForMatchCount({ matchCount: 1, alertIfCountGreaterThan: null })
    ).toBe(true);
  });

  it("returns true only when above threshold", () => {
    expect(
      shouldAlertForMatchCount({ matchCount: 5, alertIfCountGreaterThan: 5 })
    ).toBe(false);
    expect(
      shouldAlertForMatchCount({ matchCount: 6, alertIfCountGreaterThan: 5 })
    ).toBe(true);
  });

  it("treats threshold 0 as any match", () => {
    expect(
      shouldAlertForMatchCount({ matchCount: 1, alertIfCountGreaterThan: 0 })
    ).toBe(true);
  });
});

describe("buildMonitorLogQuery", () => {
  const windowStart = new Date("2026-01-15T11:00:00.000Z");
  const windowEnd = new Date("2026-01-15T12:00:00.000Z");
  const leaf = {
    recordQuery: [{ op: "eq" as const, field: "level", value: "error" }],
  };

  it("ANDs leaf query with createdAt window meta", () => {
    const q = buildMonitorLogQuery({
      projectId: "p1",
      query: leaf,
      timeField: kMonitorTimeFields.createdAt,
      windowStart,
      windowEnd,
    });
    expect(q).toEqual({
      and: [
        {
          metaQuery: {
            projectId: { eq: "p1" },
            createdAt: {
              gte: windowStart.toISOString(),
              lte: windowEnd.toISOString(),
            },
          },
        },
        leaf,
      ],
    });
  });

  it("ANDs leaf query with timestamp window record filters", () => {
    const q = buildMonitorLogQuery({
      projectId: "p1",
      query: leaf,
      timeField: kMonitorTimeFields.timestamp,
      windowStart,
      windowEnd,
    });
    expect(q).toEqual({
      and: [
        {
          recordQuery: [
            { op: "gte", field: "timestamp", value: windowStart.toISOString() },
            { op: "lte", field: "timestamp", value: windowEnd.toISOString() },
          ],
          metaQuery: {
            projectId: { eq: "p1" },
          },
        },
        leaf,
      ],
    });
  });

  it("preserves or trees instead of flattening", () => {
    const orQuery = {
      or: [
        {
          recordQuery: [{ op: "eq" as const, field: "level", value: "error" }],
        },
        {
          recordQuery: [{ op: "eq" as const, field: "level", value: "fatal" }],
        },
      ],
    };
    const q = buildMonitorLogQuery({
      projectId: "p1",
      query: orQuery,
      timeField: kMonitorTimeFields.createdAt,
      windowStart,
      windowEnd,
    });
    expect(q).toEqual({
      and: [
        {
          metaQuery: {
            projectId: { eq: "p1" },
            createdAt: {
              gte: windowStart.toISOString(),
              lte: windowEnd.toISOString(),
            },
          },
        },
        orQuery,
      ],
    });
  });
});

describe("extractMonitorFilters (UI helper only)", () => {
  it("returns leaf recordQuery", () => {
    const filters = [{ op: "eq" as const, field: "level", value: "error" }];
    expect(extractMonitorFilters({ recordQuery: filters })).toEqual(filters);
  });

  it("unwraps single and leaf for the form editor", () => {
    const filters = [{ op: "eq" as const, field: "level", value: "error" }];
    expect(
      extractMonitorFilters({
        and: [{ recordQuery: filters }],
      })
    ).toEqual(filters);
  });
});
