import { getProject } from "@/src/lib/serverHelpers/project/getProject";
import {
  addMonitorSchema,
  IAddMonitorEndpointResponse,
} from "fimidx-core/definitions/monitor";
import { addMonitor } from "fimidx-core/serverHelpers/index";
import { NextMaybeAuthenticatedEndpointFn } from "../../types";

export const addMonitorEndpoint: NextMaybeAuthenticatedEndpointFn<
  IAddMonitorEndpointResponse
> = async (params) => {
  const {
    req,
    session: { clientToken, getBy },
  } = params;

  const input = addMonitorSchema.parse(await req.json());
  const { project } = await getProject({
    input: { projectId: input.projectId },
    clientToken,
  });
  const { monitor } = await addMonitor({
    args: input,
    by: getBy().by,
    byType: getBy().byType,
    groupId: project.orgId,
  });

  const response: IAddMonitorEndpointResponse = {
    monitor,
  };

  return response;
};
