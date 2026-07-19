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
  updateMonitors,
} from "fimidx-core/serverHelpers/index";
import { nodeMonitorCallbackScheduler } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateMonitorsInput } from "../../utils/sanitizeKId0";

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

  // Sync callback for matching monitors (status/interval may have changed)
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
      const { monitors } = await getMonitors({
        args: { query: input.query, limit: 100 },
      });
      for (const monitor of monitors) {
        await syncMonitorCallback({
          monitor,
          by,
          byType,
          scheduler: nodeMonitorCallbackScheduler,
        });
      }
    }
  } catch (err) {
    fimidxConsoleLogger.error({
      message: "[updateMonitorsEndpoint] syncMonitorCallback failed",
      error: err,
    });
  }

  return { success: true };
};
