import { getSourceMapUploadsEndpoint } from "@/src/lib/endpoints/internal/sourceMaps/getSourceMapUploadsEndpoint";
import { wrapUserAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const getEndpointFn = wrapUserAuthenticated(
  async (req: NextRequest, ctx: IRouteContext, session) => {
    return getSourceMapUploadsEndpoint({ req, ctx, session });
  }
);

export const GET = getEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<Response>
>;
