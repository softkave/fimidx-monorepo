import {
  GetLogFieldsEndpointResponse,
  getLogFieldsSchema,
} from "fimidx-core/definitions/log";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getLogFields } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetLogFieldsInput } from "../../utils/sanitizeKId0";

export const getLogFieldsEndpoint: NextMaybeAuthenticatedEndpointFn<
  GetLogFieldsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getLogFieldsSchema.parse(await req.json());
  sanitizeGetLogFieldsInput(input);

  const projectId = input.query.projectId;
  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId,
    action: kFimidxPermissions.log.read,
  });

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
