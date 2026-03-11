import {
  EncodeClientTokenJWTEndpointResponse,
  encodeClientTokenJWTSchema,
} from "fimidx-core/definitions/clientToken";
import { kOwnServerErrorCodes, OwnServerError } from "fimidx-core/common/error";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import {
  encodeClientTokenJWT,
  getClientTokenById,
} from "fimidx-core/serverHelpers/index";
import { checkPermissionGroupThenProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeEncodeClientTokenJWTInput } from "../../utils/sanitizeKId0";

export const encodeClientTokenEndpoint: NextMaybeAuthenticatedEndpointFn<
  EncodeClientTokenJWTEndpointResponse
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken: sessionClientToken, userId },
  } = params;

  const input = encodeClientTokenJWTSchema.parse(await req.json());
  sanitizeEncodeClientTokenJWTInput(input);

  if (!sessionClientToken && !userId) {
    throw new OwnServerError("Unauthorized", kOwnServerErrorCodes.Unauthorized);
  }

  const clientToken = await getClientTokenById({
    id: input.id,
    projectId: input.projectId,
    groupId: input.groupId,
  });

  if (sessionClientToken) {
    await checkPermissionGroupThenProjectThenOrg({
      clientToken: sessionClientToken,
      groupId: clientToken.groupId,
      projectId: clientToken.projectId,
      action: kFimidxPermissions.clientToken.read,
    });
  } else if (userId) {
    await checkPermissionGroupThenProjectThenOrg({
      userId,
      groupId: clientToken.groupId,
      projectId: clientToken.projectId,
      action: kFimidxPermissions.clientToken.read,
    });
  }

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
