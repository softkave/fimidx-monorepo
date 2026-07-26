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

type RunMonitorActor = {
  by: string;
  byType: string;
};

type RunMonitorContext = RunMonitorActor & {
  monitorId: string;
  startedAt: Date;
  storage?: IObjStorage;
};

const kStaleRunningMs = 15 * 60 * 1000;

/**
 * Atomically claim the per-monitor run lock.
 * Returns the claimed `runningAt` timestamp on success, or null if busy.
 *
 * Talks to Mongo directly via findOneAndUpdate. The obj storage layer cannot
 * express a conditional compare-and-set on a single field — its updates
 * read-merge-write the whole objRecord, which races under concurrent runs.
 * That race is exactly what this lock prevents, so bypassing storage here is
 * intentional (same idea as runSymbolication's direct Mongo reads).
 */
async function tryAcquireMonitorLock(params: {
  monitorId: string;
}): Promise<Date | null> {
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

  return claimed != null ? now : null;
}

/**
 * Clear the run lock and apply post-run fields (lastRunAt / lastAlertedAt).
 * Only the holder that set `runningAt` may clear it (ownership check), so a
 * stale takeover cannot have its lock cleared by the previous holder's release.
 * Uses a field-level $set so we do not clobber concurrent objRecord updates.
 */
async function releaseMonitorLock(params: {
  monitorId: string;
  claimedRunningAt: Date;
  by: string;
  byType: string;
  patch: Record<string, unknown>;
}) {
  const { monitorId, claimedRunningAt, by, byType, patch } = params;
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
      // Allow release after soft-delete so a mid-run delete cannot leave a
      // stuck lock.
      "objRecord.runningAt": claimedRunningAt,
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

function durationSince(startedAt: Date, finishedAt: Date = new Date()): number {
  return finishedAt.getTime() - startedAt.getTime();
}

/** Yield so a concurrent hard-delete can observe the held lock before we load. */
async function yieldAfterLockAcquired(
  afterLockAcquired?: () => Promise<void>
): Promise<void> {
  if (afterLockAcquired) {
    await afterLockAcquired();
    return;
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function handleConcurrentSkip(
  ctx: RunMonitorContext
): Promise<IRunMonitorResult> {
  const { monitorId, startedAt, by, byType, storage } = ctx;
  const finishedAt = new Date();
  const durationMs = durationSince(startedAt, finishedAt);
  const monitor = await getMonitorById({ monitorId, storage });

  if (!monitor) {
    return {
      skipped: true,
      suppressedReason: kMonitorRunSuppressedReasons.concurrent,
      matchCount: 0,
      alertCreated: false,
      durationMs,
    };
  }

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
    durationMs,
  };
}

function handleMissingMonitor(ctx: RunMonitorContext): IRunMonitorResult {
  // Deleted after acquire: soft-deleted docs can't be re-acquired
  // (deletedAt: null required), hard-deleted docs are gone — no release.
  return {
    skipped: true,
    matchCount: 0,
    alertCreated: false,
    error: "Monitor not found",
    durationMs: durationSince(ctx.startedAt),
  };
}

async function handleDisabledMonitor(params: {
  ctx: RunMonitorContext;
  monitor: IMonitor;
  claimedRunningAt: Date;
}): Promise<IRunMonitorResult> {
  const { ctx, monitor, claimedRunningAt } = params;
  const { monitorId, startedAt, by, byType, storage } = ctx;
  const finishedAt = new Date();
  const durationMs = durationSince(startedAt, finishedAt);
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
      durationMs,
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
    claimedRunningAt,
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
    durationMs,
  };
}

async function notifyAlertRecipients(params: {
  ctx: RunMonitorContext;
  monitor: IMonitor;
  alert: IAlert;
  matchCount: number;
  userIds: string[];
  sendAlertEmail?: SendMonitorAlertEmailFn;
}): Promise<{ emailSent: number; emailFailed: number }> {
  const { ctx, monitor, alert, matchCount, userIds, sendAlertEmail } = params;
  if (!sendAlertEmail || userIds.length === 0) {
    return { emailSent: 0, emailFailed: 0 };
  }

  const users = await getUsers(userIds);
  const emails = users
    .map((u) => u.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);

  if (emails.length === 0) {
    return { emailSent: 0, emailFailed: 0 };
  }

  try {
    const result = await sendAlertEmail({
      to: emails,
      monitor,
      alert,
      matchCount,
    });
    return { emailSent: result.sent, emailFailed: result.failed };
  } catch (err) {
    fimidxConsoleLogger.error({
      message: "[runMonitor] email send failed",
      error: err,
      monitorId: ctx.monitorId,
      by: ctx.by,
      byType: ctx.byType,
    });
    return { emailSent: 0, emailFailed: emails.length };
  }
}

async function createAlertAndNotify(params: {
  ctx: RunMonitorContext;
  monitor: IMonitor;
  windowStart: Date;
  windowEnd: Date;
  matchCount: number;
  sendAlertEmail?: SendMonitorAlertEmailFn;
}): Promise<{
  alertId: string;
  emailSent: number;
  emailFailed: number;
}> {
  const { ctx, monitor, windowStart, windowEnd, matchCount, sendAlertEmail } =
    params;
  const { by, byType, storage } = ctx;

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
      query: monitor.query ?? {},
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

  const { emailSent, emailFailed } = await notifyAlertRecipients({
    ctx,
    monitor,
    alert,
    matchCount,
    userIds,
    sendAlertEmail,
  });

  return { alertId: alert.id, emailSent, emailFailed };
}

async function recordFailedRun(params: {
  ctx: RunMonitorContext;
  monitor: IMonitor;
  windowStart: Date;
  windowEnd: Date;
  finishedAt: Date;
  errorMessage: string;
}): Promise<void> {
  const { ctx, monitor, windowStart, windowEnd, finishedAt, errorMessage } =
    params;
  const { monitorId, startedAt, by, byType, storage } = ctx;

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
        durationMs: durationSince(startedAt, finishedAt),
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
}

async function handleEvaluationFailure(params: {
  ctx: RunMonitorContext;
  monitor: IMonitor;
  claimedRunningAt: Date;
  windowStart: Date;
  windowEnd: Date;
  err: unknown;
}): Promise<IRunMonitorResult> {
  const { ctx, monitor, claimedRunningAt, windowStart, windowEnd, err } =
    params;
  const finishedAt = new Date();
  const errorMessage = err instanceof Error ? err.message : String(err);

  fimidxConsoleLogger.error({
    message: "[runMonitor] failed",
    monitorId: ctx.monitorId,
    error: err,
  });

  await recordFailedRun({
    ctx,
    monitor,
    windowStart,
    windowEnd,
    finishedAt,
    errorMessage,
  });

  // Do not advance lastRunAt on evaluation failure so the next successful
  // run re-evaluates the same window (no skipped logs).
  await releaseMonitorLock({
    monitorId: ctx.monitorId,
    claimedRunningAt,
    by: ctx.by,
    byType: ctx.byType,
    patch: {},
  });

  return {
    skipped: false,
    matchCount: 0,
    alertCreated: false,
    error: errorMessage,
    durationMs: durationSince(ctx.startedAt, finishedAt),
  };
}

async function evaluateAndFinishRun(params: {
  ctx: RunMonitorContext;
  monitor: IMonitor;
  claimedRunningAt: Date;
  dryRun?: boolean;
  sendAlertEmail?: SendMonitorAlertEmailFn;
}): Promise<IRunMonitorResult> {
  const { ctx, monitor, claimedRunningAt, dryRun, sendAlertEmail } = params;
  const { monitorId, startedAt, by, byType, storage } = ctx;

  let windowStart = startedAt;
  let windowEnd = startedAt;

  try {
    const window = computeMonitorWindow({ monitor });
    windowStart = window.windowStart;
    windowEnd = window.windowEnd;

    const matchCount = await countMonitorMatches({
      monitor,
      windowStart,
      windowEnd,
      storage,
    });

    let suppressedReason = getSuppressedReason(monitor, matchCount, windowEnd);
    let alertCreated = false;
    let alertId: string | null = null;
    let emailSent = 0;
    let emailFailed = 0;

    if (suppressedReason == null && !dryRun) {
      const alertResult = await createAlertAndNotify({
        ctx,
        monitor,
        windowStart,
        windowEnd,
        matchCount,
        sendAlertEmail,
      });
      alertCreated = true;
      alertId = alertResult.alertId;
      emailSent = alertResult.emailSent;
      emailFailed = alertResult.emailFailed;
    }

    if (dryRun && suppressedReason == null) {
      // Dry run would have alerted; mark as no suppressed reason but no alert
      suppressedReason = null;
    }

    const finishedAt = new Date();
    const durationMs = durationSince(startedAt, finishedAt);

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

    await releaseMonitorLock({
      monitorId,
      claimedRunningAt,
      by,
      byType,
      patch,
    });

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
    return handleEvaluationFailure({
      ctx,
      monitor,
      claimedRunningAt,
      windowStart,
      windowEnd,
      err,
    });
  }
}

export async function runMonitor(params: {
  monitorId: string;
  by?: string;
  byType?: string;
  storage?: IObjStorage;
  sendAlertEmail?: SendMonitorAlertEmailFn;
  /** When true, evaluate and write run history but never create alert/email. */
  dryRun?: boolean;
  /**
   * Invoked after the run lock is acquired and before the monitor is loaded.
   * Intended for tests that need to hard-delete mid-run without racing setImmediate.
   */
  afterLockAcquired?: () => Promise<void>;
}): Promise<IRunMonitorResult> {
  const startedAt = new Date();
  const ctx: RunMonitorContext = {
    monitorId: params.monitorId,
    startedAt,
    by: params.by ?? "system",
    byType: params.byType ?? kByTypes.system,
    storage: params.storage,
  };

  const claimedRunningAt = await tryAcquireMonitorLock({
    monitorId: ctx.monitorId,
  });

  if (!claimedRunningAt) {
    return handleConcurrentSkip(ctx);
  }

  await yieldAfterLockAcquired(params.afterLockAcquired);

  const monitor = await getMonitorById({
    monitorId: ctx.monitorId,
    storage: ctx.storage,
  });
  if (!monitor) {
    return handleMissingMonitor(ctx);
  }

  if (monitor.status === kMonitorStatus.disabled) {
    return handleDisabledMonitor({ ctx, monitor, claimedRunningAt });
  }

  return evaluateAndFinishRun({
    ctx,
    monitor,
    claimedRunningAt,
    dryRun: params.dryRun,
    sendAlertEmail: params.sendAlertEmail,
  });
}
