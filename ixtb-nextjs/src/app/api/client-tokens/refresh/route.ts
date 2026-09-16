import { refreshClientTokenEndpoint } from "@/src/lib/endpoints/external/clientTokens/refreshClientTokenEndpoint";
import {
  clientTokenOptionsHandler,
  wrapClientTokenAuthenticated,
} from "@/src/lib/serverHelpers/wrapAuthenticated";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapClientTokenAuthenticated(
  async (req, ctx, session) => {
    return refreshClientTokenEndpoint({ req, ctx, session });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

export const OPTIONS = clientTokenOptionsHandler;
