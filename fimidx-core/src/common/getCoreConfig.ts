import { isString } from "lodash-es";
import {
  coreConfigSchema,
  type CoreConfig,
} from "../definitions/coreConfig.js";

export function getCoreConfig(): CoreConfig {
  const fimidxPostgresUrl = process.env.FIMIDX_POSTGRES_URL;
  const fimidxTursoUrl = process.env.FIMIDX_TURSO_URL;
  const fimidxTursoAuthToken = process.env.FIMIDX_TURSO_AUTH_TOKEN;
  const authTursoUrl = process.env.AUTH_TURSO_URL;
  const authTursoAuthToken = process.env.AUTH_TURSO_AUTH_TOKEN;
  const mongoUri = process.env.MONGO_URI;
  const mongoDbName = process.env.MONGO_DB_NAME;
  const adminEmails = process.env.ADMIN_EMAILS;
  const storageType = process.env.STORAGE_TYPE;
  const jwtSecret = process.env.JWT_SECRET;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fimidxInternalNodeServerUrl =
    process.env.FIMIDX_INTERNAL_NODE_SERVER_URL;
  const fimidxInternalInternalAccessKey =
    process.env.FIMIDX_INTERNAL_INTERNAL_ACCESS_KEY;
  const indexObjsUrl = process.env.INDEX_OBJS_URL;
  const indexObjsIntervalMs = process.env.INDEX_OBJS_INTERVAL_MS;
  const cleanupObjsUrl = process.env.CLEANUP_OBJS_URL;
  const cleanupObjsIntervalMs = process.env.CLEANUP_OBJS_INTERVAL_MS;
  const nodeServerHttpPort = process.env.NODE_SERVER_HTTP_PORT;
  const fimidxLoggerAppId = process.env.NEXT_PUBLIC_FIMIDX_LOGGER_APP_ID;
  const fimidxLoggerClientToken =
    process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
  const fimidxLoggerServerUrl =
    process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
  const wsHost = process.env.WS_HOST;
  const fimidaraAuthToken = process.env.FIMIDARA_AUTH_TOKEN;
  const fimidaraWorkspaceRootname = process.env.FIMIDARA_WORKSPACE_ROOTNAME;
  const fimidaraLogsFolderPrefix = process.env.FIMIDARA_LOGS_FOLDER_PREFIX;
  const redisUrl = process.env.REDIS_URL;
  const consumeLogsUrl = process.env.CONSUME_LOGS_URL;
  const consumeLogsIntervalMs = process.env.CONSUME_LOGS_INTERVAL_MS;

  return coreConfigSchema.parse({
    postgres: {
      url: fimidxPostgresUrl,
    },
    turso: {
      url: fimidxTursoUrl,
      authToken: fimidxTursoAuthToken,
    },
    auth: {
      turso: {
        url: authTursoUrl,
        authToken: authTursoAuthToken,
      },
    },
    mongo: {
      uri: mongoUri,
      dbName: mongoDbName,
    },
    adminEmails: isString(adminEmails) ? adminEmails.split(",") : [],
    storage: {
      type: storageType,
    },
    jwtSecret,
    resend: {
      fromEmail: resendFromEmail,
      apiKey: resendApiKey,
    },
    fimidxInternal: {
      nodeServerUrl: fimidxInternalNodeServerUrl,
      internalAccessKey: fimidxInternalInternalAccessKey,
    },
    indexObjs: {
      url: indexObjsUrl,
      intervalMs: indexObjsIntervalMs,
    },
    cleanupObjs: {
      url: cleanupObjsUrl,
      intervalMs: cleanupObjsIntervalMs,
    },
    nodeServerHttp: {
      port: nodeServerHttpPort,
    },
    logger: {
      fimidxAppId: fimidxLoggerAppId,
      fimidxClientToken: fimidxLoggerClientToken,
      fimidxServerUrl: fimidxLoggerServerUrl,
    },
    ws: {
      host: wsHost,
    },
    fimidara: {
      authToken: fimidaraAuthToken,
      workspaceRootname: fimidaraWorkspaceRootname,
      logsFolderPrefix: fimidaraLogsFolderPrefix,
    },
    redis: {
      url: redisUrl,
    },
    consumeLogs: {
      url: consumeLogsUrl,
      intervalMs: consumeLogsIntervalMs,
    },
  });
}
