import { deleteOrgSchema } from "@/src/definitions/org";
import { kByTypes, kFimidxPermissions } from "fimidx-core/definitions/index";
import { kId0 } from "fimidx-core/definitions/system";
import { deleteGroups } from "fimidx-core/serverHelpers/index";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteOrgInput } from "../../utils/sanitizeKId0.js";

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
  sanitizeDeleteOrgInput(input);

  await requirePermissionForUser({
    userId,
    orgId: input.id,
    action: kFimidxPermissions.group.delete,
    target: input.id,
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
