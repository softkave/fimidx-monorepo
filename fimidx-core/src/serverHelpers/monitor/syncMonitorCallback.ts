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
import type {
  AddCallbackEndpointArgs,
  ICallback,
} from "../../definitions/callback.js";
import type { IMonitor } from "../../definitions/monitor.js";
import { kMonitorStatus } from "../../definitions/monitor.js";
import { kId0 } from "../../definitions/system.js";
import type { IObjStorage } from "../../storage/types.js";

/** Aligns with stringMetaQuerySchema `in` max and node add batch max. */
export const kMonitorCallbackBatchSize = 100;

/** Stable idempotency key so each monitor maps to at most one callback. */
export function getMonitorCallbackIdempotencyKey(monitorId: string) {
  return `__fimidx_monitor_${monitorId}`;
}

export function getMonitorCallbackName(monitorId: string) {
  return `__fimidx_monitor_${monitorId}`;
}

export type IMonitorCallbackAddParams = {
  args: AddCallbackEndpointArgs;
  projectId: string;
  groupId: string;
  by: string;
  byType: string;
  storage?: IObjStorage;
};

export type IMonitorCallbackAddResult = {
  success: boolean;
  callback?: ICallback | void;
  error?: unknown;
};

/**
 * Pluggable add/delete used by monitor sync so callers can route through the
 * node-server (which owns the in-memory timer store) instead of Mongo only.
 */
export interface IMonitorCallbackScheduler {
  deleteByIdempotencyKeys: (params: {
    idempotencyKeys: string[];
    by: string;
    storage?: IObjStorage;
  }) => Promise<void>;
  addMany: (params: {
    items: IMonitorCallbackAddParams[];
  }) => Promise<IMonitorCallbackAddResult[]>;
  /** Convenience: single-key delete via deleteByIdempotencyKeys. */
  deleteByIdempotencyKey: (params: {
    idempotencyKey: string;
    by: string;
    storage?: IObjStorage;
  }) => Promise<void>;
  /** Convenience: single add via addMany. */
  add: (params: IMonitorCallbackAddParams) => Promise<ICallback | void>;
}

export function wrapMonitorCallbackScheduler(
  batch: Pick<
    IMonitorCallbackScheduler,
    "deleteByIdempotencyKeys" | "addMany"
  >
): IMonitorCallbackScheduler {
  return {
    ...batch,
    async deleteByIdempotencyKey(params) {
      await batch.deleteByIdempotencyKeys({
        idempotencyKeys: [params.idempotencyKey],
        by: params.by,
        storage: params.storage,
      });
    },
    async add(params) {
      const [result] = await batch.addMany({ items: [params] });
      if (!result?.success) {
        throw result?.error ?? new Error("Failed to add monitor callback");
      }
      return result.callback;
    },
  };
}

function buildAddParams(params: {
  monitor: IMonitor;
  by: string;
  byType: string;
  storage?: IObjStorage;
  publicURL: string;
  internalAccessKey: string;
  idempotencyKey: string;
}): IMonitorCallbackAddParams {
  const {
    monitor,
    by,
    byType,
    storage,
    publicURL,
    internalAccessKey,
    idempotencyKey,
  } = params;
  const intervalMs = getMsFromDuration(monitor.interval);
  const url = `${publicURL.replace(/\/$/, "")}/api/internal/monitors/run`;

  return {
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
  };
}

async function deleteKeysInChunks(params: {
  scheduler: IMonitorCallbackScheduler;
  idempotencyKeys: string[];
  by: string;
  storage?: IObjStorage;
}) {
  const { scheduler, idempotencyKeys, by, storage } = params;
  for (let i = 0; i < idempotencyKeys.length; i += kMonitorCallbackBatchSize) {
    const chunk = idempotencyKeys.slice(i, i + kMonitorCallbackBatchSize);
    await scheduler.deleteByIdempotencyKeys({
      idempotencyKeys: chunk,
      by,
      storage,
    });
  }
}

/**
 * Recreate the runner callback for a monitor.
 *
 * Disabled monitors: delete by idempotency key only.
 * Enabled without publicURL: do not delete (keeps any existing runner) and throw.
 * Enabled with publicURL: delete then add; on add failure, best-effort restore then rethrow.
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

  if (monitor.status !== kMonitorStatus.enabled) {
    await scheduler.deleteByIdempotencyKey({ idempotencyKey, by, storage });
    return { synced: false as const };
  }

  const {
    fimidxInternal: { internalAccessKey },
    app: { publicURL },
  } = getCoreConfig();

  if (!publicURL) {
    throw new Error(
      "Cannot sync enabled monitor without app.publicURL; existing runner left unchanged"
    );
  }

  const addParams = buildAddParams({
    monitor,
    by,
    byType,
    storage,
    publicURL,
    internalAccessKey,
    idempotencyKey,
  });

  await scheduler.deleteByIdempotencyKey({ idempotencyKey, by, storage });

  try {
    await scheduler.add(addParams);
  } catch (err) {
    try {
      await scheduler.add(addParams);
    } catch {
      // Best-effort restore failed; original error is what callers care about.
    }
    throw err;
  }

  return { synced: true as const };
}

/**
 * Sync many monitors with batched delete/add (chunks of
 * {@link kMonitorCallbackBatchSize}). Per-item failures are collected; others
 * still succeed.
 */
export async function syncMonitorCallbacks(params: {
  monitors: IMonitor[];
  by: string;
  byType: string;
  scheduler: IMonitorCallbackScheduler;
  storage?: IObjStorage;
}): Promise<{
  syncedCount: number;
  errors: Array<{ monitorId: string; error: unknown }>;
}> {
  const { monitors, by, byType, storage, scheduler } = params;
  const errors: Array<{ monitorId: string; error: unknown }> = [];
  let syncedCount = 0;

  const disabled = monitors.filter((m) => m.status !== kMonitorStatus.enabled);
  const enabled = monitors.filter((m) => m.status === kMonitorStatus.enabled);

  if (disabled.length > 0) {
    await deleteKeysInChunks({
      scheduler,
      idempotencyKeys: disabled.map((m) =>
        getMonitorCallbackIdempotencyKey(m.id)
      ),
      by,
      storage,
    });
  }

  if (enabled.length === 0) {
    return { syncedCount, errors };
  }

  const {
    fimidxInternal: { internalAccessKey },
    app: { publicURL },
  } = getCoreConfig();

  if (!publicURL) {
    for (const monitor of enabled) {
      errors.push({
        monitorId: monitor.id,
        error: new Error(
          "Cannot sync enabled monitor without app.publicURL; existing runner left unchanged"
        ),
      });
    }
    return { syncedCount, errors };
  }

  await deleteKeysInChunks({
    scheduler,
    idempotencyKeys: enabled.map((m) => getMonitorCallbackIdempotencyKey(m.id)),
    by,
    storage,
  });

  for (let i = 0; i < enabled.length; i += kMonitorCallbackBatchSize) {
    const chunk = enabled.slice(i, i + kMonitorCallbackBatchSize);
    const addItems = chunk.map((monitor) =>
      buildAddParams({
        monitor,
        by,
        byType,
        storage,
        publicURL,
        internalAccessKey,
        idempotencyKey: getMonitorCallbackIdempotencyKey(monitor.id),
      })
    );

    let results = await scheduler.addMany({ items: addItems });

    const failedIndexes: number[] = [];
    for (let j = 0; j < results.length; j++) {
      if (!results[j]?.success) {
        failedIndexes.push(j);
      }
    }

    if (failedIndexes.length > 0) {
      const retryItems = failedIndexes.map((idx) => addItems[idx]);
      const retryResults = await scheduler.addMany({ items: retryItems });
      for (let r = 0; r < failedIndexes.length; r++) {
        results[failedIndexes[r]] = retryResults[r];
      }
    }

    for (let j = 0; j < chunk.length; j++) {
      const result = results[j];
      if (result?.success) {
        syncedCount++;
      } else {
        errors.push({
          monitorId: chunk[j].id,
          error: result?.error ?? new Error("Failed to add monitor callback"),
        });
      }
    }
  }

  return { syncedCount, errors };
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

/** Remove runner callbacks for many monitors (batched deletes). */
export async function deleteMonitorCallbacks(params: {
  monitorIds: string[];
  by: string;
  scheduler: IMonitorCallbackScheduler;
  storage?: IObjStorage;
}) {
  const { monitorIds, by, storage, scheduler } = params;
  await deleteKeysInChunks({
    scheduler,
    idempotencyKeys: monitorIds.map(getMonitorCallbackIdempotencyKey),
    by,
    storage,
  });
}
