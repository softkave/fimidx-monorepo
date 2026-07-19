import { getMsFromDuration } from "../../common/date.js";
import { fimidxConsoleLogger } from "../../common/logger/fimidx-console-logger.js";
import { getObjModel } from "../../db/fimidx.mongo.js";
import type { IAlert } from "../../definitions/alert.js";
import { kByTypes } from "../../definitions/index.js";
import type { IMonitor } from "../../definitions/monitor.js";
import {
    kMonitorReportToTypes,
    kMonitorStatus,
} from "../../definitions/monitor.js";
import {
    kMonitorRunSuppressedReasons,
    type MonitorRunSuppressedReason,
} from "../../definitions/monitorRun.js";
import { kObjTags } from "../../definitions/obj.js";
import type { IObjStorage } from "../../storage/types.js";
import { addAlert } from "../alert/addAlert.js";
import { addMonitorRun } from "../monitorRun/addMonitorRun.js";
import { getUsers } from "../user.js";
import { getMonitorById } from "./getMonitorById.js";
import {
    computeMonitorWindow,
    countMonitorMatches,
    extractMonitorFilters,
    shouldAlertForMatchCount,
} from "./monitorQueryUtils.js";

export type SendMonitorAlertEmailFn = (params: {
  to: string[];
  monitor: IMonitor;
  alert: IAlert;
  matchCount: number;
}) => Promise<{ sent: number; failed: number }>;

export interface IRunMonitorResult {
  skipped: boolean;
  suppressedReason?: MonitorRunSuppressedReason | null;
  matchCount: number;
  alertCreated: boolean;
  alertId?: string | null;
  monitorRunId?: string | null;
  error?: string | null;
  durationMs: number;
}

const kStaleRunningMs = 15 * 60 * 1000;

/**
 * Atomically claim the per-monitor run lock.
 *
 * Talks to Mongo directly via findOneAndUpdate. The obj storage layer cannot
 * express a conditional compare-and-set on a single field — its updates
 * read-merge-write the whole objRecord, which races under concurrent runs.
 * That race is exactly what this lock prevents, so bypassing storage here is
 * intentional (same idea as runSymbolication's direct Mongo reads).
 */
async function tryAcquireMonitorLock(params: {
  monitorId: string;
}): Promise<boolean> {
  const { monitorId } = params;
  const now = new Date();
  const staleBefore = new Date(now.getTime() - kStaleRunningMs);
  const model = getObjModel();

  // Claim succeeds only if runningAt is free (null/missing) or stale.
  // Acquired iff a document was returned.
  const claimed = await model.findOneAndUpdate(
    {
      id: monitorId,
      tag: kObjTags.monitor,
      deletedAt: null,
      $or: [
        { "objRecord.runningAt": null },
        { "objRecord.runningAt": { $lt: staleBefore } },
        // Legacy ISO-string locks from the previous storage-layer path.
        { "objRecord.runningAt": { $lt: staleBefore.toISOString() } },
      ],
    },
    {
      $set: {
        "objRecord.runningAt": now,
        updatedAt: now,
      },
    }
  );

  return claimed != null;
}

/**
 * Clear the run lock and apply post-run fields (lastRunAt / lastAlertedAt).
 * Uses a field-level $set so we do not clobber concurrent objRecord updates.
 */
async function releaseMonitorLock(params: {
  monitorId: string;
  by: string;
  byType: string;
  patch: Record<string, unknown>;
}) {
  const { monitorId, by, byType, patch } = params;
  const now = new Date();
  const model = getObjModel();

  const setFields: Record<string, unknown> = {
    "objRecord.runningAt": null,
    updatedAt: now,
    updatedBy: by,
    updatedByType: byType,
  };
  for (const [key, value] of Object.entries(patch)) {
    setFields[`objRecord.${key}`] = value;
  }

  await model.findOneAndUpdate(
    {
      id: monitorId,
      tag: kObjTags.monitor,
      deletedAt: null,
    },
    { $set: setFields }
  );
}

function getSuppressedReason(
  monitor: IMonitor,
  matchCount: number,
  now: Date
): MonitorRunSuppressedReason | null {
  if (monitor.status === kMonitorStatus.disabled) {
    return kMonitorRunSuppressedReasons.disabled;
  }
  if (monitor.muted) {
    return kMonitorRunSuppressedReasons.muted;
  }
  if (monitor.snoozedUntil && now < new Date(monitor.snoozedUntil)) {
    return kMonitorRunSuppressedReasons.snoozed;
  }
  if (matchCount <= 0) {
    return kMonitorRunSuppressedReasons.no_matches;
  }
  if (
    !shouldAlertForMatchCount({
      matchCount,
      alertIfCountGreaterThan: monitor.alertIfCountGreaterThan,
    })
  ) {
    return kMonitorRunSuppressedReasons.below_threshold;
  }
  if (monitor.lastAlertedAt) {
    const cooldownMs = getMsFromDuration(monitor.cooldown);
    const elapsed = now.getTime() - new Date(monitor.lastAlertedAt).getTime();
    if (elapsed < cooldownMs) {
      return kMonitorRunSuppressedReasons.cooldown;
    }
  }
  return null;
}

export async function runMonitor(params: {
  monitorId: string;
  by?: string;
  byType?: string;
  storage?: IObjStorage;
  sendAlertEmail?: SendMonitorAlertEmailFn;
  /** When true, evaluate and write run history but never create alert/email. */
  dryRun?: boolean;
}): Promise<IRunMonitorResult> {
  const startedAt = new Date();
  const by = params.by ?? "system";
  const byType = params.byType ?? kByTypes.system;
  const { monitorId, storage, sendAlertEmail, dryRun } = params;

  const acquired = await tryAcquireMonitorLock({
    monitorId,
  });

  if (!acquired) {
    const finishedAt = new Date();
    const monitor = await getMonitorById({ monitorId, storage });
    if (monitor) {
      const { monitorRun } = await addMonitorRun({
        projectId: monitor.projectId,
        groupId: monitor.groupId,
        by,
        byType,
        record: {
          monitorId,
          startedAt,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          windowStart: startedAt,
          windowEnd: startedAt,
          timeField: monitor.timeField,
          matchCount: 0,
          alertCreated: false,
          suppressedReason: kMonitorRunSuppressedReasons.concurrent,
          error: null,
        },
        storage,
      });
      return {
        skipped: true,
        suppressedReason: kMonitorRunSuppressedReasons.concurrent,
        matchCount: 0,
        alertCreated: false,
        monitorRunId: monitorRun.id,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }
    return {
      skipped: true,
      suppressedReason: kMonitorRunSuppressedReasons.concurrent,
      matchCount: 0,
      alertCreated: false,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }

  let monitor = await getMonitorById({ monitorId, storage });
  if (!monitor) {
    return {
      skipped: true,
      matchCount: 0,
      alertCreated: false,
      error: "Monitor not found",
      durationMs: Date.now() - startedAt.getTime(),
    };
  }

  if (monitor.status === kMonitorStatus.disabled) {
    const finishedAt = new Date();
    const { windowStart, windowEnd } = computeMonitorWindow({ monitor });
    const { monitorRun } = await addMonitorRun({
      projectId: monitor.projectId,
      groupId: monitor.groupId,
      by,
      byType,
      record: {
        monitorId,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        windowStart,
        windowEnd,
        timeField: monitor.timeField,
        matchCount: 0,
        alertCreated: false,
        suppressedReason: kMonitorRunSuppressedReasons.disabled,
        error: null,
      },
      storage,
    });
    await releaseMonitorLock({
      monitorId,
      by,
      byType,
      patch: { lastRunAt: finishedAt },
    });
    return {
      skipped: true,
      suppressedReason: kMonitorRunSuppressedReasons.disabled,
      matchCount: 0,
      alertCreated: false,
      monitorRunId: monitorRun.id,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }

  const { windowStart, windowEnd } = computeMonitorWindow({ monitor });
  try {
    const matchCount = await countMonitorMatches({
      monitor,
      windowStart,
      windowEnd,
      storage,
    });

    const now = windowEnd;
    let suppressedReason = getSuppressedReason(monitor, matchCount, now);
    let alertCreated = false;
    let alertId: string | null = null;
    let emailSent = 0;
    let emailFailed = 0;

    const wouldAlert = suppressedReason == null && !dryRun;

    if (wouldAlert) {
      const filters = extractMonitorFilters(monitor.query);
      const userIds = monitor.reportsTo
        .filter((r) => r.type === kMonitorReportToTypes.user)
        .map((r) => r.userId);

      const { alert } = await addAlert({
        projectId: monitor.projectId,
        groupId: monitor.groupId,
        by,
        byType,
        record: {
          monitorId: monitor.id,
          monitorName: monitor.name,
          monitorDescription: monitor.description ?? null,
          resourceType: monitor.resourceType,
          timeField: monitor.timeField,
          filters,
          windowStart,
          windowEnd,
          matchCount,
          alertIfCountGreaterThan: monitor.alertIfCountGreaterThan ?? null,
          notifiedUserIds: userIds,
          acknowledgedAt: null,
          acknowledgedBy: null,
        },
        storage,
      });

      alertCreated = true;
      alertId = alert.id;

      if (sendAlertEmail && userIds.length > 0) {
        const users = await getUsers(userIds);
        const emails = users
          .map((u) => u.email)
          .filter((e): e is string => typeof e === "string" && e.length > 0);

        if (emails.length > 0) {
          try {
            const result = await sendAlertEmail({
              to: emails,
              monitor,
              alert,
              matchCount,
            });
            emailSent = result.sent;
            emailFailed = result.failed;
          } catch (err) {
            emailFailed = emails.length;
            fimidxConsoleLogger.error({
              message: "[runMonitor] email send failed",
              error: err,
              monitorId,
              by,
              byType,
            });
          }
        }
      }
    }

    if (dryRun && suppressedReason == null) {
      // Dry run would have alerted; mark as no suppressed reason but no alert
      suppressedReason = null;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    const { monitorRun } = await addMonitorRun({
      projectId: monitor.projectId,
      groupId: monitor.groupId,
      by,
      byType,
      record: {
        monitorId,
        startedAt,
        finishedAt,
        durationMs,
        windowStart,
        windowEnd,
        timeField: monitor.timeField,
        matchCount,
        alertCreated,
        alertId,
        suppressedReason,
        error: null,
      },
      storage,
    });

    const patch: Record<string, unknown> = { lastRunAt: finishedAt };
    if (alertCreated) {
      patch.lastAlertedAt = finishedAt;
    }

    await releaseMonitorLock({ monitorId, by, byType, patch });

    fimidxConsoleLogger.info({
      message: "[runMonitor]",
      monitorId,
      durationMs,
      matchCount,
      alertCreated,
      suppressedReason,
      emailSent,
      emailFailed,
    });

    return {
      skipped: false,
      suppressedReason,
      matchCount,
      alertCreated,
      alertId,
      monitorRunId: monitorRun.id,
      durationMs,
    };
  } catch (err) {
    const finishedAt = new Date();
    const errorMessage = err instanceof Error ? err.message : String(err);

    fimidxConsoleLogger.error({
      message: "[runMonitor] failed",
      monitorId,
      error: err,
    });

    try {
      await addMonitorRun({
        projectId: monitor.projectId,
        groupId: monitor.groupId,
        by,
        byType,
        record: {
          monitorId,
          startedAt,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          windowStart,
          windowEnd,
          timeField: monitor.timeField,
          matchCount: 0,
          alertCreated: false,
          suppressedReason: null,
          error: errorMessage,
        },
        storage,
      });
    } catch (err) {
      fimidxConsoleLogger.error({
        message: "[runMonitor] failed to add monitor run",
        monitorId,
        error: err,
      });
    }

    await releaseMonitorLock({
      monitorId,
      by,
      byType,
      patch: { lastRunAt: finishedAt },
    });

    return {
      skipped: false,
      matchCount: 0,
      alertCreated: false,
      error: errorMessage,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }
}
