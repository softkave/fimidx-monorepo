import { getSymbolicationConfigEndpoint } from "@/src/lib/endpoints/internal/sourceMaps/getSymbolicationConfigEndpoint";
import { updateSymbolicationConfigEndpoint } from "@/src/lib/endpoints/internal/sourceMaps/updateSymbolicationConfigEndpoint";
import { wrapUserAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const getEndpointFn = wrapUserAuthenticated(
  async (req: NextRequest, ctx: IRouteContext, session) => {
    const result = await getSymbolicationConfigEndpoint({ req, ctx, session });
    return Response.json(result);
  }
);

export const GET = getEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<Response>
>;

const patchEndpointFn = wrapUserAuthenticated(
  async (req: NextRequest, ctx: IRouteContext, session) => {
    await updateSymbolicationConfigEndpoint({ req, ctx, session });
    return new Response(null, { status: 204 });
  }
);

export const PATCH = patchEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<Response>
>;
