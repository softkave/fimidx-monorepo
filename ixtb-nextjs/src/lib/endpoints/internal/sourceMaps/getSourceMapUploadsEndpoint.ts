import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getSourceMapUploadsByProject } from "fimidx-core/serverHelpers/index";
import { z } from "zod";
import { getOrgIdFromProjectId } from "../../../serverHelpers/permissions/getOrgIdFromProjectId";
import { requirePermissionForUser } from "../../../serverHelpers/permissions/requirePermissionForUser";
import type { NextUserAuthenticatedEndpointFn } from "../../types";

const querySchema = z.object({
  projectId: z.string().min(1),
});

export const getSourceMapUploadsEndpoint: NextUserAuthenticatedEndpointFn<{
  uploads: Array<{
    repoIdentifier: string;
    version: string;
    repoIdentifierDisplay: string;
    versionDisplay: string;
    uploadedAt: string;
    isZip: boolean;
  }>;
}> = async (params) => {
  const {
    session: { user },
  } = params;
  const userId = user?.id;
  assert.ok(userId, "User id required");

  const input = querySchema.parse(
    Object.fromEntries(params.req.nextUrl.searchParams)
  );

  const orgId = await getOrgIdFromProjectId(input.projectId);
  assert.ok(
    orgId,
    new OwnServerError("Project not found", kOwnServerErrorCodes.NotFound)
  );

  await requirePermissionForUser({
    userId,
    orgId,
    action: kFimidxPermissions.sourceMap.read,
    target: input.projectId,
  });

  const uploads = await getSourceMapUploadsByProject(input.projectId);
  return {
    uploads: uploads.map((u) => ({
      repoIdentifier: u.repoIdentifier,
      version: u.version,
      repoIdentifierDisplay: u.repoIdentifierDisplay ?? u.repoIdentifier,
      versionDisplay: u.versionDisplay ?? u.version,
      uploadedAt: u.uploadedAt.toISOString(),
      isZip: u.isZip,
    })),
  };
};
