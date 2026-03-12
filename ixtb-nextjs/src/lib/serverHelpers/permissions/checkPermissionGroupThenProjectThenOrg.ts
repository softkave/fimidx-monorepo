import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import type { IClientToken } from "fimidx-core/definitions/clientToken";
import { getOrgIdFromProjectId } from "./getOrgIdFromProjectId";
import { requirePermissionForClientToken } from "./requirePermissionForClientToken";
import { requirePermissionForUser } from "./requirePermissionForUser";

type BaseParams = {
  groupId: string;
  projectId: string;
  action: string;
};

type WithUser = BaseParams & {
  userId: string;
  clientToken?: never;
};

type WithClientToken = BaseParams & {
  clientToken: IClientToken;
  userId?: never;
};

async function tryRequireClientToken(
  clientToken: IClientToken,
  action: string,
  target: string
): Promise<boolean> {
  try {
    await requirePermissionForClientToken({
      clientToken,
      action,
      target,
    });
    return true;
  } catch {
    return false;
  }
}

async function tryRequireUser(
  userId: string,
  orgId: string,
  action: string,
  target: string
): Promise<boolean> {
  try {
    await requirePermissionForUser({
      userId,
      orgId,
      action,
      target,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tries permission check in order: target = groupId, then projectId, then orgId.
 * For client token: skips org check if orgId === groupId. Throws if all attempts fail.
 * Use for: client tokens, members.
 */
export async function checkPermissionGroupThenProjectThenOrg(
  params: WithUser | WithClientToken
): Promise<void> {
  const { groupId, projectId, action } = params;

  if (params.clientToken) {
    if (
      await tryRequireClientToken(params.clientToken, action, groupId)
    ) {
      return;
    }
    if (
      await tryRequireClientToken(params.clientToken, action, projectId)
    ) {
      return;
    }
    const orgId = await getOrgIdFromProjectId(projectId);
    if (orgId !== groupId) {
      await requirePermissionForClientToken({
        clientToken: params.clientToken,
        action,
        target: orgId,
      });
      return;
    }
    throw new OwnServerError("Forbidden", kOwnServerErrorCodes.Forbidden);
  }

  if (await tryRequireUser(params.userId, groupId, action, groupId)) {
    return;
  }
  const orgIdFromProject = await getOrgIdFromProjectId(projectId);
  if (await tryRequireUser(params.userId, orgIdFromProject, action, projectId)) {
    return;
  }
  if (groupId !== orgIdFromProject) {
    await requirePermissionForUser({
      userId: params.userId,
      orgId: orgIdFromProject,
      action,
      target: orgIdFromProject,
    });
    return;
  }
  throw new OwnServerError("Forbidden", kOwnServerErrorCodes.Forbidden);
}
