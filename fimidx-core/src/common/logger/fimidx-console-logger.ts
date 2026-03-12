import { FimidxConsoleLikeLogger } from "fimidx";
import { getClientConfig } from "../getClientConfig.js";
import { fimidxLogger } from "./fimidx-logger.js";

const { fimidxLoggerEnabled } = getClientConfig();

export const fimidxConsoleLogger = new FimidxConsoleLikeLogger({
  fimidxLogger: fimidxLogger,
  // Always enable console fallback to avoid losing logs in production. This is
  // because fimidx handles logs for other projects including itself, but should it
  // be down, there'll be no way to know what went wrong.
  enableConsoleFallback: true,
  logToFimidx: fimidxLoggerEnabled,
});
