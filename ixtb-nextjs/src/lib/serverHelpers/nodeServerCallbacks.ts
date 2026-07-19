import { OwnServerError } from "fimidx-core/common/error";
import type {
  AddCallbackEndpointArgs,
  DeleteCallbacksEndpointArgs,
  ICallback,
} from "fimidx-core/definitions/callback";
import { kId0 } from "fimidx-core/definitions/system";
import type { IMonitorCallbackScheduler } from "fimidx-core/serverHelpers/monitor/syncMonitorCallback";
import {
  getNodeServerInternalAccessKey,
  getNodeServerURL,
} from "./nodeServer";

export async function callNodeServerAddCallback(params: {
  item: AddCallbackEndpointArgs;
  groupId: string;
  clientTokenId: string;
}): Promise<ICallback> {
  const nodeServerURL = getNodeServerURL();
  const nodeServerInternalAccessKey = getNodeServerInternalAccessKey();

  const response = await fetch(`${nodeServerURL}/cb/addCallback`, {
    method: "POST",
    body: JSON.stringify({
      item: params.item,
      groupId: params.groupId,
      clientTokenId: params.clientTokenId,
    }),
    headers: {
      "X-Internal-Access-Key": nodeServerInternalAccessKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new OwnServerError("Failed to add callback", 500);
  }

  const responseBody = await response.json();
  return responseBody.callback as ICallback;
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
export const nodeMonitorCallbackScheduler: IMonitorCallbackScheduler = {
  async deleteByIdempotencyKey({ idempotencyKey, by }) {
    await callNodeServerDeleteCallbacks({
      query: {
        projectId: kId0,
        idempotencyKey: { eq: idempotencyKey },
      },
      deleteMany: true,
      clientTokenId: by,
    });
  },
  async add({ args, groupId, by }) {
    return callNodeServerAddCallback({
      item: args,
      groupId,
      clientTokenId: by,
    });
  },
};
