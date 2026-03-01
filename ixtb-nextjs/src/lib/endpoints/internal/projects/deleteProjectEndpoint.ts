import { kByTypes } from "fimidx-core/definitions/other";
import { deleteProjectsSchema } from "fimidx-core/definitions/project";
import { deleteProjects } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";

export const deleteProjectEndpoint: NextUserAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = deleteProjectsSchema.parse(await req.json());

  await deleteProjects({
    query: input.query,
    deleteMany: input.deleteMany,
    by: userId,
    byType: kByTypes.user,
  });
};
