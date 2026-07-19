import { getAlertEndpoint } from "@/src/lib/endpoints/external/alerts/getAlertEndpoint";
import { acknowledgeAlertEndpoint } from "@/src/lib/endpoints/external/alerts/acknowledgeAlertEndpoint";
import { wrapUserOrClientTokenAuthenticated } from "@/src/lib/serverHelpers/wrapAuthenticated.ts";
import { IRouteContext } from "@/src/lib/serverHelpers/wrapRoute.ts";
import assert from "assert";
import { OwnServerError } from "fimidx-core/common/error";
import { NextRequest } from "next/server";
import { AnyFn } from "softkave-js-utils";

const getEndpointFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    const pathParams = (await ctx.params) as { alertId?: string };
    const alertId = pathParams.alertId;
    assert.ok(alertId, new OwnServerError("Alert ID required", 400));
    const cloned = new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ alertId }),
    });
    return getAlertEndpoint({ req: cloned, ctx, session });
  }
);

export const GET = getEndpointFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;

const postAckFn = wrapUserOrClientTokenAuthenticated(
  async (req, ctx, session) => {
    const pathParams = (await ctx.params) as { alertId?: string };
    const alertId = pathParams.alertId;
    const body = await req.json().catch(() => ({}));
    const cloned = new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ alertId, ...body }),
    });
    return acknowledgeAlertEndpoint({ req: cloned, ctx, session });
  }
);

export const POST = postAckFn as unknown as AnyFn<
  [NextRequest, IRouteContext],
  Promise<void | Response>
>;
