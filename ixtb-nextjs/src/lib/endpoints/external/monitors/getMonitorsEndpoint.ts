import {
  getMonitorsSchema,
  IGetMonitorsEndpointResponse,
} from "fimidx-core/definitions/index";
import { getMonitors } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetMonitorsInput } from "../../utils/sanitizeKId0.js";

export const getMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetMonitorsEndpointResponse
> = async (params) => {
  const { req } = params;

  const input = getMonitorsSchema.parse(await req.json());
  sanitizeGetMonitorsInput(input);
  const { monitors, page, limit, hasMore } = await getMonitors({
    args: input,
  });

  const response: IGetMonitorsEndpointResponse = {
    monitors,
    page,
    limit,
    hasMore,
  };

  return response;
};
