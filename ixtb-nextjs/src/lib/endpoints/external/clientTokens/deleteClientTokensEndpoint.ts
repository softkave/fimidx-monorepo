import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { deleteClientTokensSchema } from "fimidx-core/definitions/clientToken";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  deleteClientTokens,
  getClientTokens,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
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
    await checkPermissionForClientTokenOrUser({
      userId,
      groupId,
      projectId,
      clientToken: sessionClientToken,
      action: kFimidxPermissions.clientToken.delete,
    });
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
        await checkPermissionForClientTokenOrUser({
          userId,
          clientToken: sessionClientToken,
          groupId: token.groupId,
          projectId: token.projectId,
          action: kFimidxPermissions.clientToken.delete,
        });
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
  } else if (allowedIds.length === 0 && clientTokens.length > 0) {
    throw new OwnServerError(
      "No client tokens found with permission to delete",
      kOwnServerErrorCodes.Forbidden
    );
  }
};
