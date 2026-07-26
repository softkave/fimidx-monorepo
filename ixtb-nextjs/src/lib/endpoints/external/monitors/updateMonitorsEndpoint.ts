import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";
import {
  IUpdateMonitorsEndpointResponse,
  kFimidxPermissions,
  updateMonitorsSchema,
} from "fimidx-core/definitions/index";
import {
  getMonitorById,
  getMonitors,
  syncMonitorCallback,
  syncMonitorCallbacks,
  updateMonitors,
} from "fimidx-core/serverHelpers/index";
import { nodeMonitorCallbackScheduler } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateMonitorsInput } from "../../utils/sanitizeKId0";

const kSyncPageSize = 100;

/** Runner callbacks only depend on schedule fields, not evaluation config. */
function updateNeedsCallbackSync(update: {
  status?: unknown;
  interval?: unknown;
}): boolean {
  return update.status !== undefined || update.interval !== undefined;
}

/** Fetch one page, batch-sync, next page until exhausted. */
async function syncMonitorsForQueryPaged(params: {
  query: { projectId: string; [key: string]: unknown };
  by: string;
  byType: string;
}): Promise<{ errorCount: number; syncedCount: number }> {
  const { query, by, byType } = params;
  let page = 1;
  let hasMore = true;
  let errorCount = 0;
  let syncedCount = 0;

  while (hasMore) {
    const result = await getMonitors({
      args: { query: query as never, page, limit: kSyncPageSize },
    });

    const batch = await syncMonitorCallbacks({
      monitors: result.monitors,
      by,
      byType,
      scheduler: nodeMonitorCallbackScheduler,
    });
    syncedCount += batch.syncedCount;
    errorCount += batch.errors.length;

    for (const err of batch.errors) {
      fimidxConsoleLogger.error({
        message: "[updateMonitorsEndpoint] syncMonitorCallback failed",
        error: err.error,
        monitorId: err.monitorId,
      });
    }

    hasMore = result.hasMore;
    page++;
  }

  return { errorCount, syncedCount };
}

export const updateMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IUpdateMonitorsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken, userId },
  } = params;

  const input = updateMonitorsSchema.parse(await req.json());
  sanitizeUpdateMonitorsInput(input);
  const projectId = input.query.projectId;

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId,
    action: kFimidxPermissions.monitor.mutate,
  });

  const { by, byType } = getBy();
  await updateMonitors({
    args: input,
    by,
    byType,
  });

  if (!updateNeedsCallbackSync(input.update)) {
    return { success: true };
  }

  // Sync callback for matching monitors (status/interval changed)
  try {
    if (input.query.id?.eq) {
      const monitor = await getMonitorById({ monitorId: input.query.id.eq });
      if (monitor) {
        await syncMonitorCallback({
          monitor,
          by,
          byType,
          scheduler: nodeMonitorCallbackScheduler,
        });
      }
    } else {
      const { errorCount } = await syncMonitorsForQueryPaged({
        query: input.query,
        by,
        byType,
      });
      if (errorCount > 0) {
        throw new OwnServerError(
          `Monitor updated but scheduler sync failed for ${errorCount} monitor(s)`,
          kOwnServerErrorCodes.InternalServerError
        );
      }
    }
  } catch (err) {
    fimidxConsoleLogger.error({
      message: "[updateMonitorsEndpoint] syncMonitorCallback failed",
      error: err,
      by,
      byType,
    });
    if (OwnServerError.isOwnServerError(err)) {
      throw err;
    }

    throw new OwnServerError(
      "Monitor updated but scheduler sync failed; retry update to register the runner",
      kOwnServerErrorCodes.InternalServerError
    );
  }

  return { success: true };
};
