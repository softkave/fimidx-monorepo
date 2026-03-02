import {
  GetProjectsEndpointResponse,
  getProjectsSchema,
} from "fimidx-core/definitions/index";
import { getProjects } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetProjectsInput } from "../../utils/sanitizeKId0.js";

export const getProjectsEndpoint: NextUserAuthenticatedEndpointFn<
  GetProjectsEndpointResponse
> = async (params) => {
  const { req } = params;

  const input = getProjectsSchema.parse(await req.json());
  sanitizeGetProjectsInput(input);
  const { projects, hasMore, page, limit } = await getProjects({
    args: input,
  });

  const response: GetProjectsEndpointResponse = {
    projects,
    page,
    limit,
    hasMore,
  };

  return response;
};
