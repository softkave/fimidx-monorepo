import { OwnServerError } from "fimidx-core/common/error";
import {
  AddCallbackEndpointArgs,
  addCallbackSchema,
  IAddCallbackEndpointResponse,
  ICallback,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { v7 as uuidv7 } from "uuid";
import {
  getNodeServerInternalAccessKey,
  getNodeServerURL,
} from "../../../serverHelpers/nodeServer";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeAddCallbackInput } from "../../utils/sanitizeKId0";

async function callNodeServerAddCallback(params: {
  item: AddCallbackEndpointArgs;
  groupId: string;
  clientTokenId: string;
  idempotencyKey: string;
}) {
  const nodeServerURL = getNodeServerURL();
  const nodeServerInternalAccessKey = getNodeServerInternalAccessKey();
  const callParams = {
    item: params.item,
    groupId: params.groupId,
    clientTokenId: params.clientTokenId,
    idempotencyKey: params.idempotencyKey,
  };

  const response = await fetch(`${nodeServerURL}/cb/addCallback`, {
    method: "POST",
    body: JSON.stringify(callParams),
    headers: {
      "X-Internal-Access-Key": nodeServerInternalAccessKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new OwnServerError("Failed to add callback", 500);
  }

  const responseBody = await response.json();
  return responseBody.callback as ICallback;
}

export const addCallbackEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IAddCallbackEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = addCallbackSchema.parse(await req.json());
  sanitizeAddCallbackInput(input);

  await checkPermissionProjectThenOrg({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.callback.mutate,
  });

  const idempotencyKey =
    input.idempotencyKey ?? `__fimidx_generated_${uuidv7()}_${Date.now()}`;
  const callback = await callNodeServerAddCallback({
    item: input,
    groupId: clientToken.groupId,
    clientTokenId: clientToken.id,
    idempotencyKey,
  });

  const response: IAddCallbackEndpointResponse = {
    callback,
  };

  return response;
};
