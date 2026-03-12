import {
  externalApiQueryToInternalQuery,
  getManyObjsExternalApiSchema,
  IGetManyObjsEndpointResponse,
  kObjTags,
} from "fimidx-core/definitions/obj";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getManyObjs } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetManyObjsExternalApiInput } from "../../utils/sanitizeKId0";

export const getManyObjsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetManyObjsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getManyObjsExternalApiSchema.parse(await req.json());
  sanitizeGetManyObjsExternalApiInput(input);

  if (clientToken) {
    await checkPermissionProjectThenOrg({
      clientToken,
      projectId: input.projectId,
      action: kFimidxPermissions.obj.read,
    });
  } else if (userId) {
    await checkPermissionProjectThenOrg({
      userId,
      projectId: input.projectId,
      action: kFimidxPermissions.obj.read,
    });
  }

  const objQuery = externalApiQueryToInternalQuery(input.query, {
    projectId: input.projectId,
    tag: kObjTags.obj,
  });

  const response = await getManyObjs({
    objQuery,
    tag: kObjTags.obj,
    limit: input.limit,
    page: input.page,
    sort: input.sort,
  });

  return response;
};
