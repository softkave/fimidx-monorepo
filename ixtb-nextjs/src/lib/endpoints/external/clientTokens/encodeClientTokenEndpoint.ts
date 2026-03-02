import { getClientToken } from "@/src/lib/serverHelpers/clientToken/getClientToken";
import {
  EncodeClientTokenJWTEndpointResponse,
  encodeClientTokenJWTSchema,
} from "fimidx-core/definitions/clientToken";
import { encodeClientTokenJWT } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeEncodeClientTokenJWTInput } from "../../utils/sanitizeKId0.js";

export const encodeClientTokenEndpoint: NextMaybeAuthenticatedEndpointFn<
  EncodeClientTokenJWTEndpointResponse
> = async (params) => {
  const {
    req,
    session: { getBy },
  } = params;

  const input = encodeClientTokenJWTSchema.parse(await req.json());
  sanitizeEncodeClientTokenJWTInput(input);
  const { clientToken } = await getClientToken({
    input: { clientTokenId: input.id },
  });
  const { refreshToken, token } = await encodeClientTokenJWT({
    id: input.id,
    groupId: clientToken.groupId,
    projectId: clientToken.projectId,
    args: input,
  });

  const response: EncodeClientTokenJWTEndpointResponse = {
    refreshToken,
    token,
  };

  return response;
};
