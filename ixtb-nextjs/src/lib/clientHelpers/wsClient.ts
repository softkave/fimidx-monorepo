import { IWsBase } from "fimidx-core/common/ws";
import { AnyFn, AnyObject } from "softkave-js-utils";

export class WsBrowser implements IWsBase {
  protected ws: WebSocket;
  protected projectListeners = new Map<AnyFn, AnyFn>();

  constructor(host: string) {
    this.ws = new WebSocket(host);
  }

  addOpenListener(listener: () => void) {
    this.ws.addEventListener("open", listener);
  }

  addErrorListener(listener: (error: unknown) => void) {
    this.ws.addEventListener("error", listener);
  }

  addMessageListener(listener: (message: string) => void) {
    const projectListener = async (event: MessageEvent) => {
      const data = event.data;
      let message: string | undefined;

      if (typeof data === "string") {
        message = data;
      } else if (data instanceof Blob) {
        message = await data.text();
      } else if ((data as AnyObject).toString) {
        message = (data as AnyObject).toString();
      }

      if (message) {
        listener(message);
      }
    };

    this.projectListeners.set(listener, projectListener);
    this.ws.addEventListener("message", projectListener);
  }

  addCloseListener(listener: () => void) {
    this.ws.addEventListener("close", listener);
  }

  removeMessageListener(listener: (message: string) => void) {
    const projectListener = this.projectListeners.get(listener);
    if (projectListener) {
      this.ws.removeEventListener("message", projectListener);
      this.projectListeners.delete(listener);
    }
  }

  close() {
    this.ws.close();
  }

  send(message: string) {
    this.ws.send(message);
  }

  getReadyState() {
    return this.ws.readyState;
  }
}

export function getWsBrowser(host: string) {
  return new WsBrowser(host);
}
