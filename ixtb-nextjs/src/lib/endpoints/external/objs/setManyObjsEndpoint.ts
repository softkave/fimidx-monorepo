import { getProject } from "@/src/lib/serverHelpers/project/getProject";
import {
  ISetManyObjsEndpointResponse,
  kObjTags,
  setManyObjsSchema,
} from "fimidx-core/definitions/obj";
import { kByTypes } from "fimidx-core/definitions/other";
import { setManyObjs } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextClientTokenAuthenticatedEndpointFn } from "../../types";
import { sanitizeSetManyObjsInput } from "../../utils/sanitizeKId0.js";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";

export const setManyObjsEndpoint: NextClientTokenAuthenticatedEndpointFn<
  ISetManyObjsEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken },
  } = params;

  const input = setManyObjsSchema.parse(await req.json());
  sanitizeSetManyObjsInput(input);

  await checkPermissionProjectThenOrg({
    clientToken,
    projectId: input.projectId,
    action: kFimidxPermissions.obj.mutate,
  });

  const { project } = await getProject({
    input: { projectId: input.projectId },
    clientToken,
  });
  const response = await setManyObjs({
    by: clientToken.id,
    byType: kByTypes.clientToken,
    groupId: project.orgId,
    tag: kObjTags.obj,
    input,
  });

  return response;
};
