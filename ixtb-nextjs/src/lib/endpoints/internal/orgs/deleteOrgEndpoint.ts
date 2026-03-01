import { deleteOrgSchema } from "@/src/definitions/org";
import { kByTypes } from "fimidx-core/definitions/index";
import { kId0 } from "fimidx-core/definitions/system";
import { deleteGroups } from "fimidx-core/serverHelpers/index";
import { NextUserAuthenticatedEndpointFn } from "../../types";

export const deleteOrgEndpoint: NextUserAuthenticatedEndpointFn<void> = async (
  params
) => {
  const {
    ctx,
    session: { userId },
  } = params;

  const pathParams = (await ctx.params) as { orgId: string };
  const input = deleteOrgSchema.parse({
    id: pathParams.orgId,
  });

  await deleteGroups({
    query: {
      id: {
        eq: input.id,
      },
      projectId: kId0,
    },
    by: userId,
    byType: kByTypes.user,
  });
};
