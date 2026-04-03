import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { upsertSymbolicationConfig } from "fimidx-core/serverHelpers/index";
import { z } from "zod";
import { getOrgIdFromProjectId } from "../../../serverHelpers/permissions/getOrgIdFromProjectId";
import { requirePermissionForUser } from "../../../serverHelpers/permissions/requirePermissionForUser";
import type { NextUserAuthenticatedEndpointFn } from "../../types";

const bodySchema = z.object({
  projectId: z.string().min(1),
  fieldsToSymbolicate: z.array(z.string()).default([]),
  repoIdFields: z.array(z.string()).default([]),
  versionFields: z.array(z.string()).default([]),
});

export const updateSymbolicationConfigEndpoint: NextUserAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    session: { user },
  } = params;
  const userId = user?.id;
  assert.ok(userId, "User id required");

  const input = bodySchema.parse(await params.req.json());

  const orgId = await getOrgIdFromProjectId(input.projectId);
  assert.ok(
    orgId,
    new OwnServerError("Project not found", kOwnServerErrorCodes.NotFound)
  );

  await requirePermissionForUser({
    userId,
    orgId,
    action: kFimidxPermissions.project.mutate,
    target: input.projectId,
  });

  await upsertSymbolicationConfig({
    projectId: input.projectId,
    fieldsToSymbolicate: input.fieldsToSymbolicate,
    repoIdFields: input.repoIdFields,
    versionFields: input.versionFields,
  });
};
