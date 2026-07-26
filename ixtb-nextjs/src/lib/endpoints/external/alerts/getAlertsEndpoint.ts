import {
  getAlertsSchema,
  type IGetAlertsEndpointResponse,
} from "fimidx-core/definitions/alert";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getAlerts } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const getAlertsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetAlertsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getAlertsSchema.parse(await req.json());

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: input.query.projectId,
    action: kFimidxPermissions.alert.read,
  });

  return getAlerts({ args: input });
};
