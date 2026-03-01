import {
  AddProjectEndpointResponse,
  kByTypes,
} from "fimidx-core/definitions/index";
import { addProjectSchema } from "fimidx-core/definitions/project";
import { addProject } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";

export const addProjectEndpoint: NextUserAuthenticatedEndpointFn<
  AddProjectEndpointResponse
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = addProjectSchema.parse(await req.json());
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
