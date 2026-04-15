import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";
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
  projectId: string;
  groupId: string;
  action: string;
  target: string;
}): Promise<void> {
  const { clientToken, projectId, groupId, action, target } = params;

  if (clientToken.groupId !== groupId) {
    fimidxConsoleLogger.error({
      message: "Client token group id does not match expected",
      clientTokenId: clientToken.id,
      clientTokenGroupId: clientToken.groupId,
      projectId,
      groupId,
    });
    throw new OwnServerError("Forbidden", kOwnServerErrorCodes.Forbidden);
  }

  const { results } = await checkClientTokenPermissions({
    args: {
      query: {
        projectId,
        groupId,
        clientTokenId: clientToken.id,
      },
      items: [
        { entity: clientToken.id, action, target },
        { entity: clientToken.id, action: kFimidxPermissions.wildcard, target },
        ...(target !== groupId
          ? [
              { entity: clientToken.id, action, target: groupId },
              {
                entity: clientToken.id,
                action: kFimidxPermissions.wildcard,
                target: groupId,
              },
            ]
          : []),
      ],
    },
  });
  const hasTargetAction = results[0]?.isPermitted ?? false;
  const hasTargetWildcard = results[1]?.isPermitted ?? false;
  const hasOrgAction = results[2]?.isPermitted ?? false;
  const hasOrgWildcard = results[3]?.isPermitted ?? false;
  if (
    !hasTargetAction &&
    !hasTargetWildcard &&
    !hasOrgAction &&
    !hasOrgWildcard
  ) {
    fimidxConsoleLogger.error("Client token does not have permission", {
      clientTokenId: clientToken.id,
      projectId,
      groupId,
      action,
      target,
    });
    throw new OwnServerError("Forbidden", kOwnServerErrorCodes.Forbidden);
  }
}
