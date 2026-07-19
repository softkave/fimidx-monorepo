import {
  deleteCallbacksSchema,
  kFimidxPermissions,
} from "fimidx-core/definitions/index";
import { callNodeServerDeleteCallbacks } from "../../../serverHelpers/nodeServerCallbacks";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteCallbacksInput } from "../../utils/sanitizeKId0";

export const deleteCallbacksEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = deleteCallbacksSchema.parse(await req.json());
  sanitizeDeleteCallbacksInput(input);

  await checkPermissionForClientTokenOrUser({
    clientToken,
    projectId: input.query.projectId,
    action: kFimidxPermissions.callback.delete,
  });

  await callNodeServerDeleteCallbacks({
    ...input,
    clientTokenId: clientToken.id,
  });
};
