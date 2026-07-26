import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import {
  acknowledgeAlertSchema,
  type IAcknowledgeAlertEndpointResponse,
} from "fimidx-core/definitions/alert";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  acknowledgeAlert,
  getAlertById,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const acknowledgeAlertEndpoint: NextMaybeAuthenticatedEndpointFn<
  IAcknowledgeAlertEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, getBy, userId },
  } = params;

  const input = acknowledgeAlertSchema.parse(await req.json());
  const existing = await getAlertById({ alertId: input.alertId });
  assert.ok(
    existing,
    new OwnServerError("Alert not found", kOwnServerErrorCodes.NotFound)
  );

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: existing.projectId,
    action: kFimidxPermissions.alert.mutate,
  });

  const { by, byType } = getBy();
  return acknowledgeAlert({
    alertId: input.alertId,
    acknowledged: input.acknowledged ?? true,
    by,
    byType,
  });
};
