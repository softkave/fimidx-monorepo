import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import type { IClientToken } from "fimidx-core/definitions/clientToken";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { checkClientTokenPermissions } from "fimidx-core/serverHelpers/index";

/**
 * Requires that the client token has either the specific action or wildcard on
 * the given target. Throws 403 if neither permission is present.
 *
 * Use for client-token-authenticated endpoints. Target is typically the project
 * id for project-scoped resources.
 */
export async function requirePermissionForClientToken(params: {
  clientToken: IClientToken;
  action: string;
  target: string;
}): Promise<void> {
  const { clientToken, action, target } = params;
  const { results } = await checkClientTokenPermissions({
    args: {
      projectId: clientToken.projectId,
      clientTokenId: clientToken.id,
      groupId: clientToken.groupId,
      items: [
        { entity: clientToken.id, action, target },
        { entity: clientToken.id, action: kFimidxPermissions.wildcard, target },
      ],
    },
  });
  const hasAction = results[0]?.isPermitted ?? false;
  const hasWildcard = results[1]?.isPermitted ?? false;
  if (!hasAction && !hasWildcard) {
    throw new OwnServerError("Forbidden", kOwnServerErrorCodes.Forbidden);
  }
}
