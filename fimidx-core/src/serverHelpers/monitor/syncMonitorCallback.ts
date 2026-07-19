/**
 * Keeps a periodic callback in sync for each enabled monitor.
 *
 * Monitors do not have a separate scheduler. Evaluation is driven by the
 * existing callback runner: each enabled monitor owns one callback (keyed by
 * `__fimidx_monitor_<id>`) that POSTs to `/api/internal/monitors/run` on the
 * monitor's interval. Create/update/delete of monitors call these helpers so
 * the callback schedule matches monitor state.
 *
 * Callers must pass a `scheduler` that talks to the node-server callback APIs
 * (or updates the in-process store) so timers stay in sync.
 */
import { getMsFromDuration } from "../../common/date.js";
import { getCoreConfig } from "../../common/getCoreConfig.js";
import { fimidxConsoleLogger } from "../../common/logger/fimidx-console-logger.js";
import type {
  AddCallbackEndpointArgs,
  ICallback,
} from "../../definitions/callback.js";
import type { IMonitor } from "../../definitions/monitor.js";
import { kMonitorStatus } from "../../definitions/monitor.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";

/** Stable idempotency key so each monitor maps to at most one callback. */
export function getMonitorCallbackIdempotencyKey(monitorId: string) {
  return `__fimidx_monitor_${monitorId}`;
}

export function getMonitorCallbackName(monitorId: string) {
  return `__fimidx_monitor_${monitorId}`;
}

/**
 * Pluggable add/delete used by monitor sync so callers can route through the
 * node-server (which owns the in-memory timer store) instead of Mongo only.
 */
export interface IMonitorCallbackScheduler {
  deleteByIdempotencyKey: (params: {
    idempotencyKey: string;
    by: string;
    storage?: IObjStorage;
  }) => Promise<void>;
  add: (params: {
    args: AddCallbackEndpointArgs;
    projectId: string;
    groupId: string;
    by: string;
    byType: string;
    storage?: IObjStorage;
  }) => Promise<ICallback | void>;
}

/**
 * Recreate the runner callback for a monitor.
 *
 * Deletes any existing callback for this monitor, then creates a new one when
 * the monitor is enabled. Recreate-on-sync picks up interval/status/URL changes
 * without a separate update path. No-ops (after cleanup) when disabled or when
 * `app.publicURL` is missing (callback needs an absolute run URL).
 */
export async function syncMonitorCallback(params: {
  monitor: IMonitor;
  by: string;
  byType: string;
  scheduler: IMonitorCallbackScheduler;
  storage?: IObjStorage;
}) {
  const { monitor, by, byType, storage, scheduler } = params;
  const idempotencyKey = getMonitorCallbackIdempotencyKey(monitor.id);

  await scheduler.deleteByIdempotencyKey({ idempotencyKey, by, storage });

  if (monitor.status !== kMonitorStatus.enabled) {
    return { synced: false as const };
  }

  const {
    fimidxInternal: { internalAccessKey },
    app: { publicURL },
  } = getCoreConfig();

  if (!publicURL) {
    fimidxConsoleLogger.warn({
      message:
        "[syncMonitorCallback] No app.publicURL configured; skipping callback sync",
      monitorId: monitor.id,
      by,
      byType,
    });
    return { synced: false as const };
  }

  const intervalMs = getMsFromDuration(monitor.interval);
  const url = `${publicURL.replace(/\/$/, "")}/api/internal/monitors/run`;

  await scheduler.add({
    args: {
      projectId: kId0,
      url,
      method: "POST",
      requestHeaders: {
        "x-internal-access-key": internalAccessKey,
        "content-type": "application/json",
      },
      requestBody: JSON.stringify({ monitorId: monitor.id }),
      intervalFrom: new Date().toISOString(),
      intervalMs,
      idempotencyKey,
      name: getMonitorCallbackName(monitor.id),
      description: `Monitor runner for ${monitor.name}`,
    },
    projectId: kId0,
    groupId: kId0,
    by,
    byType,
    storage,
  });

  return { synced: true as const };
}

/** Remove the runner callback when a monitor is deleted. */
export async function deleteMonitorCallback(params: {
  monitorId: string;
  by: string;
  scheduler: IMonitorCallbackScheduler;
  storage?: IObjStorage;
}) {
  const { monitorId, by, storage, scheduler } = params;
  const idempotencyKey = getMonitorCallbackIdempotencyKey(monitorId);
  await scheduler.deleteByIdempotencyKey({ idempotencyKey, by, storage });
}
