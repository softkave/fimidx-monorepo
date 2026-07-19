import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { getAlertLogsSchema } from "fimidx-core/definitions/alert";
import type { GetLogsEndpointResponse } from "fimidx-core/definitions/log";
import { kObjTags } from "fimidx-core/definitions/obj";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  buildMonitorLogQuery,
  getAlertById,
} from "fimidx-core/serverHelpers/index";
import { getManyObjs } from "fimidx-core/serverHelpers/obj/getObjs";
import { objToLog } from "fimidx-core/serverHelpers/logs/objToLog";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const getAlertLogsEndpoint: NextMaybeAuthenticatedEndpointFn<
  GetLogsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getAlertLogsSchema.parse(await req.json());
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

  const pageNumber = input.page ?? 1;
  const limitNumber = input.limit ?? 50;

  const objQuery = buildMonitorLogQuery({
    projectId: alert.projectId,
    filters: alert.filters,
    timeField: alert.timeField,
    windowStart: new Date(alert.windowStart),
    windowEnd: new Date(alert.windowEnd),
  });

  const result = await getManyObjs({
    objQuery,
    tag: kObjTags.log,
    page: pageNumber - 1,
    limit: limitNumber,
  });

  return {
    logs: result.objs.map(objToLog),
    page: pageNumber,
    limit: limitNumber,
    hasMore: result.hasMore,
  };
};
