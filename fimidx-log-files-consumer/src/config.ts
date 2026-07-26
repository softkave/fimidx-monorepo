import {
  IResolvedFileConfig,
  kDefaultBatchSize,
  kDefaultFlushIncompleteAfterMs,
  kDefaultMaxRecordBytes,
  LogFileInput,
  LogFilesConsumerOptions,
} from './types.js';

export interface ICredentialEnv {
  FIMIDX_PROJECT_ID?: string;
  FIMIDX_CLIENT_TOKEN?: string;
  FIMIDX_SERVER_URL?: string;
}

export function resolveFileConfig(
  logFile: LogFileInput,
  globalConfig: LogFilesConsumerOptions,
  env: ICredentialEnv = process.env,
): IResolvedFileConfig {
  const projectId =
    logFile.projectId ?? globalConfig.projectId ?? env.FIMIDX_PROJECT_ID;
  const clientToken =
    logFile.clientToken ?? globalConfig.clientToken ?? env.FIMIDX_CLIENT_TOKEN;
  const serverURL =
    logFile.serverURL ?? globalConfig.serverURL ?? env.FIMIDX_SERVER_URL;

  if (!projectId || !clientToken) {
    throw new Error(
      `Missing required config for file ${logFile.path}: projectId and clientToken are required (set in config or via FIMIDX_PROJECT_ID / FIMIDX_CLIENT_TOKEN)`,
    );
  }

  return {
    path: logFile.path,
    metadata: {
      ...(globalConfig.metadata ?? {}),
      ...(logFile.metadata ?? {}),
    },
    projectId,
    clientToken,
    ...(serverURL ? {serverURL} : {}),
    batchSize:
      logFile.batchSize ?? globalConfig.batchSize ?? kDefaultBatchSize,
    maxRecordBytes:
      logFile.maxRecordBytes ??
      globalConfig.maxRecordBytes ??
      kDefaultMaxRecordBytes,
    flushIncompleteAfterMs:
      logFile.flushIncompleteAfterMs ??
      globalConfig.flushIncompleteAfterMs ??
      kDefaultFlushIncompleteAfterMs,
  };
}
