import {
  getCallbacksSchema,
  IGetCallbacksEndpointResponse,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { getCallbacks } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetCallbacksInput } from "../../utils/sanitizeKId0";

export const getCallbacksEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetCallbacksEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getCallbacksSchema.parse(await req.json());
  sanitizeGetCallbacksInput(input);
  const projectId = input.query.projectId;

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId,
    action: kFimidxPermissions.callback.read,
  });

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
