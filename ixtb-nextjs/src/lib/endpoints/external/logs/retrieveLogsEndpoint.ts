import {
  GetLogsEndpointResponse,
  getLogsSchema,
} from "fimidx-core/definitions/log";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getLogs } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetLogsInput } from "../../utils/sanitizeKId0";
import { OwnServerError, kOwnServerErrorCodes } from "fimidx-core/common/error";

export const retrieveLogsEndpoint: NextMaybeAuthenticatedEndpointFn<
  GetLogsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getLogsSchema.parse(await req.json());
  sanitizeGetLogsInput(input);
  const projectId = input.query.projectId;

  if (clientToken) {
    await checkPermissionProjectThenOrg({
      clientToken,
      projectId,
      action: kFimidxPermissions.log.read,
    });
  } else if (userId) {
    await checkPermissionProjectThenOrg({
      userId,
      projectId,
      action: kFimidxPermissions.log.read,
    });
  } else {
    throw new OwnServerError("Unauthorized", kOwnServerErrorCodes.Unauthorized);
  }

  const { logs, page, limit, hasMore } = await getLogs({
    args: input,
  });

  const response: GetLogsEndpointResponse = {
    logs,
    page,
    limit,
    hasMore,
  };

  return response;
};
