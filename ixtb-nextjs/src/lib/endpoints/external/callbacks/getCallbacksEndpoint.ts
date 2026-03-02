import {
  getCallbacksSchema,
  IGetCallbacksEndpointResponse,
} from "fimidx-core/definitions/index";
import { getCallbacks } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetCallbacksInput } from "../../utils/sanitizeKId0.js";

export const getCallbacksEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetCallbacksEndpointResponse
> = async (params) => {
  const { req } = params;

  const input = getCallbacksSchema.parse(await req.json());
  sanitizeGetCallbacksInput(input);
  const { callbacks, hasMore, page, limit } = await getCallbacks({
    args: input,
  });

  const response: IGetCallbacksEndpointResponse = {
    callbacks,
    hasMore,
    page,
    limit,
  };

  return response;
};
