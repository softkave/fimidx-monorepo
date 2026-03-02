import {
  addMemberSchema,
  IAddMemberEndpointResponse,
  kByTypes,
} from "fimidx-core/definitions/index";
import { addMember } from "fimidx-core/serverHelpers/index";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddMemberInput } from "../../utils/sanitizeKId0.js";

export const addMemberEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IAddMemberEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = addMemberSchema.parse(await req.json());
  sanitizeAddMemberInput(input);
  const { member } = await addMember({
    args: input,
    by: clientToken.id,
    byType: kByTypes.clientToken,
  });

  const response: IAddMemberEndpointResponse = {
    member,
  };

  return response;
};
