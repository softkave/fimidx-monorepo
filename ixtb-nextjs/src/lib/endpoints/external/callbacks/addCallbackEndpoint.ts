import {
  AddCallbackEndpointArgs,
  addCallbackSchema,
  IAddCallbackEndpointResponse,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { callNodeServerAddCallback } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddCallbackInput } from "../../utils/sanitizeKId0";
import { v7 as uuidv7 } from "uuid";

export const addCallbackEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IAddCallbackEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = addCallbackSchema.parse(await req.json());
  sanitizeAddCallbackInput(input);

  await checkPermissionForClientTokenOrUser({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.callback.mutate,
  });

  const idempotencyKey =
    input.idempotencyKey ?? `__fimidx_generated_${uuidv7()}_${Date.now()}`;
  const item: AddCallbackEndpointArgs = {
    ...input,
    idempotencyKey,
  };
  const callback = await callNodeServerAddCallback({
    item,
    groupId: clientToken.groupId,
    clientTokenId: clientToken.id,
  });

  return { callback };
};
