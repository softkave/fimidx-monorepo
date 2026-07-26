import { addMonitorEndpoint } from "@/src/lib/endpoints/external/monitors/addMonitorEndpoint";
import { deleteMonitorsEndpoint } from "@/src/lib/endpoints/external/monitors/deleteMonitorsEndpoint";
import { wrapUserOrClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    return addMonitorEndpoint({ req, ctx, session });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

const deleteEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    return deleteMonitorsEndpoint({ req, ctx, session });
  }
);

export const DELETE = deleteEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
