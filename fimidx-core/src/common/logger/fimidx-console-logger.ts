import { FimidxConsoleLikeLogger } from "fimidx";
import { fimidxLogger } from "./fimidx-logger.js";

export const fimidxConsoleLogger = new FimidxConsoleLikeLogger({
  fimidxLogger: fimidxLogger,
  // Always enable console fallback to avoid losing logs in production. This is
  // because fimidx handles logs for other apps including itself, but should it
  // be down, there'll be no way to know what went wrong.
  enableConsoleFallback: true,
});
