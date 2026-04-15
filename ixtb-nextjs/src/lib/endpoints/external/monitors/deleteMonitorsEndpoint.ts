import { deleteMonitorsSchema } from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { deleteMonitors } from "fimidx-core/serverHelpers/index";
import { checkPermissionForClientTokenOrUser } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMonitorsInput } from "../../utils/sanitizeKId0";

export const deleteMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { getBy, clientToken, userId },
  } = params;

  const input = deleteMonitorsSchema.parse(await req.json());
  sanitizeDeleteMonitorsInput(input);
  const projectId = input.query.projectId;

  await checkPermissionForClientTokenOrUser({
    userId,
    clientToken,
    projectId,
    action: kFimidxPermissions.monitor.delete,
  });

  await deleteMonitors({
    ...input,
    by: getBy().by,
    byType: getBy().byType,
  });
};
