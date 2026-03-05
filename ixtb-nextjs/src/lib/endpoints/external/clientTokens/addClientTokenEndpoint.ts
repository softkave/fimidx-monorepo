import {
  AddClientTokenEndpointResponse,
  addClientTokenSchema,
} from "fimidx-core/definitions/clientToken";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { addClientToken } from "fimidx-core/serverHelpers/index";
import { checkPermissionGroupThenProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddClientTokenInput } from "../../utils/sanitizeKId0.js";

export const addClientTokenEndpoint: NextMaybeAuthenticatedEndpointFn<
  AddClientTokenEndpointResponse
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken, userId },
  } = params;

  const input = addClientTokenSchema.parse(await req.json());
  sanitizeAddClientTokenInput(input);

  if (clientToken) {
    await checkPermissionGroupThenProjectThenOrg({
      clientToken,
      groupId: input.groupId,
      projectId: input.projectId,
      action: kFimidxPermissions.clientToken.mutate,
    });
  } else if (userId) {
    await checkPermissionGroupThenProjectThenOrg({
      userId,
      groupId: input.groupId,
      projectId: input.projectId,
      action: kFimidxPermissions.clientToken.mutate,
    });
  }

  const { clientToken: newClientToken } = await addClientToken({
    args: input,
    by: getBy().by,
    byType: getBy().byType,
  });

  const response: AddClientTokenEndpointResponse = {
    clientToken: newClientToken,
  };

  return response;
};
