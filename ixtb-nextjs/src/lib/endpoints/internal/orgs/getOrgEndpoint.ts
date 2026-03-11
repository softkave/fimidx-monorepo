import { GetOrgEndpointResponse, getOrgSchema } from "@/src/definitions/org";
import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions, kId0 } from "fimidx-core/definitions/index";
import { getGroups } from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";
import { requirePermissionForUser } from "../../../serverHelpers/permissions";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetOrgInput } from "../../utils/sanitizeKId0";
import { groupToOrg } from "./groupToOrg";

export const getOrgEndpoint: NextUserAuthenticatedEndpointFn<
  GetOrgEndpointResponse
> = async (params) => {
  const {
    ctx,
    session: { userId },
  } = params;

  const pathParams = (await ctx.params) as { orgId: string };
  const input = getOrgSchema.parse({
    id: pathParams.orgId,
  });
  sanitizeGetOrgInput(input);

  await requirePermissionForUser({
    userId,
    orgId: input.id,
    action: kFimidxPermissions.group.read,
    target: input.id,
  });

  const { groups } = await getGroups({
    args: {
      query: {
        id: {
          eq: input.id,
        },
        projectId: kId0,
      },
    },
  });

  const group = first(groups);
  assert.ok(
    group,
    new OwnServerError("Organization not found", kOwnServerErrorCodes.NotFound)
  );

  const response: GetOrgEndpointResponse = {
    org: groupToOrg(group),
  };

  return response;
};
