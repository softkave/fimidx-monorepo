import { getAlertLogsEndpoint } from "@/src/lib/endpoints/external/alerts/getAlertLogsEndpoint";
import { wrapUserOrClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import assert from "assert";
import { OwnServerError } from "fimidx-core/common/error";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const postEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    const pathParams = (await ctx.params) as { alertId?: string };
    const alertId = pathParams.alertId;
    assert.ok(alertId, new OwnServerError("alertId required", 400));
    const body = await req.json().catch(() => ({}));
    const cloned = new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ alertId, ...body }),
    });
    return getAlertLogsEndpoint({ req: cloned, ctx, session });
  }
);

export const POST = postEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
