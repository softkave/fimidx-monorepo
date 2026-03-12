import { getProjectById } from "fimidx-core/serverHelpers/index";

/**
 * Resolves org id (groupId) from a project id. Used when we have projectId and
 * need to run permission checks against the org (e.g. project-then-org
 * cascade). Throws if project is not found.
 */
export async function getOrgIdFromProjectId(
  projectId: string
): Promise<string> {
  const project = await getProjectById({ id: projectId });
  if (!project) {
    const { kOwnServerErrorCodes, OwnServerError } = await import(
      "fimidx-core/common/error"
    );
    throw new OwnServerError(
      "Project not found",
      kOwnServerErrorCodes.NotFound
    );
  }
  return project.orgId;
}
