import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import {
  addMonitorSchema,
  IAddMonitorEndpointResponse,
} from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { addMonitor, getProjectById } from "fimidx-core/serverHelpers/index";
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

  const { monitor } = await addMonitor({
    args: input,
    by: getBy().by,
    byType: getBy().byType,
    groupId: project.orgId,
  });

  const response: IAddMonitorEndpointResponse = {
    monitor,
  };

  return response;
};
