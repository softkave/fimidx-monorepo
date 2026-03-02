import { deleteMonitorsSchema } from "fimidx-core/definitions/monitor";
import { deleteMonitors } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";
import { sanitizeDeleteMonitorsInput } from "../../utils/sanitizeKId0.js";

export const deleteMonitorsEndpoint: NextMaybeAuthenticatedEndpointFn<
  void
> = async (params) => {
  const {
    req,
    session: { getBy },
  } = params;

  const input = deleteMonitorsSchema.parse(await req.json());
  sanitizeDeleteMonitorsInput(input);
  await deleteMonitors({
    ...input,
    by: getBy().by,
    byType: getBy().byType,
  });
};
