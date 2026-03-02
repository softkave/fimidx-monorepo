import { GetOrgEndpointResponse, getOrgSchema } from "@/src/definitions/org";
import assert from "assert";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kId0 } from "fimidx-core/definitions/index";
import { getGroups } from "fimidx-core/serverHelpers/index";
import { first } from "lodash-es";
import { NextUserAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetOrgInput } from "../../utils/sanitizeKId0.js";
import { groupToOrg } from "./groupToOrg";

export const getOrgEndpoint: NextUserAuthenticatedEndpointFn<
  GetOrgEndpointResponse
> = async (params) => {
  const { ctx } = params;

  const pathParams = (await ctx.params) as { orgId: string };
  const input = getOrgSchema.parse({
    id: pathParams.orgId,
  });
  sanitizeGetOrgInput(input);

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
