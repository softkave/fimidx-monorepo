import {
  getObjFieldsSchema,
  IGetObjFieldsEndpointResponse,
  kObjTags,
} from "fimidx-core/definitions/obj";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { getObjFields } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeGetObjFieldsInput } from "../../utils/sanitizeKId0";

// TODO: delineate between internal and external objs

export const getObjFieldsEndpoint: NextMaybeAuthenticatedEndpointFn<
  IGetObjFieldsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, userId },
  } = params;

  const input = getObjFieldsSchema.parse(await req.json());
  sanitizeGetObjFieldsInput(input);

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.obj.read,
  });

  const response = await getObjFields({
    projectId: input.projectId,
    page: input.page,
    limit: input.limit,
    tag: kObjTags.obj,
  });

  return response;
};
