import {
  getMonitorRunsSchema,
  type IGetMonitorRunsEndpointResponse,
} from "fimidx-core/definitions/monitorRun";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getMonitorRuns } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const getMonitorRunsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetMonitorRunsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getMonitorRunsSchema.parse(await req.json());

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: input.query.projectId,
    action: kFimidxPermissions.monitor.read,
  });

  return getMonitorRuns({ args: input });
};
