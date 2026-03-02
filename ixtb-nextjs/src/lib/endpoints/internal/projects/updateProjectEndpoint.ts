import {
  kByTypes,
  UpdateProjectEndpointResponse,
} from "fimidx-core/definitions/index";
import { updateProjectsSchema } from "fimidx-core/definitions/project";
import { updateProjects } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateProjectsInput } from "../../utils/sanitizeKId0.js";

export const updateProjectEndpoint: NextUserAuthenticatedEndpointFn<
  UpdateProjectEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = updateProjectsSchema.parse(await req.json());
  sanitizeUpdateProjectsInput(input);
  await updateProjects({
    args: input,
    by: userId,
    byType: kByTypes.user,
  });

  const response: UpdateProjectEndpointResponse = {
    success: true,
  };

  return response;
};
