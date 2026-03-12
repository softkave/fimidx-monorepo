import { deleteClientTokensSchema } from "fimidx-core/definitions/clientToken";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  deleteClientTokens,
  getClientTokens,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionGroupThenProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteClientTokensInput } from "../../utils/sanitizeKId0";

export const deleteClientTokensEndpoint: NextMaybeAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken: sessionClientToken, userId },
  } = params;

  const input = deleteClientTokensSchema.parse(await req.json());
  sanitizeDeleteClientTokensInput(input);
  const query = input.query as { projectId: string; groupId: string };
  const { groupId, projectId } = query;

  let allowed = false;
  try {
    if (sessionClientToken) {
      await checkPermissionGroupThenProjectThenOrg({
        clientToken: sessionClientToken,
        groupId,
        projectId,
        action: kFimidxPermissions.clientToken.delete,
      });
    } else if (userId) {
      await checkPermissionGroupThenProjectThenOrg({
        userId,
        groupId,
        projectId,
        action: kFimidxPermissions.clientToken.delete,
      });
    }
    allowed = true;
  } catch {
    // fall through to per-token filter
  }

  if (allowed) {
    await deleteClientTokens({
      query: input.query,
      by: getBy().by,
      byType: getBy().byType,
    });
    return;
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
            action: kFimidxPermissions.clientToken.delete,
          });
        } else if (userId) {
          await checkPermissionGroupThenProjectThenOrg({
            userId,
            groupId: token.groupId,
            projectId: token.projectId,
            action: kFimidxPermissions.clientToken.delete,
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
    await deleteClientTokens({
      query: { projectId, groupId, id: { in: allowedIds } },
      deleteMany: true,
      by: getBy().by,
      byType: getBy().byType,
    });
  }
};
