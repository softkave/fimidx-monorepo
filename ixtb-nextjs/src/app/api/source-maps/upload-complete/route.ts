import { uploadCompleteEndpoint } from "@/src/lib/endpoints/external/sourceMaps/uploadCompleteEndpoint";
import { wrapClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapClientTokenAuthenticated(
  async (req: NextRequest, ctx: IRouteContext, session) => {
    await uploadCompleteEndpoint({ req, ctx, session });
    return new Response(null, { status: 204 });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<Response>
>;
