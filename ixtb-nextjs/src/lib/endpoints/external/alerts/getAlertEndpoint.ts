import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import {
  getAlertSchema,
  type IGetAlertEndpointResponse,
} from "fimidx-core/definitions/alert";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getAlertById } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const getAlertEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetAlertEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getAlertSchema.parse(await req.json());
  const alert = await getAlertById({ alertId: input.alertId });
  assert.ok(
    alert,
    new OwnServerError("Alert not found", kOwnServerErrorCodes.NotFound)
  );

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: alert.projectId,
    action: kFimidxPermissions.alert.read,
  });

  return { alert };
};
