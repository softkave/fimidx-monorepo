import { previewMonitorEndpoint } from "@/src/lib/endpoints/external/monitors/previewMonitorEndpoint";
import { wrapUserOrClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    const pathParams = (await ctx.params) as { monitorId?: string };
    const body = await req.json().catch(() => ({}));
    const cloned = new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({
        monitorId: pathParams.monitorId,
        ...body,
      }),
    });
    return previewMonitorEndpoint({ req: cloned, ctx, session });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
