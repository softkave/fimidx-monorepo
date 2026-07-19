import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { deleteProjectsSchema } from "fimidx-core/definitions/project";
import { deleteProjects, getProjects } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types.js";
import { sanitizeDeleteProjectsInput } from "../../utils/sanitizeKId0";
import { OwnServerError, kOwnServerErrorCodes } from "fimidx-core/common/error";

export const deleteProjectsEndpoint: NextUserAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = deleteProjectsSchema.parse(await req.json());
  sanitizeDeleteProjectsInput(input);
  const orgId = input.query.orgId as string;

  let hasOrgPermission = false;
  try {
    await requirePermissionForUser({
      userId,
      orgId,
      action: kFimidxPermissions.project.delete,
      target: orgId,
    });
    hasOrgPermission = true;
  } catch {
    // fall through to per-project filter
  }

  if (hasOrgPermission) {
    await deleteProjects({
      query: input.query,
      deleteMany: input.deleteMany,
      by: userId,
      byType: kByTypes.user,
    });
    return;
  }

  // TODO: pagination, caching allowed project ids (e.g. local file)
  const { projects } = await getProjects({
    args: { query: input.query, limit: 1000 },
    projection: ["id"],
  });
  const results = await Promise.all(
    projects.map(async (project) => {
      try {
        await requirePermissionForUser({
          userId,
          orgId,
          action: kFimidxPermissions.project.delete,
          target: project.id,
        });
        return project.id;
      } catch {
        return null;
      }
    })
  );
  const allowedIds = results.filter((id): id is string => id != null);
  if (allowedIds.length === 0 && projects.length > 0) {
    throw new OwnServerError(
      "No projects found with permission to delete",
      kOwnServerErrorCodes.Forbidden
    );
    return;
  }
  await deleteProjects({
    query: { orgId, id: { in: allowedIds } },
    deleteMany: true,
    by: userId,
    byType: kByTypes.user,
  });
};
