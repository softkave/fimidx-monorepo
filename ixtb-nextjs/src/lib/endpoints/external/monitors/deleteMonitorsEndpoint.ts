import { deleteMonitorsSchema } from "fimidx-core/definitions/monitor";
import { kFimidxPermissions } from "fimidx-core/definitions/permission";
import { deleteMonitors } from "fimidx-core/serverHelpers/index";
import { checkPermissionProjectThenOrg } from "../../../serverHelpers/permissions";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMonitorsInput } from "../../utils/sanitizeKId0.js";

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

  if (clientToken) {
    await checkPermissionProjectThenOrg({
      clientToken,
      projectId,
      action: kFimidxPermissions.monitor.delete,
    });
  } else if (userId) {
    await checkPermissionProjectThenOrg({
      userId,
      projectId,
      action: kFimidxPermissions.monitor.delete,
    });
  }

  await deleteMonitors({
    ...input,
    by: getBy().by,
    byType: getBy().byType,
  });
};
