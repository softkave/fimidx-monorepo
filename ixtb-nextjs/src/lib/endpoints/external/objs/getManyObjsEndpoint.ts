import {
  getManyObjsSchema,
  IGetManyObjsEndpointResponse,
  kObjTags,
} from "fimidx-core/definitions/obj";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getManyObjs } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetManyObjsInput } from "../../utils/sanitizeKId0";

export const getManyObjsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetManyObjsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getManyObjsSchema.parse(await req.json());
  sanitizeGetManyObjsInput(input);
  const projectId = input.query?.projectId;
  if (projectId) {
    if (clientToken) {
      await checkPermissionProjectThenOrg({
        clientToken,
        projectId,
        action: kFimidxPermissions.obj.read,
      });
    } else if (userId) {
      await checkPermissionProjectThenOrg({
        userId,
        projectId,
        action: kFimidxPermissions.obj.read,
      });
    }
  }

  const response = await getManyObjs({
    objQuery: input.query,
    tag: kObjTags.obj,
    limit: input.limit,
    page: input.page,
    sort: input.sort,
  });

  return response;
};
