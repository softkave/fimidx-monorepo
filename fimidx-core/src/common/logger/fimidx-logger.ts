import { FimidxLogger } from "fimidx";
import { getClientConfig } from "../getClientConfig.js";

const {
  fimidxProjectId,
  fimidxClientToken,
  fimidxServerUrl,
  fimidxLoggerMetadataApp,
  fimidxSymbolicationVersion,
  fimidxSymbolicationRepo,
} = getClientConfig();

export const fimidxLogger = new FimidxLogger({
  projectId: fimidxProjectId,
  clientToken: fimidxClientToken,
  consoleLogOnError: true,
  logRemoteErrors: true,
  ...(fimidxServerUrl ? { serverURL: fimidxServerUrl } : {}),
  metadata: {
    app: fimidxLoggerMetadataApp,
    version: fimidxSymbolicationVersion,
    repo: fimidxSymbolicationRepo,
  },
});

/** Flush any buffered remote log entries. Call on process shutdown. */
export async function closeFimidxLogger(): Promise<void> {
  await fimidxLogger.close();
}
