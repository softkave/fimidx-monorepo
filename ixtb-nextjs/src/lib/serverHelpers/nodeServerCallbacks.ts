import { OwnServerError } from "fimidx-core/common/error";
import type {
  AddCallbackEndpointArgs,
  DeleteCallbacksEndpointArgs,
  ICallback,
} from "fimidx-core/definitions/callback";
import { kId0 } from "fimidx-core/definitions/system";
import {
  wrapMonitorCallbackScheduler,
  type IMonitorCallbackAddResult,
  type IMonitorCallbackScheduler,
} from "fimidx-core/serverHelpers/monitor/syncMonitorCallback";
import {
  getNodeServerInternalAccessKey,
  getNodeServerURL,
} from "./nodeServer";

export async function callNodeServerAddCallback(params: {
  item: AddCallbackEndpointArgs;
  groupId: string;
  clientTokenId: string;
}): Promise<ICallback> {
  const results = await callNodeServerAddCallbacks({
    items: [params.item],
    groupId: params.groupId,
    clientTokenId: params.clientTokenId,
  });
  const result = results[0];
  if (!result?.success || !result.callback) {
    throw new OwnServerError(
      result?.error ?? "Failed to add callback",
      500
    );
  }
  return result.callback;
}

export async function callNodeServerAddCallbacks(params: {
  items: AddCallbackEndpointArgs[];
  groupId: string;
  clientTokenId: string;
}): Promise<
  Array<{
    idempotencyKey: string;
    success: boolean;
    callback?: ICallback;
    error?: string;
  }>
> {
  if (params.items.length === 0) {
    return [];
  }

  const nodeServerURL = getNodeServerURL();
  const nodeServerInternalAccessKey = getNodeServerInternalAccessKey();

  const response = await fetch(`${nodeServerURL}/cb/addCallback`, {
    method: "POST",
    body: JSON.stringify({
      items: params.items,
      groupId: params.groupId,
      clientTokenId: params.clientTokenId,
    }),
    headers: {
      "X-Internal-Access-Key": nodeServerInternalAccessKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new OwnServerError("Failed to add callbacks", 500);
  }

  const responseBody = await response.json();
  if (Array.isArray(responseBody.results)) {
    return responseBody.results;
  }

  // Backward-compat if node still returns a single callback for a one-item batch.
  if (responseBody.callback) {
    return [
      {
        idempotencyKey: params.items[0]?.idempotencyKey ?? "",
        success: true,
        callback: responseBody.callback as ICallback,
      },
    ];
  }

  throw new OwnServerError("Failed to add callbacks", 500);
}

export async function callNodeServerDeleteCallbacks(
  input: DeleteCallbacksEndpointArgs & { clientTokenId: string }
): Promise<void> {
  const nodeServerURL = getNodeServerURL();
  const nodeServerInternalAccessKey = getNodeServerInternalAccessKey();

  const response = await fetch(`${nodeServerURL}/cb/deleteCallbacks`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "X-Internal-Access-Key": nodeServerInternalAccessKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new OwnServerError("Failed to delete callbacks", 500);
  }
}

/**
 * Routes monitor callback add/delete through the node-server HTTP APIs so the
 * in-memory timer store stays in sync (Mongo-only writes do not).
 */
export const nodeMonitorCallbackScheduler: IMonitorCallbackScheduler =
  wrapMonitorCallbackScheduler({
    async deleteByIdempotencyKeys({ idempotencyKeys, by }) {
      if (idempotencyKeys.length === 0) {
        return;
      }
      await callNodeServerDeleteCallbacks({
        query: {
          projectId: kId0,
          idempotencyKey: { in: idempotencyKeys },
        },
        deleteMany: true,
        clientTokenId: by,
      });
    },
    async addMany({ items }) {
      if (items.length === 0) {
        return [];
      }
      // Batch assumes shared groupId/by (monitor runners use kId0 / same actor).
      const groupId = items[0].groupId;
      const by = items[0].by;
      const results = await callNodeServerAddCallbacks({
        items: items.map((item) => item.args),
        groupId,
        clientTokenId: by,
      });

      return results.map((result): IMonitorCallbackAddResult => {
        if (result.success) {
          return { success: true, callback: result.callback };
        }
        return {
          success: false,
          error: new OwnServerError(
            result.error ?? "Failed to add callback",
            500
          ),
        };
      });
    },
  });
