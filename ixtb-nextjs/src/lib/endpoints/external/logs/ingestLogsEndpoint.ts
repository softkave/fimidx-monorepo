import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { ingestLogsSchema } from "fimidx-core/definitions/log";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getProjects, ingestLogs } from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeIngestLogsInput } from "../../utils/sanitizeKId0.js";

export const ingestLogsEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = ingestLogsSchema.parse(await req.json());
  sanitizeIngestLogsInput(input);

  await checkPermissionProjectThenOrg({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.log.ingest,
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
    project?.id === clientToken.meta?.projectId,
    new OwnServerError("Permission denied", kOwnServerErrorCodes.Unauthorized)
  );

  await ingestLogs({
    args: input,
    by: clientToken.id,
    byType: kByTypes.clientToken,
    groupId: project.orgId,
  });
};
