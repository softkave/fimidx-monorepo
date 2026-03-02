import {
  IGetMembersEndpointResponse,
  getMembersSchema,
} from "fimidx-core/definitions/member";
import { getMembers } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetMembersInput } from "../../utils/sanitizeKId0.js";

export const getMembersEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IGetMembersEndpointResponse
> = async (params) => {
  const { req } = params;

  const input = getMembersSchema.parse(await req.json());
  sanitizeGetMembersInput(input);
  const { members, hasMore, page, limit } = await getMembers({
    args: input,
  });

  const response: IGetMembersEndpointResponse = {
    members,
    hasMore,
    page,
    limit,
  };

  return response;
};
