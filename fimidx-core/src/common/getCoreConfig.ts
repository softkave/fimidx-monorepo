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
  const sourceMapsLocalDir = process.env.FIMIDX_SOURCE_MAPS_LOCAL_DIR;
  const fimidaraAuthToken = process.env.FIMIDARA_AUTH_TOKEN;
  const fimidaraRootname = process.env.FIMIDARA_ROOTNAME;
  const symbolicationUrl = process.env.SYMBOLICATION_URL;
  const symbolicationIntervalMs = process.env.SYMBOLICATION_INTERVAL_MS;
  const symbolicationBatchSize = process.env.SYMBOLICATION_LOG_BATCH_SIZE;
  const symbolicationMaxAgeMs = process.env.SYMBOLICATION_MAX_AGE_MS;
  const unzipSourceMapsUrl = process.env.UNZIP_SOURCE_MAPS_URL;
  const unzipSourceMapsIntervalMs = process.env.UNZIP_SOURCE_MAPS_INTERVAL_MS;
  const purgeSourceMapCacheUrl = process.env.PURGE_SOURCE_MAP_CACHE_URL;
  const purgeSourceMapCacheIntervalMs =
    process.env.PURGE_SOURCE_MAP_CACHE_INTERVAL_MS;
  const purgeSourceMapCacheMaxUnusedCycles =
    process.env.SYMBOLICATION_LOCAL_CACHE_MAX_UNUSED_CYCLES;
  const nodeServerHttpPort = process.env.NODE_SERVER_HTTP_PORT;
  const fimidxLoggerProjectId =
    process.env.NEXT_PUBLIC_FIMIDX_LOGGER_PROJECT_ID;
  const fimidxLoggerClientToken =
    process.env.NEXT_PUBLIC_FIMIDX_LOGGER_CLIENT_TOKEN;
  const fimidxLoggerServerUrl =
    process.env.NEXT_PUBLIC_FIMIDX_LOGGER_SERVER_URL;
  const wsHost = process.env.WS_HOST;

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
    sourceMaps: { localDir: sourceMapsLocalDir },
    fimidara: {
      authToken: fimidaraAuthToken,
      rootname: fimidaraRootname ?? "fimidx",
    },
    symbolication: {
      url: symbolicationUrl,
      intervalMs: symbolicationIntervalMs,
      batchSize: symbolicationBatchSize,
      maxAgeMs: symbolicationMaxAgeMs,
    },
    unzipSourceMaps: {
      url: unzipSourceMapsUrl,
      intervalMs: unzipSourceMapsIntervalMs,
    },
    purgeSourceMapCache: {
      url: purgeSourceMapCacheUrl,
      intervalMs: purgeSourceMapCacheIntervalMs,
      maxUnusedCycles: purgeSourceMapCacheMaxUnusedCycles,
    },
    nodeServerHttp: {
      port: nodeServerHttpPort,
    },
    logger: {
      fimidxProjectId: fimidxLoggerProjectId,
      fimidxClientToken: fimidxLoggerClientToken,
      fimidxServerUrl: fimidxLoggerServerUrl,
    },
    ws: {
      host: wsHost,
    },
  });
}
