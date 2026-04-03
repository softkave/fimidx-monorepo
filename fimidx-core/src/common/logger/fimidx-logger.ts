import { FimidxLogger } from "fimidx";
import { getClientConfig } from "../getClientConfig.js";

const { fimidxProjectId, fimidxClientToken, nodeEnv, fimidxServerUrl } =
  getClientConfig();

export const fimidxLogger = new FimidxLogger({
  projectId: fimidxProjectId ?? "",
  clientToken: fimidxClientToken ?? "",
  consoleLogOnError: true,
  logRemoteErrors: true,
  ...(nodeEnv === "development" ? { serverURL: fimidxServerUrl } : {}),
});
