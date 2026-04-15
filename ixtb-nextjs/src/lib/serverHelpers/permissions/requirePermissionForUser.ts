import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { kId0 } from "fimidx-core/definitions/system";
import {
  checkMemberPermissions,
  getMembers,
} from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";

/**
 * Requires that the user (member) has either the specific action or wildcard on
 * the given target. Throws 403 if neither permission is present.
 *
 * Use for user-authenticated endpoints. projectId is always kId0; groupId is
 * the org id (target org we're checking against).
 */
export async function requirePermissionForUser(params: {
  userId: string;
  orgId: string;
  action: string;
  target: string;
}): Promise<void> {
  const { userId, orgId, action, target } = params;

  // TODO: refactor to use userId directly in checkMemberPermissions when it's
  // implemented
  const { members } = await getMembers({
    args: {
      query: {
        projectId: kId0,
        groupId: orgId,
        meta: [
          {
            op: "eq",
            field: "userId",
            value: userId,
          },
        ],
      },
    },
  });

  const member = first(members);
  if (!member) {
    throw new OwnServerError("Member not found", kOwnServerErrorCodes.NotFound);
  }

  const { results } = await checkMemberPermissions({
    args: {
      query: {
        projectId: kId0,
        groupId: orgId,
        id: member.id,
      },
      items: [
        { action, target },
        { action: kFimidxPermissions.wildcard, target },
        ...(target !== orgId
          ? [
              { action, target: orgId },
              { action: kFimidxPermissions.wildcard, target: orgId },
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
    fimidxConsoleLogger.error("User does not have permission", {
      userId,
      orgId,
      action,
      target,
    });
    throw new OwnServerError("Forbidden", kOwnServerErrorCodes.Forbidden);
  }
}
