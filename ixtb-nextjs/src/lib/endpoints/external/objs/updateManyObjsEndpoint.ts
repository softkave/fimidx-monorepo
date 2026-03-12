import {
  externalApiQueryToInternalQuery,
  IUpdateManyObjsEndpointResponse,
  kObjTags,
  updateManyObjsExternalApiSchema,
} from "fimidx-core/definitions/obj";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { updateManyObjs } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeUpdateManyObjsExternalApiInput } from "../../utils/sanitizeKId0";

export const updateManyObjsEndpoint: NextClientTokenAuthenticatedEndpointFn<
  IUpdateManyObjsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = updateManyObjsExternalApiSchema.parse(await req.json());
  sanitizeUpdateManyObjsExternalApiInput(input);

  await checkPermissionProjectThenOrg({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.obj.mutate,
  });

  const objQuery = externalApiQueryToInternalQuery(input.query, {
    projectId: input.projectId,
    tag: kObjTags.obj,
  });

  await updateManyObjs({
    by: clientToken.id,
    byType: kByTypes.clientToken,
    tag: kObjTags.obj,
    objQuery,
    update: input.update,
    updateWay: input.updateWay,
    fieldsToIndex: input.fieldsToIndex,
    shouldIndex: input.shouldIndex,
    count: input.count,
  });

  return {
    success: true,
  };
};
