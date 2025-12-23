import { initSdkEndpoint } from "@/src/lib/endpoints/external/logs/initSdkEndpoint.ts";
import { wrapClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapClientTokenAuthenticated(
  async (req, ctx, session) => {
    return initSdkEndpoint({
      req,
      ctx,
      session,
    });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
