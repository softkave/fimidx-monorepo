import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getSymbolicationConfig } from "fimidx-core/serverHelpers/index";
import { z } from "zod";
import { getOrgIdFromProjectId } from "../../../serverHelpers/permissions/getOrgIdFromProjectId";
import { requirePermissionForUser } from "../../../serverHelpers/permissions/requirePermissionForUser";
import type { NextUserAuthenticatedEndpointFn } from "../../types";

const querySchema = z.object({
  projectId: z.string().min(1),
});

export const getSymbolicationConfigEndpoint: NextUserAuthenticatedEndpointFn<{
  config: {
    fieldsToSymbolicate: string[];
    repoIdFields: string[];
    versionFields: string[];
  } | null;
}> = async (params) => {
  const {
    session: { user },
    req,
  } = params;
  const userId = user?.id;
  assert.ok(userId, "User id required");

  const input = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
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

  const config = await getSymbolicationConfig(input.projectId);
  return {
    config: config
      ? {
          fieldsToSymbolicate: config.fieldsToSymbolicate,
          repoIdFields: config.repoIdFields,
          versionFields: config.versionFields,
        }
      : null,
  };
};
