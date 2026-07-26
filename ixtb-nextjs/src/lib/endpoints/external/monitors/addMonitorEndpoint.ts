import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";
import {
  addMonitorSchema,
  IAddMonitorEndpointResponse,
} from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  addMonitor,
  getProjectById,
  syncMonitorCallback,
} from "fimidx-core/serverHelpers/index";
import { nodeMonitorCallbackScheduler } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddMonitorInput } from "../../utils/sanitizeKId0";

export const addMonitorEndpoint: NextMaybeAuthenticatedEndpointFn<
  IAddMonitorEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, getBy, userId },
  } = params;

  const input = addMonitorSchema.parse(await req.json());
  sanitizeAddMonitorInput(input);

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.monitor.mutate,
  });

  const project = await getProjectById({ id: input.projectId });
  assert.ok(
    project,
    new OwnServerError("Project not found", kOwnServerErrorCodes.NotFound)
  );

  const { by, byType } = getBy();
  const { monitor } = await addMonitor({
    args: input,
    by,
    byType,
    groupId: project.orgId,
  });

  try {
    await syncMonitorCallback({
      monitor,
      by,
      byType,
      scheduler: nodeMonitorCallbackScheduler,
    });
  } catch (err) {
    fimidxConsoleLogger.error({
      message: "[addMonitorEndpoint] syncMonitorCallback failed",
      error: err,
      monitorId: monitor.id,
      by,
      byType,
    });
    throw new OwnServerError(
      "Monitor created but scheduler sync failed; retry update to register the runner",
      kOwnServerErrorCodes.InternalServerError
    );
  }

  return { monitor };
};
