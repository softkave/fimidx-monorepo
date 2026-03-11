import {
  getMonitorsSchema,
  IGetMonitorsEndpointResponse,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { getMonitors } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetMonitorsInput } from "../../utils/sanitizeKId0";

export const getMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetMonitorsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getMonitorsSchema.parse(await req.json());
  sanitizeGetMonitorsInput(input);
  const projectId = input.query.projectId;

  if (clientToken) {
    await checkPermissionProjectThenOrg({
      clientToken,
      projectId,
      action: kFimidxPermissions.monitor.read,
    });
  } else if (userId) {
    await checkPermissionProjectThenOrg({
      userId,
      projectId,
      action: kFimidxPermissions.monitor.read,
    });
  }

  const { monitors, page, limit, hasMore } = await getMonitors({
    args: input,
  });

  const response: IGetMonitorsEndpointResponse = {
    monitors,
    page,
    limit,
    hasMore,
  };

  return response;
};
