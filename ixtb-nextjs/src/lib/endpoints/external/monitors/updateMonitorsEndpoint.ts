import {
  IUpdateMonitorsEndpointResponse,
  kFimidxPermissions,
  updateMonitorsSchema,
} from "fimidx-core/definitions/index";
import { updateMonitors } from "fimidx-core/serverHelpers/index";
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

  await updateMonitors({
    args: input,
    by: getBy().by,
    byType: getBy().byType,
  });

  const response: IUpdateMonitorsEndpointResponse = {
    success: true,
  };

  return response;
};
