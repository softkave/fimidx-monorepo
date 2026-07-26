import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { runMonitorSchema } from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  getMonitorById,
  runMonitor,
  type IRunMonitorResult,
} from "fimidx-core/serverHelpers/index";
import { sendMonitorAlertEmail } from "../../../serverHelpers/emails/sendMonitorAlertEmail";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const runMonitorEndpoint: NextMaybeAuthenticatedEndpointFn<
  IRunMonitorResult
> = async (params) => {
  const {
    req,
    session: { clientToken, getBy, userId },
  } = params;

  const input = runMonitorSchema.parse(await req.json());
  const monitor = await getMonitorById({ monitorId: input.monitorId });
  assert.ok(
    monitor,
    new OwnServerError("Monitor not found", kOwnServerErrorCodes.NotFound)
  );

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: monitor.projectId,
    action: kFimidxPermissions.monitor.mutate,
  });

  const { by, byType } = getBy();
  return runMonitor({
    monitorId: input.monitorId,
    by,
    byType,
    sendAlertEmail: async ({ to, monitor: m, alert, matchCount }) => {
      return sendMonitorAlertEmail({
        to,
        monitor: m,
        alert,
        matchCount,
      });
    },
  });
};
