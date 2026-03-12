import {
  UpdateClientTokensEndpointResponse,
  updateClientTokensSchema,
} from "fimidx-core/definitions/clientToken";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  getClientTokens,
  updateClientTokens,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionGroupThenProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateClientTokensInput } from "../../utils/sanitizeKId0";

export const updateClientTokensEndpoint: NextMaybeAuthenticatedEndpointFn<
  UpdateClientTokensEndpointResponse
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken: sessionClientToken, userId },
  } = params;

  const input = updateClientTokensSchema.parse(await req.json());
  sanitizeUpdateClientTokensInput(input);
  const query = input.query as { projectId: string; groupId: string };
  const { groupId, projectId } = query;

  let allowed = false;
  try {
    if (sessionClientToken) {
      await checkPermissionGroupThenProjectThenOrg({
        clientToken: sessionClientToken,
        groupId,
        projectId,
        action: kFimidxPermissions.clientToken.mutate,
      });
    } else if (userId) {
      await checkPermissionGroupThenProjectThenOrg({
        userId,
        groupId,
        projectId,
        action: kFimidxPermissions.clientToken.mutate,
      });
    }
    allowed = true;
  } catch {
    // fall through to per-token filter
  }

  if (allowed) {
    await updateClientTokens({
      args: input,
      by: getBy().by,
      byType: getBy().byType,
    });
    return { success: true };
  }

  const { clientTokens } = await getClientTokens({
    args: { query: input.query, limit: 1000 },
  });
  const results = await Promise.all(
    clientTokens.map(async (token) => {
      try {
        if (sessionClientToken) {
          await checkPermissionGroupThenProjectThenOrg({
            clientToken: sessionClientToken,
            groupId: token.groupId,
            projectId: token.projectId,
            action: kFimidxPermissions.clientToken.mutate,
          });
        } else if (userId) {
          await checkPermissionGroupThenProjectThenOrg({
            userId,
            groupId: token.groupId,
            projectId: token.projectId,
            action: kFimidxPermissions.clientToken.mutate,
          });
        }
        return token.id;
      } catch {
        return null;
      }
    })
  );
  const allowedIds = results.filter((id): id is string => id != null);
  if (allowedIds.length > 0) {
    await updateClientTokens({
      args: {
        query: { projectId, groupId, id: { in: allowedIds } },
        update: input.update,
        updateMany: true,
      },
      by: getBy().by,
      byType: getBy().byType,
    });
  }

  return { success: true };
};
