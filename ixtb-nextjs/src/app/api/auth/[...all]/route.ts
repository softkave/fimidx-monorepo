import { authApi } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

type AuthHandlers = ReturnType<typeof toNextJsHandler>;

let handlers: AuthHandlers | undefined;

function getHandlers(): AuthHandlers {
  if (!handlers) {
    handlers = toNextJsHandler(authApi);
  }
  return handlers;
}

export function GET(
  ...args: Parameters<AuthHandlers["GET"]>
): ReturnType<AuthHandlers["GET"]> {
  return getHandlers().GET(...args);
}

export function POST(
  ...args: Parameters<AuthHandlers["POST"]>
): ReturnType<AuthHandlers["POST"]> {
  return getHandlers().POST(...args);
}
