import { Request, Response } from "express";
import { runSymbolication } from "fimidx-core/serverHelpers/index";
import { kPromiseStore } from "../../ctx/promiseStore.js";
import { fimidxNodeWinstonLogger } from "../../utils/fimidxNodeloggers.js";

let isProcessing = false;

export async function symbolicateLogsEndpoint(req: Request, res: Response) {
  if (isProcessing) {
    res.status(200).send({});
    return;
  }
  isProcessing = true;
  kPromiseStore.callAndForget(async () => {
    try {
      await runSymbolication();
    } catch (err) {
      fimidxNodeWinstonLogger.error("Symbolication callback error", {
        error: err,
      });
    } finally {
      isProcessing = false;
    }
  });
  res.status(200).send({});
}
