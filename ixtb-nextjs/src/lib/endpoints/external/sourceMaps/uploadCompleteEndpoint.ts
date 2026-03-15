import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { normalizePathSegment } from "fimidx-core/definitions/sourceMap";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  buildSourceMapZipFilePath,
  getProjects,
  upsertSourceMapUpload,
} from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";
import { z } from "zod";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import type { NextClientTokenAuthenticatedEndpointFn } from "../../types";

const uploadCompleteSchema = z.object({
  projectId: z.string().min(1),
  repoIdentifier: z.string().min(1),
  version: z.string().min(1),
  isZip: z.boolean(),
});

export const uploadCompleteEndpoint: NextClientTokenAuthenticatedEndpointFn<void> =
  async (params) => {
    const {
      req,
      session: { clientToken },
    } = params;

    const input = uploadCompleteSchema.parse(await req.json());

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

    const normalizedRepo = normalizePathSegment(input.repoIdentifier);
    const normalizedVersion = normalizePathSegment(input.version);
    const fimidaraPath = buildSourceMapZipFilePath(
      input.projectId,
      normalizedRepo,
      normalizedVersion
    );

    await upsertSourceMapUpload({
      projectId: input.projectId,
      repoIdentifier: normalizedRepo,
      version: normalizedVersion,
      fimidaraPath,
      isZip: input.isZip,
      uploadedAt: new Date(),
      createdBy: clientToken.id,
      repoIdentifierDisplay: input.repoIdentifier,
      versionDisplay: input.version,
    });
  };
