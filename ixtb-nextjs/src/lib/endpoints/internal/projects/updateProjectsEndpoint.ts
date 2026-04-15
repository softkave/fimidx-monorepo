import {
  kByTypes,
  kFimidxPermissions,
  UpdateProjectEndpointResponse,
} from "fimidx-core/definitions/index";
import { updateProjectsSchema } from "fimidx-core/definitions/project";
import { getProjects, updateProjects } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types.js";
import { sanitizeUpdateProjectsInput } from "../../utils/sanitizeKId0";
import { OwnServerError, kOwnServerErrorCodes } from "fimidx-core/common/error";

export const updateProjectsEndpoint: NextUserAuthenticatedEndpointFn<
  UpdateProjectEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = updateProjectsSchema.parse(await req.json());
  sanitizeUpdateProjectsInput(input);
  const orgId = input.query.orgId as string;

  let hasOrgPermission = false;
  try {
    await requirePermissionForUser({
      userId,
      orgId,
      action: kFimidxPermissions.project.mutate,
      target: orgId,
    });
    hasOrgPermission = true;
  } catch {
    // fall through to per-project filter
  }

  if (hasOrgPermission) {
    await updateProjects({
      args: input,
      by: userId,
      byType: kByTypes.user,
    });
    return { success: true };
  }

  // TODO: pagination, caching allowed project ids (e.g. local file), projections for minimal db read
  const { projects } = await getProjects({
    args: { query: input.query, limit: 1000 },
  });
  const results = await Promise.all(
    projects.map(async (project) => {
      try {
        await requirePermissionForUser({
          userId,
          orgId,
          action: kFimidxPermissions.project.mutate,
          target: project.id,
        });
        return project.id;
      } catch {
        return null;
      }
    })
  );
  const allowedIds = results.filter((id): id is string => id != null);
  if (allowedIds.length > 0) {
    await updateProjects({
      args: {
        query: { orgId, id: { in: allowedIds } },
        update: input.update,
        updateMany: true,
      },
      by: userId,
      byType: kByTypes.user,
    });
  } else if (allowedIds.length === 0 && projects.length > 0) {
    throw new OwnServerError(
      "No projects found with permission to update",
      kOwnServerErrorCodes.Forbidden
    );
  }

  return { success: true };
};
