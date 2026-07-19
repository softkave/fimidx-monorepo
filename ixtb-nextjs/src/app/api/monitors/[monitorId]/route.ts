import { updateMonitorsEndpoint } from "@/src/lib/endpoints/external/monitors/updateMonitorsEndpoint";
import { wrapUserOrClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const patchEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    return updateMonitorsEndpoint({ req, ctx, session });
  }
);

export const PATCH = patchEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
