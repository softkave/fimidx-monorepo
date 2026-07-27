import { getAuthApi } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getMongoConnection } from "fimidx-core/db/fimidx.mongo";

type AuthHandlers = ReturnType<typeof toNextJsHandler>;

let handlers: AuthHandlers | undefined;
let handlersConnectionGeneration: number | undefined;

async function getHandlers(): Promise<AuthHandlers> {
  const api = await getAuthApi();
  const { connectionGeneration } = getMongoConnection();

  if (
    !handlers ||
    handlersConnectionGeneration !== connectionGeneration
  ) {
    handlers = toNextJsHandler(api);
    handlersConnectionGeneration = connectionGeneration;
  }

  return handlers;
}

export async function GET(
  ...args: Parameters<AuthHandlers["GET"]>
): Promise<ReturnType<AuthHandlers["GET"]>> {
  return (await getHandlers()).GET(...args);
}

export async function POST(
  ...args: Parameters<AuthHandlers["POST"]>
): Promise<ReturnType<AuthHandlers["POST"]>> {
  return (await getHandlers()).POST(...args);
}
