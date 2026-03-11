import {
  GetClientTokensEndpointResponse,
  getClientTokensSchema,
} from "fimidx-core/definitions/clientToken";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getClientTokens } from "fimidx-core/serverHelpers/index";
import {
  checkPermissionGroupThenProjectThenOrg,
  getOrgIdFromProjectId,
} from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetClientTokensInput } from "../../utils/sanitizeKId0";

export const getClientTokensEndpoint: NextMaybeAuthenticatedEndpointFn<
  GetClientTokensEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const body = await req.json();
  const input = getClientTokensSchema.parse(body);
  if (input.query?.projectId && !input.query.groupId) {
    input.query.groupId = await getOrgIdFromProjectId(input.query.projectId);
  }

  sanitizeGetClientTokensInput(input);

  const query = input.query as { projectId: string; groupId: string };
  const { groupId, projectId } = query;
  if (clientToken) {
    await checkPermissionGroupThenProjectThenOrg({
      clientToken,
      groupId,
      projectId,
      action: kFimidxPermissions.clientToken.read,
    });
    if (input.includePermissions) {
      await checkPermissionGroupThenProjectThenOrg({
        clientToken,
        groupId,
        projectId,
        action: kFimidxPermissions.clientToken.readPermissions,
      });
    }
  } else if (userId) {
    await checkPermissionGroupThenProjectThenOrg({
      userId,
      groupId,
      projectId,
      action: kFimidxPermissions.clientToken.read,
    });
    if (input.includePermissions) {
      await checkPermissionGroupThenProjectThenOrg({
        userId,
        groupId,
        projectId,
        action: kFimidxPermissions.clientToken.readPermissions,
      });
    }
  } else {
    throw new OwnServerError("Unauthorized", kOwnServerErrorCodes.Unauthorized);
  }

  const { clientTokens, page, limit, hasMore } = await getClientTokens({
    args: input,
  });

  const response: GetClientTokensEndpointResponse = {
    clientTokens,
    page,
    limit,
    hasMore,
  };

  return response;
};
