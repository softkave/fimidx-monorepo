import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { previewMonitorSchema } from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  getMonitorById,
  previewMonitorMatches,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const previewMonitorEndpoint: NextMaybeAuthenticatedEndpointFn<
  Awaited<ReturnType<typeof previewMonitorMatches>>
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = previewMonitorSchema.parse(await req.json());
  const monitor = await getMonitorById({ monitorId: input.monitorId });
  assert.ok(
    monitor,
    new OwnServerError("Monitor not found", kOwnServerErrorCodes.NotFound)
  );

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: monitor.projectId,
    action: kFimidxPermissions.monitor.read,
  });

  return previewMonitorMatches({ monitor });
};
