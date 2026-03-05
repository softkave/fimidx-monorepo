import {
  AddProjectEndpointResponse,
  kByTypes,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { addProjectSchema } from "fimidx-core/definitions/project";
import { addProject } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddProjectInput } from "../../utils/sanitizeKId0.js";

export const addProjectEndpoint: NextUserAuthenticatedEndpointFn<
  AddProjectEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = addProjectSchema.parse(await req.json());
  sanitizeAddProjectInput(input);

  await requirePermissionForUser({
    userId,
    orgId: input.orgId,
    action: kFimidxPermissions.project.mutate,
    target: input.orgId,
  });

  const { project } = await addProject({
    args: input,
    by: userId,
    byType: kByTypes.user,
  });

  const response: AddProjectEndpointResponse = {
    project,
  };

  return response;
};
