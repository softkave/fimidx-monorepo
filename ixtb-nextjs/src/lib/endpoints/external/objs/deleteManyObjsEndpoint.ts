import {
  deleteManyObjsExternalApiSchema,
  externalApiQueryToInternalQuery,
  kObjTags,
} from "fimidx-core/definitions/obj";
import { kByTypes } from "fimidx-core/definitions/other";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { deleteManyObjs } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteManyObjsExternalApiInput } from "../../utils/sanitizeKId0";

export const deleteManyObjsEndpoint: NextClientTokenAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = deleteManyObjsExternalApiSchema.parse(await req.json());
  sanitizeDeleteManyObjsExternalApiInput(input);

  await checkPermissionForClientTokenOrUser({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.obj.delete,
  });

  const objQuery = externalApiQueryToInternalQuery(input.query, {
    projectId: input.projectId,
    tag: kObjTags.obj,
  });

  await deleteManyObjs({
    deletedBy: clientToken.id,
    deletedByType: kByTypes.clientToken,
    objQuery,
    tag: kObjTags.obj,
    deleteMany: input.deleteMany ?? false,
  });
};
