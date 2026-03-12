import type { IClientToken } from "fimidx-core/definitions/clientToken";
import { getOrgIdFromProjectId } from "./getOrgIdFromProjectId";
import { requirePermissionForClientToken } from "./requirePermissionForClientToken";
import { requirePermissionForUser } from "./requirePermissionForUser";

type BaseParams = {
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

/**
 * Tries permission check with target = projectId first; if that fails,
 * resolves org from project and tries with target = orgId. Throws if both fail.
 * Use for: callbacks, logs, monitors, objs.
 * For user: resolves org from projectId and checks once with target = orgId.
 */
export async function checkPermissionProjectThenOrg(
  params: WithUser | WithClientToken
): Promise<void> {
  const { projectId, action } = params;

  if (params.clientToken) {
    try {
      await requirePermissionForClientToken({
        clientToken: params.clientToken,
        action,
        target: projectId,
      });
      return;
    } catch {
      // try org
    }
    const orgId = await getOrgIdFromProjectId(projectId);
    await requirePermissionForClientToken({
      clientToken: params.clientToken,
      action,
      target: orgId,
    });
    return;
  }

  const orgId = await getOrgIdFromProjectId(projectId);
  await requirePermissionForUser({
    userId: params.userId,
    orgId,
    action,
    target: orgId,
  });
}
