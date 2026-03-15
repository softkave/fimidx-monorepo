import { uploadTokenEndpoint } from "@/src/lib/endpoints/external/sourceMaps/uploadTokenEndpoint";
import { wrapClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapClientTokenAuthenticated(
  async (req: NextRequest, ctx: IRouteContext, session) => {
    const result = await uploadTokenEndpoint({ req, ctx, session });
    return Response.json(result);
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<Response>
>;
