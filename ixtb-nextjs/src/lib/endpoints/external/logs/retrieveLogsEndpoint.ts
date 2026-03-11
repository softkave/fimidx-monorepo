import {
  GetLogsEndpointResponse,
  getLogsSchema,
} from "fimidx-core/definitions/log";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getLogs } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import {
  checkPermissionProjectThenOrg,
} from "../../../serverHelpers/permissions";
import { sanitizeGetLogsInput } from "../../utils/sanitizeKId0";

export const retrieveLogsEndpoint: NextMaybeAuthenticatedEndpointFn<
  GetLogsEndpointResponse
> = async (params) => {
  const { req, session: { clientToken, userId } } = params;

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
