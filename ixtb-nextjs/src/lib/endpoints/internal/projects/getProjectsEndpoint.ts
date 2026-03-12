import {
  GetProjectsEndpointResponse,
  getProjectsSchema,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { getProjects } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetProjectsInput } from "../../utils/sanitizeKId0";

export const getProjectsEndpoint: NextUserAuthenticatedEndpointFn<
  GetProjectsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = getProjectsSchema.parse(await req.json());
  sanitizeGetProjectsInput(input);
  const orgId = input.query.orgId as string;

  let hasOrgPermission = false;
  try {
    await requirePermissionForUser({
      userId,
      orgId,
      action: kFimidxPermissions.project.read,
      target: orgId,
    });
    hasOrgPermission = true;
  } catch {
    // fall through to per-project filter
  }

  const { projects, hasMore, page, limit } = await getProjects({
    args: input,
  });

  if (hasOrgPermission) {
    return {
      projects,
      page,
      limit,
      hasMore,
    };
  }

  const filtered: typeof projects = [];
  for (const project of projects) {
    try {
      await requirePermissionForUser({
        userId,
        orgId,
        action: kFimidxPermissions.project.read,
        target: project.id,
      });
      filtered.push(project);
    } catch {
      // skip
    }
  }

  return {
    projects: filtered,
    page,
    limit,
    hasMore,
  };
};
