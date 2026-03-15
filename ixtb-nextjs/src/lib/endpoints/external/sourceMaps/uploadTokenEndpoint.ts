import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  buildSourceMapZipFilePath,
  ensureProjectFimidaraToken,
  getProjects,
} from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";
import { z } from "zod";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import type { NextClientTokenAuthenticatedEndpointFn } from "../../types";

const uploadTokenSchema = z.object({
  projectId: z.string().min(1),
  repoIdentifier: z.string().min(1),
  version: z.string().min(1),
});

export const uploadTokenEndpoint: NextClientTokenAuthenticatedEndpointFn<{
  token: string;
  filePath: string;
}> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = uploadTokenSchema.parse(await req.json());

  await checkPermissionProjectThenOrg({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.sourceMap.upload,
  });

  const { projects } = await getProjects({
    args: {
      query: {
        orgId: clientToken.groupId,
        id: { eq: input.projectId },
      },
    },
  });
  const project = first(projects);
  assert.ok(
    project,
    new OwnServerError("Project not found", kOwnServerErrorCodes.NotFound)
  );
  assert.ok(
    project.id === clientToken.projectId,
    new OwnServerError("Permission denied", kOwnServerErrorCodes.Unauthorized)
  );

  const { encodedToken } =
    await ensureProjectFimidaraToken(input.projectId);

  const filePath = buildSourceMapZipFilePath(
    input.projectId,
    input.repoIdentifier,
    input.version
  );

  return {
    token: encodedToken,
    filePath,
  };
};
