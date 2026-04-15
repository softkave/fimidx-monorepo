import { addClientTokenEndpoint } from "@/src/lib/endpoints/external/clientTokens/addClientTokenEndpoint";
import { deleteClientTokensEndpoint } from "@/src/lib/endpoints/external/clientTokens/deleteClientTokensEndpoint";
import { updateClientTokensEndpoint } from "@/src/lib/endpoints/external/clientTokens/updateClientTokensEndpoint";
import { wrapUserOrClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    return addClientTokenEndpoint({ req, ctx, session: session });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

const deleteEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    return deleteClientTokensEndpoint({ req, ctx, session });
  }
);

export const DELETE = deleteEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

const patchEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    return updateClientTokensEndpoint({ req, ctx, session });
  }
);

export const PATCH = patchEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
