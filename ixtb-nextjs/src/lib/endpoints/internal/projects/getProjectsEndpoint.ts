import {
  GetProjectsEndpointResponse,
  getProjectsSchema,
} from "fimidx-core/definitions/index";
import { getProjects } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";

export const getProjectsEndpoint: NextUserAuthenticatedEndpointFn<
  GetProjectsEndpointResponse
> = async (params) => {
  const { req } = params;

  const input = getProjectsSchema.parse(await req.json());
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
