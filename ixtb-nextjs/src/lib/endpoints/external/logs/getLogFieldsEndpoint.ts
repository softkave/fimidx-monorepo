import {
  GetLogFieldsEndpointResponse,
  getLogFieldsSchema,
} from "fimidx-core/definitions/log";
import { getLogFields } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetLogFieldsInput } from "../../utils/sanitizeKId0.js";

export const getLogFieldsEndpoint: NextMaybeAuthenticatedEndpointFn<
  GetLogFieldsEndpointResponse
> = async (params) => {
  const { req } = params;

  const input = getLogFieldsSchema.parse(await req.json());
  sanitizeGetLogFieldsInput(input);
  const { fields, page, limit, hasMore } = await getLogFields({
    args: input,
  });

  const response: GetLogFieldsEndpointResponse = {
    fields,
    page,
    limit,
    hasMore,
  };

  return response;
};
