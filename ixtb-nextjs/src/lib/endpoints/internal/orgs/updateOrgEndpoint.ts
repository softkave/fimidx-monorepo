import {
  UpdateOrgEndpointResponse,
  updateOrgSchema,
} from "@/src/definitions/org";
import { kByTypes, kId0 } from "fimidx-core/definitions/index";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { updateGroups } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateOrgInput } from "../../utils/sanitizeKId0";

export const updateOrgEndpoint: NextUserAuthenticatedEndpointFn<
  UpdateOrgEndpointResponse
> = async (params) => {
  const {
    req,
    ctx,
    session: { userId },
  } = params;

  const pathParams = (await ctx.params) as { orgId: string };
  const input = updateOrgSchema.parse({
    id: pathParams.orgId,
    update: await req.json(),
  });
  sanitizeUpdateOrgInput(input);

  await requirePermissionForUser({
    userId,
    orgId: input.id,
    action: kFimidxPermissions.group.mutate,
    target: input.id,
  });

  await updateGroups({
    args: {
      query: {
        id: { eq: input.id },
        projectId: kId0,
      },
      update: input.update,
      updateMany: false,
    },
    by: userId,
    byType: kByTypes.user,
  });

  const response: UpdateOrgEndpointResponse = {
    success: true,
  };

  return response;
};
