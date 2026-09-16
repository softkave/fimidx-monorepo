import { ingestLogsEndpoint } from "@/src/lib/endpoints/external/logs/ingestLogsEndpoint";
import {
  clientTokenOptionsHandler,
  wrapClientTokenAuthenticated,
} from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapClientTokenAuthenticated(
  async (req, ctx, session) => {
    return ingestLogsEndpoint({
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

export const OPTIONS = clientTokenOptionsHandler;
