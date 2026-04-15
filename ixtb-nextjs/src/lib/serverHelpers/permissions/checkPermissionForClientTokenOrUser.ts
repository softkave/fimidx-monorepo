import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { fimidxConsoleLogger } from "fimidx-core/common/logger/fimidx-console-logger";
import type { IClientToken } from "fimidx-core/definitions/clientToken";
import { getOrgIdFromProjectId } from ".";
import { requirePermissionForClientToken } from "./requirePermissionForClientToken";
import { requirePermissionForUser } from "./requirePermissionForUser";

type BaseParams = {
  groupId?: string;
  projectId: string;
  action: string;
  clientToken?: IClientToken;
  userId?: string;
};

export async function checkPermissionForClientTokenOrUser(
  params: BaseParams
): Promise<void> {
  const { projectId, action, clientToken, userId } = params;

  const groupId = params.groupId ?? (await getOrgIdFromProjectId(projectId));

  if (clientToken) {
    await requirePermissionForClientToken({
      action,
      projectId,
      groupId,
      clientToken,
      target: projectId,
    });
    return;
  }

  if (userId) {
    await requirePermissionForUser({
      action,
      userId,
      orgId: groupId,
      target: projectId,
    });
    return;
  }

  fimidxConsoleLogger.error("No user or client token provided", {
    projectId,
    action,
    groupId,
  });
  throw new OwnServerError("Unauthorized", kOwnServerErrorCodes.Unauthorized);
}
