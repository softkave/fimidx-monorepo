import { fimidxConsoleLogger } from "fimidx-core/common/logger/index";
import { deleteMonitorsSchema } from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  deleteMonitorCallback,
  deleteMonitors,
  getMonitors,
} from "fimidx-core/serverHelpers/index";
import { nodeMonitorCallbackScheduler } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMonitorsInput } from "../../utils/sanitizeKId0";

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

  // Fetch before delete so we can remove callbacks
  const { monitors } = await getMonitors({
    args: { query: input.query, limit: 100 },
  });

  await deleteMonitors({
    ...input,
    by,
    byType,
  });

  for (const monitor of monitors) {
    try {
      await deleteMonitorCallback({
        monitorId: monitor.id,
        by,
        scheduler: nodeMonitorCallbackScheduler,
      });
    } catch (err) {
      fimidxConsoleLogger.error({
        message: "[deleteMonitorsEndpoint] deleteMonitorCallback failed",
        error: err,
        monitorId: monitor.id,
        by,
        byType,
      });
    }
  }
};
