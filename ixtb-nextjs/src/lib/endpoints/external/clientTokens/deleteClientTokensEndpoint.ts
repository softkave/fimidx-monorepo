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

const kDeleteBatchSize = 100;

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
  const { by, byType } = getBy();
  const deleteMany = input.deleteMany ?? false;

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
      deleteMany,
      by,
      byType,
    });
    return;
  }

  // Caller lacks project-wide delete permission, so we must filter per token.
  //
  // Walk matches in pages. For each page, soft-delete the tokens we are
  // allowed to delete. Soft-deleted docs drop out of the default query, so
  // after a successful delete we reset to page 1 (the next undeleted matches
  // shift forward). If a page has only denied tokens, nothing is deleted and
  // those rows would stay on page 1 forever — so we advance to the next page
  // to skip them.
  let page = 1;
  let sawAny = false;
  let deletedAny = false;

  for (;;) {
    const result = await getClientTokens({
      args: {
        query: input.query,
        page,
        limit: deleteMany ? kDeleteBatchSize : 1,
      },
      projection: ["id"],
    });

    if (result.clientTokens.length === 0) {
      break;
    }
    sawAny = true;

    const permissionResults = await Promise.all(
      result.clientTokens.map(async (token) => {
        try {
          await checkPermissionForClientTokenOrUser({
            userId,
            clientToken: sessionClientToken,
            groupId,
            projectId,
            action: kFimidxPermissions.clientToken.delete,
          });
          return token.id;
        } catch {
          return null;
        }
      })
    );
    const allowedIds = permissionResults.filter((id): id is string => id != null);

    if (allowedIds.length > 0) {
      await deleteClientTokens({
        query: { projectId, groupId, id: { in: allowedIds } },
        deleteMany: true,
        by,
        byType,
      });
      deletedAny = true;
      page = 1;
    } else {
      page++;
    }

    if (!deleteMany) {
      break;
    }
    if (!result.hasMore && allowedIds.length === 0) {
      break;
    }
  }

  if (sawAny && !deletedAny) {
    throw new OwnServerError(
      "No client tokens found with permission to delete",
      kOwnServerErrorCodes.Forbidden
    );
  }
};
