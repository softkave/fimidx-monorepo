import { getDeferredPromise, type AnyObject } from "softkave-js-utils";
import { v4 as uuidv4 } from "uuid";
import { assert } from "vitest";
import { getCoreConfig } from "./getCoreConfig.js";
import { fimidxConsoleLogger } from "./logger/fimidx-console-logger.js";

export enum WsReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

export interface IWsBase {
  addOpenListener: (listener: () => void) => void;
  addErrorListener: (listener: (error: unknown) => void) => void;
  addMessageListener: (listener: (message: string) => void) => void;
  addCloseListener: (listener: () => void) => void;
  removeMessageListener: (listener: (message: string) => void) => void;
  close: () => void;
  send: (message: string) => void;
  getReadyState: () => WsReadyState;
}

const { ws: wsConfig } = getCoreConfig();

export function getWs(getWsClient: (host: string) => IWsBase) {
  assert.ok(wsConfig.host, "ws.host is required");
  const ws = getWsClient(wsConfig.host);
  ws.addOpenListener(() => {
    fimidxConsoleLogger.log("Connected to WebSocket server");
  });
  ws.addErrorListener((...args) => {
    fimidxConsoleLogger.error("WebSocket error", ...args);
  });

  return ws;
}

export function closeWs(ws: IWsBase) {
  ws.close();
}

export function waitWs(ws: IWsBase) {
  return new Promise<void>((resolve, reject) => {
    if (ws.getReadyState() === WsReadyState.Open) {
      resolve();
      return;
    }

    ws.addOpenListener(resolve);
    ws.addErrorListener(reject);
  });
}

export async function sendMessageToWs(
  ws: IWsBase,
  message: AnyObject,
  waitOnAck?: boolean
) {
  const output = {
    ...message,
    messageId: uuidv4(),
  };

  await waitWs(ws);
  ws.send(JSON.stringify(output));

  if (waitOnAck) {
    const deferred = getDeferredPromise<AnyObject>();
    const onMessage = async (messageRaw: string) => {
      let input: AnyObject | undefined;

      try {
        input = JSON.parse(messageRaw);
      } catch (error) {
        fimidxConsoleLogger.error("Error parsing message", error, messageRaw);
      }

      if (input?.messageId === output.messageId) {
        deferred.resolve(input);
      }
    };

    ws.addMessageListener(onMessage);
    setTimeout(() => {
      deferred.reject(
        new Error(
          `Timeout waiting for ack for message ${JSON.stringify(output)}`
        )
      );
    }, 10_000);

    deferred.promise.finally(() => {
      ws.removeMessageListener(onMessage);
    });

    return deferred.promise;
  }

  return undefined;
}

let ws: IWsBase | null = null;

export function getLazyWs(getWsClient: (host: string) => IWsBase) {
  if (!ws) {
    ws = getWs(getWsClient);
    ws.addCloseListener(() => {
      ws = null;
    });
  }

  return ws;
}

export function closeLazyWs() {
  if (ws) {
    closeWs(ws);
  }
}
