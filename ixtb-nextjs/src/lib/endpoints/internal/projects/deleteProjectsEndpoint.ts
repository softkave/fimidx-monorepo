import { kByTypes } from "fimidx-core/definitions/other";
import { deleteProjectsSchema } from "fimidx-core/definitions/project";
import { deleteProjects } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types.js";
import { sanitizeDeleteProjectsInput } from "../../utils/sanitizeKId0.js";

export const deleteProjectsEndpoint: NextUserAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { userId },
  } = params;

  const input = deleteProjectsSchema.parse(await req.json());
  sanitizeDeleteProjectsInput(input);

  await deleteProjects({
    query: input.query,
    deleteMany: input.deleteMany,
    by: userId,
    byType: kByTypes.user,
  });
};
