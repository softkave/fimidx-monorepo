import { OwnServerError } from "fimidx-core/common/error";
import {
  DeleteCallbacksEndpointArgs,
  deleteCallbacksSchema,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import {
  getNodeServerInternalAccessKey,
  getNodeServerURL,
} from "../../../serverHelpers/nodeServer";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteCallbacksInput } from "../../utils/sanitizeKId0.js";

async function callNodeServerDeleteCallback(
  input: DeleteCallbacksEndpointArgs & { clientTokenId: string }
) {
  const nodeServerURL = getNodeServerURL();
  const nodeServerInternalAccessKey = getNodeServerInternalAccessKey();

  const response = await fetch(`${nodeServerURL}/cb/deleteCallbacks`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "X-Internal-Access-Key": nodeServerInternalAccessKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new OwnServerError("Failed to delete callbacks", 500);
  }
}

export const deleteCallbacksEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = deleteCallbacksSchema.parse(await req.json());
  sanitizeDeleteCallbacksInput(input);

  await checkPermissionProjectThenOrg({
    clientToken,
    projectId: input.query.projectId,
    action: kFimidxPermissions.callback.delete,
  });

  await callNodeServerDeleteCallback({
    ...input,
    clientTokenId: clientToken.id,
  });
};
