import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/index";
import { deleteMonitorsSchema } from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  deleteMonitorCallbacks,
  deleteMonitors,
  getMonitors,
} from "fimidx-core/serverHelpers/index";
import { nodeMonitorCallbackScheduler } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMonitorsInput } from "../../utils/sanitizeKId0";

const kSyncPageSize = 100;

export const deleteMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken, userId },
  } = params;

  const input = deleteMonitorsSchema.parse(await req.json());
  sanitizeDeleteMonitorsInput(input);
  const projectId = input.query.projectId;

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId,
    action: kFimidxPermissions.monitor.delete,
  });

  const { by, byType } = getBy();

  // Fetch pages before delete so we can remove runners; cleanup per page so we
  // never hold the full set in memory.
  const monitorIds: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await getMonitors({
      args: { query: input.query as never, page, limit: kSyncPageSize },
      projection: ["id"],
    });
    monitorIds.push(...result.monitors.map((m) => m.id));
    hasMore = result.hasMore;
    page++;
  }

  await deleteMonitors({
    ...input,
    by,
    byType,
  });

  try {
    await deleteMonitorCallbacks({
      monitorIds,
      by,
      scheduler: nodeMonitorCallbackScheduler,
    });
  } catch (err) {
    fimidxConsoleLogger.error({
      message: "[deleteMonitorsEndpoint] deleteMonitorCallbacks failed",
      error: err,
      by,
      byType,
      count: monitorIds.length,
    });
    throw new OwnServerError(
      "Monitors deleted but scheduler cleanup failed",
      kOwnServerErrorCodes.InternalServerError
    );
  }
};
